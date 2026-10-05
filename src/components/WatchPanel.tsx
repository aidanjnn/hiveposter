"use client";

import { useState } from "react";
import type { PublicView, SeatId } from "@/engine/types";
import type { Game } from "./useGame";
import { callWorth, me, nameOf } from "@/lib/outcome";
import { Button } from "./ui/Button";
import { Dot } from "./ui/Dot";
import { Note } from "./ui/Note";
import { SuspicionMeter } from "./SuspicionMeter";

/** Plan §10, Watch mode. Live dot, your call, live suspicion meters, Take a seat. */
export function WatchPanel({ game, view }: { game: Game; view: PublicView }) {
  const [picking, setPicking] = useState<"call" | "seat" | null>(view.watchCall ? null : "call");

  const seats = view.seats.map((s) => s.id);
  const worth = callWorth(view.phase);
  const taken = me(view);
  const canCall = !view.watchCall && worth > 0;

  const [refused, setRefused] = useState<string | null>(null);

  async function choose(seat: SeatId) {
    const mode = picking;
    setPicking(null);
    setRefused(null);
    const why = mode === "call" ? await game.send({ type: "call", target: seat }) : await game.send({ type: "takeSeat", seat });
    if (why) setRefused(why);
  }

  return (
    <section className="grid gap-3 border-b border-line pb-4" aria-label="Watch">
      <div className="flex items-center justify-between font-mono text-label">
        <span className="flex items-center gap-1.5 text-accent">
          <i className="inline-block size-1.5 rounded-full bg-accent" aria-hidden="true" />
          {taken ? `You are ${nameOf(taken)}` : "Live"}
        </span>
        <Button variant="text" className="font-mono text-label" onClick={() => game.setPaused(!game.paused)}>
          {game.paused ? "Resume" : "Pause"}
        </Button>
      </div>

      {picking === "call" && !canCall ? null : picking ? (
        <div className="grid gap-2">
          <span className="text-ink-2">
            {picking === "call" ? `Who's lying? A right call now is worth ${worth}.` : "Whose seat do you want?"}
          </span>
          <div className="grid grid-cols-4 gap-1.5">
            {seats.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => choose(s)}
                className="grid justify-items-center gap-1 rounded border border-line px-1 py-2 text-label hover:border-ink-3"
              >
                <Dot seat={s} />
                {nameOf(s)}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <span className="text-ink-2">
          {view.watchCall
            ? `Your call: ${nameOf(view.watchCall.target)}, locked in ${view.watchCall.lockedAtPhase === "clue1" ? "round 1" : view.watchCall.lockedAtPhase === "clue2" ? "round 2" : "discussion"}.`
            : canCall
              ? ""
              : "Calls closed at the vote."}
        </span>
      )}

      {refused ? <span className="text-ink-3">{refused}</span> : null}

      {game.table ? (
        <>
          <SuspicionMeter seats={seats} suspicion={game.table.suspicion} />
          <Note title="Latest read">{game.table.reason}</Note>
        </>
      ) : null}

      <div className="flex gap-2">
        {canCall && !picking ? (
          <Button variant="ghost" className="flex-1" onClick={() => setPicking("call")}>
            Make your call
          </Button>
        ) : null}
        {!taken && view.phase !== "vote" && view.phase !== "lastGuess" ? (
          <Button variant="ghost" className="flex-1" onClick={() => setPicking("seat")}>
            Take a seat
          </Button>
        ) : null}
      </div>
    </section>
  );
}
