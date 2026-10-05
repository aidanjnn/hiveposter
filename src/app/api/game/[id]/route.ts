import { badRequest, TABLE_RESET, viewOf } from "@/lib/game-service";
import { getGame } from "@/lib/store";

/** GET /api/game/[id]: the current public view, for resuming after a refresh. */
export async function GET(_req: Request, ctx: RouteContext<"/api/game/[id]">) {
  const { id } = await ctx.params;
  const state = getGame(id);
  if (!state) return badRequest(TABLE_RESET, 404);
  return Response.json({ view: viewOf(state) });
}
