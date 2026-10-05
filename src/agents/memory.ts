import type { PersonaId, PublicView } from "@/engine/types";
import type { MemoryUpdate } from "./schemas";

/**
 * Plan §07, memory pipeline. After reveal, one call per persona returns ≤3 notes and a lobby line.
 * The client merges: new notes first, cap 10 per persona, stored in localStorage.
 */

export const MAX_NOTES_PER_PERSONA = 10;

export function summarizeForPersona(
  persona: PersonaId,
  view: PublicView,
  existingNotes: string[],
): Promise<MemoryUpdate> {
  throw new Error("TODO(agents): summarizeForPersona");
}

/** Pure merge, used on the client. */
export function mergeNotes(existing: string[], incoming: string[]): string[] {
  throw new Error("TODO(agents): mergeNotes");
}
