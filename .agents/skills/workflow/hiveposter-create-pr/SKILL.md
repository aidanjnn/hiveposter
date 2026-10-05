---
name: hiveposter-create-pr
description: Create or update a hiveposter GitHub PR with a Conventional Commits title, plan context, and truthful automated versus simulated versus human-play validation. Also supports drafting PR text without publishing.
---

# Create a hiveposter pull request

Use [AGENTS.md](../../../../AGENTS.md) and the
[PR template](../../../../.github/pull_request_template.md). If asked only for
title/body text, prepare text without committing, pushing, or creating a PR.

## Prepare

1. Inspect status, remote, branch, existing PR, and actual base. Use the user's
   requested base or an existing PR's base; otherwise use `main`. Fetch that
   base before reviewing the complete branch diff and all its commits.
2. Use an `agent/<bounded-task>` head branch, never the base as the PR head.
   Keep an existing suitable task branch. Preserve unrelated uncommitted changes.
3. Bootstrap edge: a PR needs an existing remote base and shared history. Check
   remote refs if the repo is unborn/empty. Never create an artificial empty
   base, duplicate root history, or force-push to make GitHub accept a PR.
4. Review all changes from the merge base, including pending task files, not
   just the latest commit. Check the engine/agent boundary, schema and prompt
   agreement, the design-system rules, and the evidence requirements that the
   diff actually touches.
5. Run the applicable [validation](../../../references/validation.md). For code
   PRs require `pnpm check`; for agent-behavior PRs also `pnpm sim` with a
   named config and game count. Docs-only work uses document/skill checks. Fix
   in-scope failures; disclose unavailable checks (no key, no deploy).

## Describe and publish

- Write a whole-branch Conventional Commits title under 72 characters.
- Fill Summary, Context, Changes, Validation, and Notes & Risks. Lead with the
  problem and resulting behavior. Reference plan sections as `§NN` or ADRs by
  number; they are not GitHub issues.
- Include only actual test results, with automated/simulated/live/human-play
  boundaries. Missing simulation evidence must be visible for prompt, persona,
  or `act()` changes. Avoid unmeasured latency or cost claims, empty headings,
  template comments, or agent-attribution footers.
- Use the [commit workflow](../hiveposter-commit/SKILL.md) for task changes and push
  the branch. Commit/push is part of an authorized PR delivery request.
- Write the body to a temporary UTF-8 file and use `gh pr create --base ...
  --head ... --title ... --body-file ...`; use `--draft` when requested. Update
  an existing matching PR instead of creating a duplicate. Do not silently
  publish known-broken code as ready; respect a requested draft and explain gaps.
- Verify returned URL, base/head, and remote head SHA.

Return the PR link and concise validation/remaining gaps. Do not merge, deploy,
submit the take-home, request reviewers, or post review comments just to open a PR.
