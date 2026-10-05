import { describe, expect, it } from "vitest";
import {
  applyClue,
  applyGuess,
  applyMessage,
  applyVote,
  callPoints,
  createGame,
  endDiscussion,
  grudgeChanges,
  imposterOf,
  lockCall,
  messagesLeft,
  nextClueSeat,
  resolveVote,
  scoreFor,
  takeSeat,
  type CreateGameInput,
} from "./game";
import { guessMatches, scrubSecret, validateClue, validateVote } from "./validate";
import { publicView, seatView } from "./view";
import { WORD_SETS, seededRandom, todaySeed, wordSetForSeed } from "./words";
import type { GameState, SeatId } from "./types";

const PLAY: CreateGameInput = {
  mode: "play",
  personas: ["juno", "biscuit", "marlowe"],
  playerId: "player-1",
  seed: "2026-10-05",
  id: "g1",
  now: 0,
};

function withImposter(state: GameState, imposter: SeatId): GameState {
  return { ...state, seats: state.seats.map((s) => ({ ...s, role: s.id === imposter ? "imposter" : "civilian" })) };
}

/** Plays both clue rounds with distinct safe clues. */
function playClues(state: GameState): GameState {
  const words = ["alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "golf", "hotel"];
  let s = state;
  while (nextClueSeat(s)) s = applyClue(s, { seat: nextClueSeat(s)!, word: words.shift()! });
  return s;
}

function toVote(state: GameState): GameState {
  return endDiscussion(playClues(state));
}

function voteAll(state: GameState, targets: Partial<Record<SeatId, SeatId>>): GameState {
  let s = state;
  for (const seat of s.seats) s = applyVote(s, { seat: seat.id, target: targets[seat.id]!, reason: "", confidence: 0.5 });
  return s;
}

describe("words", () => {
  it("has 30 sets, each with ≥3 decoys and ≥3 generic clues", () => {
    expect(WORD_SETS).toHaveLength(30);
    for (const set of WORD_SETS) {
      expect(set.decoys.length).toBeGreaterThanOrEqual(3);
      expect(set.generic.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("every generic clue is a valid civilian clue for its word", () => {
    for (const [i, set] of WORD_SETS.entries()) {
      const state = { ...createGame(PLAY), wordSet: { id: i, ...set } };
      for (const g of set.generic) expect(validateClue(state, g).ok, `${set.word}: ${g}`).toBe(true);
    }
  });

  it("no decoy shares a stem with its word", () => {
    for (const set of WORD_SETS) {
      for (const d of set.decoys) expect(d.slice(0, 4), `${set.word}/${d}`).not.toBe(set.word.slice(0, 4));
    }
  });

  it("date seeds walk the bank and number from launch day", () => {
    expect(wordSetForSeed("2026-10-05").id).toBe(1);
    expect(wordSetForSeed("2026-10-06").id).toBe(2);
    expect(wordSetForSeed("2026-10-05").word).not.toBe(wordSetForSeed("2026-10-06").word);
    expect(wordSetForSeed("practice-xyz").id).toBe(0);
  });

  it("todaySeed formats a local date", () => {
    expect(todaySeed(new Date(2026, 9, 5, 23, 30))).toBe("2026-10-05");
  });

  it("seededRandom is deterministic and in [0, 1)", () => {
    const a = seededRandom("x");
    const b = seededRandom("x");
    for (let i = 0; i < 50; i++) {
      const n = a();
      expect(n).toBe(b());
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(1);
    }
  });
});

describe("createGame", () => {
  it("deals exactly one imposter", () => {
    for (let i = 0; i < 50; i++) {
      const g = createGame({ ...PLAY, playerId: `p${i}` });
      expect(g.seats.filter((s) => s.role === "imposter")).toHaveLength(1);
    }
  });

  it("same seed + playerId → same roles and order", () => {
    const a = createGame(PLAY);
    const b = createGame(PLAY);
    expect(a.seats).toEqual(b.seats);
    expect(a.order).toEqual(b.order);
  });

  it("different playerId → different roles (over many samples)", () => {
    const imposters = new Set<SeatId>();
    for (let i = 0; i < 40; i++) imposters.add(imposterOf(createGame({ ...PLAY, playerId: `p${i}` })));
    expect(imposters.size).toBe(4);
  });

  it("same seed → same word set regardless of playerId", () => {
    expect(createGame(PLAY).wordSet).toEqual(createGame({ ...PLAY, playerId: "other" }).wordSet);
  });

  it("seats the human in play mode and four agents in watch mode", () => {
    expect(createGame(PLAY).seats.map((s) => s.kind)).toEqual(["human", "agent", "agent", "agent"]);
    const watch = createGame({ ...PLAY, mode: "watch", personas: ["juno", "biscuit", "marlowe", "rook"] });
    expect(watch.seats.every((s) => s.kind === "agent")).toBe(true);
  });

  it("rejects the wrong lineup size", () => {
    expect(() => createGame({ ...PLAY, personas: ["juno"] })).toThrow();
  });
});

describe("clue rounds", () => {
  it("follows turn order, rotates after round one, then opens discussion", () => {
    const g = createGame(PLAY);
    const first = g.order;
    let s = g;
    for (const seat of first) {
      expect(nextClueSeat(s)).toBe(seat);
      s = applyClue(s, { seat, word: `w${"abcd"[first.indexOf(seat)]}x` });
    }
    expect(s.phase).toBe("clue2");
    expect(s.order).toEqual([...first.slice(1), first[0]]);
    s = playClues(s);
    expect(s.phase).toBe("discuss");
    expect(s.clues).toHaveLength(8);
  });

  it("refuses a clue out of turn", () => {
    const g = createGame(PLAY);
    const wrong = g.order[1];
    expect(() => applyClue(g, { seat: wrong, word: "hello" })).toThrow();
  });
});

describe("validateClue", () => {
  const g = withImposter(createGame(PLAY), "juno"); // word: waffle on 2026-10-05
  it("uses the expected word for the fixture", () => expect(g.wordSet.word).toBe("waffle"));
  it("rejects the secret word", () => expect(validateClue(g, "Waffle", "you")).toEqual({ ok: false, reason: "That's the word." }));
  it("rejects a word sharing the first 4 letters with the secret word", () => {
    expect(validateClue(g, "waffles", "you").ok).toBe(false);
    expect(validateClue(g, "waff-iron", "you").ok).toBe(false);
  });
  it("rejects a clue already given this game", () => {
    const s = applyClue(g, { seat: g.order[0], word: "syrup" });
    expect(validateClue(s, "SYRUP", "you")).toEqual({ ok: false, reason: "Someone already said that." });
  });
  it("rejects multi-word input", () => expect(validateClue(g, "belgian style", "you").ok).toBe(false));
  it("rejects digits and punctuation", () => expect(validateClue(g, "syrup!", "you").ok).toBe(false));
  it("accepts hyphenated words", () => expect(validateClue(g, "deep-fried", "you")).toEqual({ ok: true, clue: "deep-fried" }));
  it("does not refuse the imposter's clue for being close to a word it doesn't know", () => {
    expect(validateClue(g, "waffle", "juno").ok).toBe(true);
  });
});

describe("discussion", () => {
  it("caps agent messages at two and trims to 140 chars", () => {
    let s = playClues(createGame(PLAY));
    s = applyMessage(s, { seat: "juno", text: "x".repeat(200) });
    expect(s.messages[0].text).toHaveLength(140);
    s = applyMessage(s, { seat: "juno", text: "again" });
    expect(messagesLeft(s, "juno")).toBe(0);
    expect(() => applyMessage(s, { seat: "juno", text: "third" })).toThrow();
  });
});

describe("resolveVote", () => {
  it("ejects the plurality target", () => {
    const g = toVote(withImposter(createGame(PLAY), "marlowe"));
    const s = resolveVote(voteAll(g, { you: "biscuit", juno: "biscuit", biscuit: "juno", marlowe: "biscuit" }));
    expect(s.result).toMatchObject({ ejected: "biscuit", winner: "imposter" });
    expect(s.phase).toBe("reveal");
  });

  it("ejects no one on a tie, and the imposter wins", () => {
    const g = toVote(withImposter(createGame(PLAY), "marlowe"));
    const s = resolveVote(voteAll(g, { you: "marlowe", juno: "marlowe", biscuit: "juno", marlowe: "juno" }));
    expect(s.result).toMatchObject({ ejected: undefined, winner: "imposter" });
  });

  it("never accepts a self-vote", () => {
    const g = toVote(createGame(PLAY));
    expect(validateVote(g, "juno", "juno")).toBe(false);
    expect(() => applyVote(g, { seat: "juno", target: "juno", reason: "", confidence: 1 })).toThrow();
  });

  it("moves to lastGuess when the imposter is ejected, else reveal", () => {
    const g = toVote(withImposter(createGame(PLAY), "marlowe"));
    const caught = resolveVote(voteAll(g, { you: "marlowe", juno: "marlowe", biscuit: "marlowe", marlowe: "juno" }));
    expect(caught.phase).toBe("lastGuess");
  });

  it("a right last guess steals the win; a wrong one loses", () => {
    const g = toVote(withImposter(createGame(PLAY), "marlowe"));
    const caught = resolveVote(voteAll(g, { you: "marlowe", juno: "marlowe", biscuit: "marlowe", marlowe: "juno" }));
    expect(applyGuess(caught, "Waffles").result?.winner).toBe("imposter");
    expect(applyGuess(caught, "pancake").result?.winner).toBe("civilian");
  });
});

describe("scoring and grudges", () => {
  it("scores civilians and the imposter per plan §02", () => {
    const g = toVote(withImposter(createGame(PLAY), "marlowe"));
    const caught = resolveVote(voteAll(g, { you: "marlowe", juno: "biscuit", biscuit: "marlowe", marlowe: "juno" }));
    const lost = applyGuess(caught, "pancake");
    expect(scoreFor(lost, "you")).toBe(2);
    expect(scoreFor(lost, "juno")).toBe(1);
    expect(scoreFor(lost, "marlowe")).toBe(0);
    expect(scoreFor(applyGuess(caught, "waffle"), "marlowe")).toBe(3);
  });

  it("adds a grudge when you vote out an innocent persona", () => {
    const g = toVote(withImposter(createGame(PLAY), "juno"));
    const s = resolveVote(voteAll(g, { you: "marlowe", juno: "marlowe", biscuit: "marlowe", marlowe: "you" }));
    expect(grudgeChanges(s)).toEqual({ marlowe: 1 });
  });

  it("resets a grudge when that persona catches you", () => {
    const g = toVote(withImposter(createGame(PLAY), "you"));
    const s = resolveVote(voteAll(g, { you: "juno", juno: "you", biscuit: "you", marlowe: "you" }));
    expect(grudgeChanges(applyGuess(s, "x"))).toMatchObject({ juno: "reset", biscuit: "reset", marlowe: "reset" });
  });
});

describe("watch mode", () => {
  const WATCH: CreateGameInput = { ...PLAY, mode: "watch", personas: ["juno", "biscuit", "marlowe", "rook"] };
  it("scores an early correct call higher", () => {
    let g = withImposter(createGame(WATCH), "rook");
    g = lockCall(g, "rook");
    expect(() => lockCall(g, "juno")).toThrow();
    const s = resolveVote(voteAll(toVote(g), { juno: "biscuit", biscuit: "juno", marlowe: "biscuit", rook: "biscuit" }));
    expect(callPoints(s)).toBe(3);
  });

  it("scores a call at the phase the viewer saw, at most one behind the server", () => {
    const g = toVote(withImposter(createGame(WATCH), "rook"));
    expect(lockCall(g, "rook", "discuss").watchCall?.lockedAtPhase).toBe("discuss");
    expect(() => lockCall(g, "rook", "clue1")).toThrow("Calls closed at the vote.");
    expect(() => lockCall(g, "rook")).toThrow("Calls closed at the vote.");
    // A call that waited behind a streaming turn is judged by the phase it arrived in.
    expect(lockCall(g, "rook", "clue2", "discuss").watchCall?.lockedAtPhase).toBe("clue2");
    expect(() => lockCall(g, "rook", "clue1", "discuss")).toThrow("Calls closed at the vote.");
    const early = withImposter(createGame(WATCH), "rook");
    expect(lockCall(early, "rook", "discuss").watchCall?.lockedAtPhase).toBe("clue1");
  });

  it("lets you take one seat", () => {
    const g = takeSeat(createGame(WATCH), "rook");
    expect(g.seats.find((s) => s.id === "rook")?.kind).toBe("human");
    expect(() => takeSeat(g, "juno")).toThrow();
  });
});

describe("seatView", () => {
  it("imposter view has word === null", () => {
    const g = withImposter(createGame(PLAY), "juno");
    expect(seatView(g, "juno").word).toBeNull();
    expect(seatView(g, "biscuit").word).toBe("waffle");
  });

  it("JSON.stringify(seatView(imposter)) does not contain the secret word", () => {
    for (const set of WORD_SETS) {
      for (const imposter of ["you", "juno", "biscuit", "marlowe"] as SeatId[]) {
        const g = playClues(withImposter({ ...createGame(PLAY), wordSet: { id: 1, ...set } }, imposter));
        const json = JSON.stringify(seatView(g, imposter)).toLowerCase();
        expect(json, `${set.word} leaked to ${imposter}`).not.toContain(set.word);
      }
    }
  });

  it("carries persona memory and grudges", () => {
    const g = createGame({ ...PLAY, memory: { marlowe: ["voted me out"] }, grudges: { marlowe: 3 } });
    expect(seatView(g, "marlowe")).toMatchObject({ memoryOfHuman: ["voted me out"], grudge: 3 });
  });
});

describe("publicView", () => {
  it("omits traces, roles, and other votes before reveal", () => {
    let g = toVote(withImposter(createGame(PLAY), "juno"));
    g = { ...g, traces: [{ seat: "juno", phase: "clue1", at: 0, privateNote: "x", suspicion: {}, model: "m", latencyMs: 1 }] };
    g = applyVote(g, { seat: "biscuit", target: "you", reason: "", confidence: 1 });
    const v = publicView(g, "you");
    expect(v.traces).toBeUndefined();
    expect(v.result).toBeUndefined();
    expect(v.votes).toHaveLength(0);
    expect(JSON.stringify(v)).not.toContain("imposter\"");
  });

  it("hides the word from an imposter viewer and shows it to a civilian", () => {
    const g = withImposter(createGame(PLAY), "you");
    expect(publicView(g, "you").word).toBeUndefined();
    expect(publicView(g, "you").yourRole).toBe("imposter");
    expect(publicView(withImposter(g, "juno"), "you").word).toBe("waffle");
  });

  it("includes word, result, and traces after reveal", () => {
    const g = toVote(withImposter(createGame(PLAY), "you"));
    const s = resolveVote(voteAll(g, { you: "juno", juno: "biscuit", biscuit: "marlowe", marlowe: "juno" }));
    const v = publicView(s, "you");
    expect(v.word).toBe("waffle");
    expect(v.result?.imposter).toBe("you");
    expect(v.traces).toEqual([]);
  });

  it("includes the word in watch mode before reveal", () => {
    const g = createGame({ ...PLAY, mode: "watch", personas: ["juno", "biscuit", "marlowe", "rook"] });
    expect(publicView(g, "audience").word).toBe("waffle");
    expect(publicView(g, "audience").yourRole).toBeUndefined();
  });
});

describe("guessMatches and scrubSecret", () => {
  const set = wordSetForSeed("2026-10-05");
  it("matches case, spacing, and plurals", () => {
    expect(guessMatches(set, " WAFFLES ")).toBe(true);
    expect(guessMatches(set, "pancake")).toBe(false);
    expect(guessMatches(set, "")).toBe(false);
  });
  it("scrubs the word and its plural from public text", () => {
    const g = createGame(PLAY);
    expect(scrubSecret(g, "Waffles are good, I love a waffle.")).toBe("••• are good, I love a •••.");
  });
});
