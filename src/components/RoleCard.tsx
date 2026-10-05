"use client";

import { useState } from "react";
import type { PublicView } from "@/engine/types";
import { setLabel } from "@/lib/outcome";
import { Button } from "./ui/Button";
import { Foot, Label, Shell } from "./Shell";

/** Plan §09, Role card. The only 28px text besides the verdict. Imposter: red label, no word. */
export function RoleCard({ view, onReady }: { view: PublicView; onReady: () => void }) {
  const [hidden, setHidden] = useState(false);
  const imposter = view.yourRole === "imposter";
  return (
    <Shell left="Your card" right={setLabel(view)}>
      <button
        type="button"
        onClick={() => setHidden((h) => !h)}
        className="appear my-auto grid gap-2 border-y border-line py-6 text-left"
        aria-label={hidden ? "Show your card" : "Hide your card"}
      >
        <Label red={imposter}>
          {imposter ? "Imposter" : "Civilian"} · {view.category}
        </Label>
        {hidden ? (
          <span className="text-display text-ink-3">Hidden</span>
        ) : imposter ? (
          <span className="text-display">You don&apos;t know the word.</span>
        ) : (
          <span className="text-display capitalize">{view.word}</span>
        )}
        <span className="text-ink-2">
          {imposter
            ? "Everyone else does. Listen to their clues and blend in."
            : "One player at this table doesn't know this word."}
        </span>
        <span className="font-mono text-label text-ink-3">{hidden ? "tap to show" : "tap to hide"}</span>
      </button>
      <Foot>
        <Button onClick={onReady}>I&apos;m ready</Button>
      </Foot>
    </Shell>
  );
}
