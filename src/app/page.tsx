/**
 * The whole game lives on this one route, driven by view.phase (plan §09).
 * Placeholder until the screens are built; it exists so the design tokens can be checked in a browser.
 */
export default function Home() {
  return (
    <main className="flex flex-1 flex-col gap-gap px-5 py-6 max-w-[480px] w-full mx-auto">
      <header className="flex justify-between font-mono text-label text-ink-3">
        <span>Imposter: The Table</span>
        <span>scaffold</span>
      </header>

      <h1 className="text-heading">Tonight&apos;s table</h1>

      <ul className="grid gap-px bg-line border border-line rounded overflow-hidden">
        {[
          ["juno", "Juno", "The overthinker"],
          ["biscuit", "Biscuit", "Chaos golden retriever"],
          ["marlowe", "Marlowe", "Smooth liar"],
        ].map(([id, name, tagline]) => (
          <li key={id} className="bg-surface px-3 py-2.5 grid gap-px">
            <span className="flex items-center gap-2">
              <i className={`size-2 rounded-full bg-seat-${id}`} aria-hidden="true" />
              {name}
            </span>
            <span className="text-ink-3 text-label">{tagline}</span>
          </li>
        ))}
      </ul>

      <p className="text-ink-2">
        Screens, engine, and agents are stubbed under <code className="font-mono text-ink-2">src/</code>. See{" "}
        <code className="font-mono text-ink-2">README.md</code> for the plan.
      </p>

      <div className="mt-auto grid gap-2">
        <button
          type="button"
          className="rounded bg-accent text-white px-3 py-2 text-[14px] leading-[18px]"
          disabled
        >
          Deal
        </button>
      </div>
    </main>
  );
}
