import { describe, expect, it } from "vitest";
import {
  applyClue,
  applyGuess,
  applyVote,
  callPoints as engineCallPoints,
  createGame,
  endDiscussion,
  grudgeChanges as engineGrudgeChanges,
  lockCall,
  nextClueSeat,
  resolveVote,
  scoreFor,
  type CreateGameInput,
} from "@/engine/game";
import type { GameState, SeatId } from "@/engine/types";
import { publicView } from "@/engine/view";
import { callPoints, grudgeChanges, scoreOf } from "./outcome";

/**
 * outcome.ts restates the engine's scoring and grudge rules from a PublicView because the
 * client must not import game.ts (it pulls in the word bank). This pins the two together.
 */

const PLAY: CreateGameInput = { mode: "play", personas: ["juno", "biscuit", "marlowe"], playerId: "p", seed: "2026-10-05", id: "o", now: 0 };
const WATCH: CreateGameInput = { mode: "watch", personas: ["juno", "biscuit", "marlowe", "rook"], playerId: "p", seed: "2026-10-05", id: "ow", now: 0 };

function withImposter(state: GameState, imposter: SeatId): GameState {
  return { ...state, seats: state.seats.map((s) => ({ ...s, role: s.id === imposter ? "imposter" : "civilian" })) };
}

function finish(state: GameState, targets: Partial<Record<SeatId, SeatId>>, guess = "nope"): GameState {
  const words = ["alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "golf", "hotel"];
  let s = state;
  while (nextClueSeat(s)) s = applyClue(s, { seat: nextClueSeat(s)!, word: words.shift()! });
  s = endDiscussion(s);
  for (const seat of s.seats) s = applyVote(s, { seat: seat.id, target: targets[seat.id]!, reason: "", confidence: 0.5 });
  s = resolveVote(s);
  if (s.phase === "lastGuess") s = applyGuess(s, guess);
  return s;
}

describe("outcome mirrors the engine", () => {
  const g = createGame(PLAY);
  const cases: [string, GameState][] = [
    ["civilian human catches the imposter", finish(withImposter(g, "juno"), { you: "juno", juno: "you", biscuit: "juno", marlowe: "juno" })],
    ["civilian human votes an innocent, imposter escapes", finish(withImposter(g, "juno"), { you: "biscuit", juno: "biscuit", biscuit: "you", marlowe: "biscuit" })],
    ["tie, no one leaves", finish(withImposter(g, "you"), { you: "juno", juno: "biscuit", biscuit: "juno", marlowe: "biscuit" })],
    ["human imposter caught, guesses right", finish(withImposter(g, "you"), { you: "juno", juno: "you", biscuit: "you", marlowe: "you" }, g.wordSet.word)],
    ["human imposter caught, guesses wrong", finish(withImposter(g, "you"), { you: "juno", juno: "you", biscuit: "you", marlowe: "you" })],
  ];

  for (const [name, state] of cases) {
    it(`scores and grudges: ${name}`, () => {
      expect(state.phase).toBe("reveal");
      const view = publicView(state, "you");
      expect(scoreOf(view)).toBe(scoreFor(state, "you"));
      expect(grudgeChanges(view)).toEqual(engineGrudgeChanges(state));
    });
  }

  it("scores a watch call like the engine", () => {
    const called = lockCall(withImposter(createGame(WATCH), "rook"), "rook", "clue1");
    const right = finish(called, { juno: "rook", biscuit: "rook", marlowe: "rook", rook: "juno" });
    expect(callPoints(publicView(right, "audience"))).toBe(engineCallPoints(right));
    expect(callPoints(publicView(right, "audience"))).toBe(3);
    const wrong = finish(lockCall(withImposter(createGame(WATCH), "juno"), "rook", "discuss"), { juno: "rook", biscuit: "rook", marlowe: "rook", rook: "juno" });
    expect(callPoints(publicView(wrong, "audience"))).toBe(engineCallPoints(wrong));
    expect(grudgeChanges(publicView(wrong, "audience"))).toEqual(engineGrudgeChanges(wrong));
  });
});
