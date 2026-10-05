import type { GameState } from "@/engine/types";

/**
 * Plan §08. In-memory game store for v1. Fluid Compute reuses instances, which is enough for a demo.
 * First thing to swap for a KV store if there's time. On a miss the client shows "Table reset. Deal again."
 */

const TTL_MS = 2 * 60 * 60 * 1000;

declare global {
  var __games: Map<string, GameState> | undefined;
}

export function getGame(id: string): GameState | undefined {
  throw new Error("TODO(lib): getGame");
}

export function putGame(state: GameState): void {
  throw new Error("TODO(lib): putGame");
}

export function sweep(now = Date.now()): void {
  throw new Error("TODO(lib): sweep");
}
