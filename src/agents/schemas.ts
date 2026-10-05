import { z } from "zod";

/**
 * Plan §06. One Zod schema per phase. Used with `Output.object({ schema })` in act().
 * Keep descriptions on fields: the model reads them.
 */

const seatId = z.enum(["you", "juno", "biscuit", "marlowe", "rook"]);
const suspicion = z
  .record(seatId, z.number().min(0).max(1))
  .describe("How likely each other player is the imposter, 0 to 1.");
const privateNote = z
  .string()
  .max(200)
  .describe("Your real thinking in under 200 characters. Nobody sees this until the game ends.");

export const CivilianClueMove = z.object({
  candidates: z
    .array(z.string())
    .length(3)
    .describe("Three one-word clues, ordered from vague to specific."),
  clue: z.string().describe("The candidate you would pick."),
  privateNote,
  suspicion,
});

export const ImposterClueMove = z.object({
  wordGuesses: z
    .record(z.string(), z.number().min(0).max(1))
    .describe("Likely secret words with probabilities, based on the clues so far."),
  clue: z.string().describe("A one-word clue that fits your top guesses and sounds like you know."),
  privateNote,
  suspicion,
});

export const DiscussMove = z.object({
  text: z.string().max(140),
  replyTo: seatId.optional(),
  privateNote,
  suspicion,
});

export const VoteMove = z.object({
  target: seatId,
  reason: z.string().max(90).describe("One public line explaining the vote."),
  confidence: z.number().min(0).max(1),
  privateNote,
  suspicion,
});

export const GuessMove = z.object({
  guess: z.string(),
  privateNote,
});

export const MemoryUpdate = z.object({
  notes: z
    .array(z.string().max(120))
    .max(3)
    .describe("Things about the human player's style worth remembering next time, in your voice."),
  lobbyLine: z.string().max(60).describe("One line you'd say to them in the lobby tomorrow."),
});

export type CivilianClueMove = z.infer<typeof CivilianClueMove>;
export type ImposterClueMove = z.infer<typeof ImposterClueMove>;
export type DiscussMove = z.infer<typeof DiscussMove>;
export type VoteMove = z.infer<typeof VoteMove>;
export type GuessMove = z.infer<typeof GuessMove>;
export type MemoryUpdate = z.infer<typeof MemoryUpdate>;
