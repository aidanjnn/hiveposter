# 0009. Adopt teachAR's delivery skills and CI gate, adapted

Date: 2026-10-04 · Status: Accepted

## Context

The user's teachAR repository carries a set of agent delivery skills (commit, create-pr, staff-review, cleanup, signoff, catchup, babysit, manual-flows, grill-me), a validation reference, a pinned-action `Check` workflow with an actionlint job and a single required `check` status, and a PR template. They encode how the user wants agents to work: focused commits, truthful validation, no unrequested publication.

## Decision

Copy the skills into `.agents/skills/workflow/hiveposter-*` as the canonical files, with `.claude/skills/` and `.cursor/skills/` holding relative symlinks, and rewrite their domain content for this project: the gate is `pnpm check` (typecheck, lint, test, build) plus `pnpm sim` where agent behavior changed; evidence tiers are automated, simulated, live-provider, and human play; plan references are `§NN` sections of `docs/plan.md`, not `TRAIL-xx` tickets. Copy `check.yml` without the Playwright and fixture jobs, keep the actionlint job and the `check` aggregate, and keep the PR template with game-specific validation prompts.

## Consequences

- One owner for workflow guidance (`AGENTS.md`), which `CLAUDE.md` includes.
- CI needs no secrets: `contents: read`, no credential persistence, frozen lockfile, Node from `.node-version`.
- Live-model checks (`pnpm sim`) are not run in CI because they need `AI_GATEWAY_API_KEY` and cost money; they are a signoff step reported with the tested SHA.
- Commit attribution follows the commit skill: configured Git authorship, no agent co-author trailers unless requested.
