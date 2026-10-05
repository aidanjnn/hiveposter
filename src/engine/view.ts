import type { GameState, PublicView, SeatId, SeatView } from "./types";

const RECENT_MESSAGES = 12;

/** Last suspicion vector this seat recorded, for blending in act(). */
export function lastSuspicion(state: GameState, seat: SeatId): SeatView["myPriorSuspicion"] {
  for (let i = state.traces.length - 1; i >= 0; i--) {
    if (state.traces[i].seat === seat) return state.traces[i].suspicion;
  }
  return {};
}

/**
 * Plan §06. The only thing a model ever sees.
 * `word` is null for the imposter. A test asserts JSON.stringify(seatView) never contains the word.
 */
export function seatView(state: GameState, seat: SeatId): SeatView {
  const me = state.seats.find((s) => s.id === seat);
  if (!me) throw new Error(`no seat ${seat}`);
  return {
    seat,
    role: me.role,
    category: state.wordSet.category,
    word: me.role === "civilian" ? state.wordSet.word : null,
    players: state.seats.map((s) => s.id),
    order: state.order,
    clues: state.clues.map((c) => [c.seat, c.round, c.word]),
    messages: state.messages.slice(-RECENT_MESSAGES),
    myPriorNotes: state.traces.filter((t) => t.seat === seat).map((t) => t.privateNote),
    myPriorSuspicion: lastSuspicion(state, seat),
    memoryOfHuman: me.persona ? (state.memory[me.persona] ?? []) : [],
    grudge: me.persona ? (state.grudges[me.persona] ?? 0) : 0,
  };
}

/**
 * What the client may see. Roles and traces stay on the server until reveal; votes stay
 * hidden until everyone has voted. In watch mode the viewer is the audience: they see
 * the word but not who the imposter is.
 */
export function publicView(state: GameState, viewer: SeatId | "audience"): PublicView {
  const revealed = state.phase === "reveal";
  const votesOut = revealed || state.phase === "lastGuess";
  const me = viewer === "audience" ? undefined : state.seats.find((s) => s.id === viewer);
  const seeWord = revealed || viewer === "audience" || me?.role === "civilian";

  const view: PublicView = {
    id: state.id,
    mode: state.mode,
    phase: state.phase,
    seed: state.seed,
    setId: state.wordSet.id,
    category: state.wordSet.category,
    seats: state.seats.map((s) => ({ id: s.id, kind: s.kind, persona: s.persona })),
    order: state.order,
    clues: state.clues,
    messages: state.messages,
    votes: votesOut ? state.votes : state.votes.filter((v) => v.seat === viewer),
  };
  if (seeWord) view.word = state.wordSet.word;
  if (me) view.yourRole = me.role;
  if (state.lastGuess) view.lastGuess = state.lastGuess;
  if (state.watchCall) view.watchCall = state.watchCall;
  if (revealed) {
    view.result = state.result;
    view.traces = state.traces;
  } else if (state.phase === "lastGuess" && state.result?.ejected) {
    // The ejected seat is public once votes are counted; the verdict waits for the guess.
    view.result = { imposter: state.result.ejected, ejected: state.result.ejected, winner: "civilian" };
  }
  return view;
}

/** Puzzle number and category, for share cards and headers. */
export function setLabel(state: Pick<GameState, "wordSet">): string {
  const n = state.wordSet.id > 0 ? `#${state.wordSet.id}` : "practice";
  return `${n} · ${state.wordSet.category}`;
}
