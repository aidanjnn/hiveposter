import { validateClue, validateVote, guessMatches } from "./validate";
import { seededRandom, wordSetForSeed } from "./words";
import type {
  Clue,
  GameState,
  Message,
  Mode,
  PersonaId,
  Phase,
  Seat,
  SeatId,
  Vote,
} from "./types";

/**
 * Pure state machine. Plan §05.
 *
 *   clue1 → clue2 → discuss → vote → (lastGuess) → reveal
 *
 * Nothing in this file calls a model or does I/O. Every function takes a state and
 * returns a new one; inputs are never mutated. Invalid moves throw, so callers
 * validate first (validateClue / validateVote) and only apply what passed.
 */

export const MAX_AGENT_MESSAGES = 2;
export const MAX_HUMAN_MESSAGES = 4;
export const MESSAGE_CHARS = 140;

export interface CreateGameInput {
  mode: Mode;
  personas: PersonaId[];
  playerId: string;
  seed: string;
  memory?: GameState["memory"];
  grudges?: GameState["grudges"];
  id?: string;
  now?: number;
}

export class EngineError extends Error {}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new EngineError(message);
}

function shuffle<T>(items: T[], rand: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

/** Pick word set from seed, assign roles with a PRNG seeded by seed + playerId, set turn order. */
export function createGame(input: CreateGameInput): GameState {
  const expected = input.mode === "play" ? 3 : 4;
  assert(input.personas.length === expected, `${input.mode} mode needs ${expected} personas`);
  assert(new Set(input.personas).size === input.personas.length, "duplicate persona");

  const rand = seededRandom(`${input.seed}:${input.playerId}`);
  const ids: { id: SeatId; persona?: PersonaId }[] = [
    ...(input.mode === "play" ? [{ id: "you" as SeatId }] : []),
    ...input.personas.map((p) => ({ id: p as SeatId, persona: p })),
  ];
  const imposter = Math.floor(rand() * ids.length);
  const seats: Seat[] = ids.map((s, i) => ({
    id: s.id,
    kind: s.id === "you" ? "human" : "agent",
    persona: s.persona,
    role: i === imposter ? "imposter" : "civilian",
  }));

  return {
    id: input.id ?? randomId(),
    mode: input.mode,
    seed: input.seed,
    wordSet: wordSetForSeed(input.seed),
    seats,
    order: shuffle(
      seats.map((s) => s.id),
      rand,
    ),
    phase: "clue1",
    clues: [],
    messages: [],
    votes: [],
    traces: [],
    memory: input.memory ?? {},
    grudges: input.grudges ?? {},
    createdAt: input.now ?? Date.now(),
  };
}

export function seatOf(state: GameState, id: SeatId): Seat {
  const seat = state.seats.find((s) => s.id === id);
  assert(seat, `no seat ${id}`);
  return seat;
}

export function imposterOf(state: GameState): SeatId {
  return state.seats.find((s) => s.role === "imposter")!.id;
}

export function humanSeat(state: GameState): SeatId | undefined {
  return state.seats.find((s) => s.kind === "human")?.id;
}

function clueRound(phase: Phase): 1 | 2 | null {
  return phase === "clue1" ? 1 : phase === "clue2" ? 2 : null;
}

/** Whose turn it is to give a clue, or null outside a clue round. */
export function nextClueSeat(state: GameState): SeatId | null {
  const round = clueRound(state.phase);
  if (!round) return null;
  const given = state.clues.filter((c) => c.round === round).length;
  return state.order[given] ?? null;
}

function rotate(order: SeatId[]): SeatId[] {
  return [...order.slice(1), order[0]];
}

/**
 * Append a clue for the seat whose turn it is. The caller has validated the word.
 * After the last seat of a round the order rotates by one and the phase advances.
 */
export function applyClue(state: GameState, clue: Omit<Clue, "round">): GameState {
  const round = clueRound(state.phase);
  assert(round, `not a clue phase: ${state.phase}`);
  assert(nextClueSeat(state) === clue.seat, `not ${clue.seat}'s turn`);
  const check = validateClue(state, clue.word, clue.seat);
  assert(check.ok, check.ok ? "" : check.reason);

  const clues = [...state.clues, { ...clue, word: check.clue, round }];
  const done = clues.filter((c) => c.round === round).length === state.order.length;
  if (!done) return { ...state, clues };
  return {
    ...state,
    clues,
    order: rotate(state.order),
    phase: round === 1 ? "clue2" : "discuss",
  };
}

export function messagesLeft(state: GameState, seat: SeatId): number {
  const cap = seatOf(state, seat).kind === "human" ? MAX_HUMAN_MESSAGES : MAX_AGENT_MESSAGES;
  return cap - state.messages.filter((m) => m.seat === seat).length;
}

/** Append a discussion message. Enforces the per-seat cap and 140 characters. */
export function applyMessage(state: GameState, message: Omit<Message, "at"> & { at?: number }): GameState {
  assert(state.phase === "discuss", `not discussion: ${state.phase}`);
  assert(messagesLeft(state, message.seat) > 0, `${message.seat} has no messages left`);
  const text = message.text.trim().slice(0, MESSAGE_CHARS);
  assert(text.length > 0, "empty message");
  const next: Message = { seat: message.seat, text, at: message.at ?? Date.now() };
  if (message.replyTo) next.replyTo = message.replyTo;
  return { ...state, messages: [...state.messages, next] };
}

export function endDiscussion(state: GameState): GameState {
  assert(state.phase === "discuss", `not discussion: ${state.phase}`);
  return { ...state, phase: "vote" };
}

/** Append one vote per seat; no self-votes. */
export function applyVote(state: GameState, vote: Vote): GameState {
  assert(state.phase === "vote", `not voting: ${state.phase}`);
  assert(validateVote(state, vote.seat, vote.target), `invalid vote ${vote.seat} → ${vote.target}`);
  assert(!state.votes.some((v) => v.seat === vote.seat), `${vote.seat} already voted`);
  const confidence = Math.min(1, Math.max(0, vote.confidence));
  return { ...state, votes: [...state.votes, { ...vote, confidence }] };
}

export function allVoted(state: GameState): boolean {
  return state.seats.every((s) => state.votes.some((v) => v.seat === s.id));
}

export function tally(state: GameState): Partial<Record<SeatId, number>> {
  const counts: Partial<Record<SeatId, number>> = {};
  for (const v of state.votes) counts[v.target] = (counts[v.target] ?? 0) + 1;
  return counts;
}

/** Plurality → ejected; tie → no one. Imposter ejected → lastGuess, else → reveal. */
export function resolveVote(state: GameState): GameState {
  assert(state.phase === "vote", `not voting: ${state.phase}`);
  assert(allVoted(state), "votes missing");
  const entries = Object.entries(tally(state)) as [SeatId, number][];
  const top = Math.max(...entries.map(([, n]) => n));
  const leaders = entries.filter(([, n]) => n === top).map(([id]) => id);
  const ejected = leaders.length === 1 ? leaders[0] : undefined;
  const imposter = imposterOf(state);

  if (ejected === imposter) {
    return { ...state, phase: "lastGuess", result: { imposter, ejected, winner: "civilian" } };
  }
  return finalize({ ...state, result: { imposter, ejected, winner: "imposter" } });
}

/** The caught imposter's one guess at the word. → reveal. */
export function applyGuess(state: GameState, word: string): GameState {
  assert(state.phase === "lastGuess", `not last guess: ${state.phase}`);
  return finalize({
    ...state,
    lastGuess: { word: word.trim().toLowerCase(), correct: guessMatches(state.wordSet, word) },
  });
}

/** Compute the result and move to reveal. */
export function finalize(state: GameState): GameState {
  const imposter = imposterOf(state);
  const ejected = state.result?.ejected;
  const caught = ejected === imposter;
  const winner = caught && !state.lastGuess?.correct ? "civilian" : "imposter";
  return { ...state, phase: "reveal", result: { imposter, ejected, winner } };
}

/** Watch mode: flip an agent seat to human mid-game. One human at a time. */
export function takeSeat(state: GameState, seat: SeatId): GameState {
  assert(state.mode === "watch", "take a seat is watch-mode only");
  assert(!humanSeat(state), "a seat is already taken");
  assert(state.phase !== "reveal" && state.phase !== "lastGuess", "too late to take a seat");
  seatOf(state, seat);
  return {
    ...state,
    seats: state.seats.map((s) => (s.id === seat ? { ...s, kind: "human" } : s)),
  };
}

const CALL_POINTS: Partial<Record<Phase, number>> = { clue1: 3, clue2: 2, discuss: 1 };

/** Watch mode: the audience locks in who they think the imposter is. */
export function lockCall(state: GameState, target: SeatId): GameState {
  assert(state.mode === "watch", "calls are watch-mode only");
  assert(!state.watchCall, "call already locked");
  assert(CALL_POINTS[state.phase] !== undefined, "calls close at the vote");
  seatOf(state, target);
  return { ...state, watchCall: { target, lockedAtPhase: state.phase } };
}

/** Points for a correct watch call: 3 before any clue round ends, 2 in round two, 1 in discussion. */
export function callPoints(state: GameState): number {
  if (!state.watchCall || !state.result) return 0;
  if (state.watchCall.target !== state.result.imposter) return 0;
  return CALL_POINTS[state.watchCall.lockedAtPhase] ?? 0;
}

/** Plan §02 scoring for one seat after reveal. */
export function scoreFor(state: GameState, seat: SeatId): number {
  const result = state.result;
  if (!result || state.phase !== "reveal") return 0;
  if (seat === result.imposter) {
    if (result.ejected !== seat) return 2;
    return state.lastGuess?.correct ? 3 : 0;
  }
  let score = result.winner === "civilian" ? 1 : 0;
  if (state.votes.find((v) => v.seat === seat)?.target === result.imposter) score += 1;
  return score;
}

/**
 * Grudge changes after a game (plan §07): +1 for a persona the human voted for while it
 * was innocent; reset for a persona that voted for the human when the human was the imposter.
 */
export function grudgeChanges(state: GameState): Partial<Record<PersonaId, number | "reset">> {
  const human = humanSeat(state);
  const result = state.result;
  if (!human || !result) return {};
  const changes: Partial<Record<PersonaId, number | "reset">> = {};
  const humanVote = state.votes.find((v) => v.seat === human)?.target;
  for (const seat of state.seats) {
    if (!seat.persona) continue;
    if (humanVote === seat.id && seat.role === "civilian") changes[seat.persona] = 1;
    const theirVote = state.votes.find((v) => v.seat === seat.id)?.target;
    if (result.imposter === human && theirVote === human) changes[seat.persona] = "reset";
  }
  return changes;
}
