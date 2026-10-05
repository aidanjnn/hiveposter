import { z } from "zod";
import type { PersonaId, PublicView } from "@/engine/types";
import { summarizeForPersona } from "@/agents/memory";
import { badRequest } from "@/lib/game-service";
import { MAX_NOTES_PER_PERSONA } from "@/agents/memory";

/**
 * POST /api/memory
 * Body: { view: PublicView (revealed), notes: { [persona]: string[] } }
 * Returns { memory: { [persona]: { notes, lobbyLine } } }. A persona whose call fails is
 * left out; the client keeps its old notes. Plan §07.
 */
export const maxDuration = 30;

// The body comes from the browser, so bound what it can spend: a finished game is a few KB,
// and each persona costs one model call.
const MAX_BODY_BYTES = 64_000;
const personaId = z.enum(["juno", "biscuit", "marlowe", "rook"]);

const Body = z.object({
  view: z
    .object({ phase: z.literal("reveal"), seats: z.array(z.object({ persona: personaId.optional() })).max(4) })
    .passthrough(),
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
  const view = parsed.data.view as unknown as PublicView;
  const personas = [...new Set(view.seats.map((s) => s.persona).filter((p): p is PersonaId => Boolean(p)))];
  const results = await Promise.allSettled(
    personas.map(async (p) => [p, await summarizeForPersona(p, view, parsed.data.notes[p] ?? [])] as const),
  );
  const memory: Record<string, { notes: string[]; lobbyLine: string }> = {};
  for (const r of results) if (r.status === "fulfilled") memory[r.value[0]] = r.value[1];
  return Response.json({ memory });
}
