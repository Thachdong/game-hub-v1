# Phase 0 Research: Caro Match Gameboard Page

## 1. Realtime transport for match-scoped events

**Decision**: Extend the existing SSE bridge (`apps/web/app/api/caro/realtime/route.ts`,
introduced by spec 007) to accept a `matchId` query param, join the backend gateway's
`match:{matchId}` room server-side, and forward every match-scoped event to the browser as an SSE
message, in addition to the two events it already forwards (`lobby:updated`, `quick_pair:matched`).

**Rationale**: The backend (`04-Projects/api/src/realtime/realtime.gateway.ts`) already implements
exactly the room/event model this feature needs:
- `@SubscribeMessage('join_room')` joins a Socket.IO room by name; for a room named `match:{id}`
  with an authenticated caller's `matchViewerUsername`, it also tracks that viewer and broadcasts
  `match:viewer_joined`/`match:viewer_left` to the room.
- Every caro-game use case already pushes its own event to `match:{matchId}` via
  `IRealtimeRoomPort.pushToRoom`: `match:player_joined` (join-match.use-case.ts),
  `match:started`/`match:ended` (start-match.use-case.ts), `match:move_placed`/`match:turn_changed`/
  `match:ended` (place-move.use-case.ts), `match:ended` (surrender.use-case.ts),
  `match:draw_requested` (send-draw-request.use-case.ts), `match:draw_declined`/`match:ended`
  (respond-draw-request.use-case.ts), `match:cancelled` (join-match.use-case.ts's start-window
  timeout, cancel-match.use-case.ts, leave-match-before-start.use-case.ts), and `match:chat`
  (send-chat-message.use-case.ts).

No backend change is needed to emit these — only the webapp's SSE Route Handler needs to open the
room and relay them, exactly mirroring the pattern spec 007 already established for the two
lobby-level events. Guests connect the same way (no `auth.token` → gateway assigns `role:
'observer'`, per `handleConnection`); `join_room` doesn't require `role === 'authenticated'` to
succeed, only to be *tracked* in the named viewer list.

**Alternatives considered**: A second, match-scoped SSE endpoint (`/api/caro/realtime/[matchId]`)
was considered instead of a query param on the existing one. Rejected: the existing route already
owns the single shared `EventSource` connection per tab pattern (`useCaroRealtimeEvent`); adding a
second endpoint would mean the gameboard page opens two SSE connections (one for match events, one
still needed for nothing else on this page) for no benefit. A query param keeps one connection,
one Route Handler, one place that owns the token/socket lifecycle.

## 2. Identifying "own" vs "opponent" and viewer identity

**Decision**: Compare `useAuthSession().account.id` (already available client-side, no token
involved — see `apps/web/lib/session.ts`'s `SessionAccount`) against `MatchState.playerX.id` /
`playerO.id` to decide which card is "own" vs "opponent," and against `MatchState.creatorId` to
decide whether the current viewer's Start control is enabled. When joining the match's realtime
room, pass `account.username` as `matchViewerUsername` (signed-in only — omit for guests, who join
anonymously as the gateway's `observer` role and are not added to the tracked viewer list).

**Rationale**: No new type or backend field is needed — `SessionAccount` already carries `id` and
`username`; `MatchState` already carries `creatorId`, `playerX`, `playerO`. This mirrors the
existing `isSelf` computation pattern used for the leaderboard in spec 007's data-model.md.

## 3. Known backend-contract gaps (webapp designs around these)

Two backend-response gaps were found; unlike the 15-second countdown, the guard placement, and the
viewer-identity payload (§4/§5/§6 below — all fixed for this feature, see plan.md's Summary), these
are left for a later backend change and the webapp designs around them defensively, per the same
approach spec 007 already established for its own set of six gaps:

| # | Gap | Where | Webapp handling |
|---|---|---|---|
| 1 | `GET /caro/matches/:id` hard-codes `playerX.username = playerXId` (the raw ID, not a display username) and `elo: 0`/`winRate: 0` for both players (`match.controller.ts`'s `toMatchStateDto`). | Backend | Own/Opponent Player Card falls back to a shortened ID (`Player {id.slice(0,6)}`) when the returned username looks like a UUID, and omits the Elo/win-rate badges when they read exactly `0` in a context where a real 0 can't yet be distinguished from "not populated" — same defensive pattern as spec 007's LeaderboardEntryView. |
| 2 | `GET /caro/matches/:id` always returns `viewers: []` — there is no REST-level source of truth for who's currently watching; the gateway's `roomViewers` map is in-memory only and not exposed via any endpoint or socket acknowledgment. | Backend | The Viewer List is built and maintained entirely client-side from `match:viewer_joined`/`match:viewer_left` events received after this viewer's own `join_room` call. A viewer who joins after others are already watching won't see those pre-existing viewers listed until the next join/leave event involving them — a known, documented limitation, not a bug to chase in this feature. |

## 4. Pre-start countdown duration (resolved, not a gap)

The backend's `JoinMatchUseCase` (`04-Projects/api/src/caro-game/application/use-cases/join-match.use-case.ts`)
previously set `START_WINDOW_SECONDS = 30`, conflicting with the spec's 15-second requirement.
Per explicit user decision (see spec.md's checklist notes), this was changed to `15` as part of
this feature rather than changing the spec's number — a one-line constant, already applied. The
countdown itself is still rendered purely from the returned `deadlineAt` timestamp (constitution
Principle VI); the constant only controls what that deadline computes to.

## 5. Guest read-access guard gap on `MatchController`/`ChatController` (resolved, not a gap)

Spec 006-caro-guest-access's own Assumptions section states its backend guard removal was already
done and out of scope for that feature — but code inspection during this feature's planning showed
`MatchController` (`lobby`, `GET :id`, `GET :id/moves`) and `ChatController`'s `GET` (history) were
still decorated with the strict `JwtAuthGuard` at the class level, meaning an unauthenticated
request would 401. This directly blocked this feature's top-priority guest-spectating story (US1),
so, per explicit user decision, it was fixed as part of this feature:

- `MatchController`: class-level guard removed; `lobby()`, `getState()`, `getMoves()` now carry
  `@UseGuards(OptionalJwtGuard)` (guest-accessible); `create()`, `join()`, `cancel()`, `leave()`,
  `invite()`, `respondToInvitation()` now each carry an explicit `@UseGuards(JwtAuthGuard)` (no
  behavior change for these — they already required `req.user.sub`).
- `ChatController`: class-level guard removed; `history()` now carries `@UseGuards(OptionalJwtGuard)`
  (guest-accessible, matching this feature's FR-010/FR-012); `send()` and `mute()` now each carry an
  explicit `@UseGuards(JwtAuthGuard)` (no behavior change).
- `GameplayController` (start/move/surrender/draw-request/draw-respond) was deliberately left
  untouched — every one of those actions is participant/creator-gated in this feature's own spec
  (FR-013/FR-014), so guest access there was never in scope.

This mirrors the existing `OptionalJwtGuard` convention already used elsewhere in the API
(`account-social/interface/http/games.controller.ts`), rather than inventing a new pattern.

## 6. Viewer identity for mute/kick (resolved, not a gap)

Found during `/speckit-analyze` (coverage-gap G1) and its remediation: `muteMatchViewer({ matchId,
viewerId })` requires `viewerId` to be a UUID (`MuteViewerDto.viewerId` is `@IsUUID()`,
`MuteRegistryService` stores it verbatim) — but `realtime.gateway.ts`'s `match:viewer_joined`/
`match:viewer_left` events only carried `viewerUsername`, sourced from `join_room`'s
client-supplied `matchViewerUsername` string. There was no way for the webapp to resolve a viewer
list entry back to the UUID the mute endpoint needs.

Fixed as part of this feature: both events now also include `viewerId: client.userId` — the
already-verified account id the gateway attaches to the socket in `handleConnection` for any
authenticated connection, so no new lookup or backend call is required, just including a value the
gateway already has. `ViewerEntry` (data-model.md) gained an `id` field sourced from this.

## 7. "Report" action

**Decision**: Reuse the already-existing, already-shipped `packages/profiles-service` functions
`listReportTypes()` and `submitReport({ reportedUserId, reportTypeId, context })` — no new service
package or backend endpoint. The backend's `POST /reports` (`trust-report` module, unrelated to
`caro-game`) requires a `reportTypeId` (from `GET /report-types`) and a 1–2000 character `context`,
so the Report control opens a small form (type selector + free-text reason) rather than firing on a
single click; this is an implementation detail of the control, not a change to spec.md's FR-015
("available to any signed-in viewer... redirect to login for guests").

**Alternatives considered**: A caro-specific report endpoint. Rejected — Principle V (Rule of Two)
and the fact that a working, general-purpose reports service already exists and is already used
elsewhere in the app (`packages/admin-service`'s reports moderation surface).

## 8. Move Replay ("xem lại các nước đã chơi")

**Decision**: The `GameBoard` organism gains a `replayIndex` prop; in replay mode it renders the
board built from `moves.slice(0, replayIndex)` instead of the full `moves` array, with simple
prev/next controls. No new data is needed — `MatchState.moves` (already an ordered `CaroMove[]`
with `sequenceNumber`) is sufficient.

**Alternatives considered**: A separate `/game-caro/[matchId]/replay` route. Rejected — spec.md's
Assumptions section already settled on "replays... on the same board area used for live play,"
and a same-page mode toggle is simpler than a second route with duplicated header chrome.
