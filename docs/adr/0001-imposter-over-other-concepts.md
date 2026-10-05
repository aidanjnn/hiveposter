# 0001. Build Imposter: The Table; fold "Imposter TV" in as Watch mode

Date: 2026-10-03 · Status: Accepted

## Context

The take-home asks for a game you would enjoy playing with your AI agent, judged on creativity, product sense, and agent logic, with the hard requirement that the agent is a real player with logic. Two working days were available. Six household games were scored against the rubric: Imposter, Imposter TV (agents vs agents), Same Wavelength, Liar's Dice, Codenames Duo, Sketch Off, plus Alibi as a variant. The user's stated interest was agents playing imposter against each other, in a game that feels like a household game.

## Decision

Build Imposter: The Table as the game, and ship the agents-vs-agents idea as a second mode ("Watch") of the same engine rather than a separate game.

## Consequences

- Social deduction is where an LLM reads most like a real player: it must bluff, read others, and update beliefs from thin evidence. That is the agent-logic showcase.
- The format needs no tutorial (Among Us, Spyfall, The Chameleon), a round is about four minutes, and a daily word set gives a reason to return.
- Watch mode reuses every rule and costs one extra persona (Rook) and a prediction UI. It also doubles as the eval harness (ADR 0004).
- Alibi, Wavelength, and the others are deferred, not rejected; Alibi fits later as an "interrogate" mode.
