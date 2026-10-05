---
name: hiveposter-cleanup
description: Simplify an implemented hiveposter change or fix concrete review findings while preserving the game rules, the hidden-information boundary, and agent behavior. Use for cleanup, simplify, polish, or make the diff smaller.
---

# Clean up a hiveposter change

Read [AGENTS.md](../../../../AGENTS.md), the complete task diff, and immediate
consumers/tests where needed. Scope the pass to this change; preserve unrelated
work. A cleanup request authorizes edits, not commits or publication by itself.

1. Identify intended behavior and invariants before editing. Refer to plan
   §02 (rules), §05 (engine phases), and §06 (agent guardrails) for the
   behavior the change must keep.
2. Remove dead code, debug logging of prompts or traces, stale comments, unused
   dependencies, duplicated validation, and unnecessary pass-through layers.
   Prefer clear module boundaries over a new framework or general-purpose utility.
3. Preserve the engine's purity (no React, `ai`, or I/O in `src/engine/`), the
   `SeatView` boundary (imposter `word` is `null`), clue validity rules,
   tie-favors-imposter, retry-then-fallback in `act()`, the 12s timeout, trace
   writes on every agent call, and the design-system rules in plan §00. Do not
   simplify away the regex scrub of the secret word or the per-phase schemas.
4. Do not reformat another workstream or update the lockfile incidentally.
   Do not change persona knobs or prompts during a cleanup; that is tuning and
   needs `pnpm sim` evidence.
5. Fix supported in-scope review findings; do not implement new product behavior
   solely because a reviewer suggested it. When `types.ts` must change, update
   schemas, prompts, views, and tests together.
6. Run focused [checks](../../../references/validation.md) for changed behavior.
   Expand for cross-module changes or an actual failure. Reuse previous
   passing evidence for unchanged inputs; signoff owns the full readiness gate
   when that workflow is requested.

Report the simplifications/fixes, checks, and remaining concrete limits.
