# Imposter: The Table

A social deduction word game you play at a table with three AI players who have secrets, personalities, and grudges. Everyone gets the secret word except one imposter, who only knows the category. Two rounds of one-word clues, a short argument, a vote. Built for the Hivemind Winter '27 take-home.

## Play it

- **Live:** _deployment link pending_
- **Local:**

  ```sh
  pnpm install
  cp .env.example .env.local   # then add AI_GATEWAY_API_KEY
  pnpm dev                     # http://localhost:3000
  ```

  Without a working key the game still plays end to end: every agent turn falls back to a safe, flagged move. That's useful for trying the flow, but the agents won't think.

Phone width is the intended layout. **Play** puts you at the table with Juno, Biscuit, and Marlowe. **Watch** seats four agents and has you call the imposter before they do.

## What I built

A daily party game where the AI players are real players, not a referee. One table, four seats, one imposter. A new word set every day (30 hand-written sets with close decoys), a streak, and a share card. Agents remember how you play and hold grudges when you vote them out wrongly.

After every reveal, **Brain Replay** shows what the agents were actually thinking: each agent's private note per turn, a sparkline of its suspicion of the real imposter, and the imposter's running guesses at the word. **Watch mode** runs four agents against each other while you try to call the imposter early for more points, and lets you take over a seat mid-game.

## How the agent decides

The code is the referee and the model only gets a seat ([ADR 0002](docs/adr/0002-code-referees-model-plays.md)).

1. **Seat view.** A pure TypeScript engine owns the word, roles, phases, and rules. When a seat must act, the engine builds a `SeatView` with only what that seat may know. For the imposter, `word` is `null`. The secret word is never in its prompt, and a [test](src/agents/agents.test.ts) checks every prompt the imposter receives across all seats. Another [test](src/engine/game.test.ts) checks the serialized view for every word set.
2. **Structured move.** One model call per turn, with a Zod schema per phase. Civilians return three candidate clues from vague to specific. The imposter returns a probability list of what the word might be, then a clue that fits its top guesses. Every move carries a private note and a suspicion score for each other player.
3. **Validation.** The engine checks the answer (one word, not the word or its stem, no repeats). A rejected clue is retried once with the reason; after that the agent plays a flagged safe fallback. There's a 12 s timeout, and a failed call never stalls the game.
4. **Personality in code, not just tone** ([ADR 0005](docs/adr/0005-personas-change-decisions.md)). Each persona has knobs that change decisions after the model answers. *Specificity* picks which of the three candidates is played (Juno plays the specific one, Biscuit the vague one). *Update rate* blends new suspicion with the old (Juno moves slowly, Biscuit flips every clue). *Chaos* sometimes sends a vote to the second suspect and logs it as a hunch.
5. **Memory.** After each game, a short call per persona writes up to three notes about your play style plus a lobby line. Those notes and a grudge counter go into the next game's prompt.

## Model and why

Claude through the Vercel AI Gateway ([ADR 0004](docs/adr/0004-claude-via-ai-gateway.md)): **Haiku 4.5** for civilian turns and **Sonnet 5.5** for the imposter seat.

- The engine depends on strict structured output every turn, so schema-following matters more than prose quality.
- Bluffing and inferring the word are the hardest reasoning in the game, and they all happen in one seat, so that seat gets the stronger model.
- Three agents act every phase, so the rest run on the fast, cheap model, in parallel where the rules allow.

The split is meant to be justified by measurement, not assertion: `pnpm sim` plays headless four-agent games and prints this table.

| Config (civilian / imposter) | Imposter win rate | Caught but guessed | Clue rejections | Fallback moves | Avg turn latency | Cost / game |
| --- | --- | --- | --- | --- | --- | --- |
| haiku-4.5 / sonnet-5.5 | _pending_ | | | | | |
| haiku-4.5 / haiku-4.5 | _pending_ | | | | | |
| sonnet-5.5 / sonnet-5.5 | _pending_ | | | | | |

_Pending: the gateway account currently refuses requests until a card is on file (`403 customer_verification_required`). Target: imposter win rate 35–50%, rejections under 10%._

```sh
pnpm sim -- --games 10 --civ anthropic/claude-haiku-4.5 --imp anthropic/claude-sonnet-5.5 --verbose
```

## Tools

Next.js 16 (App Router), AI SDK 7 with the Vercel AI Gateway, Zod 4, Tailwind 4, Vitest, GitHub Actions. Deployed on Vercel.

## Deliberate design choices

- **Code referees, model plays.** Hidden information is enforced by what's in the prompt, not by asking the model to behave.
- **Flawed on purpose.** Personas have tells and hunches so the imposter has a real chance and the table feels like people.
- **Reasoning only after the game.** Brain Replay is locked until the reveal so it can't spoil a round. Watch mode streams a table-average read live because the viewer isn't playing.
- **Ties favor the imposter.** That makes "I'm sure" and every vote matter.
- **Streamed turns, no sockets.** Each phase is one streamed POST; clues and votes land one at a time ([ADR 0007](docs/adr/0007-sse-and-in-memory-store.md)).
- **One dark theme, three type sizes** ([ADR 0008](docs/adr/0008-design-system-from-jasonyuan-design.md)). Players are 8px dots, and red appears in exactly four places. The words carry the screen.
- **In-memory game store for v1.** A recycled serverless instance drops an in-progress table and shows "Table reset. Deal again." A KV store is the first upgrade.

## What I'd do next

- Voice mode for the living room: one phone as the table, everyone speaks their clue.
- Friends and agents at the same table, with agents filling empty seats.
- An interrogation mode (Alibi): three agent suspects share a story and one is lying.
- Persona tuning from Watch-mode tournaments, using the sim's win rates and vote accuracy as the objective.
- KV persistence and cross-device memory.

## Repository

| Path | What |
| --- | --- |
| `src/engine/` | Pure rules, views, word bank, and tests ([plan §05](docs/plan.md#05-game-engine)) |
| `src/agents/` | Prompts, schemas, `act()`, runner, memory ([§06–07](docs/plan.md#06-agent-design)) |
| `src/app/api/`, `src/lib/` | Routes, SSE, store ([§08](docs/plan.md#08-routes-and-realtime)) |
| `src/components/` | Screens and `useGame` ([§09–10](docs/plan.md#09-screens)) |
| `scripts/sim.ts` | Eval harness ([§11](docs/plan.md#11-eval-harness-and-model-pick)) |
| `docs/` | [Plan](docs/plan.md), [ADRs](docs/adr/README.md), [CI](docs/ci.md), [validation log](docs/validation.md) |

```sh
pnpm check      # typecheck, lint, tests, build
pnpm test       # engine and agent tests (scripted model, no network)
pnpm sim -- --games 10
```
