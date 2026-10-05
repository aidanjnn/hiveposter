"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GameEvent, HumanMove, Mode, PersonaId, PublicView, SeatId } from "@/engine/types";
import { todaySeed } from "@/engine/words";
import { PLAY_LINEUP, WATCH_LINEUP } from "@/agents/personas";
import { readEvents } from "@/lib/sse";
import * as local from "@/lib/local";
import { callPoints, grudgeChanges, humanWon, me, scoreOf, setLabel } from "@/lib/outcome";

/**
 * Plan §09, client state. One hook holds the view, what the server is waiting for, and a
 * busy flag. Streamed events patch the view; clue, message, and vote events land one at a
 * time so the table reads like turns. When nobody human is needed, the hook asks the server
 * for the next phase on its own (Watch mode can pause that).
 */

export interface Waiting {
  seat: SeatId;
  for: "clue" | "message" | "vote" | "guess";
}

export interface TableRead {
  suspicion: Partial<Record<SeatId, number>>;
  reason: string;
}

const STAGGER_MS = 700;
const VOTE_STAGGER_MS = 900;
const PHASE_PAUSE_MS = 600;

function reducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, reducedMotion() ? 0 : ms));

export function useGame() {
  const [view, setView] = useState<PublicView | null>(null);
  const [waiting, setWaiting] = useState<Waiting | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [table, setTable] = useState<TableRead | null>(null);
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const resumed = useRef(false);
  const recorded = useRef<string | null>(null);

  /**
   * Once per finished game: history, streak, grudges, detective rating, persona memory.
   * Runs where the revealed view arrives, before it renders, so the share card sees the new streak.
   */
  const finish = useCallback((v: PublicView) => {
    if (v.phase !== "reveal" || recorded.current === v.id) return;
    recorded.current = v.id;
    const self = me(v);
    local.recordGame({
      id: v.id,
      seed: v.seed,
      setLabel: setLabel(v),
      yourRole: v.yourRole,
      won: humanWon(v),
      score: scoreOf(v),
      at: Date.now(),
    });
    if (v.mode === "watch" && v.watchCall) local.recordCall(callPoints(v) > 0);
    if (!self) return;
    local.applyGrudges(grudgeChanges(v));
    const personas = v.seats.map((s) => s.persona).filter((p): p is PersonaId => Boolean(p));
    void fetch("/api/memory", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ view: v, notes: local.allMemory(personas) }),
    })
      .then((r) => r.json())
      .then((j: { memory?: Record<string, { notes: string[]; lobbyLine: string }> }) => {
        for (const [p, m] of Object.entries(j.memory ?? {})) local.setMemory(p as PersonaId, m.notes, m.lobbyLine);
      })
      .catch(() => undefined);
  }, []);

  const reset = useCallback((message?: string) => {
    setView(null);
    setWaiting(null);
    setTable(null);
    setStarted(false);
    setPaused(false);
    setError(null);
    setNotice(message ?? null);
    local.rememberGame(null);
  }, []);

  const consume = useCallback(async (res: Response) => {
    for await (const e of readEvents(res) as AsyncGenerator<GameEvent>) {
      switch (e.type) {
        case "clue":
          setView((v) => (v && !v.clues.some((c) => c.seat === e.clue.seat && c.round === e.clue.round) ? { ...v, clues: [...v.clues, e.clue] } : v));
          await sleep(STAGGER_MS);
          break;
        case "message":
          setView((v) => (v && !v.messages.some((m) => m.seat === e.message.seat && m.at === e.message.at) ? { ...v, messages: [...v.messages, e.message] } : v));
          await sleep(STAGGER_MS);
          break;
        case "vote":
          setView((v) => (v ? { ...v, votes: [...v.votes.filter((x) => x.seat !== e.vote.seat), e.vote] } : v));
          await sleep(VOTE_STAGGER_MS);
          break;
        case "suspicion":
          setTable({ suspicion: e.table, reason: e.reason });
          break;
        case "waiting":
          setWaiting({ seat: e.seat, for: e.for });
          break;
        case "phase":
          await sleep(PHASE_PAUSE_MS);
          finish(e.view);
          setView(e.view);
          break;
        case "view":
          finish(e.view);
          setView(e.view);
          break;
        case "error":
          setError(e.message);
          break;
      }
    }
  }, [finish]);

  /** POST and stream. Returns a user-facing error for a refused move, else null. */
  const request = useCallback(
    async (url: string, body: unknown): Promise<string | null> => {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.status === 404) {
          reset("Table reset. Deal again.");
          return null;
        }
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          return j.error ?? "That didn't work.";
        }
        setWaiting(null);
        await consume(res);
        return null;
      } catch {
        setError("Connection lost. Try again.");
        return null;
      } finally {
        setBusy(false);
      }
    },
    [consume, reset],
  );

  const start = useCallback(
    async (mode: Mode, opts: { practice?: boolean } = {}) => {
      reset();
      setBusy(true);
      const personas: PersonaId[] = mode === "play" ? PLAY_LINEUP : WATCH_LINEUP;
      const daily = todaySeed();
      const seed = opts.practice || (mode === "play" && local.playedToday(daily)) ? `practice-${Date.now()}` : daily;
      try {
        const res = await fetch("/api/game", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            mode,
            playerId: local.getPlayerId(),
            seed,
            personas,
            memory: local.allMemory(personas),
            grudges: local.allGrudges(personas),
          }),
        });
        const j = (await res.json()) as { view?: PublicView; error?: string };
        if (!res.ok || !j.view) throw new Error(j.error);
        local.rememberGame(j.view.id);
        setView(j.view);
        // Play mode waits on the role card; Watch mode starts right away.
        setStarted(mode === "watch");
      } catch {
        setError("Couldn't deal. Try again.");
      } finally {
        setBusy(false);
      }
    },
    [reset],
  );

  const advance = useCallback(async () => {
    if (!view) return;
    await request(`/api/game/${view.id}/phase`, {});
  }, [request, view]);

  const send = useCallback(
    async (move: HumanMove): Promise<string | null> => {
      if (!view) return null;
      if (move.type !== "call" && move.type !== "takeSeat") return request(`/api/game/${view.id}/human`, move);
      // Asides don't start turns and may arrive while a turn is still streaming.
      const body = move.type === "call" ? { ...move, seenPhase: view.phase } : move;
      if (move.type === "call") setView((v) => (v ? { ...v, watchCall: { target: move.target, lockedAtPhase: v.phase } } : v));
      try {
        const res = await fetch(`/api/game/${view.id}/human`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        const j = (await res.json().catch(() => ({}))) as { view?: PublicView; error?: string };
        if (!res.ok) {
          if (move.type === "call") setView((v) => (v ? { ...v, watchCall: undefined } : v));
          return j.error ?? "That didn't work.";
        }
        if (move.type === "takeSeat" && j.view) {
          const next = j.view;
          setView((v) => (v ? { ...v, seats: next.seats, yourRole: next.yourRole, word: next.word } : next));
        }
        return null;
      } catch {
        return "Connection lost. Try again.";
      }
    },
    [request, view],
  );

  // Resume the table in progress after a refresh.
  useEffect(() => {
    if (resumed.current) return;
    resumed.current = true;
    const id = local.currentGame();
    if (!id) return;
    fetch(`/api/game/${id}`)
      .then(async (res) => {
        if (!res.ok) return reset("Table reset. Deal again.");
        const j = (await res.json()) as { view: PublicView };
        finish(j.view);
        setView(j.view);
        setStarted(true);
      })
      .catch(() => reset());
  }, [finish, reset]);

  // Nobody human is needed: ask for the next phase.
  useEffect(() => {
    if (!view || !started || busy || waiting || error || paused) return;
    if (view.phase === "reveal") return;
    const t = setTimeout(() => void advance(), 300);
    return () => clearTimeout(t);
  }, [view, started, busy, waiting, error, paused, advance]);

  return {
    view,
    waiting,
    busy,
    error,
    notice,
    table,
    paused,
    setPaused,
    started,
    begin: () => setStarted(true),
    start,
    send,
    retry: () => {
      setError(null);
    },
    leave: () => reset(),
  };
}

export type Game = ReturnType<typeof useGame>;
