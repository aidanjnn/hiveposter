import { z } from "zod";
import type { PersonaId, PublicView } from "@/engine/types";
import { summarizeForPersona } from "@/agents/memory";
import { badRequest } from "@/lib/game-service";

/**
 * POST /api/memory
 * Body: { view: PublicView (revealed), notes: { [persona]: string[] } }
 * Returns { memory: { [persona]: { notes, lobbyLine } } }. A persona whose call fails is
 * left out; the client keeps its old notes. Plan §07.
 */
export const maxDuration = 30;

const Body = z.object({
  view: z.object({ phase: z.literal("reveal"), seats: z.array(z.object({ persona: z.string().optional() })) }).passthrough(),
  notes: z.record(z.string(), z.array(z.string())).default({}),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Memory needs a finished game.");
  const view = parsed.data.view as unknown as PublicView;
  const personas = view.seats.map((s) => s.persona).filter((p): p is PersonaId => Boolean(p));
  const results = await Promise.allSettled(
    personas.map(async (p) => [p, await summarizeForPersona(p, view, parsed.data.notes[p] ?? [])] as const),
  );
  const memory: Record<string, { notes: string[]; lobbyLine: string }> = {};
  for (const r of results) if (r.status === "fulfilled") memory[r.value[0]] = r.value[1];
  return Response.json({ memory });
}
