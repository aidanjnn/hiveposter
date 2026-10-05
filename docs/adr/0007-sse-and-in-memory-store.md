# 0007. Streamed POST responses over WebSockets; in-memory game store for v1

Date: 2026-10-04 · Status: Accepted

## Context

The game is turn-based and single-player on the human side; the client always knows when it needs the next phase. Reveals should land one item at a time for drama. Two days are available.

## Decision

- Each phase is one `POST /api/game/[id]/phase` whose response streams `GameEvent`s as `text/event-stream`. Human moves go to `POST /api/game/[id]/human`, which applies the move and streams the rest of the phase. `maxDuration = 60` on both.
- Game state lives in `globalThis.__games` (a `Map` with a 2-hour sweep). Client-side persistence (streak, history, persona memory) is localStorage keyed by a random `playerId`.

## Consequences

- No socket lifecycle to manage; streaming works on the default Node.js runtime on Vercel.
- A cold start can lose an in-progress game. The client shows "Table reset. Deal again." and the write-up discloses it. Swapping the store for a Marketplace KV is the first post-deadline change.
- localStorage is per device; cross-device memory is out of scope for v1.
