---
name: hiveposter-catchup
description: Bring a hiveposter task branch up to date with its actual PR base or main, resolving merge conflicts while preserving engine rules, schemas, and user work. Use for catch up, sync branch, or resolve conflicts.
---

# Catch up a hiveposter branch

Follow [AGENTS.md](../../../../AGENTS.md). Inspect status, current branch, base,
and any merge/rebase already in progress. Use the existing PR's base or the
user's explicit ref; otherwise use `main`. Fetch the selected remote ref.

- Preserve unrelated dirty/staged files. Prefer an isolated checkout when
  needed; do not blindly stash, reset, or overwrite work. An unborn branch or
  missing remote base needs bootstrap, not a merge with an invented history.
- If the base is already an ancestor of HEAD, there is no catch-up to perform.
- Merge by default for shared/pushed branches. Rebase only when requested;
  rewriting a published branch needs explicit authorization. Never use bare
  force push or discard one whole side without reading it.
- For each conflict, inspect both intents and nearby consumers/tests. Resolve
  routine and evidence-backed behavior changes directly. Ask only for a real
  unresolved product/rules choice or unavailable authority, not merely
  because a file is important.
- Pay particular attention to `src/engine/types.ts` (shared contract), Zod
  schemas and the prompts that depend on them, the clue validity rules, phase
  order, and the `PublicView`/`SeatView` boundaries. Preserve both sides'
  intended behavior and regression coverage.
- Resolve manifest intent before regenerating `pnpm-lock.yaml` with the
  repository's pinned pnpm; do not hand-merge incompatible resolutions or
  upgrade dependencies as a shortcut.
- Inspect the complete resulting diff, including automatic merges. Run relevant
  [checks](../../../references/validation.md), stage specific resolved files,
  and finish the merge/rebase. Preserve hooks and configured authorship.

Push only if requested or part of authorized PR delivery. Report the base,
resulting commit, validation, and whether published. If blocked mid-operation,
state its exact status and the concrete decision needed; do not silently leave
an unfinished merge or abort someone else's existing operation.
