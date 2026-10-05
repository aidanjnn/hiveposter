# 0006. Agent reasoning is recorded every turn and shown only after reveal

Date: 2026-10-03 · Status: Accepted

## Context

"Agent logic" is a judging criterion, but a good bluff is invisible by design. Reviewers need a way to see that the agents were actually reasoning, without that visibility ruining the game.

## Decision

Every agent call writes an `AgentTrace` (private note ≤200 chars, suspicion vector, imposter word guesses, model, latency, retry/hunch flags). Traces are server-only until the reveal phase, then included in the public view and rendered as Brain Replay: sparklines of suspicion toward the real imposter, a phase scrubber, and each agent's notes. In Watch mode, where the viewer is not a player, a table-average suspicion event streams live.

## Consequences

- Brain Replay is the Loom centerpiece and the one feature the cut list protects.
- Trace storage is the cheapest part of the system (a push per call) and makes the sim's metrics free.
- The public view must be derived, never stored, so traces cannot leak early (ADR 0002).
