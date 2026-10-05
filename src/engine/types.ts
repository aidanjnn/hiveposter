/**
 * Shared types for Imposter: The Table.
 *
 * This is the contract between the engine, the agents, the routes, and the UI.
 * Everything else imports from here. See plan §04 (Data model).
 */

export type SeatId = "you" | "juno" | "biscuit" | "marlowe" | "rook";
export type PersonaId = "juno" | "biscuit" | "marlowe" | "rook";
export type Role = "civilian" | "imposter";
export type Mode = "play" | "watch";

export type Phase =
  | "lobby"
  | "deal"
  | "clue1"
  | "clue2"
  | "discuss"
  | "vote"
  | "lastGuess"
  | "reveal";

export interface WordSet {
  /** Day index → share card "#142". */
  id: number;
  category: string;
  word: string;
  /** Same-category near misses so the imposter has real options. */
  decoys: string[];
  /** Safe fallback clues when an agent's clue is rejected twice. */
  generic: string[];
}

export interface Seat {
  id: SeatId;
  kind: "human" | "agent";
  persona?: PersonaId;
  /** Server-only until reveal. */
  role: Role;
}

export interface Clue {
  seat: SeatId;
  round: 1 | 2;
  word: string;
  /** Set when the agent's clue was rejected twice and a generic clue was used. */
  fallback?: boolean;
}

export interface Message {
  seat: SeatId;
  text: string;
  at: number;
  replyTo?: SeatId;
}

export interface Vote {
  seat: SeatId;
  target: SeatId;
  reason: string;
  /** 0..1 */
  confidence: number;
}

/** One entry per agent turn. Powers Brain Replay. Server-only until reveal. */
export interface AgentTrace {
  seat: SeatId;
  phase: Phase;
  at: number;
  /** ≤ 200 chars, the agent's real thinking. */
  privateNote: string;
  /** 0..1 per other seat. */
  suspicion: Partial<Record<SeatId, number>>;
  /** Imposter only: candidate words → probability. */
  wordGuesses?: Record<string, number>;
  model: string;
  latencyMs: number;
  retried?: boolean;
  /** Chaos knob fired: voted for the second suspect. */
  hunch?: boolean;
}

export interface GameResult {
  imposter: SeatId;
  ejected?: SeatId;
  winner: Role;
}

export interface GameState {
  id: string;
  mode: Mode;
  seed: string;
  wordSet: WordSet;
  seats: Seat[];
  /** Turn order, rotated by one each clue round. */
  order: SeatId[];
  phase: Phase;
  clues: Clue[];
  messages: Message[];
  votes: Vote[];
  lastGuess?: { word: string; correct: boolean };
  traces: AgentTrace[];
  /** Watch mode: the audience's prediction. */
  watchCall?: { target: SeatId; lockedAtPhase: Phase };
  result?: GameResult;
  /** Persona memory notes about the human, keyed by persona. */
  memory: Partial<Record<PersonaId, string[]>>;
  /** Games in a row the human voted this persona out while it was innocent. */
  grudges: Partial<Record<PersonaId, number>>;
  createdAt: number;
}

/** What the client may see. Derived from GameState, never stored. */
export interface PublicView {
  id: string;
  mode: Mode;
  phase: Phase;
  category: string;
  /** Present only if you are a civilian, or in watch mode. */
  word?: string;
  yourRole?: Role;
  seats: { id: SeatId; kind: Seat["kind"]; persona?: PersonaId }[];
  order: SeatId[];
  clues: Clue[];
  messages: Message[];
  /** Filled as revealed. */
  votes: Vote[];
  lastGuess?: GameState["lastGuess"];
  watchCall?: GameState["watchCall"];
  result?: GameResult;
  /** Only after reveal. */
  traces?: AgentTrace[];
}

/** What a seat is allowed to know when it is asked to act. The model sees exactly this. */
export interface SeatView {
  seat: SeatId;
  role: Role;
  category: string;
  /** null for the imposter. This is the guardrail. */
  word: string | null;
  players: SeatId[];
  order: SeatId[];
  clues: [SeatId, 1 | 2, string][];
  messages: Message[];
  myPriorNotes: string[];
  myPriorSuspicion: Partial<Record<SeatId, number>>;
  memoryOfHuman: string[];
  grudge: number;
}

/** Human moves accepted by POST /api/game/[id]/human. */
export type HumanMove =
  | { type: "clue"; clue: string }
  | { type: "message"; text: string; replyTo?: SeatId }
  | { type: "sure" }
  | { type: "vote"; target: SeatId }
  | { type: "guess"; word: string }
  | { type: "call"; target: SeatId }
  | { type: "takeSeat"; seat: SeatId };

/** Events streamed from the phase route as SSE. */
export type GameEvent =
  | { type: "clue"; clue: Clue }
  | { type: "message"; message: Message }
  | { type: "vote"; vote: Vote }
  | { type: "suspicion"; table: Partial<Record<SeatId, number>>; reason: string }
  | { type: "waiting"; seat: SeatId; for: "clue" | "message" | "vote" | "guess" }
  | { type: "phase"; phase: Phase; view: PublicView }
  | { type: "error"; message: string };
