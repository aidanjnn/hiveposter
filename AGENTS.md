<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# hiveposter agent guide

Imposter: The Table is a social deduction word game played at a table with
three AI players who have secrets, personalities, and grudges. It is the
Hivemind Winter '27 take-home, due Monday, October 5, 2026.
[docs/plan.md](docs/plan.md) is the product and implementation reference;
code comments cite its sections as `§NN`. [docs/adr/](docs/adr/README.md)
records the decisions behind it. Its schedule and targets are planning
snapshots, not verification evidence.

## Repository status and scope

The repository is a scaffold: Next.js 16 App Router, AI SDK 7, Zod 4, Vitest.
Types, personas, and Zod schemas are real; every other module throws
`TODO(area): name`. Inspect the current tree before claiming a capability
exists. Continue from the schedule in plan §12.

Implement the requested work and its necessary validation. Reuse passing checks
while their inputs remain unchanged. A request to build does not itself request
publication, and a request to review is read-only unless fixes are also
requested. For an end-to-end delivery request, complete all authorized steps
without asking again at each workflow boundary. Keep unrelated changes intact.

## Read first

- [NOTES.md](NOTES.md): verified SDK/framework APIs and decisions carried from the plan.
- [README.md](README.md): plan section map and the write-up skeleton.
- [.agents/references/validation.md](.agents/references/validation.md): which checks prove what.

## Skills

Canonical skills live in `.agents/skills/workflow/`. `.claude/skills/` and
`.cursor/skills/` contain relative discovery links; edit the canonical files.
`CLAUDE.md` points here so guidance has one owner. These workflows are adapted
from the teachAR repository's delivery skills (ADR 0009).

| Request | Skill |
| --- | --- |
| Commit, commit and push | [hiveposter-commit](.agents/skills/workflow/hiveposter-commit/SKILL.md) |
| Create/open/draft PR, write PR description | [hiveposter-create-pr](.agents/skills/workflow/hiveposter-create-pr/SKILL.md) |
| Staff review, review branch, grade PR | [hiveposter-staff-review](.agents/skills/workflow/hiveposter-staff-review/SKILL.md) |
| Cleanup, simplify, fix review findings | [hiveposter-cleanup](.agents/skills/workflow/hiveposter-cleanup/SKILL.md) |
| Signoff, verify readiness | [hiveposter-signoff](.agents/skills/workflow/hiveposter-signoff/SKILL.md) |
| Catch up with main, resolve merge conflicts | [hiveposter-catchup](.agents/skills/workflow/hiveposter-catchup/SKILL.md) |
| Babysit PR, fix CI, address PR feedback | [hiveposter-babysit](.agents/skills/workflow/hiveposter-babysit/SKILL.md) |
| Manual test plan, playtest checklist, Loom rehearsal | [hiveposter-manual-flows](.agents/skills/workflow/hiveposter-manual-flows/SKILL.md) |
| Grill me, challenge the plan | [hiveposter-grill-me](.agents/skills/workflow/hiveposter-grill-me/SKILL.md) |

Use relevant skills to support the requested task; their presence does not
authorize additional external actions. Staff review, cleanup, and signoff are
useful separately, not mandatory ceremonies before every commit or PR. Do not
invoke external review bots or delegate work unless requested.

## Rules of the codebase

- `src/engine/` is pure TypeScript. No React, no `ai`, no I/O. It is shared by
  routes, tests, and `scripts/sim.ts`.
- The model only ever sees a `SeatView`. The imposter's `word` is `null`.
  Never pass `GameState` to a prompt. A test asserts the imposter's view never
  contains the word; keep it green.
- Agent moves are validated by the engine before they touch state. Retry once,
  then fall back, flagged in the trace. The game never stalls; 12s timeout per call.
- Every agent call writes an `AgentTrace`. Traces and roles leave the server
  only at reveal (Watch mode streams a table-average suspicion event).
- Persona knobs are applied in `act()` (candidate index, suspicion blending,
  chaos hunch), not only in the prompt. Changing knobs or prompts is tuning and
  needs `pnpm sim` evidence.
- Don't write AI SDK code from memory. Check `node_modules/ai/docs/` first
  (AI SDK 7: structured output is `generateText` + `Output.object`; the gateway
  reads `AI_GATEWAY_API_KEY` and takes `"provider/model"` strings).
- Next 16: read `node_modules/next/dist/docs/` before framework work. Route
  `params` are a Promise. Streaming routes set `maxDuration = 60`; do not use
  the Edge runtime.
- Design system (plan §00): single dark theme, tokens in `globals.css`, three
  type sizes (`text-body`, `text-heading`, `text-display`), 4px radius, 20px
  gap, players are 8px dots. Red (`accent`) only on the imposter role card, the
  live dot, an invalid clue border, and the Deal button.

## Boundaries and data

`AI_GATEWAY_API_KEY` stays in `.env.local` and Vercel env; never in client
code, logs, or commits. Game state is server-side; the client receives
`PublicView` only. Keep raw model transcripts and sim output out of Git except
the summary table in the README. Word sets are hand-written; no scraped lists.

## Checks and evidence

`pnpm check` runs typecheck, lint, unit tests, and `next build`. `pnpm sim`
runs headless Watch-mode games against the live gateway and is the only proof
of agent quality; name the model config and game count when citing it. Use
[.agents/references/validation.md](.agents/references/validation.md) to select
checks. Existing applicable checks must pass or be reported as failing or
unavailable; never weaken a check to pass it. Report automated, simulated,
live-provider, and human-play evidence separately.

## Git and delivery

- Default integration branch: `main`. Create `agent/<bounded-task>` branches
  for agent work.
- Use Conventional Commits with scopes `engine`, `agents`, `api`, `ui`, `sim`,
  `docs`, `ci`, `skills`. Stage specific files and inspect the staged diff,
  including untracked files.
- Use configured Git authorship. Do not add agent credit or co-author trailers
  unless requested. Preserve hooks; no `--no-verify`. Do not amend, rewrite
  shared history, or force-push unless explicitly requested.
- A commit-only request remains local; push when requested or as part of an
  authorized PR delivery. PR creation does not authorize merging, deploying,
  or submitting the take-home. Use the repository PR template.
