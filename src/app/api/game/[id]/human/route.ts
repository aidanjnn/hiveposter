/**
 * POST /api/game/[id]/human
 * Body: HumanMove ({ type: "clue" | "message" | "sure" | "vote" | "guess" | "call" | "takeSeat", ... })
 * Validates (400 with a reason on an invalid clue), applies, then continues the phase and streams the rest.
 * Plan §08.
 */
export const maxDuration = 60;

export async function POST(req: Request, ctx: RouteContext<"/api/game/[id]/human">) {
  const { id } = await ctx.params;
  return Response.json({ error: `TODO(api): human move for ${id}` }, { status: 501 });
}
