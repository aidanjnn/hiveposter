import { advance, badRequest, HumanBody } from "@/lib/game-service";

/**
 * POST /api/game/[id]/human
 * Body: HumanMove. Validates (400 with a user-facing reason), applies, then streams the
 * rest of the turn like the phase route. Plan §08.
 */
export const maxDuration = 60;

export async function POST(req: Request, ctx: RouteContext<"/api/game/[id]/human">) {
  const { id } = await ctx.params;
  const parsed = HumanBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("That move isn't valid.");
  return advance(id, parsed.data);
}
