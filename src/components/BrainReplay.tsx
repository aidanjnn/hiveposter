"use client";

import { useState } from "react";
import type { AgentTrace, Phase, PublicView, SeatId } from "@/engine/types";
import { nameOf } from "@/lib/outcome";
import { Dot } from "./ui/Dot";
import { Meter } from "./ui/Meter";
import { Note } from "./ui/Note";

const STOPS: { key: string; label: string; phases: Phase[] }[] = [
  { key: "r1", label: "R1", phases: ["clue1"] },
  { key: "r2", label: "R2", phases: ["clue2"] },
  { key: "talk", label: "Talk", phases: ["discuss"] },
  { key: "vote", label: "Vote", phases: ["vote", "lastGuess"] },
];

function Sparkline({ values, bright }: { values: number[]; bright: boolean }) {
  if (values.length === 0) return <span className="font-mono text-label text-ink-3">no reads</span>;
  const pts = values.length === 1 ? [values[0], values[0]] : values;
  const points = pts.map((v, i) => `${(i / (pts.length - 1)) * 100},${26 - v * 24}`).join(" ");
  return (
    <svg viewBox="0 0 100 28" preserveAspectRatio="none" className="block h-7 w-full" aria-hidden="true">
      <line x1="0" x2="100" y1="14" y2="14" stroke="var(--line)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      <polyline fill="none" stroke={bright ? "var(--ink)" : "var(--ink-3)"} strokeWidth="1.5" vectorEffect="non-scaling-stroke" points={points} />
    </svg>
  );
}

function badges(t: AgentTrace): string[] {
  const out: string[] = [];
  if (t.hunch) out.push("went with a hunch");
  if (t.fallback) out.push("no answer in time, played safe");
  if (t.retried) out.push("first clue rejected");
  return out;
}

/**
 * Plan §10, Brain Replay. Per agent: a sparkline of suspicion toward the real imposter
 * (white for whoever ended most sure). A four-stop scrubber shows every private note.
 */
export function BrainReplay({ view }: { view: PublicView }) {
  const [stop, setStop] = useState("r1");
  const traces = view.traces ?? [];
  const imposter = view.result?.imposter;
  const agents = view.seats.filter((s) => s.kind === "agent" || traces.some((t) => t.seat === s.id)).map((s) => s.id);

  const lines = new Map<SeatId, number[]>();
  for (const seat of agents) {
    if (seat === imposter || !imposter) continue;
    lines.set(
      seat,
      traces.filter((t) => t.seat === seat && t.suspicion[imposter] !== undefined).map((t) => t.suspicion[imposter]!),
    );
  }

  const sharpest = [...lines.entries()].sort((a, b) => (b[1].at(-1) ?? 0) - (a[1].at(-1) ?? 0))[0]?.[0];
  const trail = imposter
    ? traces.filter((t) => t.seat === imposter && t.wordGuesses).map((t) => {
        const [word, p] = Object.entries(t.wordGuesses!).sort((a, b) => b[1] - a[1])[0] ?? ["?", 0];
        return { word, p, right: word === view.word };
      })
    : [];
  const current = STOPS.find((s) => s.key === stop)!;
  const atStop = traces.filter((t) => current.phases.includes(t.phase));

  if (traces.length === 0) return null;

  return (
    <section className="grid gap-4" aria-label="Brain Replay">
      <div className="grid gap-0.5">
        <span className="font-mono text-label uppercase text-ink-3">Brain Replay</span>
        <p className="text-ink-2">Here&apos;s what they were actually thinking.</p>
      </div>

      {imposter ? (
        <div className="grid gap-2">
          {[...lines.entries()].map(([seat, values]) => (
            <div key={seat} className="grid grid-cols-[132px_1fr_32px] items-center gap-2 text-label text-ink-2">
              <span className="flex items-center gap-1.5 truncate">
                <Dot seat={seat} />
                {nameOf(seat)} → {imposter === "you" ? "you" : nameOf(imposter)}
              </span>
              <Sparkline values={values} bright={seat === sharpest} />
              <span className="text-right font-mono text-label text-ink-3">{values.length ? values.at(-1)!.toFixed(2).replace(/^0/, "") : "–"}</span>
            </div>
          ))}
        </div>
      ) : null}

      {trail.length ? (
        <p className="font-mono text-label text-ink-3">
          {nameOf(imposter!)}&apos;s best guess:{" "}
          {trail.map((g, i) => (
            <span key={i} className={g.right ? "text-ink" : undefined}>
              {i ? " → " : ""}
              {g.word} {g.p.toFixed(2).replace(/^0/, "")}
            </span>
          ))}
        </p>
      ) : null}

      <div role="tablist" aria-label="Replay stage" className="grid grid-cols-4 overflow-hidden rounded border border-line text-center text-label">
        {STOPS.map((s) => (
          <button
            key={s.key}
            role="tab"
            aria-selected={stop === s.key}
            onClick={() => setStop(s.key)}
            className={`py-1.5 ${stop === s.key ? "bg-surface-2 text-ink" : "text-ink-3 hover:text-ink-2"}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4">
        {atStop.length === 0 ? <p className="text-ink-3">No agent thinking at this stage.</p> : null}
        {atStop.map((t, i) => (
          <div key={`${t.seat}-${t.at}-${i}`} className="grid gap-2">
            <Note
              title={
                <span className="flex items-center gap-1.5">
                  <Dot seat={t.seat} />
                  {nameOf(t.seat)}
                  {t.seat === imposter ? <span className="text-ink-3">· imposter</span> : null}
                </span>
              }
            >
              {t.privateNote || "…"}
              {badges(t).length ? <span className="block font-mono text-label text-ink-3">{badges(t).join(" · ")}</span> : null}
            </Note>
            <div className="grid gap-1 pl-2.5">
              {(Object.entries(t.suspicion) as [SeatId, number][]).map(([seat, p]) => (
                <Meter key={seat} label={nameOf(seat)} value={p} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
