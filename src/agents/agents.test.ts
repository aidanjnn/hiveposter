import { describe, expect, it, vi } from "vitest";
import { createGame } from "@/engine/game";
import type { GameEvent, GameState, SeatId } from "@/engine/types";
import { actClue, actVote, blendSuspicion, candidateIndex, clip, pace, type ModelCall } from "./act";
import { gameSummary, mergeNotes, summarizeForPersona } from "./memory";
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

function toVoteWatch(): GameState {
  const g = createGame({ ...WATCH, personas: [...WATCH.personas] });
  return { ...g, phase: "vote", traces: [] };
}

function withImposter(state: GameState, imposter: SeatId): GameState {
  return { ...state, seats: state.seats.map((s) => ({ ...s, role: s.id === imposter ? "imposter" : "civilian" })) };
}

describe("act", () => {
  it("paces Gemini calls to 14 a minute per model and leaves gateway ids alone", async () => {
    vi.useFakeTimers();
    try {
      let t = 0;
      const now = () => t;
      for (let i = 0; i < 14; i++) await pace("gemini-test-a", now);
      await pace("gemini-test-b", now);
      for (let i = 0; i < 30; i++) await pace("anthropic/claude-test", now);
      let done = false;
      const waiting = pace("gemini-test-a", now).then(() => (done = true));
      await vi.advanceTimersByTimeAsync(5_000);
      expect(done).toBe(false);
      t = 60_100;
      await vi.advanceTimersByTimeAsync(60_000);
      await waiting;
      expect(done).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("clips long text at a word boundary", () => {
    expect(clip("short", 140)).toBe("short");
    const long = "I'm at 55% on you, Biscuit, because food could fit anything at all in this category and you know it";
    const out = clip(long, 60);
    expect(out.length).toBeLessThanOrEqual(60);
    expect(out.endsWith("…")).toBe(true);
    expect(out).not.toMatch(/\s…$/);
    expect(long.startsWith(out.slice(0, -1))).toBe(true);
  });

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
  it("never streams a private note in watch mode", async () => {
    const { call } = scripted();
    const events: GameEvent[] = [];
    await runUntilHuman(createGame({ ...WATCH, personas: [...WATCH.personas] }), { call, emit: (e) => events.push(e), rand: () => 0.99 });
    const reads = events.filter((e) => e.type === "suspicion");
    expect(reads.length).toBeGreaterThan(0);
    for (const e of reads) expect(JSON.stringify(e)).not.toMatch(/civ note|imp note|talk|vote"|pancake/);
  });

  it("a hunch moves a top-suspect vote to the second suspect, never the reverse", async () => {
    const g = toVoteWatch();
    const call: ModelCall = async () => ({
      output: { target: "biscuit", reason: "r", confidence: 1, privateNote: "", suspicion: [{ seat: "biscuit", p: 1 }, { seat: "marlowe", p: 0.6 }, { seat: "rook", p: 0.1 }] } as never,
    });
    const hunch = await actVote(g, "juno", { call, rand: () => 0 });
    expect(hunch.move.target).toBe("marlowe");
    expect(hunch.trace.hunch).toBe(true);
    const second: ModelCall = async () => ({
      output: { target: "marlowe", reason: "r", confidence: 1, privateNote: "", suspicion: [{ seat: "biscuit", p: 1 }, { seat: "marlowe", p: 0.6 }, { seat: "rook", p: 0.1 }] } as never,
    });
    const kept = await actVote(g, "juno", { call: second, rand: () => 0 });
    expect(kept.move.target).toBe("marlowe");
    expect(kept.trace.hunch).toBeUndefined();
  });

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

  it("scrubs the secret word from human messages before any agent sees them", () => {
    const base = withImposter(createGame({ ...PLAY, personas: [...PLAY.personas] }), "juno");
    const s = applyHumanMove({ ...base, phase: "discuss" }, { type: "message", text: "obviously Waffles, @juno?" });
    expect(s.messages.at(-1)?.text).not.toMatch(/waffle/i);
    expect(JSON.stringify(seatView(s, "juno"))).not.toMatch(/waffle/i);
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

  it("keeps the secret word out of stored notes and the lobby line", async () => {
    const { call } = scripted();
    const end = await runUntilHuman(createGame({ ...WATCH, personas: [...WATCH.personas] }), { call, rand: () => 0.99 });
    const { publicView } = await import("@/engine/view");
    const leaky: ModelCall = async () => ({ output: { notes: ["said syrup for waffle"], lobbyLine: "Waffles again?" } as never, costUsd: 0 });
    const out = await summarizeForPersona("juno", publicView(end, "audience"), [], leaky);
    expect(JSON.stringify(out)).not.toMatch(/waffle/i);
  });
});
