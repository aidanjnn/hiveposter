import type { WordSet } from "./types";

/**
 * Daily word bank. Plan §04: 30 hand-written sets with close decoys.
 * The decoys matter more than the word; the imposter's whole game is picking between them.
 *
 * TODO(words): fill 30 sets across Breakfast, Coastline, Kitchen tools, Board games,
 * Weather, Dog breeds, Instruments, Office supplies, Fruit, Winter sports.
 */
export const WORD_SETS: WordSet[] = [
  {
    id: 0,
    category: "Breakfast",
    word: "waffle",
    decoys: ["pancake", "french toast", "crepe", "bagel"],
    generic: ["morning", "plate", "warm"],
  },
];

/** Local date as YYYY-MM-DD, used as the daily seed. */
export function todaySeed(date = new Date()): string {
  throw new Error("TODO(engine): todaySeed");
}

/** Deterministic word set for a seed. Same date → same word for everyone. */
export function wordSetForSeed(seed: string): WordSet {
  throw new Error("TODO(engine): wordSetForSeed");
}

/** Small seeded PRNG (mulberry32 or similar). Roles use seed + playerId so the word is shared but the imposter isn't. */
export function seededRandom(seed: string): () => number {
  throw new Error("TODO(engine): seededRandom");
}
