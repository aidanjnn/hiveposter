"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { PublicView, SeatId } from "@/engine/types";
import type { Game } from "./useGame";
import { me, nameOf, setLabel } from "@/lib/outcome";
import { Button } from "./ui/Button";
import { Dot } from "./ui/Dot";
import { Input } from "./ui/Input";
import { Timer } from "./ui/Timer";
import { Shell } from "./Shell";

const DISCUSSION_S = 60;
const HUMAN_CAP = 4;

/** Plan §09, Discussion. Plain text, names in grey. @chips prefill. "I'm sure" ends early. */
export function Discussion({ game, view, side }: { game: Game; view: PublicView; side?: React.ReactNode }) {
  const self = me(view);
  const [left, setLeft] = useState(DISCUSSION_S);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const ended = useRef(false);
  const listRef = useRef<HTMLDivElement>(null);
  const myTurn = Boolean(self) && game.waiting?.for === "message";
  const used = view.messages.filter((m) => m.seat === self).length;

  // The clock starts once the openers are in and it's the human's move.
  useEffect(() => {
    if (!myTurn) return;
    const t = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [myTurn]);

  useEffect(() => {
    if (left > 0 || ended.current || !self) return;
    ended.current = true;
    void game.send({ type: "sure" });
  }, [left, self, game]);

  useEffect(() => {
    listRef.current?.lastElementChild?.scrollIntoView({ block: "nearest" });
  }, [view.messages.length]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    const mention = view.seats.find((s) => s.persona && text.toLowerCase().includes(`@${s.id}`))?.id as SeatId | undefined;
    const refused = await game.send({ type: "message", text, ...(mention ? { replyTo: mention } : {}) });
    if (refused) setError(refused);
    else setText("");
  }

  const typing = game.busy && view.messages.length >= view.seats.filter((s) => s.kind === "agent").length;

  return (
    <Shell left="Discussion" right={self ? `0:${String(left).padStart(2, "0")}` : setLabel(view)}>
      {side}
      {self ? <Timer fraction={left / DISCUSSION_S} /> : null}
      <div ref={listRef} className="grid gap-3">
        {view.messages.map((m, i) => (
          <div key={`${m.seat}-${i}`} className="appear grid gap-0.5">
            <span className="flex items-center gap-1.5 text-label text-ink-3">
              <Dot seat={m.seat} />
              {nameOf(m.seat)}
              {m.replyTo ? <span>→ {nameOf(m.replyTo)}</span> : null}
            </span>
            <p className={m.seat === self ? "text-ink-2" : "text-ink"}>{m.text}</p>
          </div>
        ))}
        {game.busy ? <span className="text-label text-ink-3">{typing ? "Someone is typing…" : "The table is talking…"}</span> : null}
      </div>

      {self ? (
        <form onSubmit={submit} className="mt-auto grid gap-2">
          <div className="flex flex-wrap items-center gap-3 text-label text-ink-3">
            {view.seats
              .filter((s) => s.persona)
              .map((s) => (
                <button key={s.id} type="button" className="hover:text-ink" onClick={() => setText(`@${s.id} `)}>
                  @{nameOf(s.id)}
                </button>
              ))}
            <Button variant="text" className="ml-auto text-ink" disabled={game.busy} onClick={() => game.send({ type: "sure" })}>
              I&apos;m sure
            </Button>
          </div>
          <div className="flex gap-2">
            <Input
              id="message-input"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setError(null);
              }}
              maxLength={140}
              placeholder={used >= HUMAN_CAP ? "Out of messages. Tap I'm sure." : "Say something"}
              disabled={!myTurn || game.busy || used >= HUMAN_CAP}
              invalid={Boolean(error)}
              className="flex-1"
            />
            <Button type="submit" disabled={!myTurn || game.busy || used >= HUMAN_CAP}>
              Send
            </Button>
          </div>
          <span className="min-h-5 text-ink-3">{error}</span>
        </form>
      ) : null}
    </Shell>
  );
}
