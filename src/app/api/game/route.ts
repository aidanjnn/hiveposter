import { badRequest, create, CreateBody, viewOf } from "@/lib/game-service";

/**
 * POST /api/game
 * Body: { mode, playerId, seed?, personas?, memory?, grudges? }
 * Deals a new table and returns the public view. Agents act on the first phase request.
 * Plan §08.
 */
export async function POST(req: Request) {
  const parsed = CreateBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid game settings.");
  try {
    const state = create(parsed.data);
    return Response.json({ view: viewOf(state) });
  } catch (err) {
    return badRequest(err instanceof Error ? err.message : "Couldn't deal.");
  }
}
