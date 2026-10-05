import type { SeatId } from "@/engine/types";
import { nameOf } from "@/lib/outcome";
import { Meter } from "./ui/Meter";

/** Table-average suspicion per seat. Plan §00 component, §10 Watch mode. */
export function SuspicionMeter({ seats, suspicion }: { seats: SeatId[]; suspicion: Partial<Record<SeatId, number>> }) {
  return (
    <div className="grid gap-1.5">
      {seats.map((s) => (
        <Meter key={s} label={nameOf(s)} value={suspicion[s] ?? 0} />
      ))}
    </div>
  );
}
