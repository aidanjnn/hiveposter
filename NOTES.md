# Build notes

Working notes for the implementation. Verified against the installed packages, not memory.

## Installed

- next 16.3.8 (App Router, Turbopack, Tailwind v4). Read `node_modules/next/dist/docs/` before touching framework APIs; this version differs from training data.
- ai 7.0.127, zod 4.6.5
- vitest 5.0.3, tsx 4.23.15

## AI SDK 7, confirmed in `node_modules/ai/docs/`

- Structured output: `generateText({ model, output: Output.object({ schema }), prompt | messages })` → `result.output`.
  Source: `03-ai-sdk-core/10-generating-structured-data.mdx`. (`generateObject` is not the API in this version.)
- Streaming structured output: `streamText` with the same `output` option.
- Gateway: pass the model as a plain `"provider/model"` string. The SDK's Vercel AI Gateway provider is the default and reads `AI_GATEWAY_API_KEY`.
  Source: `02-getting-started/02-nextjs-app-router.mdx` lines 60–71.
- Model IDs live on the gateway (checked 2026-10-03): `anthropic/claude-haiku-4.5`, `anthropic/claude-sonnet-5.5`.
  Re-list with `curl -s https://ai-gateway.vercel.sh/v1/models | jq -r '.data[].id'`.
- Field `.describe()` on Zod schemas is passed to the model; use it (see `src/agents/schemas.ts`).
- Still to look up when implementing `act()`: `abortSignal` for the 12s timeout, `maxRetries`, and how to read `usage` for the cost column in the sim. Check `03-ai-sdk-core/25-settings.mdx` and `07-reference/`.

## Next 16 route handlers

- `ctx.params` is a Promise; the generated `RouteContext<"/api/game/[id]/phase">` type is used in the stubs.
- `export const maxDuration = 60` on the two streaming routes (plan §08).
- Streaming a `ReadableStream` as `text/event-stream` works on the default Node.js runtime; don't set `runtime = "edge"`.

## Decisions carried from the plan

- The engine is pure TS (`src/engine/`), no framework imports, shared by routes, tests, and `scripts/sim.ts`.
- The imposter's `SeatView.word` is `null`. A test asserts `JSON.stringify(seatView(imposter))` never contains the word.
- Persona knobs change decisions in `act()` (candidate index, suspicion blending, chaos hunch), not just the prompt.
- Game state is in-memory on the server (`globalThis.__games`). Client persistence is localStorage.
- Single dark theme, three type sizes, red only on: imposter role card, live dot, invalid clue border, Deal button.
