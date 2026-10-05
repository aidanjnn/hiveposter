---
name: hiveposter-staff-review
description: Review hiveposter branch or PR readiness at staff level, with an evidence-based weighted score and actionable findings for game-rule correctness, the hidden-information boundary, agent logic, and product feel. Read-only unless fixes are separately requested.
---

# Staff review for hiveposter

Judge the changed behavior against [AGENTS.md](../../../../AGENTS.md), the
relevant sections of [plan.md](../../../../docs/plan.md), and the
[ADRs](../../../../docs/adr/README.md). Be direct and specific. Optimize for a
game a reviewer wants to play again tomorrow, not speculative production
infrastructure. Review does not authorize edits, commits, pushes, or posted
GitHub reviews. Keep the report in this conversation unless posting is requested.

## Scope and evidence

Inspect branch/status and the complete merge-base diff. Prefer the PR's actual
base, then the user-specified base, then `origin/main`/`main`. Include staged,
unstaged, and relevant untracked files when the user is reviewing current work;
state exactly what you reviewed. If HEAD/base does not exist, review available
files as an initial scaffold and say there is no branch comparison.

Read immediate consumers, schemas, and tests as needed. Do not block on
unrelated pre-existing debt or deferred features absent from this change.
Stubbed modules in a scaffold are not defects. Use existing checks as evidence;
run verification if requested, keeping any generated artifacts isolated. Do not
call a missing sim run a confirmed defect. Use
[validation routes](../../../references/validation.md).

## Review priorities

1. **Rules correctness (plan §02, §05):** one imposter, seeded determinism,
   clue validity (word, 4-letter stem, repeats), turn rotation, plurality and
   tie handling, last-guess matching, scoring, phase order.
2. **Hidden information (ADR 0002):** `SeatView.word` is null for the imposter;
   prompts are built from `SeatView` only; `PublicView` omits roles and traces
   before reveal; the secret word is scrubbed from public text; the API key
   never reaches the client.
3. **Agent logic (plan §06, ADR 0005):** per-phase schemas match prompts;
   validation, retry-once, fallback, and timeout paths exist and are flagged
   in traces; knobs are applied in `act()`; suspicion is clamped and blended;
   sequential clues, parallel votes.
4. **Product feel (plan §00, §09):** design-system rules, red only in the
   four places, three type sizes, staggered reveals, phone width, copy reads
   like a knowledgeable person talking.
5. **Architecture and simplicity:** pure engine, no framework imports there,
   one page route, SSE phases, small modules, no speculative abstractions.
6. **Evidence quality:** engine tests exist for the rules touched; sim results
   named with config and count when agent behavior changed; manual play
   reported with device and commit.

Trace concrete triggers to consequences. A useful finding names the relevant
changed file/line, failure scenario, impact, and smallest correction. Recommend
broader redesign only with a smaller concrete replacement shape.

## Score and verdict

Score each applicable dimension from 0–100. Weight them as follows:

| Dimension | Weight |
| --- | --- |
| Rules correctness and hidden-information boundary | 25 |
| Agent logic and guardrails | 20 |
| Product feel and design-system adherence | 15 |
| Architecture and simplicity | 15 |
| Tests, simulation, and evidence quality | 15 |
| Recovery and demo operability | 5 |
| Repository discipline and docs | 5 |

Compute `round(sum(weight * score) / sum(applicable weights))`; mark truly
irrelevant dimensions N/A and explain normalization. This is a review judgment,
not a measured product metric. Missing evidence on an affected surface belongs
in its score, not N/A. Never let an average override a concrete blocker.

Return: **Approve**, **Approve with nits**, **Request changes**, or **Block merge**,
the score with a compact breakdown, scope/base, prioritized findings, and actual
verification gaps. Severity: P0 immediate severe failure; P1 must fix before
merge; P2 material follow-up; P3 polish. A word leak to the imposter, a leaked
key, or a stalled game loop are blocking when demonstrated in the change.
Explain any readiness limit when checks are missing. If no actionable defect
is found, say so without inventing findings to fill a template.
