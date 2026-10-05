/**
 * Plan §11. Headless Watch-mode simulator.
 *
 *   pnpm sim -- --games 10 --civ anthropic/claude-haiku-4.5 --imp anthropic/claude-sonnet-5.5
 *
 * Plays full four-agent games through the same runner the API uses and prints the
 * write-up table: imposter win rate, caught-but-guessed, clue rejections, fallbacks,
 * average turn latency, cost per game, and vote accuracy per persona.
 *
 * Flags: --games N (default 5)  --civ MODEL  --imp MODEL  --concurrency N (default 3)
 *        --verbose (print each game's transcript)
 * Gemini ids ("gemini-3.5-flash") need GOOGLE_GENERATIVE_AI_API_KEY; "provider/model" ids
 * go through the AI Gateway and need AI_GATEWAY_API_KEY. Both are read from .env.local.
 */
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

import { createGame, imposterOf } from "../src/engine/game";
import type { GameState, SeatId } from "../src/engine/types";
import { MODELS, setRateWaitBudget } from "../src/agents/act";
import { WATCH_LINEUP, PERSONAS } from "../src/agents/personas";
import { runUntilHuman } from "../src/agents/runner";

function flag(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const next = process.argv[i + 1];
  return next && !next.startsWith("--") ? next : "true";
}

const games = Number(flag("games", "5"));
// Free-tier Gemini keys rate-limit per minute; one game at a time stays under it.
const concurrency = Number(flag("concurrency", "1"));
const verbose = flag("verbose") === "true";
const models = { civilian: flag("civ", MODELS.civilian)!, imposter: flag("imp", MODELS.imposter)! };
// No route limit here: wait out rate limits rather than measure fallback play.
setRateWaitBudget(Infinity);

const short = (m: string) => m.replace(/^anthropic\/claude-/, "").replace(/^gemini-/, "gemini ");

function transcript(g: GameState): string {
  const name = (s: SeatId) => PERSONAS[s as keyof typeof PERSONAS]?.name ?? s;
  return [
    `— ${g.wordSet.category}: ${g.wordSet.word} · imposter ${name(imposterOf(g))}`,
    `  clues: ${g.clues.map((c) => `${name(c.seat)} "${c.word}"${c.fallback ? "*" : ""}`).join(", ")}`,
    ...g.messages.map((m) => `  ${name(m.seat)}: ${m.text}`),
    `  votes: ${g.votes.map((v) => `${name(v.seat)}→${name(v.target)}`).join(", ")}`,
    `  result: ${g.result?.winner} wins${g.result?.ejected ? `, ${name(g.result.ejected)} out` : ", tie"}${g.lastGuess ? `, guessed "${g.lastGuess.word}" (${g.lastGuess.correct ? "right" : "wrong"})` : ""}`,
  ].join("\n");
}

async function playOne(i: number): Promise<GameState> {
  const start = createGame({ mode: "watch", personas: WATCH_LINEUP, playerId: `sim-${i}`, seed: `sim-${Date.now()}-${i}` });
  return runUntilHuman(start, { models });
}

async function main() {
  // Each seat's model needs its own key; a missing one would quietly turn that seat into fallbacks.
  const needs = new Set([models.civilian, models.imposter].map((m) => (m.includes("/") ? "AI_GATEWAY_API_KEY" : "GOOGLE_GENERATIVE_AI_API_KEY")));
  const missing = [...needs].filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(`Set ${missing.join(" and ")} in .env.local.`);
    process.exit(1);
  }
  console.log(`Simulating ${games} games · civilians ${short(models.civilian)} · imposter ${short(models.imposter)}\n`);

  const results: GameState[] = [];
  let next = 0;
  const started = Date.now();
  await Promise.all(
    Array.from({ length: Math.min(concurrency, games) }, async () => {
      while (next < games) {
        const i = next++;
        const g = await playOne(i);
        results.push(g);
        process.stdout.write(verbose ? `${transcript(g)}\n\n` : `game ${results.length}/${games} · ${g.result?.winner} wins\n`);
      }
    }),
  );

  const traces = results.flatMap((g) => g.traces);
  const clueTraces = traces.filter((t) => t.phase === "clue1" || t.phase === "clue2");
  const impWins = results.filter((g) => g.result?.winner === "imposter").length;
  const caughtGuessed = results.filter((g) => g.result?.ejected === g.result?.imposter && g.lastGuess?.correct).length;
  // A rejection is any clue turn where the model's pick didn't play: a retry or a demotion.
  const rejected = clueTraces.filter((t) => t.retried || t.demoted).length;
  const fallbacks = traces.filter((t) => t.fallback).length;
  const latency = traces.filter((t) => !t.fallback).map((t) => t.latencyMs);
  const avgLatency = latency.length ? latency.reduce((a, b) => a + b, 0) / latency.length : NaN;
  const costs = traces.map((t) => t.costUsd).filter((c): c is number => c !== undefined);
  const costPerGame = costs.length ? costs.reduce((a, b) => a + b, 0) / results.length : NaN;
  const tokensPerGame = traces.reduce((a, t) => a + (t.tokens ?? 0), 0) / Math.max(1, results.length);

  const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : "n/a");
  console.log(`\n| Config (civilian / imposter) | Imposter win rate | Caught but guessed | Clue rejections | Fallback moves | Avg turn latency | Tokens / game | Cost / game |`);
  console.log(`| --- | --- | --- | --- | --- | --- | --- | --- |`);
  console.log(
    `| ${short(models.civilian)} / ${short(models.imposter)} | ${pct(impWins, results.length)} (${impWins}/${results.length}) | ${caughtGuessed} | ${pct(rejected, clueTraces.length)} | ${pct(fallbacks, traces.length)} | ${Number.isFinite(avgLatency) ? `${(avgLatency / 1000).toFixed(1)}s` : "n/a"} | ${Math.round(tokensPerGame).toLocaleString()} | ${Number.isFinite(costPerGame) ? `$${costPerGame.toFixed(4)}` : "n/a"} |`,
  );

  console.log(`\nVote accuracy as civilian (voted for the real imposter):`);
  for (const persona of WATCH_LINEUP) {
    let right = 0;
    let total = 0;
    for (const g of results) {
      const imp = imposterOf(g);
      if (imp === persona) continue;
      const v = g.votes.find((x) => x.seat === persona);
      if (!v) continue;
      total++;
      if (v.target === imp) right++;
    }
    console.log(`  ${PERSONAS[persona].name.padEnd(8)} ${pct(right, total)} (${right}/${total})`);
  }
  const reasons = new Map<string, number>();
  for (const t of traces) if (t.error) reasons.set(t.error, (reasons.get(t.error) ?? 0) + 1);
  if (reasons.size) {
    console.log(`\nFallback causes:`);
    for (const [r, n] of [...reasons].sort((a, b) => b[1] - a[1]).slice(0, 5)) console.log(`  ${n}× ${r}`);
  }
  const hunches = traces.filter((t) => t.hunch).length;
  console.log(`\nHunch votes: ${hunches} · wall time ${((Date.now() - started) / 1000).toFixed(0)}s`);
  if (fallbacks === traces.length) {
    console.log("\nEvery move was a fallback: the model calls failed. Check the API key, quota and billing.");
    process.exitCode = 2;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
