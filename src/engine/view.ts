import type { GameState, PublicView, SeatId, SeatView } from "./types";

/**
 * Plan §06. The only thing a model ever sees.
 * `word` is null for the imposter. A test asserts JSON.stringify(seatView) never contains the word.
 */
export function seatView(state: GameState, seat: SeatId): SeatView {
  throw new Error("TODO(engine): seatView");
}

/**
 * What the client may see. Omits roles, the imposter's word, and traces until reveal.
 * In watch mode the word is included (the viewer is the audience) but roles are not.
 */
export function publicView(state: GameState, viewer: SeatId | "audience"): PublicView {
  throw new Error("TODO(engine): publicView");
}

/** Last suspicion vector this seat recorded, for blending in act(). */
export function lastSuspicion(state: GameState, seat: SeatId): SeatView["myPriorSuspicion"] {
  throw new Error("TODO(engine): lastSuspicion");
}
