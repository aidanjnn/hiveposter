import type { PersonaId, Role } from "@/engine/types";
import { isDailySeed } from "@/engine/calendar";
import { mergeNotes } from "./notes";

/**
 * Plan §03, persistence. localStorage keyed by a random playerId. Every read and write is
 * wrapped so a blocked or empty store never breaks the game; it just forgets.
 *
 * Keys (prefix "imposter."):
 *   playerId · streak { count, lastPlayed } · history GameSummary[] · detective { right, total }
 *   memory.{persona} string[] (≤ 10) · lobby.{persona} string · grudge.{persona} number
 */

const PREFIX = "imposter.";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Private mode or blocked storage: the game still works, it just forgets.
  }
}

export interface GameSummary {
  id: string;
  mode: "play" | "watch";
  seed: string;
  setLabel: string;
  yourRole?: Role;
  won: boolean;
  score: number;
  at: number;
}

export function getPlayerId(): string {
  let id = read<string | null>("playerId", null);
  if (!id) {
    id = Math.random().toString(36).slice(2, 12);
    write("playerId", id);
  }
  return id;
}

function localDate(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function previousDay(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() - 1);
  return localDate(d);
}

export function getStreak(): { count: number; lastPlayed?: string } {
  const s = read<{ count: number; lastPlayed?: string }>("streak", { count: 0 });
  if (!s.lastPlayed) return s;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const alive = s.lastPlayed === localDate() || s.lastPlayed === localDate(yesterday);
  return alive ? s : { count: 0, lastPlayed: s.lastPlayed };
}

export function getHistory(): GameSummary[] {
  return read<GameSummary[]>("history", []);
}

/**
 * Record a finished game once. Returns false if it was already recorded (a refresh on the
 * reveal screen), so callers skip the other one-time effects too. The streak counts days on
 * which you played the daily table; practice tables and Watch games don't touch it. It keys
 * on the table's own date, so a game dealt before midnight still counts for that day.
 */
export function recordGame(summary: GameSummary): boolean {
  const history = getHistory();
  if (history.some((h) => h.id === summary.id)) return false;
  write("history", [summary, ...history].slice(0, 100));
  const day = summary.mode === "play" && isDailySeed(summary.seed) ? summary.seed : null;
  const streak = read<{ count: number; lastPlayed?: string }>("streak", { count: 0 });
  if (day && (!streak.lastPlayed || day > streak.lastPlayed)) {
    write("streak", { count: streak.lastPlayed === previousDay(day) ? streak.count + 1 : 1, lastPlayed: day });
  }
  return true;
}

/** Whether you've already played this daily table. Watching it doesn't count. */
export function playedToday(seed: string): boolean {
  return getHistory().some((h) => h.seed === seed && h.mode === "play");
}

/** "Caught N of M": games as a civilian where the imposter was caught. */
export function caughtRecord(): { caught: number; total: number } {
  const civ = getHistory().filter((h) => h.mode === "play" && h.yourRole === "civilian");
  return { caught: civ.filter((h) => h.won).length, total: civ.length };
}

export function getDetective(): { right: number; total: number } {
  return read("detective", { right: 0, total: 0 });
}

export function recordCall(right: boolean): void {
  const d = getDetective();
  write("detective", { right: d.right + (right ? 1 : 0), total: d.total + 1 });
}

export function getMemory(persona: PersonaId): string[] {
  return read<string[]>(`memory.${persona}`, []);
}

export function allMemory(personas: PersonaId[]): Partial<Record<PersonaId, string[]>> {
  return Object.fromEntries(personas.map((p) => [p, getMemory(p)]));
}

export function setMemory(persona: PersonaId, notes: string[], lobbyLine: string): void {
  write(`memory.${persona}`, mergeNotes(getMemory(persona), notes));
  if (lobbyLine) write(`lobby.${persona}`, lobbyLine);
}

export function getLobbyLine(persona: PersonaId): string | undefined {
  return read<string | undefined>(`lobby.${persona}`, undefined);
}

export function getGrudge(persona: PersonaId): number {
  return read<number>(`grudge.${persona}`, 0);
}

export function allGrudges(personas: PersonaId[]): Partial<Record<PersonaId, number>> {
  return Object.fromEntries(personas.map((p) => [p, getGrudge(p)]));
}

export function applyGrudges(changes: Partial<Record<PersonaId, number | "reset">>): void {
  for (const [persona, change] of Object.entries(changes) as [PersonaId, number | "reset"][]) {
    write(`grudge.${persona}`, change === "reset" ? 0 : getGrudge(persona) + change);
  }
}

/** Session-scoped: lets a refresh resume the table in progress. */
export function rememberGame(id: string | null): void {
  try {
    if (id) window.sessionStorage.setItem(PREFIX + "gameId", id);
    else window.sessionStorage.removeItem(PREFIX + "gameId");
  } catch {
    /* ignore */
  }
}

export function currentGame(): string | null {
  try {
    return window.sessionStorage.getItem(PREFIX + "gameId");
  } catch {
    return null;
  }
}
