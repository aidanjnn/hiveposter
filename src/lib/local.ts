import type { PersonaId } from "@/engine/types";

/**
 * Plan §03, persistence. localStorage keyed by a random playerId.
 * Every read/write is wrapped so a blocked store never breaks the game.
 *
 * Keys:
 *   imposter.playerId
 *   imposter.streak        { count, lastPlayed: YYYY-MM-DD }
 *   imposter.history       GameSummary[]
 *   imposter.memory.{persona}   string[]  (≤ 10)
 *   imposter.lobby.{persona}    string
 *   imposter.grudge.{persona}   number
 *   imposter.detective     { correct, total }
 */

export interface GameSummary {
  seed: string;
  setId: number;
  category: string;
  yourRole: "civilian" | "imposter";
  won: boolean;
  score: number;
  caughtInRound?: 1 | 2;
}

export function getPlayerId(): string {
  throw new Error("TODO(lib): getPlayerId");
}

export function getStreak(): { count: number; lastPlayed?: string } {
  throw new Error("TODO(lib): getStreak");
}

export function recordGame(summary: GameSummary): void {
  throw new Error("TODO(lib): recordGame");
}

export function getMemory(persona: PersonaId): string[] {
  throw new Error("TODO(lib): getMemory");
}

export function setMemory(persona: PersonaId, notes: string[], lobbyLine: string): void {
  throw new Error("TODO(lib): setMemory");
}

export function getGrudge(persona: PersonaId): number {
  throw new Error("TODO(lib): getGrudge");
}

export function bumpGrudge(persona: PersonaId, delta: number | "reset"): void {
  throw new Error("TODO(lib): bumpGrudge");
}
