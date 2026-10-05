import type { GameState } from "@/engine/types";

/**
 * Plan §08, ADR 0007. In-memory game store for v1. Fluid Compute reuses instances, which
 * is enough for a demo. A miss means the instance was recycled; the client shows
 * "Table reset. Deal again." Swapping this for a KV store is the first post-deadline change.
 */

const TTL_MS = 2 * 60 * 60 * 1000;

declare global {
  var __games: Map<string, GameState> | undefined;
  var __gameLocks: Map<string, Promise<unknown>> | undefined;
}

const games = (globalThis.__games ??= new Map());
const locks = (globalThis.__gameLocks ??= new Map());

export function getGame(id: string): GameState | undefined {
  return games.get(id);
}

export function putGame(state: GameState): void {
  sweep();
  games.set(state.id, state);
}

export function sweep(now = Date.now()): void {
  for (const [id, g] of games) if (now - g.createdAt > TTL_MS) games.delete(id);
}

/**
 * Serialize work per game so two requests can't advance the same table at once
 * (a double-tapped button, a retry racing the original).
 */
export async function withGame<T>(id: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(id) ?? Promise.resolve();
  const run = prev.catch(() => undefined).then(fn);
  locks.set(id, run);
  try {
    return await run;
  } finally {
    if (locks.get(id) === run) locks.delete(id);
  }
}
