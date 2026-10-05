"use client";

import type { HumanMove, Phase, PublicView } from "@/engine/types";

/**
 * Plan §09, client state. One hook holds the view, an event log, and a pending flag.
 * SSE events patch `view`. gameId lives in sessionStorage so a refresh resumes.
 */
export interface UseGame {
  view: PublicView | null;
  pending: boolean;
  error: string | null;
  start(mode: "play" | "watch"): Promise<void>;
  advance(phase: Phase): Promise<void>;
  send(move: HumanMove): Promise<void>;
}

export function useGame(): UseGame {
  throw new Error("TODO(ui): useGame");
}
