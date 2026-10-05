---
name: hiveposter-signoff
description: Verify and repair hiveposter's applicable readiness checks for the current revision, separating code readiness from simulated agent quality and real human play. Use for signoff, final verification, or checking readiness after PR fixes.
---

# Sign off a hiveposter revision

Read [AGENTS.md](../../../../AGENTS.md) and
[validation routes](../../../references/validation.md). Signoff establishes
evidence for the requested scope. It does not start a staff review, publish
GitHub statuses, or submit the take-home.

## Verify and repair

1. Record status, branch, HEAD if present, and any task/unrelated dirty files.
   Identify whether the request concerns the engine, agent behavior, the UI,
   or submission readiness. Inspect actual scripts and CI before naming the gate.
2. Docs/skills-only changes use structural/document checks. Code changes run
   `pnpm check`. Agent-behavior changes additionally run `pnpm sim` with the
   affected config and at least 5 games, if a key is available. Report absent
   or unrunnable checks (no key, sandboxed port binding, blocked font fetch)
   honestly and name what they leave unproven.
3. Read all failures from the run, repair their in-scope causes, and run focused
   checks for those repairs. Do not weaken tests, clue validation, the
   `SeatView` boundary, or the win-rate target to obtain a pass. An
   incompatible product decision or unavailable external prerequisite is a
   concrete blocker.
4. Rerun the applicable final gate after changes. Stop a repeated identical
   infrastructure failure when no new local action can resolve it; report the
   command, evidence, and missing prerequisite rather than retrying blindly.
5. If commit/push is part of the user's delivery request, use
   [hiveposter-commit](../hiveposter-commit/SKILL.md), verify the final SHA and
   upstream, and attribute only evidence valid for that revision. Otherwise
   leave edits uncommitted and label results as worktree verification.

## Readiness report

Give the revision/worktree scope, actual commands/results, fixes, and unresolved
issues. Hosted CI is a separate result; local success does not imply CI passed.
Any later relevant change invalidates the affected evidence.

For submission signoff, require the plan §13 checklist: a full round on a phone
from the deployed URL, three rounds in a row, the sim table with real numbers,
Brain Replay with real traces, the Loom under 3:00, the README write-up, and no
`.env` in the repo. When absent, state **code verified; play acceptance not
tested** (or the actual partial result). Never fabricate sim numbers or treat
fallback clues as live model play.
