import { beforeEach, describe, expect, it } from "vitest";
import * as local from "./local";

/** localStorage stand-in: the module reads and writes through window.localStorage only. */
const store = new Map<string, string>();
const storage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
};

function iso(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function game(id: string, seed: string, mode: "play" | "watch" = "play"): local.GameSummary {
  return { id, mode, seed, setLabel: "", yourRole: "civilian", won: true, score: 1, at: 0 };
}

beforeEach(() => {
  store.clear();
  (globalThis as { window?: unknown }).window = { localStorage: storage, sessionStorage: storage };
});

describe("local history and streak", () => {
  it("records a game once", () => {
    expect(local.recordGame(game("a", iso(0)))).toBe(true);
    expect(local.recordGame(game("a", iso(0)))).toBe(false);
    expect(local.getHistory()).toHaveLength(1);
    expect(local.playedToday(iso(0))).toBe(true);
  });

  it("counts consecutive daily tables and keys on the table's date, not the clock", () => {
    local.recordGame(game("y", iso(-1)));
    expect(local.getStreak()).toEqual({ count: 1, lastPlayed: iso(-1) });
    local.recordGame(game("t", iso(0)));
    expect(local.getStreak().count).toBe(2);
    // A table dealt yesterday that ends after midnight counts for yesterday and never regresses today.
    local.recordGame(game("late", iso(-1)));
    expect(local.getStreak()).toEqual({ count: 2, lastPlayed: iso(0) });
  });

  it("credits a midnight-spanning game to the day it was dealt", () => {
    local.recordGame(game("late", iso(-1)));
    expect(local.getStreak()).toEqual({ count: 1, lastPlayed: iso(-1) });
  });

  it("restarts after a missed day and ignores practice and Watch", () => {
    local.recordGame(game("old", iso(-3)));
    local.recordGame(game("p", `practice-${Date.now()}`));
    local.recordGame(game("w", iso(0), "watch"));
    expect(local.getStreak().count).toBe(0);
    expect(local.playedToday(iso(0))).toBe(false);
    local.recordGame(game("t", iso(0)));
    expect(local.getStreak()).toEqual({ count: 1, lastPlayed: iso(0) });
  });
});
