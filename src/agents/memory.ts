import type { PersonaId, PublicView } from "@/engine/types";
import { modelCall, MODELS, type ModelCall } from "./act";
import { scrubWord } from "@/engine/validate";
import { PERSONAS } from "./personas";
import { memoryPrompt } from "./prompts";
import { MemoryUpdate } from "./schemas";

/**
 * Plan §07, memory pipeline. After reveal, one call per persona returns ≤3 notes and a lobby
 * line. The client merges: new notes first, cap 10 per persona, stored in localStorage.
 */

export { mergeNotes, MAX_NOTES_PER_PERSONA } from "@/lib/notes";
const NOTE_CHARS = 100;
const LOBBY_CHARS = 60;

/** Plain-text recap of a revealed game from one persona's point of view. */
export function gameSummary(persona: PersonaId, view: PublicView): string {
  const name = (s: string) => (s === "you" ? "the human" : (PERSONAS[s as PersonaId]?.name ?? s));
  const r = view.result;
  const lines = [
    `Category: ${view.category}. Secret word: ${view.word ?? "unknown"}.`,
    r ? `The imposter was ${name(r.imposter)}. ${r.ejected ? `${name(r.ejected)} was voted out.` : "The vote tied; no one was ejected."} ${r.winner === "civilian" ? "Civilians won." : "The imposter won."}` : "",
    view.lastGuess ? `The imposter's last guess was "${view.lastGuess.word}" (${view.lastGuess.correct ? "right" : "wrong"}).` : "",
    "Clues:",
    ...view.clues.map((c) => `- ${name(c.seat)}: "${c.word}"`),
    "Discussion:",
    ...view.messages.map((m) => `- ${name(m.seat)}: ${m.text}`),
    "Votes:",
    ...view.votes.map((v) => `- ${name(v.seat)} voted for ${name(v.target)}${v.reason ? ` ("${v.reason}")` : ""}`),
    `Your private notes (${PERSONAS[persona].name}):`,
    ...(view.traces ?? []).filter((t) => t.seat === persona).map((t) => `- ${t.privateNote}`),
  ];
  return lines.filter(Boolean).join("\n");
}

export async function summarizeForPersona(
  persona: PersonaId,
  view: PublicView,
  existingNotes: string[],
  call: ModelCall = modelCall,
): Promise<MemoryUpdate> {
  const p = PERSONAS[persona];
  const { output } = await call({
    model: MODELS.memory,
    system: `You are ${p.name}. ${p.voice}`,
    prompt: memoryPrompt(p, gameSummary(persona, view), existingNotes),
    schema: MemoryUpdate,
  });
  // Notes ride into every later system prompt, the imposter's included; a repeat word set
  // must not arrive pre-solved.
  const clean = (t: string) => (view.word ? scrubWord(view.word, t) : t).trim();
  return {
    notes: (output.notes ?? []).map((n) => clean(n).slice(0, NOTE_CHARS)).filter(Boolean).slice(0, 3),
    lobbyLine: clean(output.lobbyLine ?? "").slice(0, LOBBY_CHARS),
  };
}
