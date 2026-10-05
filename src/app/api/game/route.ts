/**
 * POST /api/game
 * Body: { mode, personas, playerId, seed?, memory }
 * Creates a game, runs deal, returns the PublicView for the human seat (or the audience in watch mode).
 * Plan §08.
 */
export async function POST(req: Request) {
  return Response.json({ error: "TODO(api): create game" }, { status: 501 });
}
