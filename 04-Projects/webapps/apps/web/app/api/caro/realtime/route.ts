import { cookies } from "next/headers";
import { ACCESS_COOKIE_NAME, getSessionStatus } from "@/lib/session";
import { connectRealtime } from "@/lib/realtime";

/**
 * Events this bridge always relays (contracts/realtime-bridge.md, data-model.md
 * "Realtime event contract"). `lobby:updated` is not yet emitted by the backend
 * (research.md §2 row 5) — subscribing to it ahead of time is a safe, inert default.
 */
const LOBBY_EVENTS = ["lobby:updated", "quick_pair:matched"] as const;

/**
 * Match-scoped events, forwarded only when a `matchId` query param is supplied
 * (contracts/realtime-bridge-addendum.md).
 */
const MATCH_EVENTS = [
  "match:player_joined",
  "match:started",
  "match:move_placed",
  "match:turn_changed",
  "match:draw_requested",
  "match:draw_declined",
  "match:ended",
  "match:cancelled",
  "match:chat",
  "match:viewer_joined",
  "match:viewer_left",
] as const;

/**
 * SSE bridge to the backend's Socket.IO `/realtime` gateway (contracts/realtime-bridge.md,
 * contracts/realtime-bridge-addendum.md). The access token is read from the httpOnly cookie
 * here, server-side, and used only to open this route's own outbound socket.io-client
 * connection — it is never sent to or held by the browser, which only ever opens a same-origin
 * EventSource (constitution Principle VI).
 *
 * When `?matchId=` is present, this also joins the backend gateway's `match:{matchId}` room
 * (passing the signed-in viewer's username, omitted for guests) and forwards every match-scoped
 * event in addition to the two lobby-level ones.
 */
export async function GET(request: Request): Promise<Response> {
  const store = await cookies();
  const accessToken = store.get(ACCESS_COOKIE_NAME)?.value ?? null;
  const socket = connectRealtime(accessToken);

  const matchId = new URL(request.url).searchParams.get("matchId");
  const matchViewerUsername = matchId ? (await getSessionStatus()).account?.username : undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      const eventNames: readonly string[] = matchId ? [...LOBBY_EVENTS, ...MATCH_EVENTS] : LOBBY_EVENTS;

      for (const eventName of eventNames) {
        socket.on(eventName, (payload: unknown) => {
          controller.enqueue(encoder.encode(`event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`));
        });
      }

      if (matchId) {
        socket.emit("join_room", { room: `match:${matchId}`, matchViewerUsername });
      }
    },
    cancel() {
      if (matchId) {
        socket.emit("leave_room", { room: `match:${matchId}` });
      }
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
