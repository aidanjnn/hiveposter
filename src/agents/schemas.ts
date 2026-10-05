import { z } from "zod";

/**
 * Plan §06. One Zod schema per phase, used with `Output.object({ schema })` in act().
 *
 * Schemas stay loose on purpose: no numeric ranges, lengths, or exhaustive record keys,
 * because provider JSON-schema support for those keywords varies. act() clamps, trims,
 * and validates every field against the engine instead. Descriptions are read by the model.
 */

const seatId = z.enum(["you", "juno", "biscuit", "marlowe", "rook"]);

const suspicion = z
  .array(z.object({ seat: seatId, p: z.number().describe("0 to 1") }))
  .describe("For each OTHER player: how likely they are the imposter, 0 to 1.");

const privateNote = z
  .string()
  .describe("Your real thinking in under 200 characters. Nobody sees this until the game ends.");

export const CivilianClueMove = z.object({
  candidates: z
    .array(z.string())
    .describe("Exactly three one-word clues, ordered from most vague to most specific."),
  privateNote,
  suspicion,
});

export const ImposterClueMove = z.object({
  wordGuesses: z
    .array(z.object({ word: z.string(), p: z.number().describe("0 to 1") }))
    .describe("3 to 6 candidate secret words with probabilities, based on the clues so far."),
  clue: z.string().describe("One word that fits your top guesses and sounds like you know the word."),
  privateNote,
  suspicion: suspicion.describe(
    "For each OTHER player: how suspicious they look to the table, 0 to 1. Use it to steer blame.",
  ),
});

export const DiscussMove = z.object({
  text: z.string().describe("What you say out loud, under 140 characters, in your voice."),
  replyTo: seatId.optional().describe("The player you are answering or accusing, if any."),
  privateNote,
  suspicion,
});

export const VoteMove = z.object({
  target: seatId.describe("Who you vote out. Never yourself."),
  reason: z.string().describe("One short public line explaining the vote, under 90 characters."),
  confidence: z.number().describe("0 to 1"),
  privateNote,
  suspicion,
});

export const GuessMove = z.object({
  guess: z.string().describe("Your single best guess at the secret word."),
  privateNote,
});

export const MemoryUpdate = z.object({
  notes: z
    .array(z.string())
    .describe("Up to 3 short notes about the human player's style worth remembering, in your voice."),
  lobbyLine: z.string().describe("One line under 60 characters you'd say to them in the lobby tomorrow."),
});

export type CivilianClueMove = z.infer<typeof CivilianClueMove>;
export type ImposterClueMove = z.infer<typeof ImposterClueMove>;
export type DiscussMove = z.infer<typeof DiscussMove>;
export type VoteMove = z.infer<typeof VoteMove>;
export type GuessMove = z.infer<typeof GuessMove>;
export type MemoryUpdate = z.infer<typeof MemoryUpdate>;
