import { advance } from "@/lib/game-service";

/**
 * POST /api/game/[id]/phase
 * Runs agent turns until a human move is needed, streaming GameEvents as SSE.
 * The last event is { type: "view" }. Plan §08.
 */
export const maxDuration = 120;

export async function POST(_req: Request, ctx: RouteContext<"/api/game/[id]/phase">) {
  const { id } = await ctx.params;
  return advance(id);
}
