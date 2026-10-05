import type { ReactNode } from "react";

/** One phone-width column. A mono top bar, then the screen. Plan §00 layout. */
export function Shell({ left, right, children }: { left: ReactNode; right?: ReactNode; children: ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-[440px] flex-1 flex-col gap-5 px-5 pb-8 pt-5">
      <header className="flex items-center justify-between gap-3 font-mono text-label text-ink-3">
        <span className="truncate">{left}</span>
        {right ? <span className="truncate text-right">{right}</span> : null}
      </header>
      {children}
    </main>
  );
}

export function Heading({ children }: { children: ReactNode }) {
  return <h1 className="text-heading">{children}</h1>;
}

export function Foot({ children }: { children: ReactNode }) {
  return <div className="mt-auto grid gap-2 pt-2">{children}</div>;
}

export function Label({ children, red }: { children: ReactNode; red?: boolean }) {
  return <span className={`font-mono text-label uppercase ${red ? "text-accent" : "text-ink-3"}`}>{children}</span>;
}
