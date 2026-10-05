# hiveposter validation routes

Use [plan §01](../../docs/plan.md#01-scope-and-definition-of-done) for the
definition of done per feature, [plan §05](../../docs/plan.md#05-game-engine)
for the engine tests, [plan §11](../../docs/plan.md#11-eval-harness-and-model-pick)
for the simulation targets, and [AGENTS.md](../../AGENTS.md) for invariants.
This reference selects evidence; it does not claim tests exist.

## Select checks from the current repository

1. Inspect `package.json` scripts, `vitest.config.mts`, and CI for actual
   commands. `pnpm check` runs typecheck, lint, unit tests, and `next build`.
2. For documentation/skills, check local links, discovery symlinks, frontmatter,
   and patch whitespace. Read new untracked files; `git diff` alone omits them.
3. For engine changes, run `pnpm test` first. The engine is pure TypeScript;
   its tests need no network or key.
4. For agent changes (prompts, schemas, personas, `act()`), run `pnpm sim`
   with the affected model config and at least 5 games. It needs
   `AI_GATEWAY_API_KEY` and spends money; say which config and how many games
   ran. Green engine tests do not prove the agents play well.
5. For routes and UI, run `pnpm build`, then play a round against `pnpm dev`
   (or the deployed URL) on a phone-width viewport. Streaming and the
   staggered reveal are not covered by unit tests.
6. Reuse results for unchanged inputs; after repairs, rerun affected checks and
   the final gate when required. Record the tested SHA or say results are for
   an uncommitted worktree. Do not attribute results to a different revision.

| Changed surface | Relevant checks | Additional evidence |
| --- | --- | --- |
| `src/engine/types.ts`, `game.ts`, `validate.ts`, `view.ts` | `pnpm test`; the hidden-info test must stay green | Role dealing determinism, tie handling, clue stem rule, public view before/after reveal |
| `src/engine/words.ts` | `pnpm test` | Every set has ≥3 decoys and ≥3 generic clues; no decoy shares a 4-letter stem with the word |
| `src/agents/prompts.ts`, `schemas.ts`, `personas.ts`, `act.ts` | `pnpm sim` (≥5 games, named config) | Imposter win rate 35–50%, clue rejections <10%, Juno accuracy > Biscuit, avg turn <2.5s, no secret word in public text |
| `src/agents/memory.ts`, `src/lib/local.ts` | `pnpm test` where pure; manual | Notes capped at 10, lobby line ≤60 chars, grudge resets when caught |
| `src/app/api/*`, `src/lib/sse.ts`, `src/lib/store.ts` | `pnpm build`; one streamed round in a browser | 400 with reason on an invalid human clue; `waiting` event names the right seat; TTL sweep |
| `src/components/*`, `globals.css` | `pnpm build`; phone-width manual pass | Design-system rules (plan §00): red only in the four allowed places, three type sizes, no horizontal scroll |
| `scripts/sim.ts` | run it once | Prints the write-up table columns |
| `.github/workflows/*` | `actionlint` | Pinned action SHAs unchanged or reviewed |

## Claims and readiness

- **Automated:** deterministic typecheck/lint/tests/build. Name commands and results.
- **Simulated:** `pnpm sim` output with model config, game count, and the
  metrics. It proves agent behavior statistically, not a specific round.
- **Live provider:** actual gateway call, model, response/failure, latency,
  cost. A mocked or fallback move is not provider success.
- **Human play:** a real round on a phone against the deployed URL, with the
  commit, device/browser, and anything that felt wrong.

Use `not tested`, `blocked`, `failed`, or `passed` accurately. No gateway key
does not prevent a scoped engine or UI PR; disclose the missing simulation
evidence. An empty test run or missing required check is not a pass.

For submission readiness, require: a full round on a phone from the deployed
URL with no console errors; three rounds in a row; the sim table in the README
with real numbers; Brain Replay showing real traces; the Loom recorded against
the deployed URL. Mock agents, cached responses, or a local-only build cannot
prove that target.
