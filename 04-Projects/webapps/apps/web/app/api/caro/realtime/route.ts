import { cookies } from "next/headers";
import { ACCESS_COOKIE_NAME } from "@/lib/session";
import { connectRealtime } from "@/lib/realtime";

/**
 * Events this bridge relays to the browser (contracts/realtime-bridge.md, data-model.md
 * "Realtime event contract"). `lobby:updated` is not yet emitted by the backend
 * (research.md §2 row 5) — subscribing to it ahead of time is a safe, inert default.
 */
const FORWARDED_EVENTS = ["lobby:updated", "quick_pair:matched"] as const;

/**
 * SSE bridge to the backend's Socket.IO `/realtime` gateway (contracts/realtime-bridge.md). The
 * access token is read from the httpOnly cookie here, server-side, and used only to open this
 * route's own outbound socket.io-client connection — it is never sent to or held by the browser,
 * which only ever opens a same-origin EventSource (constitution Principle VI).
 */
export async function GET(): Promise<Response> {
  const store = await cookies();
  const accessToken = store.get(ACCESS_COOKIE_NAME)?.value ?? null;
  const socket = connectRealtime(accessToken);

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();

      for (const eventName of FORWARDED_EVENTS) {
        socket.on(eventName, (payload: unknown) => {
          controller.enqueue(encoder.encode(`event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`));
        });
      }
    },
    cancel() {
      socket.disconnect();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
