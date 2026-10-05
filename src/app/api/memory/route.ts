import { z } from "zod";
import type { PersonaId } from "@/engine/types";
import { humanSeat } from "@/engine/game";
import { summarizeForPersona } from "@/agents/memory";
import { badRequest, viewOf } from "@/lib/game-service";
import { MAX_NOTES_PER_PERSONA } from "@/lib/notes";
import { getGame } from "@/lib/store";

/**
 * POST /api/memory
 * Body: { view: { id } of a revealed game }. Submitted notes are accepted but not used.
 * Returns { memory: { [persona]: { notes, lobbyLine } } }. A persona whose call fails is
 * left out; the client keeps its old notes. Plan §07.
 *
 * The summary is built from the server's copy of the game and the notes it was dealt with,
 * never the submitted view or notes, so one client can't shape another's memory. Each
 * persona is summarized once per game; a retry returns the cached summaries and re-asks only
 * for failed ones, at most three attempts, so a made-up or replayed body can't buy model calls.
 * A recycled instance has no copy; the client just keeps its old notes.
 */
export const maxDuration = 30;

// The body comes from the browser, so bound what it can spend: a finished game is a few KB,
// and each persona costs one model call.
const MAX_BODY_BYTES = 64_000;
const personaId = z.enum(["juno", "biscuit", "marlowe", "rook"]);

type Memory = { notes: string[]; lobbyLine: string };
/** Per finished game: summaries that succeeded, attempts made, and the attempt in flight. */
type GameMemory = { memory: Partial<Record<PersonaId, Memory>>; attempts: number; pending?: Promise<void> };
const MAX_ATTEMPTS = 3;

declare global {
  var __memorized: Map<string, GameMemory> | undefined;
}
const memorized = (globalThis.__memorized ??= new Map());

const Body = z.object({
  view: z.object({ id: z.string().min(1).max(64) }).passthrough(),
  notes: z.partialRecord(personaId, z.array(z.string().max(200)).max(MAX_NOTES_PER_PERSONA)).default({}),
});

export async function POST(req: Request) {
  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return badRequest("Memory needs a finished game.");
  let body: unknown = null;
  try {
    body = JSON.parse(raw);
  } catch {}
  const parsed = Body.safeParse(body);
  if (!parsed.success) return badRequest("Memory needs a finished game.");
  const id = parsed.data.view.id;
  const state = getGame(id);
  if (!state || state.phase !== "reveal" || !humanSeat(state)) return badRequest("Memory needs a finished game.");
  for (const done of memorized.keys()) if (!getGame(done)) memorized.delete(done);
  const record: GameMemory = memorized.get(id) ?? { memory: {}, attempts: 0 };
  memorized.set(id, record);
  const view = viewOf(state);
  const personas = [...new Set(view.seats.map((s) => s.persona).filter((p): p is PersonaId => Boolean(p)))];
  // An overlapping request shares the attempt in flight and never starts one of its own,
  // so a burst of requests during an outage can't use up the retries.
  if (record.pending) {
    await record.pending;
    return Response.json({ memory: record.memory });
  }
  // A retry gets the cached summaries back and only re-asks for the ones that failed.
  const missing = personas.filter((p) => !record.memory[p]);
  if (missing.length && record.attempts < MAX_ATTEMPTS) {
    record.attempts += 1;
    record.pending = Promise.allSettled(
      missing.map(async (p) => [p, await summarizeForPersona(p, view, state.memory[p] ?? [])] as const),
    ).then((results) => {
      for (const r of results) if (r.status === "fulfilled") record.memory[r.value[0]] = r.value[1];
      record.pending = undefined;
    });
    await record.pending;
  }
  return Response.json({ memory: record.memory });
}
