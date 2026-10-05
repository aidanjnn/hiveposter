"use client";

import { useRef, useState } from "react";
import type { PersonaId, PublicView } from "@/engine/types";
import { PERSONAS } from "@/agents/personas";
import * as local from "@/lib/local";
import { grudgeChanges, shareText } from "@/lib/outcome";
import { Button } from "./ui/Button";
import { Dot } from "./ui/Dot";

/** Plan §09, Share. Mono share card, clipboard copy with a select-text fallback, grudge line. */
export function ShareCard({ view, onPlay, onWatch }: { view: PublicView; onPlay: () => void; onWatch: () => void }) {
  const text = shareText(view);
  const [copied, setCopied] = useState(false);
  const streak = local.getStreak().count;
  const pre = useRef<HTMLPreElement>(null);
  const grudge = Object.entries(grudgeChanges(view)).find(([, c]) => c === 1)?.[0] as PersonaId | undefined;

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      const range = document.createRange();
      if (pre.current) {
        range.selectNodeContents(pre.current);
        window.getSelection()?.removeAllRanges();
        window.getSelection()?.addRange(range);
      }
    }
  }

  return (
    <section className="grid gap-3" aria-label="Share">
      <div className="grid gap-2 rounded border border-line p-3 font-mono text-label text-ink-2">
        <div className="flex gap-1">
          {view.order.map((s) => (
            <i key={s} className="inline-block size-3 rounded-[2px]" style={{ background: `var(--seat-${s})` }} />
          ))}
        </div>
        <pre ref={pre} className="whitespace-pre-wrap font-mono">{text}</pre>
        <span className="text-ink-3">Streak {streak}</span>
      </div>
      {grudge ? (
        <div className="flex items-center gap-2 text-[14px]">
          <Dot seat={grudge} />
          <span>
            {PERSONAS[grudge].name} will remember this.
            <small className="block text-[12px] text-ink-3">Grudge: {local.getGrudge(grudge)} game{local.getGrudge(grudge) === 1 ? "" : "s"}</small>
          </span>
        </div>
      ) : null}
      <Button onClick={copy}>{copied ? "Copied" : "Copy share card"}</Button>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="ghost" onClick={onPlay}>
          Play again
        </Button>
        <Button variant="ghost" onClick={onWatch}>
          Watch the agents
        </Button>
      </div>
    </section>
  );
}
