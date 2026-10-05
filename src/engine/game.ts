import type {
  Clue,
  GameState,
  Message,
  Mode,
  PersonaId,
  SeatId,
  Vote,
} from "./types";

/**
 * Pure state machine. Plan §05.
 *
 *   lobby → deal → clue1 → clue2 → discuss → vote → (lastGuess) → reveal
 *
 * Nothing in this file calls a model or touches I/O. Each function takes a state
 * and returns the next state (treat GameState as immutable).
 */

export interface CreateGameInput {
  mode: Mode;
  personas: PersonaId[];
  playerId: string;
  seed: string;
  memory: GameState["memory"];
}

/** Pick word set from seed, assign roles with a PRNG seeded by seed + playerId, set turn order. */
export function createGame(input: CreateGameInput): GameState {
  throw new Error("TODO(engine): createGame");
}

/** Append a validated clue. Advances phase and rotates order after the last seat of a round. */
export function applyClue(state: GameState, clue: Clue): GameState {
  throw new Error("TODO(engine): applyClue");
}

/** Append a message. Enforces 2 per agent per phase and 140 chars. */
export function applyMessage(state: GameState, message: Message): GameState {
  throw new Error("TODO(engine): applyMessage");
}

/** Append a vote (no self-votes, one per seat). */
export function applyVote(state: GameState, vote: Vote): GameState {
  throw new Error("TODO(engine): applyVote");
}

/** Plurality → ejected; tie → none. Imposter ejected → lastGuess, else → reveal. */
export function resolveVote(state: GameState): GameState {
  throw new Error("TODO(engine): resolveVote");
}

/** Imposter's last-chance guess. → reveal. */
export function applyGuess(state: GameState, word: string): GameState {
  throw new Error("TODO(engine): applyGuess");
}

/** Compute result and move to reveal. */
export function finalize(state: GameState): GameState {
  throw new Error("TODO(engine): finalize");
}

/** Whose turn is it to give a clue, or null if the round is complete. */
export function nextClueSeat(state: GameState): SeatId | null {
  throw new Error("TODO(engine): nextClueSeat");
}

/** Watch mode: flip an agent seat to human mid-game. */
export function takeSeat(state: GameState, seat: SeatId): GameState {
  throw new Error("TODO(engine): takeSeat");
}

/** Plan §02 scoring. */
export function scoreFor(state: GameState, seat: SeatId): number {
  throw new Error("TODO(engine): scoreFor");
}
