import { z } from "zod";
import { createGame, humanSeat } from "@/engine/game";
import { EngineError } from "@/engine/game";
import { publicView } from "@/engine/view";
import { todaySeed } from "@/engine/words";
import type { GameState, HumanMove } from "@/engine/types";
import { PLAY_LINEUP, WATCH_LINEUP } from "@/agents/personas";
import { applyHumanMove, MoveError, runUntilHuman } from "@/agents/runner";
import { eventStream } from "./sse";
import { getGame, putGame, withGame } from "./store";

/**
 * Glue between the routes and the engine/runner (plan §08). Routes stay thin: parse,
 * call one of these, return the Response.
 */

const personaId = z.enum(["juno", "biscuit", "marlowe", "rook"]);
const seatId = z.enum(["you", "juno", "biscuit", "marlowe", "rook"]);

export const CreateBody = z.object({
  mode: z.enum(["play", "watch"]),
  playerId: z.string().min(1).max(64),
  seed: z.string().min(1).max(64).optional(),
  personas: z.array(personaId).optional(),
  memory: z.record(z.string(), z.array(z.string().max(200)).max(10)).optional(),
  grudges: z.record(z.string(), z.number().int().min(0).max(99)).optional(),
});

export const HumanBody = z.discriminatedUnion("type", [
  z.object({ type: z.literal("clue"), clue: z.string().max(40) }),
  z.object({ type: z.literal("message"), text: z.string().max(280), replyTo: seatId.optional() }),
  z.object({ type: z.literal("sure") }),
  z.object({ type: z.literal("vote"), target: seatId }),
  z.object({ type: z.literal("guess"), word: z.string().max(40) }),
  z.object({ type: z.literal("call"), target: seatId }),
  z.object({ type: z.literal("takeSeat"), seat: seatId }),
]);

export function viewOf(state: GameState) {
  return publicView(state, humanSeat(state) ?? "audience");
}

export function badRequest(message: string, status = 400): Response {
  return Response.json({ error: message }, { status });
}

export const TABLE_RESET = "Table reset. Deal again.";

export function create(body: z.infer<typeof CreateBody>): GameState {
  const personas = body.personas ?? (body.mode === "play" ? PLAY_LINEUP : WATCH_LINEUP);
  const state = createGame({
    mode: body.mode,
    personas,
    playerId: body.playerId,
    seed: body.seed ?? todaySeed(),
    memory: body.memory as GameState["memory"],
    grudges: body.grudges as GameState["grudges"],
  });
  putGame(state);
  return state;
}

/**
 * Stream the rest of a turn: optionally apply a human move first, then run agents until
 * the human is needed again. Validation errors come back as a 400 before any streaming.
 */
export async function advance(id: string, move?: HumanMove): Promise<Response> {
  const current = getGame(id);
  if (!current) return badRequest(TABLE_RESET, 404);

  let afterMove = current;
  if (move) {
    try {
      afterMove = applyHumanMove(current, move);
    } catch (err) {
      if (err instanceof MoveError || err instanceof EngineError) return badRequest(err.message);
      throw err;
    }
  }

  const stream = eventStream();
  void withGame(id, async () => {
    try {
      // Re-read inside the lock in case another request advanced the table first.
      let state = getGame(id) === current ? afterMove : getGame(id)!;
      if (move && state !== afterMove) {
        state = applyHumanMove(state, move);
      }
      putGame(state);
      if (move?.type === "clue") stream.send({ type: "clue", clue: state.clues[state.clues.length - 1] });
      if (move?.type === "message") stream.send({ type: "message", message: state.messages[state.messages.length - 1] });
      state = await runUntilHuman(state, { emit: (e) => stream.send(e) });
      putGame(state);
      stream.send({ type: "view", view: viewOf(state) });
    } catch (err) {
      stream.send({ type: "error", message: err instanceof Error ? err.message : "Something went wrong." });
    } finally {
      stream.close();
    }
  });
  return stream.response;
}
