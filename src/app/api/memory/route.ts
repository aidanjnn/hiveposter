/**
 * POST /api/memory
 * Body: { view: PublicView, notes: Partial<Record<PersonaId, string[]>> }
 * Returns { [persona]: { notes, lobbyLine } }. Plan §07.
 */
export async function POST(req: Request) {
  return Response.json({ error: "TODO(api): memory summary" }, { status: 501 });
}
