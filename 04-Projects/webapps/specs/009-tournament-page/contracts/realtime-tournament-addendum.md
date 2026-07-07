# Contract Addendum: Realtime Bridge — Tournament Support

Addendum to `contracts/realtime-bridge.md`/`realtime-bridge-addendum.md` from specs 007/008.
Describes the tournament-page extension to `apps/web/app/api/caro/realtime/route.ts` and
`apps/web/lib/useCaroRealtime.ts` (research.md §6), and the corresponding backend gateway change
(research.md §2/§3).

## Route Handler (`apps/web/app/api/caro/realtime/route.ts`)

New optional query param: `?tournamentId=`, independent of the existing `?matchId=`.

```text
GET /api/caro/realtime                                → LOBBY_EVENTS + match:started
GET /api/caro/realtime?matchId={id}                    → LOBBY_EVENTS + MATCH_EVENTS (includes match:started)
GET /api/caro/realtime?tournamentId={id}               → LOBBY_EVENTS + TOURNAMENT_EVENTS + match:started
GET /api/caro/realtime?matchId={a}&tournamentId={b}    → not used by this feature (a page never needs both)
```

`match:started` moves out of the `matchId`-gated set into an always-forwarded one — every connection
listens for it regardless of query params, since it's how the tournament page learns it's time to
navigate (FR-007). This has no effect on non-tournament pages: `match:started` is only ever pushed
(`pushToUser`) to the two players actually placed into a match, so a lobby-only connection simply
never receives it.

When `tournamentId` is present, the Route Handler emits `join_room` for `tournament:{tournamentId}`
(no `matchViewerUsername` payload needed — presence tracking here is by authenticated `userId`, set
server-side by the gateway from the JWT already used to open the socket, per research.md §2) and
`leave_room` on stream cancel (page close/navigation-away), exactly mirroring the existing
`matchId` join/leave lifecycle.

```ts
const TOURNAMENT_EVENTS = [
  "tournament:status-changed",
  "tournament:match-created",
  "tournament:participant-updated",
] as const;

const ALWAYS_ON_EVENTS = [...LOBBY_EVENTS, "match:started"] as const;
```

## Client hook (`apps/web/lib/useCaroRealtime.ts`)

`acquireSharedSource` gains a second optional parameter:

```ts
function acquireSharedSource(matchId?: string, tournamentId?: string): EventSource {
  if (!sharedSource) {
    const params = new URLSearchParams();
    if (matchId) params.set("matchId", matchId);
    if (tournamentId) params.set("tournamentId", tournamentId);
    const qs = params.toString();
    sharedSource = new EventSource(qs ? `/api/caro/realtime?${qs}` : "/api/caro/realtime");
  }
  refCount += 1;
  return sharedSource;
}
```

`useCaroRealtimeEvent(eventName, handler, matchId?, tournamentId?)` — the tournament page passes
`tournamentId`; the gameboard page continues passing `matchId` exactly as spec 008 left it.

## Backend gateway presence tracking

See data-model.md's "Realtime event contract" table and research.md §2/§3 for the full
`tournamentPresence` Map and `caro.tournament.presence-joined` event design. No new client-facing
socket event is introduced by this addition — it's purely server-internal (gateway → `EventEmitter2`
→ `TournamentPresenceJoinedHandler`), triggering the existing `PairIdlePlayersUseCase`.
