"use client";

import { useState } from "react";
import type { PublicView, SeatId } from "@/engine/types";
import type { Game } from "./useGame";
import { me, nameOf, setLabel } from "@/lib/outcome";
import { Button } from "./ui/Button";
import { Dot } from "./ui/Dot";
import { Foot, Heading, Shell } from "./Shell";

/** Plan §09, Vote. Hairline rows; votes are seat dots revealed one at a time with a grey reason. Shown only during the vote; the outcome is the Reveal's. */
export function VoteList({ game, view, side }: { game: Game; view: PublicView; side?: React.ReactNode }) {
  const self = me(view);
  const [pick, setPick] = useState<SeatId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mine = view.votes.find((v) => v.seat === self);
  const canVote = Boolean(self) && !mine && game.waiting?.for === "vote";
  const done = view.votes.length === view.seats.length;

  return (
    <Shell left="Vote" right={done ? setLabel(view) : `${view.votes.length} of ${view.seats.length} in`}>
      {side}
      <Heading>Who&apos;s the imposter?</Heading>
      <ul className="grid gap-px overflow-hidden rounded border border-line bg-line">
        {view.order.map((seat) => {
          const against = view.votes.filter((v) => v.target === seat);
          const selectable = canVote && seat !== self;
          return (
            <li key={seat}>
              <button
                type="button"
                disabled={!selectable}
                onClick={() => setPick(seat)}
                className={`grid w-full grid-cols-[1fr_auto] items-center gap-1.5 px-3 py-2.5 text-left ${pick === seat || mine?.target === seat ? "bg-surface-2" : "bg-surface"} ${selectable ? "hover:bg-surface-2" : ""}`}
              >
                <span className="flex items-center gap-2">
                  <Dot seat={seat} />
                  {nameOf(seat)}
                </span>
                <span className="flex gap-1">
                  {against.map((v) => (
                    <Dot key={v.seat} seat={v.seat} className="appear" />
                  ))}
                </span>
                {against
                  .filter((v) => v.reason)
                  .map((v) => (
                    <small key={v.seat} className="appear col-span-2 text-label text-ink-3">
                      {nameOf(v.seat)}: {v.reason}
                    </small>
                  ))}
              </button>
            </li>
          );
        })}
      </ul>
      {!done && !canVote ? <p className="text-ink-3">{mine || !self ? "Votes are coming in." : "The table is deciding."}</p> : null}
      {canVote ? (
        <Foot>
          <span className="min-h-5 text-ink-3">{error ?? (pick ? `Vote out ${nameOf(pick)}?` : "Tap a player.")}</span>
          <Button
            disabled={!pick || game.busy}
            onClick={async () => {
              if (!pick) return;
              const refused = await game.send({ type: "vote", target: pick });
              if (refused) setError(refused);
            }}
          >
            Lock in vote
          </Button>
        </Foot>
      ) : null}
    </Shell>
  );
}
