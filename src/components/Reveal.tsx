"use client";

import type { PublicView } from "@/engine/types";
import type { Game } from "./useGame";
import { callPoints, me, nameOf, scoreOf, setLabel, verdict } from "@/lib/outcome";
import { WordInput } from "./ClueInput";
import { BrainReplay } from "./BrainReplay";
import { ShareCard } from "./ShareCard";
import { Label, Shell } from "./Shell";

/** The caught imposter's one guess. Plan §05 lastGuess. */
export function LastGuess({ game, view }: { game: Game; view: PublicView }) {
  const self = me(view);
  const caught = view.result?.ejected;
  const mine = caught === self && game.waiting?.for === "guess";
  return (
    <Shell left="Last guess" right={setLabel(view)}>
      <Label>{caught ? `${nameOf(caught)} ${caught === self ? "were" : "was"} voted out` : "Voted out"}</Label>
      {mine ? (
        <>
          <span className="text-display">Caught.</span>
          <p className="text-ink-2">Guess the word and you still win.</p>
          <div className="mt-auto">
            <WordInput action="Guess" placeholder="The word was…" disabled={game.busy} onSubmit={(word) => game.send({ type: "guess", word })} />
          </div>
        </>
      ) : (
        <p className="text-ink-2">{caught ? `${nameOf(caught)} gets one guess at the word. Right, and they steal the win.` : "…"}</p>
      )}
    </Shell>
  );
}

/** Plan §09, Reveal: mono label, 28px verdict, the detail line, then Brain Replay and Share. */
export function Reveal({ game, view }: { game: Game; view: PublicView }) {
  const v = verdict(view);
  if (!v) return null;
  const self = me(view);
  const watching = view.mode === "watch";
  return (
    <Shell left="Reveal" right={setLabel(view)}>
      <div className="appear grid gap-1.5">
        <Label red={view.result?.imposter === self}>{v.label}</Label>
        <span className="text-display">{v.headline}</span>
        <p className="text-ink-2">{v.detail}</p>
        <p className="text-[13px] text-ink-3">
          The word was <span className="text-ink">{view.word}</span>.
          {self ? ` Score +${scoreOf(view)}.` : ""}
          {watching && view.watchCall
            ? ` Your call: ${nameOf(view.watchCall.target)}, ${callPoints(view) > 0 ? `right, +${callPoints(view)}` : "wrong"}.`
            : ""}
        </p>
      </div>
      <BrainReplay view={view} />
      <ShareCard view={view} onPlay={() => game.start("play", { practice: true })} onWatch={() => game.start("watch")} />
    </Shell>
  );
}
