import {
  allVoted,
  applyClue,
  applyGuess,
  applyMessage,
  applyVote,
  endDiscussion,
  humanSeat,
  lockCall,
  messagesLeft,
  nextClueSeat,
  resolveVote,
  seatOf,
  takeSeat,
} from "@/engine/game";
import { validateClue } from "@/engine/validate";
import { publicView } from "@/engine/view";
import type { AgentTrace, GameEvent, GameState, HumanMove, SeatId } from "@/engine/types";
import { actClue, actDiscuss, actLastGuess, actVote, type ActOptions } from "./act";
import { PERSONAS } from "./personas";

/**
 * Drives a game forward through agent turns until a human move is needed or the game is
 * over. Shared by the API routes (which stream the events) and the simulator (which
 * ignores them). Plan §05 phase rules, §08 event stream.
 */

export type Emit = (event: GameEvent) => void;

export interface RunOptions extends ActOptions {
  emit?: Emit;
  /** Return after the first phase change. Keeps each streamed request short; the client asks again. */
  onePhase?: boolean;
}

export class MoveError extends Error {}

function viewer(state: GameState): SeatId | "audience" {
  return humanSeat(state) ?? "audience";
}

function agents(state: GameState): SeatId[] {
  return state.seats.filter((s) => s.kind === "agent").map((s) => s.id);
}

function shuffled<T>(items: T[], rand: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function withTrace(state: GameState, trace: AgentTrace): GameState {
  return { ...state, traces: [...state.traces, trace] };
}

/** Table-average suspicion from each agent's latest vector. Watch mode streams it live. */
export function tableSuspicion(state: GameState): Partial<Record<SeatId, number>> {
  const latest = new Map<SeatId, AgentTrace>();
  for (const t of state.traces) latest.set(t.seat, t);
  const sums: Partial<Record<SeatId, number[]>> = {};
  for (const t of latest.values()) {
    for (const [seat, p] of Object.entries(t.suspicion) as [SeatId, number][]) (sums[seat] ??= []).push(p);
  }
  const out: Partial<Record<SeatId, number>> = {};
  for (const [seat, ps] of Object.entries(sums) as [SeatId, number[]][]) {
    out[seat] = Math.round((ps.reduce((a, b) => a + b, 0) / ps.length) * 100) / 100;
  }
  return out;
}

function emitTrace(state: GameState, trace: AgentTrace, emit?: Emit) {
  if (state.mode !== "watch" || !emit) return;
  const name = PERSONAS[seatOf(state, trace.seat).persona!].name;
  emit({ type: "suspicion", table: tableSuspicion(state), reason: `${name}: ${trace.privateNote}` });
}

/** The agent that should answer a human message: the one @mentioned, else the human's top target. */
function responder(state: GameState, text: string, replyTo?: SeatId): SeatId | undefined {
  const pool = agents(state).filter((s) => messagesLeft(state, s) > 0);
  if (replyTo && pool.includes(replyTo)) return replyTo;
  const lower = text.toLowerCase();
  const named = pool.find((s) => lower.includes(`@${s}`) || lower.includes(PERSONAS[seatOf(state, s).persona!].name.toLowerCase()));
  if (named) return named;
  // Otherwise whoever the table suspects most answers for themselves.
  const table = tableSuspicion(state);
  return [...pool].sort((a, b) => (table[b] ?? 0) - (table[a] ?? 0))[0];
}

async function runClues(state: GameState, opts: RunOptions): Promise<GameState> {
  let s = state;
  let seat = nextClueSeat(s);
  while (seat) {
    if (seatOf(s, seat).kind === "human") {
      opts.emit?.({ type: "waiting", seat, for: "clue" });
      return s;
    }
    const { move, trace } = await actClue(s, seat, opts);
    s = withTrace(applyClue(s, move), trace);
    opts.emit?.({ type: "clue", clue: s.clues[s.clues.length - 1] });
    emitTrace(s, trace, opts.emit);
    // Hand back at each round boundary so the caller emits the phase change.
    if (s.phase !== state.phase) return s;
    seat = nextClueSeat(s);
  }
  return s;
}

async function runDiscussion(state: GameState, opts: RunOptions): Promise<GameState> {
  let s = state;
  const rand = opts.rand ?? Math.random;
  const human = humanSeat(s);
  const opened = s.messages.some((m) => seatOf(s, m.seat).kind === "agent");

  if (!opened) {
    // Opening pass: every agent speaks once, computed in parallel, revealed in random order.
    const results = await Promise.all(agents(s).map((seat) => actDiscuss(s, seat, undefined, opts)));
    for (const { move, trace } of shuffled(results, rand)) {
      s = withTrace(applyMessage(s, move), trace);
      opts.emit?.({ type: "message", message: s.messages[s.messages.length - 1] });
      emitTrace(s, trace, opts.emit);
    }
  }

  if (!human) {
    if (!opened) {
      // Watch mode: one reply pass so accusations get answered, then vote.
      for (const seat of shuffled(agents(s), rand)) {
        const last = [...s.messages].reverse().find((m) => m.seat !== seat && (m.replyTo === seat || !m.replyTo));
        if (!last || messagesLeft(s, seat) <= 0) continue;
        const { move, trace } = await actDiscuss(s, seat, { seat: last.seat, text: last.text }, opts);
        s = withTrace(applyMessage(s, move), trace);
        opts.emit?.({ type: "message", message: s.messages[s.messages.length - 1] });
        emitTrace(s, trace, opts.emit);
      }
    }
    return endDiscussion(s);
  }

  // A human message that no agent has answered yet gets one reply.
  const last = s.messages[s.messages.length - 1];
  if (last && last.seat === human && opened) {
    const seat = responder(s, last.text, last.replyTo);
    if (seat) {
      const { move, trace } = await actDiscuss(s, seat, { seat: human, text: last.text }, opts);
      s = withTrace(applyMessage(s, { ...move, replyTo: human }), trace);
      opts.emit?.({ type: "message", message: s.messages[s.messages.length - 1] });
    }
  }
  opts.emit?.({ type: "waiting", seat: human, for: "message" });
  return s;
}

async function runVote(state: GameState, opts: RunOptions): Promise<GameState> {
  let s = state;
  const pending = agents(s).filter((seat) => !s.votes.some((v) => v.seat === seat));
  // Agents vote in parallel and can't see each other's votes. Hidden until resolved.
  const results = await Promise.all(pending.map((seat) => actVote(s, seat, opts)));
  for (const { move, trace } of results) s = withTrace(applyVote(s, move), trace);

  const human = humanSeat(s);
  if (human && !s.votes.some((v) => v.seat === human)) {
    opts.emit?.({ type: "waiting", seat: human, for: "vote" });
    return s;
  }
  s = resolveVote(s);
  for (const vote of s.votes) opts.emit?.({ type: "vote", vote });
  return s;
}

async function runLastGuess(state: GameState, opts: RunOptions): Promise<GameState> {
  const imposter = state.result!.imposter;
  if (seatOf(state, imposter).kind === "human") {
    opts.emit?.({ type: "waiting", seat: imposter, for: "guess" });
    return state;
  }
  const { move, trace } = await actLastGuess(state, imposter, opts);
  return applyGuess(withTrace(state, trace), move.word);
}

/** Advance through agent turns until a human must act or the game is revealed. */
export async function runUntilHuman(state: GameState, opts: RunOptions = {}): Promise<GameState> {
  let s = state;
  for (let guard = 0; guard < 20; guard++) {
    const before = s;
    switch (s.phase) {
      case "clue1":
      case "clue2":
        s = await runClues(s, opts);
        break;
      case "discuss":
        s = await runDiscussion(s, opts);
        break;
      case "vote":
        s = await runVote(s, opts);
        break;
      case "lastGuess":
        s = await runLastGuess(s, opts);
        break;
      default:
        break;
    }
    if (s.phase !== before.phase) opts.emit?.({ type: "phase", phase: s.phase, view: publicView(s, viewer(s)) });
    if (s.phase === "reveal" || s === before || s.phase === before.phase || opts.onePhase) break;
  }
  return s;
}

/**
 * Apply a human move after checking it is theirs to make. Throws MoveError with a
 * user-facing reason; the route turns that into a 400.
 */
export function applyHumanMove(state: GameState, move: HumanMove): GameState {
  const human = humanSeat(state);
  const fail = (reason: string): never => {
    throw new MoveError(reason);
  };

  switch (move.type) {
    case "takeSeat":
      if (humanSeat(state)) fail("You already have a seat.");
      if (state.phase === "lastGuess" || state.phase === "reveal") fail("Too late to take a seat.");
      return takeSeat(state, move.seat);
    case "call":
      if (state.watchCall) fail("Your call is already locked.");
      return lockCall(state, move.target, move.seenPhase);
  }

  if (!human) fail("Take a seat first.");
  const me = human!;
  switch (move.type) {
    case "clue": {
      if (nextClueSeat(state) !== me) fail("It's not your turn.");
      const check = validateClue(state, move.clue, me);
      if (!check.ok) fail(check.reason);
      return applyClue(state, { seat: me, word: move.clue });
    }
    case "message": {
      if (state.phase !== "discuss") fail("Discussion is over.");
      if (messagesLeft(state, me) <= 0) fail("You're out of messages. Tap I'm sure.");
      if (!move.text.trim()) fail("Say something.");
      return applyMessage(state, { seat: me, text: move.text, ...(move.replyTo ? { replyTo: move.replyTo } : {}) });
    }
    case "sure":
      if (state.phase !== "discuss") fail("Discussion is over.");
      return endDiscussion(state);
    case "vote":
      if (state.phase !== "vote") fail("Voting hasn't started.");
      if (move.target === me) fail("You can't vote for yourself.");
      if (state.votes.some((v) => v.seat === me)) fail("You already voted.");
      return applyVote(state, { seat: me, target: move.target, reason: "", confidence: 1 });
    case "guess":
      if (state.phase !== "lastGuess" || state.result?.imposter !== me) fail("No guess to make.");
      if (!move.word.trim()) fail("Guess a word.");
      return applyGuess(state, move.word);
  }
  return state;
}

export { allVoted };
