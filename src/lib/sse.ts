import type { GameEvent } from "@/engine/types";

/**
 * Plan §08. Tiny server-sent-events helper. Each phase is one POST whose response streams GameEvents;
 * the client patches its view as they arrive. No sockets.
 */

export interface EventStream {
  response: Response;
  send(event: GameEvent): void;
  close(): void;
}

export function eventStream(): EventStream {
  throw new Error("TODO(lib): eventStream");
}

/** Client side: parse a streamed response into GameEvents. */
export async function* readEvents(response: Response): AsyncGenerator<GameEvent> {
  throw new Error("TODO(lib): readEvents");
}
