/**
 * Persona memory notes (plan §07). Pure, so the client can merge without importing the
 * agent code that calls models.
 */

export const MAX_NOTES_PER_PERSONA = 10;

/** New notes first, no duplicates (case-insensitive), capped. */
export function mergeNotes(existing: string[], incoming: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const note of [...incoming, ...existing]) {
    const key = note.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(note.trim());
  }
  return out.slice(0, MAX_NOTES_PER_PERSONA);
}
