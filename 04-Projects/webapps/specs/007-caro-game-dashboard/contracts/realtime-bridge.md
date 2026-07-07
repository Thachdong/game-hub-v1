# Contract: Realtime SSE Bridge

Defines the boundary between the browser and `apps/web/app/api/caro/realtime/route.ts` — the
service-interface-layer equivalent for realtime data, per constitution Principle VI. Full event
payload shapes are in `data-model.md`'s "Realtime event contract" table.

## Endpoint

`GET /api/caro/realtime` (Next.js Route Handler, same-origin only — never called cross-origin).

- **Request**: No body. Auth is implicit via the `access_token` httpOnly cookie, read
  server-side exactly like `forwardToBackend` does — never passed as a query param or header by
  the caller, since the caller is same-origin browser JS that must never hold the token.
- **Response**: `Content-Type: text/event-stream`, kept open for the lifetime of the browser tab's
  interest in the dashboard. Each backend-gateway event this bridge subscribes to (see
  data-model.md) is forwarded as one SSE message: `event: <name>\ndata: <JSON>\n\n`.
- **Guest requests** (no `access_token` cookie): allowed. The bridge opens its backend
  `socket.io-client` connection with no `auth.token`, which the backend gateway already accepts as
  a read-only `observer` (`realtime.gateway.ts`'s `handleConnection`). Guests receive `lobby:updated`
  events (once the backend ships them) but never `quick_pair:matched` (that's pushed per
  authenticated user only, and a guest has no `playerId` to match).

## Client usage

A thin hook (e.g. `useLobbyRealtime()`) wraps the native `EventSource` API — no
`socket.io-client` dependency in browser bundle at all; that package is a server-only dependency
of the Route Handler.

```ts
const source = new EventSource("/api/caro/realtime");
source.addEventListener("lobby:updated", (e) => {
  const payload = JSON.parse(e.data) as { matchId: string; action: string };
  // merge into local Lobby list state
});
source.addEventListener("quick_pair:matched", (e) => {
  const payload = JSON.parse(e.data) as { matchId: string };
  // navigate to /game-caro/{matchId}
});
```

## Reconnection

`EventSource` auto-reconnects on drop per the spec's native behavior (no custom retry loop
needed). The Route Handler's `socket.io-client` connection to the backend uses that library's
default reconnection behavior as well. Neither side needs bespoke backoff logic for this feature.

## What this contract does NOT cover

- The backend adding the `lobby` room/broadcast (research.md §2 row 5) — this bridge is written to
  consume that event once it exists; until then, subscribing to `lobby:updated` simply never
  fires, which is a safe, inert default (no error, no fallback polling).
- Any bidirectional messages from browser to backend (e.g. `join_room`) — this feature only needs
  to *receive* events, not send socket messages, so the bridge is a one-way relay.
