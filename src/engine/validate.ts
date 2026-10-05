import type { GameState, SeatId } from "./types";

export type ClueCheck = { ok: true; clue: string } | { ok: false; reason: string };

/**
 * Plan §02, Clue validity (engine-enforced):
 * - one word, letters and hyphen only, lowercased for checks
 * - not the secret word, not a word sharing its first 4 letters, not a repeat
 */
export function validateClue(state: GameState, raw: string): ClueCheck {
  throw new Error("TODO(engine): validateClue");
}

/** Target must be a seat in the game and not the voter. */
export function validateVote(state: GameState, voter: SeatId, target: SeatId): boolean {
  throw new Error("TODO(engine): validateVote");
}

/** Lowercase, trim, strip trailing "s", accept listed synonyms. Plan §05 lastGuess. */
export function guessMatches(wordSet: GameState["wordSet"], guess: string): boolean {
  throw new Error("TODO(engine): guessMatches");
}

/** Last line of defense: remove the secret word from any public text. */
export function scrubSecret(state: GameState, text: string): string {
  throw new Error("TODO(engine): scrubSecret");
}
