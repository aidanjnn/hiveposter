import type { PersonaId, PublicView, SeatId } from "@/engine/types";
import { PERSONAS } from "@/agents/personas";

/**
 * Pure helpers that read a revealed PublicView on the client: names, verdict copy, score,
 * grudges, watch-call points, and the share card text. Mirrors the engine's rules (plan §02)
 * without needing server-only state.
 */

export function nameOf(seat: SeatId): string {
  return seat === "you" ? "You" : PERSONAS[seat].name;
}

export function me(view: PublicView): SeatId | undefined {
  return view.seats.find((s) => s.kind === "human")?.id;
}

export function setLabel(view: Pick<PublicView, "setId" | "category">): string {
  return `${view.setId > 0 ? `#${view.setId}` : "Practice"} · ${view.category}`;
}

export function roundLabel(phase: PublicView["phase"]): string {
  switch (phase) {
    case "clue1":
      return "Clues · R1";
    case "clue2":
      return "Clues · R2";
    case "discuss":
      return "Discussion";
    case "vote":
      return "Vote";
    case "lastGuess":
      return "Last guess";
    case "reveal":
      return "Reveal";
    default:
      return "";
  }
}

export interface Verdict {
  label: string;
  headline: string;
  detail: string;
  civiliansWon: boolean;
}

export function verdict(view: PublicView): Verdict | null {
  const r = view.result;
  if (!r || view.phase !== "reveal") return null;
  const self = me(view);
  const imp = nameOf(r.imposter);
  const civiliansWon = r.winner === "civilian";
  const label = r.imposter === self ? "You were the imposter" : `${imp} was the imposter`;
  let headline: string;
  if (r.imposter === self) headline = civiliansWon ? "Caught." : "You got away.";
  else headline = civiliansWon ? "Caught." : "Got away.";

  let detail: string;
  if (!r.ejected) detail = "The vote tied. No one left the table.";
  else if (r.ejected !== r.imposter) detail = `${nameOf(r.ejected)} was voted out, and ${r.ejected === "you" ? "you weren't" : "wasn't"} the imposter.`;
  else if (view.lastGuess) detail = `Last guess: "${view.lastGuess.word}". ${view.lastGuess.correct ? "Right. The imposter steals it." : "Wrong."}`;
  else detail = `${imp} was voted out.`;
  return { label, headline, detail, civiliansWon };
}

/** Plan §02 scoring for the human seat. */
export function scoreOf(view: PublicView): number {
  const r = view.result;
  const self = me(view);
  if (!r || !self || view.phase !== "reveal") return 0;
  if (r.imposter === self) {
    if (r.ejected !== self) return 2;
    return view.lastGuess?.correct ? 3 : 0;
  }
  let score = r.winner === "civilian" ? 1 : 0;
  if (view.votes.find((v) => v.seat === self)?.target === r.imposter) score += 1;
  return score;
}

export function humanWon(view: PublicView): boolean {
  const r = view.result;
  const self = me(view);
  if (!r || !self) return false;
  return r.imposter === self ? r.winner === "imposter" : r.winner === "civilian";
}

/** Same rule as engine grudgeChanges, from the revealed view. */
export function grudgeChanges(view: PublicView): Partial<Record<PersonaId, number | "reset">> {
  const r = view.result;
  const self = me(view);
  if (!r || !self) return {};
  const changes: Partial<Record<PersonaId, number | "reset">> = {};
  const myVote = view.votes.find((v) => v.seat === self)?.target;
  for (const seat of view.seats) {
    if (!seat.persona) continue;
    if (myVote === seat.id && seat.id !== r.imposter) changes[seat.persona] = 1;
    const theirs = view.votes.find((v) => v.seat === seat.id)?.target;
    if (r.imposter === self && theirs === self) changes[seat.persona] = "reset";
  }
  return changes;
}

const CALL_POINTS: Partial<Record<PublicView["phase"], number>> = { clue1: 3, clue2: 2, discuss: 1 };

export function callPoints(view: PublicView): number {
  if (!view.watchCall || !view.result) return 0;
  if (view.watchCall.target !== view.result.imposter) return 0;
  return CALL_POINTS[view.watchCall.lockedAtPhase] ?? 0;
}

export function callWorth(phase: PublicView["phase"]): number {
  return CALL_POINTS[phase] ?? 0;
}

/** Plain-text share card. No spoilers: names the outcome, not the word. */
export function shareText(view: PublicView): string {
  const v = verdict(view);
  const self = me(view);
  const r = view.result!;
  const myClue = self ? view.clues.find((c) => c.seat === self && c.round === 1)?.word : undefined;
  const line =
    view.mode === "watch" && !self
      ? `Watched ${nameOf(r.imposter)} ${v?.civiliansWon ? "get caught" : "get away"}${view.watchCall ? `. My call: ${callPoints(view) > 0 ? "right" : "wrong"}` : ""}.`
      : r.imposter === self
        ? v?.civiliansWon
          ? "I was the imposter. They caught me."
          : "I was the imposter. I got away."
        : v?.civiliansWon
          ? `Caught ${nameOf(r.imposter)}.`
          : `${nameOf(r.imposter)} got away.`;
  return [`Imposter ${setLabel(view)}`, line, myClue ? `My clue: ${myClue}` : ""].filter(Boolean).join("\n");
}
