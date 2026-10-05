# Imposter: The Table

A social deduction word game you play at a table with three AI players who have secrets, personalities, and grudges. Built for the Hivemind Winter '27 take-home.

> Status: scaffolded, not yet playable. See [Plan](#plan) and `NOTES.md`.

## Play it

- Live: _(deployed URL goes here)_
- Local: `pnpm install`, copy `.env.example` to `.env.local` and add `AI_GATEWAY_API_KEY`, then `pnpm dev` and open http://localhost:3000.

## Write-up

_Sections below are filled in before submission (plan §13)._

### What I built

### How the agent decides what to do

### Model and why

| Config (civilian / imposter) | Imposter win rate | Caught but guessed | Clue rejections | Avg turn latency | Cost / game |
| --- | --- | --- | --- | --- | --- |
| haiku-4.5 / sonnet-5.5 | | | | | |
| haiku-4.5 / haiku-4.5 | | | | | |
| sonnet-5.5 / sonnet-5.5 | | | | | |

_Generated with `pnpm sim`._

### Tools

Next.js (App Router), AI SDK through the Vercel AI Gateway, Zod, Vitest, Vercel.

### Deliberate design choices

### What I'd do next

## Plan and decisions

The implementation plan is [docs/plan.md](docs/plan.md); code comments cite its sections as `§NN`. Decisions are recorded in [docs/adr/](docs/adr/README.md). CI behavior is in [docs/ci.md](docs/ci.md). Agent workflow skills (commit, PR, review, signoff, …) live in `.agents/skills/workflow/` and are indexed in [AGENTS.md](AGENTS.md).

| § | Area | Where |
| --- | --- | --- |
| 00 | Design system | `src/app/globals.css` |
| 02 | Rules | enforced in `src/engine/validate.ts`, `src/engine/game.ts` |
| 04 | Data model | `src/engine/types.ts` |
| 05 | Engine + tests | `src/engine/`, `src/engine/game.test.ts` |
| 06 | Agent design | `src/agents/act.ts`, `prompts.ts`, `schemas.ts` |
| 07 | Personas + memory | `src/agents/personas.ts`, `memory.ts`, `src/lib/local.ts` |
| 08 | Routes + SSE | `src/app/api/`, `src/lib/sse.ts`, `src/lib/store.ts` |
| 09 | Screens | `src/components/`, `src/components/useGame.ts` |
| 10 | Watch mode + Brain Replay | `src/components/WatchPanel.tsx`, `BrainReplay.tsx` |
| 11 | Eval harness | `scripts/sim.ts` |

## Scripts

```
pnpm dev        # next dev
pnpm build      # next build
pnpm test       # vitest run (engine tests)
pnpm test:watch
pnpm typecheck  # tsc --noEmit
pnpm lint
pnpm sim -- --games 10 --civ anthropic/claude-haiku-4.5 --imp anthropic/claude-sonnet-5.5
```
