/** Plan §09. 2px bar that drains as the discussion clock runs. White, like every meter: red is not for urgency (§00). */
export function Timer({ fraction }: { fraction: number }) {
  return (
    <div className="h-[2px] bg-line" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(fraction * 100)}>
      <i className="block h-full bg-ink transition-[width] duration-1000 ease-linear" style={{ width: `${Math.max(0, Math.min(1, fraction)) * 100}%` }} />
    </div>
  );
}
