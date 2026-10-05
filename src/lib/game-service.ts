import { z } from "zod";
import { createGame, EngineError, humanSeat, MESSAGE_CHARS } from "@/engine/game";
import { publicView } from "@/engine/view";
import type { GameState, HumanMove } from "@/engine/types";
import { PLAY_LINEUP, WATCH_LINEUP } from "@/agents/personas";
import { applyHumanMove, MoveError, runUntilHuman, type RunOptions } from "@/agents/runner";
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
  /** Always from the client: the daily seed is the player's local date (plan §04), not the server's. */
  seed: z.string().min(1).max(64),
  personas: z.array(personaId).optional(),
  memory: z.record(z.string(), z.array(z.string().max(200)).max(10)).optional(),
  grudges: z.record(z.string(), z.number().int().min(0).max(99)).optional(),
});

export const HumanBody = z.discriminatedUnion("type", [
  z.object({ type: z.literal("clue"), clue: z.string().max(40) }),
  z.object({ type: z.literal("message"), text: z.string().max(MESSAGE_CHARS), replyTo: seatId.optional() }),
  z.object({ type: z.literal("sure") }),
  z.object({ type: z.literal("vote"), target: seatId }),
  z.object({ type: z.literal("guess"), word: z.string().max(40) }),
  z.object({ type: z.literal("call"), target: seatId, seenPhase: z.enum(["clue1", "clue2", "discuss", "vote"]).optional() }),
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
    seed: body.seed,
    memory: body.memory as GameState["memory"],
    grudges: body.grudges as GameState["grudges"],
  });
  putGame(state);
  return state;
}

/**
 * Watch-mode moves that don't start agent turns: lock a call, take a seat. Applied under the
 * game lock so an in-flight turn can't overwrite them, and answered with plain JSON.
 */
export async function applyAside(id: string, move: Extract<HumanMove, { type: "call" | "takeSeat" }>): Promise<Response> {
  if (!getGame(id)) return badRequest(TABLE_RESET, 404);
  return withGame(id, async () => {
    const state = getGame(id);
    if (!state) return badRequest(TABLE_RESET, 404);
    try {
      const next = applyHumanMove(state, move);
      putGame(next);
      return Response.json({ view: viewOf(next) });
    } catch (err) {
      if (err instanceof MoveError || err instanceof EngineError) return badRequest(err.message);
      throw err;
    }
  });
}

/** Only the engine's and the runner's refusals are player copy; anything else stays on the server. */
function playerMessage(err: unknown, fallback: string): string {
  return err instanceof MoveError || err instanceof EngineError ? err.message : fallback;
}

/**
 * Stream the rest of a turn: optionally apply a human move first, then run agents until
 * the human is needed again or the phase changes. Validation errors come back as a 400
 * before any streaming. `opts` lets tests script the model call.
 */
export async function advance(id: string, move?: HumanMove, opts: RunOptions = {}): Promise<Response> {
  const current = getGame(id);
  if (!current) return badRequest(TABLE_RESET, 404);

  let afterMove = current;
  // A second "I'm sure" (button and timer together) is harmless: nothing to apply, keep going.
  if (move?.type === "sure" && current.phase !== "discuss") move = undefined;
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
      let state = afterMove;
      let applied = move !== undefined;
      // Re-read inside the lock in case another request advanced the table first. A move that
      // no longer fits (a double-tapped clue or vote the first request already applied) is
      // dropped rather than reported: the table is fine, the client just needs the view.
      const latest = getGame(id) ?? current;
      if (latest !== current) {
        state = latest;
        applied = false;
        if (move && !(move.type === "sure" && latest.phase !== "discuss")) {
          try {
            state = applyHumanMove(latest, move);
            applied = true;
          } catch (err) {
            if (!(err instanceof MoveError || err instanceof EngineError)) throw err;
          }
        }
      }
      putGame(state);
      if (applied && move?.type === "clue") stream.send({ type: "clue", clue: state.clues[state.clues.length - 1] });
      if (applied && move?.type === "message") stream.send({ type: "message", message: state.messages[state.messages.length - 1] });
      state = await runUntilHuman(state, { ...opts, emit: (e) => stream.send(e), onePhase: true });
      putGame(state);
      stream.send({ type: "view", view: viewOf(state) });
    } catch (err) {
      console.error(`advance ${id} failed`, err);
      stream.send({ type: "error", message: playerMessage(err, "Something went wrong. Try again.") });
    } finally {
      stream.close();
    }
  });
  return stream.response;
}
