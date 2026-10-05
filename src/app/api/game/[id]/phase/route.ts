/**
 * POST /api/game/[id]/phase
 * Body: { phase }
 * Runs agent turns for that phase until a human move is needed, streaming GameEvents as SSE.
 * The final event is { type: "phase", view }. Plan §08.
 */
export const maxDuration = 60;

export async function POST(req: Request, ctx: RouteContext<"/api/game/[id]/phase">) {
  const { id } = await ctx.params;
  return Response.json({ error: `TODO(api): advance phase for ${id}` }, { status: 501 });
}
