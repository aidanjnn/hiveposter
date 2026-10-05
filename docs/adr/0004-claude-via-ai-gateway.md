# 0004. Claude through the Vercel AI Gateway, Haiku/Sonnet split measured by simulation

Date: 2026-10-04 · Status: Superseded by [0010](0010-gemini-flash-split.md)

## Context

The brief says any model is fine but asks for the reasoning behind the pick. The engine depends on strict structured output every turn (ADR 0002), the imposter seat needs reasoning about hidden information while staying in character, and three agents act every phase, so latency and cost matter. The user asked why the AI Gateway rather than a direct Anthropic key, and chose to keep the gateway for now.

## Decision

- Use Claude: `anthropic/claude-haiku-4.5` for civilian turns and the memory summary, `anthropic/claude-sonnet-5.5` for the imposter seat. Overridable with `MODEL_CIVILIAN`, `MODEL_IMPOSTER`, `MODEL_MEMORY`.
- Route through the Vercel AI Gateway: models are plain `"provider/model"` strings and the SDK reads `AI_GATEWAY_API_KEY`; no provider package.
- Justify the split with numbers from `pnpm sim` (10 games per config: all-Haiku, split, all-Sonnet) rather than by assertion. Target an imposter win rate of 35–50%.

## Consequences

- One env var, one line to swap models, a cost column for free from gateway logs. Adding a non-Anthropic model to the comparison table is a string change.
- The gateway is an extra hop and bills through Vercel. Going direct later is a one-line change in `src/agents/act.ts` (`anthropic("claude-haiku-4-5")` with `@ai-sdk/anthropic`).
- AI SDK 7 APIs are verified against `node_modules/ai/docs` (structured output is `generateText` + `Output.object`, not `generateObject`); nothing is written from memory.
