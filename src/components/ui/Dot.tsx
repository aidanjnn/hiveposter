import type { SeatId } from "@/engine/types";

/** Plan §00. Players are 8px dots, never avatars. Static class names so Tailwind sees them. */
const SEAT_BG: Record<SeatId, string> = {
  you: "bg-seat-you",
  juno: "bg-seat-juno",
  biscuit: "bg-seat-biscuit",
  marlowe: "bg-seat-marlowe",
  rook: "bg-seat-rook",
};

export function Dot({ seat, className = "" }: { seat: SeatId; className?: string }) {
  return <i aria-hidden="true" className={`inline-block size-2 shrink-0 rounded-full ${SEAT_BG[seat]} ${className}`} />;
}
