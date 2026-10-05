import type { AgentTrace, GameState, Phase, SeatId } from "@/engine/types";
import type { Clue, Message, Vote } from "@/engine/types";

/**
 * Plan §06. One function: build the seat view, build the prompt, call the model with a schema,
 * validate against the engine, retry once, fall back. Every call writes a trace.
 *
 * Model routing (plan §11): civilians on MODELS.civilian, the imposter seat on MODELS.imposter.
 * Through the AI Gateway these are plain "provider/model" strings and need only AI_GATEWAY_API_KEY.
 *
 * SDK notes: see NOTES.md. Structured output is `generateText({ model, output: Output.object({ schema }), ... })`
 * from the bundled docs at node_modules/ai/docs/03-ai-sdk-core/10-generating-structured-data.mdx.
 */

export const MODELS = {
  civilian: process.env.MODEL_CIVILIAN ?? "anthropic/claude-haiku-4.5",
  imposter: process.env.MODEL_IMPOSTER ?? "anthropic/claude-sonnet-5.5",
  memory: process.env.MODEL_MEMORY ?? "anthropic/claude-haiku-4.5",
} as const;

/** Per-call timeout. On timeout the fallback path runs so the game never stalls. */
export const CALL_TIMEOUT_MS = 12_000;

export type ActResult<M> = { move: M; trace: AgentTrace };

export function actClue(state: GameState, seat: SeatId): Promise<ActResult<Clue>> {
  throw new Error("TODO(agents): actClue");
}

export function actDiscuss(
  state: GameState,
  seat: SeatId,
  askedBy?: { seat: SeatId; text: string },
): Promise<ActResult<Message>> {
  throw new Error("TODO(agents): actDiscuss");
}

export function actVote(state: GameState, seat: SeatId): Promise<ActResult<Vote>> {
  throw new Error("TODO(agents): actVote");
}

export function actLastGuess(state: GameState, seat: SeatId): Promise<ActResult<{ word: string }>> {
  throw new Error("TODO(agents): actLastGuess");
}

/** Which model a seat uses for a phase. */
export function modelFor(state: GameState, seat: SeatId, phase: Phase): string {
  throw new Error("TODO(agents): modelFor");
}
