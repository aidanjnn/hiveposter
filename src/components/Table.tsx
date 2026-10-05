"use client";

import type { PublicView, SeatId } from "@/engine/types";
import type { Game } from "./useGame";
import { me, nameOf, roundLabel, setLabel } from "@/lib/outcome";
import { WordInput } from "./ClueInput";
import { Clue } from "./ui/Clue";
import { Dot } from "./ui/Dot";
import { Heading, Shell } from "./Shell";

function nextSeat(view: PublicView): SeatId | null {
  const round = view.phase === "clue1" ? 1 : view.phase === "clue2" ? 2 : null;
  if (!round) return null;
  return view.order[view.clues.filter((c) => c.round === round).length] ?? null;
}

/** Plan §09, Table. Seats as a list in turn order; clue chips land one at a time. */
export function Table({ game, view, side }: { game: Game; view: PublicView; side?: React.ReactNode }) {
  const self = me(view);
  const next = nextSeat(view);
  const yourTurn = game.waiting?.for === "clue" && game.waiting.seat === self;
  const round = view.phase === "clue2" ? 2 : 1;

  return (
    <Shell left={roundLabel(view.phase)} right={setLabel(view)}>
      {side}
      {view.word ? (
        <Heading>
          <span className="capitalize">{view.word}</span>
        </Heading>
      ) : (
        <Heading>
          Imposter. <span className="text-ink-2">You don&apos;t know the word.</span>
        </Heading>
      )}

      <ul className="grid gap-3">
        {view.order.map((seat) => {
          const mine = view.clues.filter((c) => c.seat === seat).sort((a, b) => a.round - b.round);
          const pending = seat === next;
          return (
            <li key={seat} className="grid grid-cols-[84px_1fr] items-center gap-2">
              <span className={`flex items-center gap-1.5 text-label ${seat === self ? "text-ink" : "text-ink-2"}`}>
                <Dot seat={seat} />
                {nameOf(seat)}
              </span>
              <span className="flex flex-wrap gap-1.5">
                {mine.map((c) => (
                  <Clue key={c.round} word={c.word} fallback={c.fallback} />
                ))}
                {pending ? <Clue pending word={seat === self ? (yourTurn ? "your turn" : "next") : "thinking"} /> : null}
              </span>
            </li>
          );
        })}
      </ul>

      <p className="text-ink-2">
        {view.yourRole === "imposter"
          ? "Your clue should sound like you know the word. Too vague looks guilty."
          : self
            ? "Specific enough to prove you know it. Vague enough to keep it."
            : `Round ${round} of 2. The imposter is giving clues for a word they don't know.`}
      </p>

      {self ? (
        <div className="mt-auto">
          <WordInput
            action="Lock in"
            placeholder={yourTurn ? "One word" : "Wait for your turn"}
            disabled={!yourTurn || game.busy}
            onSubmit={(clue) => game.send({ type: "clue", clue })}
          />
        </div>
      ) : null}
    </Shell>
  );
}
