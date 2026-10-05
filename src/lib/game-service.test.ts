import { describe, expect, it } from "vitest";
import type { ModelCall } from "@/agents/act";
import { CivilianClueMove, DiscussMove, GuessMove, ImposterClueMove, VoteMove } from "@/agents/schemas";
import type { GameEvent } from "@/engine/types";
import { advance, create } from "./game-service";
import { readEvents } from "./sse";
import { getGame } from "./store";

/**
 * The request path with a scripted model: the per-game lock, the re-apply inside it, the
 * 400-before-stream contract and the final view event. No network.
 */

function letters(n: number): string {
  let s = "";
  do {
    s = String.fromCharCode(97 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return `zq${s}`;
}

function scripted(): ModelCall {
  let n = 0;
  return async ({ schema }) => {
    const s = schema as unknown;
    const suspicion = [{ seat: "juno", p: 0.5 }];
    let output: unknown;
    if (s === CivilianClueMove) output = { candidates: [letters(n++), letters(n++), letters(n++)], privateNote: "n", suspicion };
    else if (s === ImposterClueMove) output = { wordGuesses: [{ word: "pancake", p: 0.6 }], clue: letters(n++), privateNote: "n", suspicion };
    else if (s === DiscussMove) output = { text: `message ${n++}`, privateNote: "n", suspicion };
    else if (s === VoteMove) output = { target: "juno", reason: "felt off", confidence: 0.7, privateNote: "n", suspicion };
    else if (s === GuessMove) output = { guess: "pancake", privateNote: "n" };
    return { output: output as never };
  };
}

async function events(res: Response): Promise<GameEvent[]> {
  const out: GameEvent[] = [];
  for await (const e of readEvents(res)) out.push(e);
  return out;
}

const types = (es: GameEvent[], type: GameEvent["type"]) => es.filter((e) => e.type === type);

describe("game service", () => {
  it("serializes concurrent phase requests, one phase each, and ends every stream with a view", async () => {
    const g = create({ mode: "watch", playerId: "t", seed: "svc-watch" });
    const call = scripted();
    const opts = { call, rand: () => 0.99 };
    const [a, b] = await Promise.all([advance(g.id, undefined, opts), advance(g.id, undefined, opts)]);
    expect(a.status).toBe(200);
    expect(a.headers.get("content-type")).toContain("text/event-stream");
    const ea = await events(a);
    const eb = await events(b);
    expect(types(ea, "error")).toEqual([]);
    expect(types(eb, "error")).toEqual([]);
    expect(ea.at(-1)?.type).toBe("view");
    expect(eb.at(-1)?.type).toBe("view");
    // The first request played round one, the second round two; neither ran past its phase.
    expect(types(ea, "clue")).toHaveLength(4);
    expect(types(eb, "clue")).toHaveLength(4);
    expect(types(ea, "phase").map((e) => (e as { phase: string }).phase)).toEqual(["clue2"]);
    expect(types(eb, "phase").map((e) => (e as { phase: string }).phase)).toEqual(["discuss"]);
    expect(getGame(g.id)?.phase).toBe("discuss");
  });

  it("refuses an invalid clue before streaming and drops a move that lost the race", async () => {
    const g = create({ mode: "play", playerId: "t", seed: "svc-play" });
    const opts = { call: scripted() };
    const first = await events(await advance(g.id, undefined, opts));
    expect(first.at(-1)?.type).toBe("view");
    expect(first).toContainEqual({ type: "waiting", seat: "you", for: "clue" });

    const bad = await advance(g.id, { type: "clue", clue: "two words" }, opts);
    expect(bad.status).toBe(400);
    expect(await bad.json()).toEqual({ error: "One word only." });

    // A double-tapped clue: the second request re-validates inside the lock and loses, but the
    // table is fine, so it streams the view instead of an error.
    const move = { type: "clue" as const, clue: "zqhuman" };
    const [r1, r2] = await Promise.all([advance(g.id, move, opts), advance(g.id, move, opts)]);
    expect([r1.status, r2.status]).toEqual([200, 200]);
    const e1 = await events(r1);
    const e2 = await events(r2);
    expect(types(e1, "error")).toEqual([]);
    expect(types(e2, "error")).toEqual([]);
    expect(e2.at(-1)?.type).toBe("view");
    expect(types(e1, "clue").filter((e) => (e as { clue: { seat: string } }).clue.seat === "you")).toHaveLength(1);
    expect(types(e2, "clue").filter((e) => (e as { clue: { seat: string } }).clue.seat === "you")).toHaveLength(0);
    expect(getGame(g.id)?.clues.filter((c) => c.word === "zqhuman")).toHaveLength(1);
  });

  it("answers a missing table with 404 before any stream", async () => {
    const res = await advance("nope");
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Table reset. Deal again." });
  });
});
