---
name: hiveposter-grill-me
description: Challenge the hiveposter plan one consequential decision at a time, grounding questions in the repository, the brief, and simulation evidence. Use for grill me, stress-test this plan, or challenge assumptions.
---

# Challenge the hiveposter plan

Read [plan.md](../../../../docs/plan.md), the [ADRs](../../../../docs/adr/README.md),
[AGENTS.md](../../../../AGENTS.md), and any actual evidence for the decision at
hand (sim output, engine tests, a played round). Inspect the repository before
asking a question the files can answer. Do not infer remaining time or agent
quality from the planning snapshot.

Ask one consequential question at a time, give a recommended choice with its
tradeoff, and wait for the answer. Start with the earliest unresolved dependency:
is the hidden-info boundary actually enforced; does the imposter win often
enough to be fun; is a round under five minutes; does Brain Replay show real
reasoning; then memory, Watch mode, and polish.

Use concrete scenarios: the imposter's top guess is the right word with 0.9 and
it still gives a generic clue; three agents all accuse the human in round one;
the gateway times out mid-vote; the same word set repeats for two days; a
reviewer opens the link on an iPhone with the font blocked. Ask what behavior
and observable evidence would count as success. Distinguish engine guarantees,
statistical sim results, and one good round.

Prefer a smaller demonstrable tier over an unproved feature list. Keep persona
knobs, win-rate targets, and latency assumptions as unresolved until the sim
supports them. Recheck time-sensitive facts (model IDs, SDK APIs) from their
source when the decision depends on them.

Capture agreed decisions as a new ADR or a plan edit when the user asks to
update them. Do not silently turn interview answers into implementation or
publication. Finish with the decisions reached and the remaining evidence required.
