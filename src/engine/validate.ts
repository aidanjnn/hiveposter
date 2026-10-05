import type { GameState, SeatId, WordSet } from "./types";

export type ClueCheck = { ok: true; clue: string } | { ok: false; reason: string };

const CLUE_SHAPE = /^[a-z]+(-[a-z]+)*$/;
const STEM = 4;

function normalize(text: string): string {
  return text.trim().toLowerCase();
}

/** True when two words are the same or share a 4-letter stem ("waffle" / "waffles" / "waffled"). */
function tooClose(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length >= STEM && b.length >= STEM && a.slice(0, STEM) === b.slice(0, STEM)) return true;
  return false;
}

/**
 * Plan §02, clue validity:
 * - one word, letters and hyphen only, lowercased for checks
 * - not the secret word, not a word sharing its first 4 letters, not a repeat
 *
 * The secret-word checks apply only to civilians. The imposter doesn't know the word,
 * and refusing its clue as "too close" would tell it the answer.
 */
export function validateClue(state: GameState, raw: string, seat?: SeatId): ClueCheck {
  const clue = normalize(raw);
  if (!clue) return { ok: false, reason: "Give a clue." };
  if (/\s/.test(clue)) return { ok: false, reason: "One word only." };
  if (clue.length > 24) return { ok: false, reason: "Shorter, please." };
  if (!CLUE_SHAPE.test(clue)) return { ok: false, reason: "Letters only." };

  const role = seat ? state.seats.find((s) => s.id === seat)?.role : "civilian";
  if (role !== "imposter") {
    const word = state.wordSet.word.toLowerCase();
    const parts = [clue, ...clue.split("-")];
    if (parts.some((p) => p === word)) return { ok: false, reason: "That's the word." };
    if (parts.some((p) => tooClose(p, word))) return { ok: false, reason: "Too close to the word." };
  }

  if (state.clues.some((c) => c.word === clue)) return { ok: false, reason: "Someone already said that." };
  return { ok: true, clue };
}

/** Target must be another seat in the game. */
export function validateVote(state: GameState, voter: SeatId, target: SeatId): boolean {
  if (voter === target) return false;
  return state.seats.some((s) => s.id === target) && state.seats.some((s) => s.id === voter);
}

/** A word and its singular candidates: "waffles" → waffles, waffle, waffl. */
function forms(text: string): Set<string> {
  const base = text.toLowerCase().replace(/[^a-z]/g, "");
  return new Set([base, base.replace(/s$/, ""), base.replace(/es$/, "")].filter(Boolean));
}

/** Lowercase, ignore spaces/punctuation, ignore a trailing plural. Plan §05 lastGuess. */
export function guessMatches(wordSet: WordSet, guess: string): boolean {
  const target = forms(wordSet.word);
  return [...forms(guess)].some((f) => target.has(f));
}

/** Last line of defense: remove the secret word (and its plural) from public text. */
export function scrubSecret(state: GameState, text: string): string {
  const word = state.wordSet.word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.replace(new RegExp(`\\b${word}(e?s)?\\b`, "gi"), "•••");
}
