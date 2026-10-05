import type { SeatId, SeatView } from "@/engine/types";
import type { Persona } from "./personas";
import { PERSONAS } from "./personas";

/**
 * Plan §06. System prompt shared across phases; one user prompt builder per phase.
 * Builders take a SeatView and nothing else, so the imposter can't be told the word by accident.
 */

export function seatName(seat: SeatId): string {
  return seat === "you" ? "the human" : PERSONAS[seat].name;
}

function seatList(view: SeatView): string {
  return view.players
    .map((p) => `${p}${p === "you" ? " (the human player)" : ""}${p === view.seat ? " (you)" : ""}`)
    .join(", ");
}

function others(view: SeatView): string {
  return view.players.filter((p) => p !== view.seat).join(", ");
}

function cluesBlock(view: SeatView): string {
  if (view.clues.length === 0) return "No clues have been given yet.";
  return view.clues.map(([seat, round, word]) => `- round ${round}, ${seat}: "${word}"`).join("\n");
}

function messagesBlock(view: SeatView): string {
  if (view.messages.length === 0) return "Nobody has spoken yet.";
  return view.messages
    .map((m) => `- ${m.seat}${m.replyTo ? ` (to ${m.replyTo})` : ""}: ${m.text}`)
    .join("\n");
}

function notesBlock(view: SeatView): string {
  const notes = view.myPriorNotes.slice(-4);
  if (notes.length === 0) return "";
  return `\nYour private notes from earlier this game:\n${notes.map((n) => `- ${n}`).join("\n")}`;
}

function suspicionLine(view: SeatView): string {
  const entries = Object.entries(view.myPriorSuspicion);
  if (entries.length === 0) return "";
  return `\nYour current suspicion: ${entries.map(([s, p]) => `${s} ${Number(p).toFixed(2)}`).join(", ")}.`;
}

function secretLine(view: SeatView): string {
  return view.word === null
    ? `You are the IMPOSTER. You do NOT know the secret word. You only know the category: ${view.category}.`
    : `You are a civilian. Category: ${view.category}. The secret word is "${view.word}".`;
}

export function systemPrompt(persona: Persona, view: SeatView): string {
  const k = persona.knobs;
  const memory = view.memoryOfHuman.length
    ? `\nWhat you remember about the human from earlier games:\n${view.memoryOfHuman.map((n) => `- ${n}`).join("\n")}`
    : "";
  const grudge = view.grudge > 0 ? `\nYou hold a grudge against the human (${view.grudge} game${view.grudge === 1 ? "" : "s"}).` : "";
  return `You are ${persona.name}, a player in a 4-player social deduction word game called Imposter.
${persona.voice}

Rules: one player is the imposter and knows only the category. Civilians know the secret word. Everyone gives one-word clues for two rounds, then there is a short discussion, then a vote. Civilians win by voting out the imposter. The imposter wins by surviving the vote, or, if caught, by guessing the word. A tie ejects no one.

Players (seat ids): ${seatList(view)}.

How you play: ${persona.playbook}
Your tendencies are part of who you are:
- Clue specificity: ${k.specificity}/10 (10 = revealing clues)
- How fast you change your mind: ${k.updateRate}/10
- Bluffing skill as imposter: ${k.bluff}/10
- Chaos: ${k.chaos}/10 (10 = sometimes act on a hunch)${memory}${grudge}

Answer only with the structured output requested. privateNote is your real thinking, under 200 characters, plain and honest. Never reveal your role or the secret word in anything public.`;
}

function round(view: SeatView): 1 | 2 {
  return view.clues.length >= view.players.length ? 2 : 1;
}

export function civilianCluePrompt(view: SeatView): string {
  return `${secretLine(view)}
Clue round ${round(view)}. Clues so far:
${cluesBlock(view)}${notesBlock(view)}

Give exactly three one-word candidate clues, ordered from most vague to most specific. A good clue proves you know the word to other civilians without letting the imposter guess it. Each candidate must be a single word (letters, hyphen allowed), must not be the secret word, must not share its first four letters, and must not repeat a clue already given.

Then rate each other player (${others(view)}) from 0 to 1 for how likely they are the imposter. A clue that fits the category but not this specific word is suspicious. A player who has not given a clue yet stays near 0.33.`;
}

export function imposterCluePrompt(view: SeatView): string {
  return `${secretLine(view)}
Clue round ${round(view)}. Clues so far:
${cluesBlock(view)}${notesBlock(view)}

1. wordGuesses: list 3 to 6 words the secret word could be, with probabilities, using the clues above. If there are no clues yet, guess from the category.
2. clue: one word that fits your most likely guesses, so civilians think you know the word. Too vague looks guilty; naming a guess outright risks being wrong. It must not repeat a clue already given.
3. suspicion: for each other player (${others(view)}), how suspicious they look to the rest of the table, 0 to 1. You will try to steer blame toward the highest one.`;
}

export function discussPrompt(view: SeatView, askedBy?: { seat: SeatId; text: string }): string {
  const ask = askedBy
    ? `\n${seatName(askedBy.seat)} (${askedBy.seat}) just said to you: "${askedBy.text}". Answer them directly.`
    : "\nOpen the discussion: accuse whoever you suspect most and quote their clue as evidence, or defend yourself if you have been accused.";
  return `${secretLine(view)}
All clues:
${cluesBlock(view)}

Discussion so far:
${messagesBlock(view)}${notesBlock(view)}${suspicionLine(view)}
${ask}

Say one thing, under 140 characters, in your own voice. Never say the secret word. Update your suspicion of each other player (${others(view)}) given everything said.`;
}

export function votePrompt(view: SeatView): string {
  return `${secretLine(view)}
All clues:
${cluesBlock(view)}

Discussion:
${messagesBlock(view)}${notesBlock(view)}${suspicionLine(view)}

Vote now for who to eject: one of ${others(view)}. You cannot vote for yourself. Give a one-line public reason under 90 characters, your confidence from 0 to 1, and your final suspicion of each other player.`;
}

export function lastGuessPrompt(view: SeatView): string {
  return `${secretLine(view)}
You were voted out. If you guess the secret word now, you still win.
All clues:
${cluesBlock(view)}${notesBlock(view)}

Give your single best guess at the secret word.`;
}

/** Post-game. The game is over, so the summary may include everything. The persona's voice is in the system prompt. */
export function memoryPrompt(gameSummary: string, existingNotes: string[]): string {
  const existing = existingNotes.length
    ? `\nNotes you already have about the human:\n${existingNotes.map((n) => `- ${n}`).join("\n")}`
    : "";
  return `A game of Imposter just ended. Here is what happened:
${gameSummary}
${existing}

Write up to 3 new short notes (under 100 characters each) about how the human plays: their clue style, how they bluff, how they vote, anything they did to you. Do not repeat notes you already have. Then write one line, under 60 characters, that you would say to the human in the lobby tomorrow, in your voice, referencing this game.`;
}

/** Retry suffix when the engine rejected a clue. */
export function clueRejectedSuffix(clue: string, reason: string): string {
  return `\n\nYour clue "${clue}" was rejected: ${reason} Give different candidates.`;
}
