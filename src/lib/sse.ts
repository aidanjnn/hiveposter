import type { GameEvent } from "@/engine/types";

/**
 * Plan §08. Server-sent events over a POST response. Each phase request streams GameEvents
 * and ends with a "view" event; the client patches its state as they arrive. No sockets.
 */

export interface EventStream {
  response: Response;
  send(event: GameEvent): void;
  close(): void;
}

export function eventStream(): EventStream {
  const encoder = new TextEncoder();
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  let closed = false;
  const body = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
    cancel() {
      closed = true;
    },
  });
  return {
    response: new Response(body, {
      headers: {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache, no-transform",
        "x-accel-buffering": "no",
      },
    }),
    send(event) {
      if (closed) return;
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
    },
    close() {
      if (closed) return;
      closed = true;
      controller.close();
    },
  };
}

/** Client side: parse a streamed response into GameEvents as they arrive. */
export async function* readEvents(response: Response): AsyncGenerator<GameEvent> {
  if (!response.body) return;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (value) buffer += decoder.decode(value, { stream: true });
    let end = buffer.indexOf("\n\n");
    while (end !== -1) {
      const chunk = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      const data = chunk
        .split("\n")
        .filter((l) => l.startsWith("data: "))
        .map((l) => l.slice(6))
        .join("\n");
      if (data) yield JSON.parse(data) as GameEvent;
      end = buffer.indexOf("\n\n");
    }
    if (done) return;
  }
}
