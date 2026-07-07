# Contract Addendum: Realtime SSE Bridge — Match Room Support

Extends `specs/007-caro-game-dashboard/contracts/realtime-bridge.md`. That contract's endpoint,
guest handling, and reconnection behavior are unchanged and apply as-is; this addendum only adds a
query parameter and a wider forwarded-event set for match-scoped viewing.

## Endpoint (unchanged path, new optional param)

`GET /api/caro/realtime?matchId={id}` (Next.js Route Handler, same-origin only).

- When `matchId` is present, the Route Handler additionally emits `join_room` on its backend
  `socket.io-client` connection with `{ room: `match:${matchId}`, matchViewerUsername }` —
  `matchViewerUsername` is the signed-in viewer's `account.username` (read the same way
  `forwardToBackend` reads the access-token cookie: server-side, from the httpOnly cookie's
  decoded session, never from a client-supplied value) or omitted entirely for a guest request (no
  cookie), who joins as the gateway's anonymous `observer` role.
- When the browser tab navigates away from the match (or `matchId` changes), the client closes and
  reopens the `EventSource` with the new `matchId` — the Route Handler's `cancel()` callback emits
  `leave_room` for the previous room before disconnecting its backend socket, exactly as it already
  disconnects on cancel today.
- When `matchId` is absent (e.g. the dashboard page), behavior is byte-for-byte identical to spec
  007's original contract — no room is joined, only `lobby:updated`/`quick_pair:matched` forward.

## Forwarded events (superset)

In addition to `lobby:updated` and `quick_pair:matched` (unchanged), when a `matchId` was supplied
this bridge also forwards every event listed in data-model.md's "Realtime event contract" table:
`match:player_joined`, `match:started`, `match:move_placed`, `match:turn_changed`,
`match:draw_requested`, `match:draw_declined`, `match:ended`, `match:cancelled`, `match:chat`,
`match:viewer_joined`, `match:viewer_left`. Each is relayed as its own SSE message
(`event: <name>\ndata: <JSON>\n\n`), identical framing to the existing two events.

## Client usage

```ts
const source = new EventSource(`/api/caro/realtime?matchId=${matchId}`);
source.addEventListener("match:move_placed", (e) => {
  const move = JSON.parse(e.data) as CaroMove;
  // append to local moves state
});
source.addEventListener("match:viewer_joined", (e) => {
  const { viewerUsername } = JSON.parse(e.data) as { matchId: string; viewerUsername: string };
  // add to local viewer list
});
```

The existing `useCaroRealtimeEvent(eventName, handler)` hook (`apps/web/lib/useCaroRealtimeEvent.ts`)
is unchanged in shape; only its shared `EventSource` construction needs the `matchId` query param
threaded through from whichever component owns "which match is this page for" (the gameboard
template), same pool/refcount behavior as today.

## What this addendum does NOT cover

- The two backend response-shape gaps in `GET /caro/matches/:id` (placeholder username/elo, always-
  empty `viewers`) — research.md §3. This bridge faithfully relays whatever the gateway emits; it
  doesn't paper over gaps in the initial REST fetch.
- Any bidirectional gameplay messages (placing a move, starting, drawing, surrendering) — those
  remain plain authenticated REST calls through `packages/caro-service`, unchanged by this feature.
  This bridge only ever *receives* events for the browser to react to.
