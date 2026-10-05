# 0005. Persona knobs enter the decision in code, not just the prompt

Date: 2026-10-03 · Status: Accepted

## Context

A persona that is only a voice makes every agent play the same game in a different accent. The brief asks for an opponent "with a point of view," and a reviewer should be able to see Juno and Marlowe vote differently on the same evidence.

## Decision

Each persona has four numeric knobs (specificity, updateRate, bluff, chaos) plus a voice and a playbook. Three of the knobs are applied by `act()` after the model responds: specificity picks which of the model's three ranked candidate clues is used; updateRate blends the model's suspicion with the prior (`new = prev + (model − prev) × rate`); chaos occasionally sends the vote to the second suspect and flags the trace `hunch: true`. Bluff is prompt-only.

## Consequences

- Personas are tunable without re-prompting, and the simulator can check that Juno's vote accuracy beats Biscuit's.
- Agents are deliberately imperfect, which keeps the imposter win rate in a playable band.
- The grudge counter and memory notes (plan §07) feed the prompt as text; they are persona flavor, not knobs.
- Cost: `act()` holds game-logic-adjacent code. It stays small and is covered by the sim rather than unit tests.
