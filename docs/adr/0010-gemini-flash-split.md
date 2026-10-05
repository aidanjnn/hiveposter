# 0010. Gemini Flash-Lite civilians and a Flash imposter, called directly

Date: 2026-10-04 · Status: Accepted · Supersedes [0004](0004-claude-via-ai-gateway.md)

## Context

ADR 0004 chose Claude through the Vercel AI Gateway. In practice the gateway account returned
`403 customer_verification_required` on every call until a card was on file, so no agent could
think. The user had a Gemini API key on hand and chose to use Gemini instead.

What the key can reach was checked against the live model list rather than assumed. Pro models
returned `429` (no quota on this key). `gemini-3.8-flash` and `gemini-3.7-flash` returned `503`
(overloaded at the time). `gemini-3.5-flash` (~3 s, thinks) and `gemini-3.5-flash-lite` (~1 s,
no thinking) both returned valid structured output. On an imposter probe, Flash guessed "waffle"
at 0.8 from the clues "grid" and "syrup" and bluffed with "iron".

## Decision

- Civilians and the memory summary use **`gemini-3.5-flash-lite`**: fast and cheap, three of four
  seats act every phase.
- The imposter seat uses **`gemini-3.5-flash`** with low thinking: bluffing and inferring the
  word are the hardest reasoning in the game and all happen in that seat.
- Bare `gemini-…` ids go straight to Google through `@ai-sdk/google`, which reads
  `GOOGLE_GENERATIVE_AI_API_KEY`. Any `provider/model` id still routes through the AI Gateway, so
  switching back to Claude is an env change (`MODEL_CIVILIAN`, `MODEL_IMPOSTER`, `MODEL_MEMORY`).
- The split is not yet measured. It rests on the probes above and the reasoning carried from
  0004. `pnpm sim` across all-Lite, the split, and all-Flash is the evidence that should confirm
  or change it; until those rows are in the README, treat the split as a judgment call.

## Consequences

- The game works today with no billing setup.
- The reasoning from 0004 still holds (schema-following every turn, one isolated context per
  seat, strongest model on the imposter), but the strongest tier available to this key is Flash.
- Free-tier keys rate-limit per minute, so the simulator plays one game at a time by default.
  Pacing counts requests per server instance, not per key; several instances can together hit
  the quota, and those calls fall back. A shared counter waits on the KV store.
- Gateway cost reporting doesn't apply; the sim reports tokens per game instead.
- The key was shared in chat and should be rotated after submission.
