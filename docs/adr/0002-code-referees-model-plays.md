# 0002. The code is the referee; the model only ever gets a seat

Date: 2026-10-03 · Status: Accepted

## Context

Most "play with AI" games make the model the game master, which lets it cheat (it knows everything) and makes its reasoning unverifiable. The brief rewards agent logic that reviewers can trust.

## Decision

A pure TypeScript engine (`src/engine/`) owns roles, the secret word, phases, validation, and scoring. Each agent turn is one model call that receives a `SeatView` containing only what that seat may know (the imposter's `word` is `null`) and must return a structured move. The engine validates the move, retries once, then falls back; it never accepts an invalid move and never stalls.

## Consequences

- The imposter cannot leak the word because it is never in its context. A unit test asserts `JSON.stringify(seatView(imposter))` does not contain the word; the write-up cites it.
- The engine has no framework or SDK imports, so the same code runs in route handlers, Vitest, and the headless simulator.
- Prompts are built from `SeatView` only. Passing `GameState` to a prompt is a rule violation (see `CLAUDE.md`).
- The cost is a stricter interface: every phase needs a Zod schema and a validator, which is the work the plan front-loads on day one.
