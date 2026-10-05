import { describe, expect, it } from "vitest";
import { createGame } from "@/engine/game";
import type { GameEvent, GameState, SeatId } from "@/engine/types";
import { actClue, blendSuspicion, candidateIndex, type ModelCall } from "./act";
import { gameSummary, mergeNotes } from "./memory";
import { PERSONAS } from "./personas";
import { seatView } from "@/engine/view";
import { applyHumanMove, MoveError, runUntilHuman } from "./runner";
import { CivilianClueMove, DiscussMove, GuessMove, ImposterClueMove, VoteMove } from "./schemas";

const SEATS: SeatId[] = ["you", "juno", "biscuit", "marlowe", "rook"];

function letters(n: number): string {
  let s = "";
  do {
    s = String.fromCharCode(97 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return `zq${s}`;
}

/** A scripted model: deterministic, schema-shaped answers, and a log of every prompt. */
function scripted() {
  let n = 0;
  const prompts: { model: string; system: string; prompt: string }[] = [];
  const call: ModelCall = async ({ model, system, prompt, schema: s }) => {
    prompts.push({ model, system, prompt });
    const schema = s as unknown;
    const suspicion = SEATS.map((seat, i) => ({ seat, p: ((i + n) % 4) / 4 }));
    let output: unknown;
    if (schema === CivilianClueMove) output = { candidates: [letters(n++), letters(n++), letters(n++)], privateNote: "civ note", suspicion };
    else if (schema === ImposterClueMove) output = { wordGuesses: [{ word: "pancake", p: 0.6 }], clue: letters(n++), privateNote: "imp note", suspicion };
    else if (schema === DiscussMove) output = { text: `message ${n++}`, privateNote: "talk", suspicion };
    else if (schema === VoteMove) output = { target: "juno", reason: "felt off", confidence: 0.7, privateNote: "vote", suspicion };
    else if (schema === GuessMove) output = { guess: "pancake", privateNote: "guess" };
    return { output: output as never, costUsd: 0.001 };
  };
  return { call, prompts };
}

const failing: ModelCall = async () => {
  throw new Error("AI Gateway requires a valid credit card");
};

const WATCH = { mode: "watch" as const, personas: ["juno", "biscuit", "marlowe", "rook"] as const, playerId: "p", seed: "2026-10-05", id: "w", now: 0 };
const PLAY = { mode: "play" as const, personas: ["juno", "biscuit", "marlowe"] as const, playerId: "p", seed: "2026-10-05", id: "p", now: 0 };

function withImposter(state: GameState, imposter: SeatId): GameState {
  return { ...state, seats: state.seats.map((s) => ({ ...s, role: s.id === imposter ? "imposter" : "civilian" })) };
}

describe("act", () => {
  it("maps the specificity knob to a candidate index", () => {
    expect([1, 3, 4, 5.5, 7, 8, 10].map(candidateIndex)).toEqual([0, 0, 1, 1, 1, 2, 2]);
  });

  it("plays the knob's candidate: Juno the specific one, Biscuit the vague one", async () => {
    const g = withImposter(createGame({ ...WATCH, personas: [...WATCH.personas] }), "rook");
    const { call } = scripted();
    const juno = await actClue({ ...g, order: ["juno", "biscuit", "marlowe", "rook"] }, "juno", { call });
    expect(juno.move.word).toBe(letters(2));
    const { call: call2 } = scripted();
    const biscuit = await actClue({ ...g, order: ["biscuit", "juno", "marlowe", "rook"] }, "biscuit", { call: call2 });
    expect(biscuit.move.word).toBe(letters(0));
  });

  it("blends suspicion by update rate and drops self", () => {
    const g = createGame({ ...WATCH, personas: [...WATCH.personas] });
    const view = seatView(g, "juno");
    const out = blendSuspicion({ view, seat: "juno", persona: PERSONAS.juno }, [
      { seat: "biscuit", p: 1 },
      { seat: "juno", p: 1 },
      { seat: "marlowe", p: 7 },
    ]);
    expect(out.juno).toBeUndefined();
    expect(out.biscuit).toBeCloseTo(0.33 + (1 - 0.33) * 0.35, 2);
    expect(out.marlowe).toBeCloseTo(0.33 + (1 - 0.33) * 0.35, 2);
    expect(out.rook).toBe(0.33);
  });

  it("falls back to a generic clue when the model fails, flagged in the trace", async () => {
    const g = createGame({ ...WATCH, personas: [...WATCH.personas] });
    const seat = g.order[0];
    const r = await actClue(g, seat, { call: failing });
    expect(r.move.fallback).toBe(true);
    expect(r.trace.fallback).toBe(true);
    expect(g.wordSet.generic).toContain(r.move.word);
  });

  it("retries once when every candidate is invalid, then accepts", async () => {
    const g = withImposter(createGame({ ...WATCH, personas: [...WATCH.personas] }), "rook");
    let calls = 0;
    const call: ModelCall = async () => {
      calls++;
      const candidates = calls === 1 ? ["waffle", "waffles", "two words"] : ["syrup", "grid", "belgian"];
      return { output: { candidates, privateNote: "", suspicion: [] } as never };
    };
    const r = await actClue({ ...g, order: ["juno", "biscuit", "marlowe", "rook"] }, "juno", { call });
    expect(calls).toBe(2);
    expect(r.trace.retried).toBe(true);
    expect(r.move.word).toBe("belgian");
  });

  it("never puts the secret word in the imposter's prompts", async () => {
    for (const imposter of ["juno", "biscuit", "marlowe", "rook"] as SeatId[]) {
      const { call, prompts } = scripted();
      const g = withImposter(createGame({ ...WATCH, personas: [...WATCH.personas] }), imposter);
      const end = await runUntilHuman(g, { call, rand: () => 0.99 });
      expect(end.phase).toBe("reveal");
      const imposterModel = prompts.filter((p) => p.system.includes(`You are ${PERSONAS[imposter as "juno"].name},`));
      expect(imposterModel.length).toBeGreaterThan(0);
      for (const p of imposterModel) expect(`${p.system}\n${p.prompt}`.toLowerCase()).not.toContain("waffle");
    }
  });
});

describe("runner", () => {
  it("plays a whole watch game to reveal and streams events", async () => {
    const { call } = scripted();
    const events: GameEvent[] = [];
    const end = await runUntilHuman(createGame({ ...WATCH, personas: [...WATCH.personas] }), { call, emit: (e) => events.push(e), rand: () => 0.99 });
    expect(end.phase).toBe("reveal");
    expect(end.clues).toHaveLength(8);
    expect(end.votes).toHaveLength(4);
    expect(end.messages.length).toBeGreaterThanOrEqual(4);
    expect(events.filter((e) => e.type === "phase").map((e) => (e as { phase: string }).phase)).toEqual(
      expect.arrayContaining(["clue2", "discuss", "vote"]),
    );
    expect(events.some((e) => e.type === "suspicion")).toBe(true);
    expect(end.traces.every((t) => t.privateNote.length <= 200)).toBe(true);
  });

  it("finishes a watch game even when every model call fails", async () => {
    const end = await runUntilHuman(createGame({ ...WATCH, personas: [...WATCH.personas] }), { call: failing, rand: () => 0.5 });
    expect(end.phase).toBe("reveal");
    expect(end.traces.every((t) => t.fallback)).toBe(true);
  });

  it("stops for the human in play mode and resumes after their moves", async () => {
    const { call } = scripted();
    let s = createGame({ ...PLAY, personas: [...PLAY.personas] });
    const events: GameEvent[] = [];
    s = await runUntilHuman(s, { call, emit: (e) => events.push(e) });
    expect(events.at(-1)).toEqual({ type: "waiting", seat: "you", for: "clue" });

    s = await runUntilHuman(applyHumanMove(s, { type: "clue", clue: "belgian" }), { call });
    s = await runUntilHuman(applyHumanMove(s, { type: "clue", clue: "syrup" }), { call });
    expect(s.phase).toBe("discuss");
    const agentMessages = s.messages.length;
    expect(agentMessages).toBe(3);

    s = await runUntilHuman(applyHumanMove(s, { type: "message", text: "@marlowe what goes on toast" }), { call });
    expect(s.messages.at(-1)).toMatchObject({ seat: "marlowe", replyTo: "you" });

    s = await runUntilHuman(applyHumanMove(s, { type: "sure" }), { call });
    expect(s.phase).toBe("vote");
    expect(s.votes).toHaveLength(3);

    s = await runUntilHuman(applyHumanMove(s, { type: "vote", target: "juno" }), { call });
    expect(["reveal", "lastGuess"]).toContain(s.phase);
  });

  it("refuses human moves with a reason", () => {
    const s = createGame({ ...PLAY, personas: [...PLAY.personas] });
    const notMine = s.order[0] === "you" ? undefined : "It's not your turn.";
    if (notMine) expect(() => applyHumanMove(s, { type: "clue", clue: "syrup" })).toThrow(MoveError);
    const mine = { ...s, order: ["you", ...s.order.filter((x) => x !== "you")] as SeatId[] };
    expect(() => applyHumanMove(mine, { type: "clue", clue: "waffles" })).toThrow("Too close to the word.");
    expect(() => applyHumanMove(mine, { type: "vote", target: "juno" })).toThrow("Voting hasn't started.");
  });
});

describe("memory", () => {
  it("merges new notes first, dedupes, and caps at 10", () => {
    const existing = Array.from({ length: 10 }, (_, i) => `old ${i}`);
    const merged = mergeNotes(existing, ["new", "OLD 0"]);
    expect(merged[0]).toBe("new");
    expect(merged).toHaveLength(10);
    expect(merged.filter((n) => n.toLowerCase() === "old 0")).toHaveLength(1);
  });

  it("summarizes a revealed game from one persona's view", async () => {
    const { call } = scripted();
    const end = await runUntilHuman(createGame({ ...WATCH, personas: [...WATCH.personas] }), { call, rand: () => 0.99 });
    const { publicView } = await import("@/engine/view");
    const text = gameSummary("juno", publicView(end, "audience"));
    expect(text).toContain("Secret word: waffle");
    expect(text).toContain("Your private notes (Juno)");
  });
});
