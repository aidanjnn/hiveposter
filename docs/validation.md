# Validation log

Evidence recorded as it happens, newest first. Tiers follow
[.agents/references/validation.md](../.agents/references/validation.md): automated,
simulated, live provider, human play. "Not tested" means exactly that.

## 2026-10-04 — staff review fixes (subagent review of #2–#4)

A read-only staff review scored the stack 69/100, Request changes, with two P1 leaks.
Each finding was checked against the code before fixing; all are fixed on the branch
that owns the code and merged up the stack.

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

## 2026-10-04 — PR stack #2–#4, local worktree

**Automated.** `pnpm test`: 55 passed (engine 43, agents 12). `pnpm typecheck` clean.
`pnpm lint`: 0 errors, 0 warnings. CI `Check` green on #2 and #3.

**Live provider: blocked.** Every gateway call for `anthropic/claude-haiku-4.5` and
`anthropic/claude-sonnet-5.5` returned `403 customer_verification_required` ("AI Gateway
requires a valid credit card on file"). The key is valid; the account needs billing.

**Simulated.** `pnpm sim -- --games 2 --verbose`: both games ran to reveal on fallback
moves only, and the script exited 2 with the billing hint. This shows the fallback path
works. It does not measure agent quality.

**Human play** (in-app browser, 375×812, `pnpm dev`, branch `agent/ui`):

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
