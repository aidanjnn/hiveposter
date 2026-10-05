import { z } from "zod";
import type { PersonaId } from "@/engine/types";
import { humanSeat } from "@/engine/game";
import { summarizeForPersona } from "@/agents/memory";
import { badRequest, viewOf } from "@/lib/game-service";
import { MAX_NOTES_PER_PERSONA } from "@/agents/memory";
import { getGame } from "@/lib/store";

/**
 * POST /api/memory
 * Body: { view: { id } of a revealed game, notes: { [persona]: string[] } }
 * Returns { memory: { [persona]: { notes, lobbyLine } } }. A persona whose call fails is
 * left out; the client keeps its old notes. Plan §07.
 *
 * The summary is built from the server's copy of the game, never the submitted view, and
 * each finished game is summarized once, so a made-up or replayed body can't buy model calls.
 * A recycled instance has no copy; the client just keeps its old notes.
 */
export const maxDuration = 30;

// The body comes from the browser, so bound what it can spend: a finished game is a few KB,
// and each persona costs one model call.
const MAX_BODY_BYTES = 64_000;
const personaId = z.enum(["juno", "biscuit", "marlowe", "rook"]);

declare global {
  var __memorized: Set<string> | undefined;
}
const memorized = (globalThis.__memorized ??= new Set());

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
  if (!state || state.phase !== "reveal" || !humanSeat(state) || memorized.has(id)) {
    return badRequest("Memory needs a finished game.");
  }
  for (const done of memorized) if (!getGame(done)) memorized.delete(done);
  memorized.add(id);
  const view = viewOf(state);
  const personas = [...new Set(view.seats.map((s) => s.persona).filter((p): p is PersonaId => Boolean(p)))];
  const results = await Promise.allSettled(
    personas.map(async (p) => [p, await summarizeForPersona(p, view, parsed.data.notes[p] ?? [])] as const),
  );
  const memory: Record<string, { notes: string[]; lobbyLine: string }> = {};
  for (const r of results) if (r.status === "fulfilled") memory[r.value[0]] = r.value[1];
  return Response.json({ memory });
}
