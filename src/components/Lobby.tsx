"use client";

import { useState } from "react";
import type { Mode, PersonaId } from "@/engine/types";
import { puzzleNumber, todaySeed } from "@/engine/calendar";
import { PERSONAS, PLAY_LINEUP, WATCH_LINEUP } from "@/agents/personas";
import * as local from "@/lib/local";
import { Button } from "./ui/Button";
import { Dot } from "./ui/Dot";
import { Foot, Heading, Shell } from "./Shell";

interface Stats {
  streak: number;
  caught: { caught: number; total: number };
  detective: { right: number; total: number };
  played: boolean;
  lines: Partial<Record<PersonaId, string>>;
  grudges: Partial<Record<PersonaId, number>>;
}

function readStats(seed: string): Stats {
  const all = [...WATCH_LINEUP];
  return {
    streak: local.getStreak().count,
    caught: local.caughtRecord(),
    detective: local.getDetective(),
    played: local.playedToday(seed),
    lines: Object.fromEntries(all.map((p) => [p, local.getLobbyLine(p)])),
    grudges: local.allGrudges(all),
  };
}

/** Plan §09, Lobby. Persona rows with lines from memory, streak chips, Deal (the one red button). */
export function Lobby({ onStart, busy, notice }: { onStart: (mode: Mode, practice?: boolean) => void; busy: boolean; notice: string | null }) {
  const [mode, setMode] = useState<Mode>("play");
  const seed = todaySeed();
  // The game renders client-only, so local storage can be read on first render.
  const [stats] = useState<Stats>(() => readStats(seed));

  const lineup = mode === "play" ? PLAY_LINEUP : WATCH_LINEUP;
  const date = new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const practice = mode === "play" && Boolean(stats?.played);

  return (
    <Shell left={date} right={`Set #${puzzleNumber(seed)}`}>
      <Heading>{mode === "play" ? "Tonight's table" : "Watch the agents"}</Heading>

      <div role="tablist" aria-label="Mode" className="grid grid-cols-2 gap-1 rounded bg-surface-2 p-[3px]">
        {(["play", "watch"] as const).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={`rounded px-2 py-1.5 capitalize ${mode === m ? "bg-surface text-ink" : "text-ink-3 hover:text-ink-2"}`}
          >
            {m}
          </button>
        ))}
      </div>

      <p className="text-ink-2">
        {mode === "play"
          ? "Three players and you. Everyone gets the secret word except one imposter. Give one-word clues, argue, vote."
          : "Four agents play without you. Call the imposter before they do."}
      </p>

      <ul className="grid gap-px overflow-hidden rounded border border-line bg-line">
        {lineup.map((id) => {
          const p = PERSONAS[id];
          const grudge = stats?.grudges[id] ?? 0;
          return (
            <li key={id} className="grid gap-0.5 bg-surface px-3 py-2.5">
              <span className="flex items-center gap-2">
                <Dot seat={id} />
                {p.name}
              </span>
              <span className="text-label text-ink-3">
                {p.tagline}
                {grudge > 0 ? ` · grudge ${grudge} game${grudge === 1 ? "" : "s"}` : ""}
              </span>
              {mode === "play" ? <q className="text-label text-ink-2">{stats?.lines[id] ?? p.defaultLobbyLine}</q> : null}
            </li>
          );
        })}
      </ul>

      {notice ? <p className="text-ink-2">{notice}</p> : null}

      <Foot>
        <span className="font-mono text-label text-ink-3">
          {mode === "play"
            ? `Streak ${stats?.streak ?? 0} · Caught ${stats?.caught.caught ?? 0} of ${stats?.caught.total ?? 0}`
            : `Detective ${stats && stats.detective.total ? Math.round((stats.detective.right / stats.detective.total) * 100) : 0}% · ${stats?.detective.total ?? 0} calls`}
        </span>
        {practice ? <span className="text-ink-3">You played today&apos;s table. This one is practice.</span> : null}
        <Button variant={mode === "play" ? "red" : "primary"} disabled={busy} onClick={() => onStart(mode, practice)}>
          {busy ? "Dealing…" : mode === "play" ? "Deal" : "Start the game"}
        </Button>
      </Foot>
    </Shell>
  );
}
