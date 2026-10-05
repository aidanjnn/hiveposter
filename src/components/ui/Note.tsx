import type { ReactNode } from "react";

/** Plan §00. Private note: hairline rule on the left, reads like a margin note. */
export function Note({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <div className="border-l border-line pl-2.5 text-ink-2">
      <b className="font-normal text-ink">{title}</b>
      <div>{children}</div>
    </div>
  );
}
