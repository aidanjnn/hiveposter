/** Plan §00. A filled chip; pending is a dashed outline in lowercase. */
export function Clue({ word, pending, fallback }: { word: string; pending?: boolean; fallback?: boolean }) {
  if (pending) {
    return <span className="inline-block rounded border border-dashed border-line px-2.5 py-1 text-ink-3 lowercase">{word}</span>;
  }
  return (
    <span className="appear inline-block rounded bg-surface-2 px-2.5 py-1 text-ink" title={fallback ? "Fallback clue: the model didn't answer in time" : undefined}>
      {word}
      {fallback ? <sup className="ml-0.5 text-ink-3">*</sup> : null}
    </span>
  );
}
