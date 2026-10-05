# Imposter: The Table — implementation plan

> A social deduction word game you play at a table with three AI players who have secrets, personalities, and grudges. The code is the referee. The model only ever gets a seat.

**Planning snapshot:** October 4, 2026. **Due:** Monday, October 5, 2026.

**Brief:** Hivemind Winter '27 co-op take-home. "Make a game you would enjoy playing with your AI agent." Any medium. The only hard requirement: the agent acts as a real player with logic, makes its own moves, reacts to yours, and has a point of view. Deliverables: a playable link, a Loom under 3 minutes, and a write-up (what you built, how the agent decides, tools, deliberate design choices, next steps, and why this model). Judged on creativity, product sense, and agent logic.

**Interface direction:** the restraint of [jasonyuan.design](https://jasonyuan.design/). One dark surface, one type size, no decoration, and the agents' words carrying the screen. Decisions are recorded in [docs/adr/](adr/README.md).

Sections are in build order and are referenced from code comments as `§NN`.

---

## 00. Design system

Lifted from the reference and adapted for a game: near-black ground, white text, grey for everything secondary, 4px radii, a 20px grid. Type never gets big. Color is reserved for two things: who is speaking (a dot) and the imposter (one red). Everything else is contrast and spacing. Tokens live in `src/app/globals.css`.

### Color

| Token | Value | Use |
| --- | --- | --- |
| `bg` | `#1A1A1B` | page |
| `card` | `#070708` | work cards, code |
| `surface` | `#0F0F10` | panels, list rows |
| `surface-2` | `#232325` | inputs, hover, selected row |
| `line` | `#2A2A2C` | hairlines |
| `ink` | `#FFFFFF` | primary text |
| `ink-2` | `#AAAAAA` | secondary text, links |
| `ink-3` | `#6E6E72` | captions, labels |
| `accent` | `#E84A3C` | imposter, live dot, invalid clue, Deal button. Used rarely. |

Seat colors (8px dots, never avatars): you `#FFFFFF`, Juno `#8AB4FF`, Biscuit `#E8C46A`, Marlowe `#B49CFF`, Rook `#8ED1B4`.

### Rules of use

- Single dark theme. No light mode.
- Red appears only on: the imposter's role card, the "live" indicator in Watch mode, an invalid clue border, and the Deal button. Never for emphasis in text.
- No shadows, no gradients, no icons. Hierarchy comes from white vs grey and from spacing.
- Hover and focus: text goes from grey to white. Buttons invert. That is the whole interaction vocabulary.
- Motion: content appears in place (opacity, 150ms). Clue chips and votes land one at a time, 700ms apart. Nothing slides or bounces.

### Type

Geist (stand-in for NB Akademie Std, which is not on Google Fonts), Geist Mono for numbers and labels. Three sizes total:

| Role | Size | Notes |
| --- | --- | --- |
| body | 15/20, −0.15px | everything a reviewer reads |
| heading | 18.5/24, 500 | screen titles |
| display | 28/32, 500, −0.4px | the role-card word and the reveal verdict only |
| label | mono 12/16 | `SET #142 · BREAKFAST · ROUND 1` |

### Components

Button (primary inverts, ghost hairline, red for Deal only), clue input (1px red border + one grey line on error), clue chip (filled; pending is dashed and lowercase), suspicion meter (2px track, white fill, mono value), private note (hairline rule on the left), player row (dot, name, one grey line).

## 01. Scope and definition of done

| Feature | Serves | Priority | Done when |
| --- | --- | --- | --- |
| Full round loop: deal → clues → discuss → vote → reveal | Hard requirement | must | 3 rounds in a row on a phone from the deployed URL, no console errors |
| Three agent seats, hidden info enforced in code | Agent logic | must | Imposter's prompt never contains the word (asserted in a test). Agents disagree on votes sometimes |
| Brain Replay after reveal | Agent logic | must | Every agent turn stores a note and suspicion vector; the reveal screen scrubs through them |
| Three personas whose knobs change decisions | Creativity | must | Same seat view fed to Juno and Marlowe yields different clue specificity and vote confidence in the sim |
| Daily word set, streak, share card | Product sense | must | Same date → same word. Share card copies as text |
| Discussion with @mentions | Agent logic, creativity | should | Agents accuse with evidence; @mention gets a reply |
| Watch mode (4 agents, you predict) | Creativity, agent logic | should | A game runs with no human seat; your call scores against the outcome |
| Persona memory across games | Product sense | should | Lobby lines reference your previous game |
| Last-chance guess | Agent logic | should | Caught imposter can steal the win |
| Take a seat mid-game | Creativity | nice | Cut first if behind |

## 02. Game rules

Written once so the engine, the prompts, and the UI copy agree. The code enforces these.

**Setup.** 4 seats: you + 3 agents (Play) or 4 agents (Watch). Exactly one imposter, uniform random; you are the imposter 25% of the time. Civilians see category + word. The imposter sees category only. Each daily word set has 3–5 decoys in the same category so the imposter has real options.

**Win conditions.** Civilians win if the plurality vote lands on the imposter and the last-chance guess is wrong. The imposter wins on a civilian ejection, a tie, or a correct last-chance guess. Ties eject no one; this makes "I'm sure" votes matter.

**Clue validity (engine-enforced).** One word, letters and hyphen only, lowercased for checks. Not the word, not a word sharing its first 4 letters, not a repeat. Agents retry once with the violation in the prompt, then get a generic fallback clue flagged `fallback: true`. Humans get inline validation and cannot submit an invalid clue.

**Timing.** 2 clue rounds; turn order rotates by one each round. Discussion: 60s or "I'm sure"; max 2 messages per agent, 140 chars each. Votes are simultaneous, revealed one at a time with reasons. Target round length: 4 minutes.

**Scoring.** Civilian: +1 if the imposter is caught, +1 if you voted correctly. Imposter: +2 if you survive, +3 if caught but guessed the word. Streak counts days played, not won.

## 03. Architecture

One Next.js app. The engine is pure TypeScript with no framework imports, so the same code runs in route handlers, tests, and the eval CLI.

| Area | Choice |
| --- | --- |
| Framework | Next.js 16 App Router, TypeScript, Tailwind v4 with the §00 tokens as the theme. Deployed to Vercel. One page route plus handlers under `/api`. |
| AI | AI SDK 7 through the Vercel AI Gateway. Models `anthropic/claude-haiku-4.5` and `anthropic/claude-sonnet-5.5` as plain strings. One env var: `AI_GATEWAY_API_KEY`. Zod schema per phase. Verify SDK calls against `node_modules/ai/docs`, not memory. |
| State | Game state lives on the server in a `Map`. The client only ever receives a public view. The secret word and agent notes never leave the server before reveal. |
| Persistence | localStorage keyed by a random `playerId` for streak, history, and persona memory. Memory is sent up with each new game. KV store only if everything else is done. |
| Realtime | Each phase is one POST that streams server-sent events. The client drives the game by requesting the next phase. No sockets. |
| Testing | Vitest for the engine. A TV-mode simulator for the agents, which doubles as the model comparison for the write-up. |

```
src/
├── engine/        pure TS: types, words, game (reducer), validate, view, game.test
├── agents/        personas, prompts, schemas, act, memory
├── app/           page.tsx, globals.css, layout.tsx, api/{game, game/[id]/phase, game/[id]/human, memory}
├── components/    Lobby, RoleCard, Table, ClueInput, Discussion, VoteList, Reveal, BrainReplay,
│                  ShareCard, WatchPanel, SuspicionMeter, useGame, ui/{Button, Dot, Input, Clue, Note, Meter, Timer}
└── lib/           store (in-memory Map + TTL), sse, local (localStorage)
scripts/sim.ts     TV-mode simulator: N games × model/persona matrix
```

## 04. Data model

Defined in `src/engine/types.ts`. Engine, prompts, and UI all import from there.

- `WordSet { id, category, word, decoys[], generic[] }`
- `Seat { id, kind: human|agent, persona?, role }` (role is server-only until reveal)
- `Clue { seat, round, word, fallback? }`, `Message { seat, text, at, replyTo? }`, `Vote { seat, target, reason, confidence }`
- `AgentTrace { seat, phase, at, privateNote (≤200), suspicion: Record<seat, 0..1>, wordGuesses?, model, latencyMs, retried?, hunch? }` — one per agent turn; powers Brain Replay; server-only until reveal
- `GameState { id, mode, seed, wordSet, seats, order, phase, clues, messages, votes, lastGuess?, traces, watchCall?, result?, memory, createdAt }`
- `PublicView` — derived, never stored. Omits roles, the imposter's word, and traces until reveal. In watch mode the word is included (the viewer is the audience) but roles are not.
- `SeatView` — what a seat is allowed to know when asked to act. `word` is `null` for the imposter. This is the guardrail.

**Daily seed.** `seed = YYYY-MM-DD` local. `wordSet = sets[dayIndex % sets.length]`. Roles come from a PRNG seeded with `seed + playerId`, so the word is shared but the imposter isn't. "Play again" uses a random seed and doesn't touch the streak.

**Word bank.** 30 hand-written sets with close decoys: Breakfast, Coastline, Kitchen tools, Board games, Weather, Dog breeds, Instruments, Office supplies, Fruit, Winter sports. The decoys matter more than the word.

## 05. Game engine

A reducer-style state machine. Each phase takes state and moves and returns the next state. Nothing here calls a model.

| Phase | Function | Behavior |
| --- | --- | --- |
| lobby | client only | Pick mode and lineup. Sends `{mode, personas, playerId, seed, memory}` to `POST /api/game`. |
| deal | `createGame()` | Pick word set from seed, assign roles, set order. Return public view with role. → `clue1` |
| clue1 / clue2 | `applyClue()` | Iterate `order`. Agents call `act()` sequentially so later seats see earlier clues; the human seat pauses for `POST /human`. Rotate order after the round. |
| discuss | `applyMessage()` | Opening pass: one message per agent in random order. Human messages trigger replies from @mentioned agents. Cap 2 per agent. Ends on timer, "I'm sure", or caps. |
| vote | `resolveVote()` | Agents vote in parallel without seeing each other. Reveal in order with reasons. Plurality → ejected; tie → none. Imposter ejected → `lastGuess`, else → `reveal`. |
| lastGuess | `applyGuess()` | One word. Match lowercase, trimmed, trailing "s" stripped, plus listed synonyms. → `reveal` |
| reveal | `finalize()` | Compute result and score. Public view now includes word, roles, traces. Client stores history and calls `/api/memory`. |

**Engine tests, before any UI** (`src/engine/game.test.ts`): exactly one imposter; same seed + playerId → same roles; different playerId → different roles; `validateClue` rejects the word, its 4-letter stem, repeats, multi-word input and accepts hyphens; `resolveVote` plurality, tie → no ejection, no self-votes; `JSON.stringify(seatView(state, imposter))` does not contain the word; `publicView` omits traces before reveal and includes them after.

## 06. Agent design

One function per phase in `src/agents/act.ts`: build the seat view, build the prompt, call the model with a schema, validate against the engine, retry once, fall back. Every call writes a trace.

**Seat view** is the only thing the model sees: seat, role, category, `word` (null for the imposter), players, order, clues so far, last 12 messages, this seat's prior notes and suspicion, persona memory of the human, grudge count.

**System prompt** (shared across phases): persona name and voice; the rules in three sentences; the persona playbook; the four knobs as "tendencies that are part of who you are"; respond only with the structured output; `privateNote` is real thinking under 200 characters; never reveal your role in public text.

| Phase | User prompt gist | Schema | Model |
| --- | --- | --- | --- |
| clue (civilian) | "Your word is X. Clues so far: […]. Give three candidate clues from vague to specific that prove you know X without giving it away." | `{ candidates[3], clue, privateNote, suspicion }` | haiku-4.5 |
| clue (imposter) | "You don't know the word. Category X. Clues so far: […]. List likely words with probabilities, then a clue that fits your top guesses." | `{ wordGuesses, clue, privateNote, suspicion }` | sonnet-5.5 |
| discuss | "One message, ≤140 chars. Accuse with evidence, defend, or answer @{seat}. Current suspicion: {…}." | `{ text, replyTo?, privateNote, suspicion }` | haiku / sonnet |
| vote | "Vote now. Not yourself. One-line public reason." | `{ target, reason, confidence, privateNote, suspicion }` | haiku / sonnet |
| lastGuess | "You were caught. Guess the word." | `{ guess, privateNote }` | sonnet-5.5 |
| memory | "Full game attached. ≤3 notes on the human's style, in your voice, plus one lobby line ≤60 chars." | `{ notes[], lobbyLine }` | haiku-4.5 |

**Knobs change decisions, not just tone.** Specificity: the model ranks 3 candidates; `act()` picks the index from the knob (0–3 → 0, 4–7 → 1, 8–10 → 2). Update rate: engine blends `new = prev + (model − prev) × rate`. Chaos: with probability `chaos/20` the vote goes to the second suspect, logged `hunch: true`. Bluff: prompt only.

**Guardrails in `act()`.** Clue through `validateClue`; retry once with the reason; then generic fallback, flagged. Vote target must be a valid seat ≠ self, else argmax suspicion. Clamp suspicion to [0,1], drop self, fill missing with prior. 12s timeout per call → fallback path; the game never stalls. Regex-strip the secret word from any public text as a last line of defense.

**Sequential clues, parallel votes.** Clues run in turn order because the imposter needs earlier clues to infer the word. Discussion openers and votes run with `Promise.all` and are revealed one at a time on the client.

## 07. Personas and memory

| Persona | Voice | Playbook | specificity | updateRate | bluff | chaos |
| --- | --- | --- | --- | --- | --- | --- |
| Juno, the overthinker | Precise, a little paranoid, quotes clues as evidence | Generic clues are the strongest signal. As imposter, over-explains. | 8 | 3.5 | 4 | 1 |
| Biscuit, chaos golden retriever | lowercase, enthusiastic | Believes the last thing said. As imposter, says the word's neighbor out loud. | 3 | 9 | 1.5 | 8 |
| Marlowe, smooth liar | Dry one-liners | As imposter, steers blame to the current top suspect. As civilian, accuses whoever accused Marlowe last. Holds grudges. | 5.5 | 2 | 9 | 3 |
| Rook, quiet analyst | Few words | Weighs every clue equally. Fills the fourth seat in Watch mode. | 5 | 5 | 5 | 2 |

**Memory pipeline.** After reveal, the client POSTs the public view with traces to `/api/memory` with existing notes. One haiku call per persona returns ≤3 notes and a lobby line. Merge, cap 10 per persona, store under `imposter.memory.{persona}`. Next game: notes go into `seatView.memoryOfHuman`; the lobby shows the line.

**Grudge counter.** Pure engine stat: `grudge[persona] += 1` when you voted for them and they were innocent; reset when they catch you. Shown as one grey line under the name. Passed to the prompt as "You hold a grudge against the human (4 games)."

## 08. Routes and realtime

| Route | Body | Returns |
| --- | --- | --- |
| `POST /api/game` | `{ mode, personas, playerId, seed?, memory }` | Creates game, runs deal. Returns `PublicView` with your role. |
| `POST /api/game/[id]/phase` | `{ phase }` | Runs agent turns until a human move is needed. SSE events: `clue`, `message`, `vote`, `suspicion` (watch only), `waiting`, `phase`. Final event carries the view. |
| `POST /api/game/[id]/human` | `HumanMove` | Validates (400 with reason), applies, continues the phase, streams the rest. |
| `POST /api/memory` | `{ view, notes }` | `{ [persona]: { notes, lobbyLine } }` |

SSE over sockets: turn-based and single-player on the human side; a streamed POST gives the one-at-a-time reveal with no connection management. `maxDuration = 60` on the two streaming routes.

Store: `globalThis.__games ??= new Map()` with a 2-hour sweep. Fine for a demo on Fluid Compute. First thing to swap for KV if time allows; noted in the write-up.

## 09. Screens

One screen per phase, driven by `view.phase`. Set in §00.

| Screen | Details |
| --- | --- |
| Lobby | Mode toggle (Play / Watch), persona rows with lobby lines from memory, streak + caught chips, Deal (the one red button). |
| Role card | Mono label `CIVILIAN · BREAKFAST`, the word at 28px, one grey sentence. Imposter: `IMPOSTER · BREAKFAST` in red, no word. Cross-fade in, tap to hide. |
| Table | Seats as a list in turn order, not a felt circle. Clue chips land one at a time (700ms); dashed outline while pending. Clue input with inline validation. |
| Discussion | Plain text, names in grey, your lines in grey. No bubbles. @chips prefill the input. 2px timer bar. "I'm sure" ends early. |
| Vote | Hairline rows; votes are seat dots revealed 700ms apart with a one-line grey reason. Ejected seat gets a strikethrough. Tie shows "No one leaves." |
| Reveal + Brain Replay | Mono label (who was the imposter), 28px verdict, last-guess line, then the replay (§10). |
| Share | Mono share card (`IMPOSTER #142 · BREAKFAST`, four squares, caught-in-N, your clue). Clipboard copy with select-text fallback. Grudge line. Play again / Watch buttons. |
| Watch | Live dot (red), your-call picker, live suspicion meters with the latest note's reason, Take a seat. |

**Client state.** One `useGame()` hook holds `view`, an events log, and `pending`. Exposes `start()`, `advance(phase)`, `send(move)`. SSE events patch `view`. `gameId` in sessionStorage so a refresh resumes.

## 10. Watch mode and Brain Replay

**Watch mode is the same engine with 4 agent seats.** `{mode:"watch"}` seats Juno, Biscuit, Marlowe, Rook. The view includes the word (you're the audience) but not roles. The client auto-advances with a short pause; "Pause" stops it. Your call is lockable any time before the vote: 3 points in clue1, 2 in clue2, 1 in discuss. The server streams a `suspicion` event after each agent turn with the table average and the latest note's reason (hidden in Play mode until reveal). Take a seat: `{takeSeat:"rook"}` flips the seat to human; you inherit its role and notes.

**Brain Replay.** Data: `view.traces` after reveal, grouped by seat. One sparkline per agent of suspicion toward the real imposter; white for the agent who climbed, grey for the rest. A four-stop scrubber (R1, R2, Talk, Vote); each stop shows every agent's private note and suspicion as 2px bars. Imposter extra: `wordGuesses` per turn ("waffle .4 → .6 → .75"). Badges from trace flags as grey mono text: hunch, fallback clue, changed mind after your @mention. One line at the top: "Here's what they were actually thinking."

## 11. Eval harness and model pick

The brief asks you to explain the model choice. Measure it. `scripts/sim.ts` runs Watch-mode games headless and prints a table for the write-up.

```
pnpm sim -- --games 10 --civ anthropic/claude-haiku-4.5 --imp anthropic/claude-sonnet-5.5
pnpm sim -- --games 10 --civ anthropic/claude-haiku-4.5 --imp anthropic/claude-haiku-4.5
pnpm sim -- --games 10 --civ anthropic/claude-sonnet-5.5 --imp anthropic/claude-sonnet-5.5
```

Per config: imposter win rate, caught-but-guessed, clue rejections, avg turn latency, cost/game. Per persona: vote accuracy.

**What good looks like.** Imposter win rate 35–50%. Clue rejection rate under 10% (above that, fix prompts before personas). Juno accuracy > Rook > Biscuit, or the knobs aren't biting. Average agent turn under 2.5s.

## 12. Schedule

Each block ends with something runnable. If a block runs more than an hour over, move on and apply the cut list.

**Sunday, Oct 4: engine, agents, and the core screens**

| Block | Work |
| --- | --- |
| 0:00–0:45 | Scaffold (done). Read `node_modules/ai/docs` for structured output and streaming; note exact names in `NOTES.md`. Push, connect to Vercel. |
| 0:45–2:30 | Engine: `types`, `words` (10 sets now, 30 later), `game`, `validate`, `view`. §05 tests green. |
| 2:30–4:30 | Agents: `schemas`, `prompts` with one neutral persona, `act` with validation, retry, fallback, timeout. Headless game script; fix until 5 clean games in a row. |
| 4:30–5:15 | Sim harness. Baseline 5 games on the split config. Save output. |
| 5:15–6:45 | Routes + raw UI. Store, SSE helper, three routes. One page with buttons and `JSON.stringify(view)`. Full game in the browser. Deploy. |
| 6:45–7:30 | Personas: Juno, Biscuit, Marlowe. Specificity index, update blending, chaos. Sim confirms Juno > Biscuit. |
| 7:30–9:30 | Core screens in the design system: `ui/` primitives first, then Lobby, RoleCard, Table, VoteList with staggered reveals. |

**Monday, Oct 5: the parts that impress, then ship**

| Block | Work |
| --- | --- |
| 0:00–1:15 | Discussion: opening pass, @mention replies, timer, "I'm sure". Caps enforced server-side. |
| 1:15–2:45 | Brain Replay: reveal headline, sparklines, scrubber, notes with 2px bars, imposter guess trail, badges. |
| 2:45–3:45 | Daily loop: seeded word, streak, history, share card, lastGuess screen. Word bank to 30. |
| 3:45–5:00 | Memory + Watch mode: `/api/memory`, lobby lines, grudge counter. Watch: auto-advance, your call, live meter, detective score. |
| 5:00–5:45 | Tune and harden: sim 10×3 configs for the write-up table; adjust if the imposter win rate is outside 35–50%. Test on a real phone. Force a bad model string to verify the timeout fallback. |
| 5:45–6:30 | Loom: two takes with the §13 script. Keep the one where something funny happens. |
| 6:30–7:15 | Write-up and submit: README with the outline, the sim table, the link, local run steps. |

**Cut list, in order:** 1. Take a seat. 2. Live meter in Watch mode (keep Watch; show meters only at reveal). 3. @mention replies (keep the opening accusation pass). 4. Persona memory via model (keep the grudge counter). 5. Watch mode entirely.

**Never cut:** Brain Replay, the hidden-info test, the daily seed and share card, the sim table.

## 13. Deliverables

**Loom script, under 3:00**

| Time | Beat |
| --- | --- |
| 0:00 | "I wanted a game night where my AI is a player with secrets, not a referee." |
| 0:15 | Lobby. Point at Marlowe's grudge line. Deal. |
| 0:30 | One round, 1.5× where needed. Say your clue and why. |
| 1:30 | Vote reveal, then Brain Replay. Read one private note aloud. |
| 2:15 | Watch mode: 15 seconds of agents accusing each other, meter moving. |
| 2:40 | Why Claude, and what's next. |

Record on the deployed URL in a phone-width window. Pre-seed localStorage so the streak and grudge aren't zero.

**Write-up (README, ~600 words).** What I built; how the agent decides (seat view → structured move → engine validation; suspicion blending, specificity index, chaos; link the hidden-info test); model and why (the sim table, the Haiku/Sonnet split, Claude over the listed options); tools; deliberate choices (code referees, personas with flaws, replay after the game only, ties favor the imposter, SSE over sockets, one dark theme and one type size); next (voice for the living room, friends and agents at one table, interrogation mode, KV persistence).

**Submission checklist**

- [ ] Deployed URL plays a full round on a phone with no setup
- [ ] README has the write-up, the sim table, and local run steps
- [ ] Loom under 3:00, shows Brain Replay and the model reasoning
- [ ] Hidden-info test passes and is linked from the README
- [ ] Repo shared with reviewers; `.env` not committed
- [ ] Gateway key has a spend limit

## 14. Risks

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| Imposter too obvious | High | Sonnet for the imposter seat; probability list before the clue; decoy-rich sets; measure with sim. |
| Civilian leaks the word | Medium | Engine validation, retry, regex strip on public text. |
| Round feels slow | Medium | Parallel votes, 12s timeout, staggered reveal hides latency, Haiku for 3 of 4 seats. |
| AI SDK API drift from memory | High | Read bundled docs after install; write `act()` once and reuse. |
| Dark-only UI reads as unfinished | Low | The reference is the reviewer's own site. Hold the line; let the words carry it. |
| In-memory store resets on cold start | Low | On 404 show "Table reset. Deal again." Note in write-up. |
| Scope creep into Watch mode | High | Watch mode is late Monday; the cut list is explicit. |

## Appendix: concepts considered

Six household games were scored against the rubric before picking Imposter. See [ADR 0001](adr/0001-imposter-over-other-concepts.md).

| Concept | One line | Why not (or why as a mode) |
| --- | --- | --- |
| Imposter: The Table | Secret word, one player only knows the category | **Picked.** Best fit for agent logic (bluffing, belief updates) and product sense (4-minute rounds, daily loop). |
| Imposter TV | Four agents play, you predict | **Folded in as Watch mode.** Same engine, zero new rules. |
| Same Wavelength | Co-op spectrum guessing with an AI partner | Strong, but one clue per round gives less to show in a replay. |
| Liar's Dice | 1v1 bluffing with a rival who remembers your bluff rate | Math is the hero; the model would mostly narrate it. |
| Codenames Duo | Co-op 5×5 word grid | Clue scoring is a solved problem; less personality. |
| Sketch Off | Pictionary with a vision model | Vision latency risk; harder to ship in two days. |
| Alibi | Interrogate three suspects, one is lying | Overlaps with Imposter; better as a later mode. |
