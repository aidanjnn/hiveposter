import type { SeatView } from "@/engine/types";
import type { Persona } from "./personas";

/**
 * Plan §06. System prompt shared across phases; one user prompt builder per phase.
 * The prompts receive a SeatView and nothing else, so the imposter can't be told the word by accident.
 */

export function systemPrompt(persona: Persona, view: SeatView): string {
  throw new Error("TODO(agents): systemPrompt");
}

export function civilianCluePrompt(view: SeatView): string {
  throw new Error("TODO(agents): civilianCluePrompt");
}

export function imposterCluePrompt(view: SeatView): string {
  throw new Error("TODO(agents): imposterCluePrompt");
}

export function discussPrompt(view: SeatView, askedBy?: { seat: string; text: string }): string {
  throw new Error("TODO(agents): discussPrompt");
}

export function votePrompt(view: SeatView): string {
  throw new Error("TODO(agents): votePrompt");
}

export function lastGuessPrompt(view: SeatView): string {
  throw new Error("TODO(agents): lastGuessPrompt");
}

/** Post-game. Gets the full public view (with traces) since the game is over. */
export function memoryPrompt(persona: Persona, gameSummary: string, existingNotes: string[]): string {
  throw new Error("TODO(agents): memoryPrompt");
}

/** Retry suffix when the engine rejected a clue. */
export function clueRejectedSuffix(clue: string, reason: string): string {
  return `Your clue "${clue}" was rejected: ${reason}. Give a different one-word clue.`;
}
