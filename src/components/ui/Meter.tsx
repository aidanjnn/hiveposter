/** Plan §00. 2px track, white fill, mono value. No color. */
export function Meter({ label, value }: { label: string; value: number }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div className="grid grid-cols-[64px_1fr_34px] items-center gap-2 text-[13px] text-ink-2">
      <span className="truncate">{label}</span>
      <span className="h-[2px] bg-line">
        <i className="block h-full bg-ink transition-[width] duration-300" style={{ width: `${pct}%` }} />
      </span>
      <span className="text-right font-mono text-label text-ink-3">{value.toFixed(2).replace(/^0/, "")}</span>
    </div>
  );
}
