import { generateText, Output } from "ai";
import type { z } from "zod";
import { seatOf } from "@/engine/game";
import { scrubSecret, validateClue, validateVote } from "@/engine/validate";
import { seatView } from "@/engine/view";
import type { AgentTrace, Clue, GameState, Message, Phase, SeatId, SeatView, Vote } from "@/engine/types";
import { PERSONAS, type Persona } from "./personas";
import {
  civilianCluePrompt,
  clueRejectedSuffix,
  discussPrompt,
  imposterCluePrompt,
  lastGuessPrompt,
  systemPrompt,
  votePrompt,
} from "./prompts";
import { CivilianClueMove, DiscussMove, GuessMove, ImposterClueMove, VoteMove } from "./schemas";

/**
 * Plan §06. Each act function builds the seat view, calls the model with a schema,
 * validates the answer against the engine, retries once, then falls back. They never
 * throw: a failed or slow model call becomes a flagged fallback move, so the game never
 * stalls. Every call returns a trace for Brain Replay.
 *
 * Model routing (plan §11): civilians use MODELS.civilian, the imposter seat MODELS.imposter.
 * Through the AI Gateway these are plain "provider/model" strings; AI_GATEWAY_API_KEY is read
 * by the SDK. Structured output is generateText + Output.object (see NOTES.md).
 */

export interface Models {
  civilian: string;
  imposter: string;
  memory: string;
}

export const MODELS: Models = {
  civilian: process.env.MODEL_CIVILIAN ?? "anthropic/claude-haiku-4.5",
  imposter: process.env.MODEL_IMPOSTER ?? "anthropic/claude-sonnet-5.5",
  memory: process.env.MODEL_MEMORY ?? "anthropic/claude-haiku-4.5",
};

/** Per-call timeout. On timeout the fallback path runs. */
export const CALL_TIMEOUT_MS = 12_000;
/** Used after a set's own generic clues run out. Vague on purpose: a fallback looks suspicious. */
const SAFE_FALLBACKS = ["classic", "common", "familiar", "everyday", "typical", "obvious", "simple", "normal"];
const NOTE_CHARS = 200;
const REASON_CHARS = 90;
const MESSAGE_CHARS = 140;

export interface ActOptions {
  models?: Partial<Models>;
  /** Injected for deterministic tests and the simulator. */
  rand?: () => number;
  /** Replaces the model call; used by tests to script answers. */
  call?: ModelCall;
}

export type ActResult<M> = { move: M; trace: AgentTrace };

export type ModelCall = <S extends z.ZodType>(req: {
  model: string;
  system: string;
  prompt: string;
  schema: S;
}) => Promise<{ output: z.infer<S>; costUsd?: number; inputTokens?: number; outputTokens?: number }>;

/** The real model call through the AI SDK. */
export const gatewayCall: ModelCall = async ({ model, system, prompt, schema }) => {
  const result = await generateText({
    model,
    system,
    prompt,
    output: Output.object({ schema }),
    timeout: CALL_TIMEOUT_MS,
    // act() owns the retry policy; SDK retries would stack on top of it and the timeout.
    maxRetries: 0,
  });
  const gateway = result.providerMetadata?.gateway as { cost?: string | number } | undefined;
  const cost = gateway?.cost !== undefined ? Number(gateway.cost) : undefined;
  return {
    output: result.output as z.infer<typeof schema>,
    costUsd: Number.isFinite(cost) ? cost : undefined,
    inputTokens: result.usage.inputTokens,
    outputTokens: result.usage.outputTokens,
  };
};

export function modelFor(state: GameState, seat: SeatId, models: Models = MODELS): string {
  return seatOf(state, seat).role === "imposter" ? models.imposter : models.civilian;
}

interface Ctx {
  state: GameState;
  seat: SeatId;
  view: SeatView;
  persona: Persona;
  model: string;
  rand: () => number;
  call: ModelCall;
  /** Last model-call failure this turn, if any; recorded on a fallback trace. */
  error?: string;
}

function context(state: GameState, seat: SeatId, opts: ActOptions = {}): Ctx {
  const s = seatOf(state, seat);
  if (!s.persona) throw new Error(`seat ${seat} has no persona`);
  return {
    state,
    seat,
    view: seatView(state, seat),
    persona: PERSONAS[s.persona],
    model: modelFor(state, seat, { ...MODELS, ...opts.models }),
    rand: opts.rand ?? Math.random,
    call: opts.call ?? gatewayCall,
  };
}

const clamp01 = (n: unknown) => (typeof n === "number" && Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : undefined);
const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Persona update rate applied in code (ADR 0005): new = prev + (model − prev) × rate/10.
 * Drops self and unknown seats, clamps to [0,1], fills missing seats with the prior.
 */
export function blendSuspicion(
  ctx: Pick<Ctx, "view" | "seat" | "persona">,
  raw: { seat: SeatId; p: number }[] | undefined,
): AgentTrace["suspicion"] {
  const rate = ctx.persona.knobs.updateRate / 10;
  const others = ctx.view.players.filter((p) => p !== ctx.seat);
  const neutral = round2(1 / others.length);
  const fromModel = new Map<SeatId, number>();
  for (const entry of raw ?? []) {
    const p = clamp01(entry?.p);
    if (p !== undefined && others.includes(entry.seat)) fromModel.set(entry.seat, p);
  }
  const out: AgentTrace["suspicion"] = {};
  for (const seat of others) {
    const prev = ctx.view.myPriorSuspicion[seat] ?? neutral;
    const next = fromModel.get(seat);
    out[seat] = round2(next === undefined ? prev : prev + (next - prev) * rate);
  }
  return out;
}

/** Highest-suspicion seats, most suspicious first. */
function ranked(suspicion: AgentTrace["suspicion"]): SeatId[] {
  return (Object.entries(suspicion) as [SeatId, number][]).sort((a, b) => b[1] - a[1]).map(([s]) => s);
}

function trace(ctx: Ctx, phase: Phase, fields: Partial<AgentTrace> & { privateNote?: string }, started: number): AgentTrace {
  return {
    seat: ctx.seat,
    phase,
    at: Date.now(),
    privateNote: (fields.privateNote ?? "").trim().slice(0, NOTE_CHARS),
    suspicion: fields.suspicion ?? ctx.view.myPriorSuspicion,
    model: ctx.model,
    latencyMs: Date.now() - started,
    ...(fields.wordGuesses ? { wordGuesses: fields.wordGuesses } : {}),
    ...(fields.retried ? { retried: true } : {}),
    ...(fields.demoted ? { demoted: true } : {}),
    ...(fields.hunch ? { hunch: true } : {}),
    ...(fields.fallback ? { fallback: true } : {}),
    ...(fields.costUsd !== undefined ? { costUsd: fields.costUsd } : {}),
    ...(fields.fallback && ctx.error ? { error: ctx.error } : {}),
  };
}

async function tryCall<S extends z.ZodType>(
  ctx: Ctx,
  prompt: string,
  schema: S,
): Promise<{ output: z.infer<S>; costUsd?: number } | { error: string }> {
  try {
    const r = await ctx.call({ model: ctx.model, system: systemPrompt(ctx.persona, ctx.view), prompt, schema });
    return { output: r.output, costUsd: r.costUsd };
  } catch (err) {
    // Keep the status and message so the sim can tell a 403 from a timeout.
    const e = err as { statusCode?: number; message?: string };
    ctx.error = `${e?.statusCode ?? ""} ${String(e?.message ?? "model call failed")}`.trim().slice(0, 120);
    return { error: ctx.error };
  }
}

const addCost = (a?: number, b?: number) => (a === undefined && b === undefined ? undefined : (a ?? 0) + (b ?? 0));

/** Specificity knob picks which of the model's ranked candidates is played (ADR 0005). */
export function candidateIndex(specificity: number): number {
  return specificity >= 8 ? 2 : specificity >= 4 ? 1 : 0;
}

function wordGuessMap(raw: { word: string; p: number }[] | undefined): Record<string, number> | undefined {
  const out: Record<string, number> = {};
  for (const g of raw ?? []) {
    const p = clamp01(g?.p);
    const w = g?.word?.trim().toLowerCase();
    if (w && p !== undefined) out[w] = round2(p);
  }
  return Object.keys(out).length ? out : undefined;
}

export async function actClue(state: GameState, seat: SeatId, opts?: ActOptions): Promise<ActResult<Omit<Clue, "round">>> {
  const ctx = context(state, seat, opts);
  const started = Date.now();
  const imposter = ctx.view.word === null;
  const phase = state.phase;
  let prompt = imposter ? imposterCluePrompt(ctx.view) : civilianCluePrompt(ctx.view);
  let cost: number | undefined;

  for (let attempt = 0; attempt < 2; attempt++) {
    const r = imposter
      ? await tryCall(ctx, prompt, ImposterClueMove)
      : await tryCall(ctx, prompt, CivilianClueMove);
    if ("error" in r) break;
    cost = addCost(cost, r.costUsd);

    // Civilians: the knob's pick first, then the others. Playing a later one is flagged
    // `demoted` so the sim counts it as a rejection. Imposter: its one clue.
    let options: string[];
    if (imposter) {
      options = [(r.output as ImposterClueMove).clue];
    } else {
      const c = ((r.output as CivilianClueMove).candidates ?? []).map(String);
      const i = Math.min(candidateIndex(ctx.persona.knobs.specificity), Math.max(0, c.length - 1));
      options = [c[i], ...c.filter((_, j) => j !== i)].filter(Boolean);
    }
    let rejected: { clue: string; reason: string } | undefined;
    for (const option of options) {
      const check = validateClue(state, option, seat);
      if (check.ok) {
        return {
          move: { seat, word: check.clue },
          trace: trace(
            ctx,
            phase,
            {
              privateNote: r.output.privateNote,
              suspicion: blendSuspicion(ctx, r.output.suspicion),
              wordGuesses: imposter ? wordGuessMap((r.output as ImposterClueMove).wordGuesses) : undefined,
              retried: attempt > 0,
              demoted: rejected !== undefined,
              costUsd: cost,
            },
            started,
          ),
        };
      }
      rejected ??= { clue: option, reason: check.reason };
    }
    prompt += clueRejectedSuffix(rejected?.clue ?? "", rejected?.reason ?? "Give a valid one-word clue.");
  }

  const generic = [...state.wordSet.generic, ...SAFE_FALLBACKS].find((g) => validateClue(state, g, seat).ok) ?? "pass";
  return {
    move: { seat, word: generic, fallback: true },
    trace: trace(ctx, phase, { privateNote: "Couldn't come up with a clue in time; played it safe.", fallback: true, costUsd: cost }, started),
  };
}

export async function actDiscuss(
  state: GameState,
  seat: SeatId,
  askedBy?: { seat: SeatId; text: string },
  opts?: ActOptions,
): Promise<ActResult<Omit<Message, "at">>> {
  const ctx = context(state, seat, opts);
  const started = Date.now();
  const r = await tryCall(ctx, discussPrompt(ctx.view, askedBy), DiscussMove);
  if ("error" in r || !r.output.text?.trim()) {
    return {
      move: { seat, text: "Still thinking.", ...(askedBy ? { replyTo: askedBy.seat } : {}) },
      trace: trace(ctx, "discuss", { privateNote: "No answer in time.", fallback: true }, started),
    };
  }
  const civilian = ctx.view.word !== null;
  let text = r.output.text.trim().slice(0, MESSAGE_CHARS);
  if (civilian) text = scrubSecret(state, text);
  const replyTo =
    r.output.replyTo && r.output.replyTo !== seat && ctx.view.players.includes(r.output.replyTo)
      ? r.output.replyTo
      : askedBy?.seat;
  return {
    move: { seat, text, ...(replyTo ? { replyTo } : {}) },
    trace: trace(
      ctx,
      "discuss",
      { privateNote: r.output.privateNote, suspicion: blendSuspicion(ctx, r.output.suspicion), costUsd: r.costUsd },
      started,
    ),
  };
}

export async function actVote(state: GameState, seat: SeatId, opts?: ActOptions): Promise<ActResult<Vote>> {
  const ctx = context(state, seat, opts);
  const started = Date.now();
  const r = await tryCall(ctx, votePrompt(ctx.view), VoteMove);

  if ("error" in r) {
    const order = ranked(ctx.view.myPriorSuspicion);
    const others = ctx.view.players.filter((p) => p !== seat);
    const target = order.find((s) => s !== seat) ?? others[Math.floor(ctx.rand() * others.length)];
    return {
      move: { seat, target, reason: "Going with my gut.", confidence: 0.3 },
      trace: trace(ctx, "vote", { privateNote: "No answer in time; voted my top suspect.", fallback: true }, started),
    };
  }

  const suspicion = blendSuspicion(ctx, r.output.suspicion);
  const order = ranked(suspicion);
  let target: SeatId = validateVote(state, seat, r.output.target) ? r.output.target : order[0];
  // Chaos knob (ADR 0005): when about to vote the top suspect, sometimes go with a hunch on the second.
  const hunch = target === order[0] && order.length > 1 && ctx.rand() < ctx.persona.knobs.chaos / 20;
  if (hunch) target = order[1];

  let reason = (r.output.reason ?? "").trim().slice(0, REASON_CHARS) || "Gut feeling.";
  if (ctx.view.word !== null) reason = scrubSecret(state, reason);
  return {
    move: { seat, target, reason, confidence: clamp01(r.output.confidence) ?? 0.5 },
    trace: trace(ctx, "vote", { privateNote: r.output.privateNote, suspicion, hunch, costUsd: r.costUsd }, started),
  };
}

export async function actLastGuess(state: GameState, seat: SeatId, opts?: ActOptions): Promise<ActResult<{ word: string }>> {
  const ctx = context(state, seat, opts);
  const started = Date.now();
  const r = await tryCall(ctx, lastGuessPrompt(ctx.view), GuessMove);
  if ("error" in r || !r.output.guess?.trim()) {
    const prior = [...state.traces].reverse().find((t) => t.seat === seat && t.wordGuesses)?.wordGuesses;
    const best = prior ? Object.entries(prior).sort((a, b) => b[1] - a[1])[0]?.[0] : undefined;
    return {
      move: { word: best ?? ctx.view.category.toLowerCase() },
      trace: trace(ctx, "lastGuess", { privateNote: "Went with my best earlier guess.", fallback: true }, started),
    };
  }
  return {
    move: { word: r.output.guess.trim().toLowerCase().slice(0, 40) },
    trace: trace(ctx, "lastGuess", { privateNote: r.output.privateNote, costUsd: r.costUsd }, started),
  };
}
