# Validation log

Evidence recorded as it happens, newest first. Tiers follow
[.agents/references/validation.md](../.agents/references/validation.md): automated,
simulated, live provider, human play. "Not tested" means exactly that.

## 2026-10-05 — staff reviews posted on PRs #2–#5 (fixes at a9f73cc / da486a6 / fd172bc)

Four reviews on GitHub, each read at the PR head of the time:
[#2](https://github.com/aidanjnn/hiveposter/pull/2) 78/100 approve with nits (5ff0326),
[#3](https://github.com/aidanjnn/hiveposter/pull/3) 73 request changes (d4dbad9),
[#4](https://github.com/aidanjnn/hiveposter/pull/4) 70 request changes (56b0d86),
[#5](https://github.com/aidanjnn/hiveposter/pull/5) 68 request changes (c0d2d8b).
Each finding was checked against the code first. Fixes land on the branch that owns the
code and are merged up the stack: `agent/agents` a9f73cc, `agent/api` da486a6, `agent/ui`
fd172bc, `agent/docs` this revision.

| Finding | Fix | Evidence |
| --- | --- | --- |
| #2 P2: a civilian's chat text reached the imposter's prompt (the fix sat unpushed on `agent/ui`) | `scrubSecret` on a civilian's text only; a human imposter's guess is left alone, since censoring it would confirm it | **Automated:** `agents.test.ts`, both cases |
| #2 P2: a rejected preferred candidate played silently and went uncounted | `demoted` on the trace; the sim counts retried or demoted clue turns as rejections | **Automated:** test |
| #2 P3: fallback traces dropped the failure reason | `error` (status and message) on fallback traces; the sim prints the top five causes | **Automated:** test asserts the reason |
| #2 P3: `applyHumanMove` let `EngineError` copy through | Player-copy guards for asides and off-table targets | **Automated:** test |
| #2 P3: NOTES said `maxRetries` 1; persona voice twice in the memory call | NOTES says 0; the voice is only in the system prompt | Read |
| #3 P1: one streamed request could run a whole Watch game past `maxDuration` | `onePhase` ends every request at the first phase change (was only on `agent/ui`, now on `agent/api`); routes set 120 s | **Automated:** service test asserts one phase per request |
| #3 P2: a move that lost the race became a 200 with an `error` event | Dropped inside the lock; the stream still ends with `view` | **Automated:** two concurrent clue requests |
| #3 P2: the request path could not run without the gateway | `advance(id, move, opts)` takes `RunOptions`; new `game-service.test.ts` | **Automated:** 3 tests through `readEvents` |
| #3 P3: unbounded memory body; raw `Error.message` to the client; 280 vs 140 chars; server-date seed | Bounded body; only `MoveError`/`EngineError` copy leaves; `MESSAGE_CHARS`; `seed` required | Typecheck + read |
| #4 P1: Watch dealt the daily seed; Leave did not abort the stream | b27b4ef pushed | Code reviewed; Watch not re-run this round |
| #4 P2: red in four disallowed places | Table heading, discussion timer, Brain Replay tag and Reveal label use ink | **Human play:** no `accent`-classed element on the Reveal screen (DOM query) |
| #4 P2: 32 ad hoc type sizes | `text-body` / `text-label` only; `grep 'text-\[1[0-9]px\]' src` is empty | **Human play:** every Play screen at 375×812 |
| #4 P3: unreachable vote states; `outcome.ts` unchecked; `seatColor`; streak across midnight | Branches removed; parity test against the engine; helper deleted; streak keys on the table's date | **Automated:** `outcome.test.ts`, `local.test.ts` |
| #5 P1–P3: README, validation log and AGENTS.md claims | Status table under Play it; red and type-size sentence; SHAs and named evidence below; AGENTS status and `maxDuration` | Read |

**Automated** at fd172bc (the whole stack's code): `vitest run` 76 passed in 6 files,
`tsc --noEmit` clean, `eslint` 0 errors. `next build` cannot run on this machine
(Turbopack's CSS worker fails to bind a port, sandboxed or not); CI runs it. CI for the new
heads was pending when this was written.

**Human play** (in-app Chromium browser pane, 375×812, `pnpm dev` serving the working tree
at fd172bc): Lobby → Deal → role card (civilian) → two clue rounds with fallback clues →
Discussion with the white timer → "I'm sure" → vote → Reveal with Brain Replay, share card,
streak 1 and a grudge line. No console errors, no horizontal scroll. Watch mode, a physical
phone and a deployed URL: not tested this round.

**Simulated and live provider:** nothing new; the gateway account is unchanged.

## 2026-10-04 — second staff review of #2–#5 (on `agent/ui` b27b4ef)

Read-only subagent review, not posted on GitHub; its findings are the rows below. Each P1
was checked against the stack tip before fixing. Fixes: ed0fb49, 5b93124, b27b4ef on
`agent/ui` (pushed 2026-10-05 with the round above).

| Finding | Fix | Evidence |
| --- | --- | --- |
| P1: human chat text reached the imposter agent's prompt unscrubbed | `scrubSecret` on human messages | **Automated:** new test fails without the fix, passes with it |
| P1: Watch dealt the daily seed, spoiling today's word and imposter index | Watch always deals a practice seed | Code reviewed; not exercised in a browser |
| P1: Leave mid-turn let a late stream event restore the old table | Leave aborts the in-flight stream and clears busy | Code reviewed; not exercised in a browser |
| P2: post-game notes could carry the word into a later system prompt | Notes and lobby line scrubbed with that game's word | **Automated:** new test fails without the fix |
| P2: `/api/memory` accepted unbounded personas, notes and body | Persona enum, dedupe, ≤4 seats, ≤10 notes of ≤200 chars, 64 KB body | Code reviewed |

`pnpm test` 60 passed, typecheck clean, lint clean. `next build` not run locally (Turbopack
could not bind a port in this environment); CI runs it.

## 2026-10-04 — staff review fixes (subagent review of #2–#4)

A read-only subagent staff review, not posted on GitHub, scored the stack 69/100, Request
changes, with two P1 leaks; its findings are the rows below. Each was checked against the
code before fixing; all are fixed on the branch that owns the code and merged up the
stack: 5ff0326 (`agent/agents`), d4dbad9 (`agent/api`), e867677 and 56b0d86 (`agent/ui`).

| Finding | Fix | Evidence |
| --- | --- | --- |
| P1: word bank shipped to the browser (Lobby → `words.ts`; `lib/local` → `agents/memory` → `act` → engine → words) | Word-free `engine/calendar.ts`, pure `lib/notes.ts`, import-graph test | **Automated + build:** `next build` of the pre-fix commit had "tiramisu", "lighthouse", "rapunzel" in a client chunk; after the fix, 0 matches for those or for `generateText` |
| P1: Watch stream sent private notes (imposter's included) before reveal | Stream only the table vector and a "leans toward" line; stop after Take a seat | Test asserts no note text in suspicion events; browser shows "The table has no read yet." |
| P2: refresh on reveal re-applied grudges and ratings | Bookkeeping stops when `recordGame` reports a duplicate | Browser: refresh resumed the reveal screen; code path reviewed |
| P2: streak counted practice and Watch; watching made the daily table practice | Only daily Play counts | Code reviewed; not yet exercised across two days |
| P3: hunch could move a vote onto the top suspect | Hunch only moves top suspect → second | Test |
| P3: stale streamed view wiped a call or seat | Client keeps asides until the server view includes them | Code reviewed |
| P3: double "I'm sure" showed an error and paused | Repeat "sure" is a no-op | Code reviewed |
| P3: SDK retries could stack past the function limit | SDK `maxRetries: 0`; `act()` owns retries | Code reviewed |

`pnpm test` 58 passed, typecheck clean, lint 0 errors after the fixes.

## 2026-10-04 — PR stack #2–#4, uncommitted worktree on `agent/ui` (logged at c6f7c90)

**Automated.** `pnpm test`: 55 passed (engine 43, agents 12). `pnpm typecheck` clean.
`pnpm lint`: 0 errors, 0 warnings. CI `Check` green on #2 (5ff0326) and #3 (d4dbad9);
#4 and #5 went green later at 56b0d86 and c0d2d8b.

**Live provider: blocked.** Every gateway call for `anthropic/claude-haiku-4.5` and
`anthropic/claude-sonnet-5.5` returned `403 customer_verification_required` ("AI Gateway
requires a valid credit card on file"). The key is valid; the account needs billing.

**Simulated.** `pnpm sim -- --games 2 --verbose` with the default config (civilians
`anthropic/claude-haiku-4.5`, imposter `anthropic/claude-sonnet-5.5`): both games ran to
reveal on fallback moves only, and the script exited 2 with the billing hint. This shows the fallback path
works. It does not measure agent quality.

**Human play** (in-app Chromium browser pane, 375×812, `pnpm dev`, uncommitted worktree on `agent/ui`):

| Flow | Result |
| --- | --- |
| Lobby renders in the design system | passed |
| Deal → role card as imposter: red label, no word | passed |
| Invalid clue "two words" refused inline ("One word only.") | passed |
| Two clue rounds stream one clue at a time; order rotates | passed |
| Discussion: 60 s bar, @Marlowe gets a reply addressed to you | passed |
| Vote: dots and reasons reveal one at a time | passed |
| Reveal "You were the imposter / You got away.", Brain Replay, share card, streak 1 | passed |
| Watch: call locked during round 1 | **failed**, then fixed: the server ran ahead of the animation and refused the call, stalling the game. Calls now carry the viewer's phase and apply under the game lock. |
| Watch after fix: call accepted, game runs to reveal, "Your call: Juno, right, +2" | passed |
| Live agent reasoning in Brain Replay | not tested (all moves were fallbacks) |
| Physical phone | not tested |
| Deployed URL | not tested (no deployment yet) |
