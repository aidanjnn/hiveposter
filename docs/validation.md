# Validation log

Evidence recorded as it happens, newest first. Tiers follow
[.agents/references/validation.md](../.agents/references/validation.md): automated,
simulated, live provider, human play. "Not tested" means exactly that.

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
