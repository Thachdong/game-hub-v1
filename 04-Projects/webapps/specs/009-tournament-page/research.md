# Research: Tournament Page

## §1. Scoring formula conflict (FR-014)

**Decision**: Keep the existing `tournament-score-calculator.ts` engine exactly as implemented; do
not change any backend scoring logic in this feature. spec.md's FR-014, its Clarifications entry,
the Tournament Standing key entity, and the Assumptions section were updated to describe the actual
formula (win=2, doubled to 4 from the 4th consecutive win; draw=1, or 2 if the prior streak was ≥3;
loss=0; loss always resets the streak, draw resets it after any bonus).

**Rationale**: `/speckit-clarify` produced FR-014 from the user's own stated rule (win=2/draw=1/
loss=0, "win liên tục thứ 3 trở lên x2 điểm... thua sẽ mất liên tục") before this plan's research
surfaced that `04-Projects/api/src/caro-game/domain/value-objects/tournament-score-calculator.ts`
already existed with a *different* threshold (4th win, not 3rd) and a draw-streak-break bonus the
user never mentioned. Asked directly during planning: "sửa code theo spec" vs. "sửa spec theo code
hiện tại." The user chose to keep the current calculation and handle any change to the API
themselves later, if needed ("giữ cách tính hiện tại, tôi sẽ check và update api sau, nếu cần").
Changing scoring logic without the user's explicit go-ahead risks silently altering already-tested
backend behavior for a rule they didn't ask this feature to touch.

**Alternatives considered**: Changing `calculateTournamentScore` to match the original FR-014
text — rejected per the user's explicit choice above.

## §2. Presence-based matchmaking eligibility (FR-006/FR-006a)

**Decision**: A participant is only eligible for the next pairing while their browser currently has
an open SSE connection joined to that tournament's room (`tournament:{tournamentId}`). Presence is
tracked in `RealtimeGateway`, parallel to its existing match-room viewer tracking, but keyed by
`playerId` (not `viewerUsername`, since eligibility is about the account, not a display name):

```ts
// realtime.gateway.ts — new state alongside the existing roomViewers Map<string, Set<string>>
private readonly tournamentPresence = new Map<string, Set<string>>(); // room → set of playerId

// handleJoinRoom, when room.startsWith('tournament:') && client.role === 'authenticated':
this.tournamentPresence.get(room)?.add(client.userId) ?? this.tournamentPresence.set(room, new Set([client.userId]));
this.eventEmitter.emit('caro.tournament.presence-joined', { tournamentId: room.replace('tournament:', ''), playerId: client.userId });

// handleLeaveRoom / handleDisconnect, mirror match-room cleanup:
this.tournamentPresence.get(room)?.delete(client.userId);
```

`getPresentPlayerIds(room): string[]` is exposed the same way `getViewersInRoom` already is, so
`PairIdlePlayersUseCase` can read it before calling into matchmaking.

**Rationale**: The spec's own wording ("player ở page này khi được match... sẽ navigate") and the
clarified answer both tie eligibility to having the page open, not to registration status alone.
Reusing the gateway's existing per-connection tracking pattern (already used for match viewers) is
the smallest change that satisfies this — no new persisted table, no heartbeat/polling loop
(Principle VI forbids polling as a presence substitute).

**Alternatives considered**:
- A persisted "last-seen" heartbeat column with a TTL — rejected: adds a poll-like periodic
  heartbeat write and a background sweep just to approximate what an open socket connection already
  tells us for free.
- Treating "registered + unpaused" as sufficient (no presence check) — rejected per the clarified
  answer (Q1 of the `/speckit-clarify` session).

## §3. Presence-triggered re-pairing

**Decision**: `RealtimeGateway.handleJoinRoom` emits `caro.tournament.presence-joined` (via the
existing `EventEmitter2`) instead of calling matchmaking directly. A new
`TournamentPresenceJoinedHandler` (`@OnEvent('caro.tournament.presence-joined')`) calls
`PairIdlePlayersUseCase.execute(tournamentId)`, which now also fetches present player IDs from the
gateway before delegating to `TournamentMatchmakingService.pairNextTwo(tournamentId,
presentPlayerIds)`. `claimTwoIdlePlayers`'s SQL gains `AND is_paused = false AND player_id =
ANY($presentPlayerIds)`.

**Rationale**: Today, re-pairing only happens on tournament start, on late registration, and after a
match completes (`TournamentMatchCompletedHandler`) — nothing re-scans idle players when someone
simply (re)opens the tournament page. Since presence is exactly the new signal this feature adds,
opening the page is the natural new trigger. Emitting a domain event (rather than injecting
`PairIdlePlayersUseCase` directly into the gateway) matches the existing architecture, where the
gateway stays a thin transport layer and all matchmaking logic lives in application-layer handlers
(same shape as `TournamentMatchCompletedHandler` listening for `match.completed`).

**Alternatives considered**: Poll idle+present registrations on an interval — rejected, same
Principle VI concern as §2.

## §4. 5-second tournament-match auto-start (FR-007/FR-008)

**Decision**: `MatchTypeormRepository.createTournamentMatch` sets `status: 'auto_starting'` (new
status value) and `deadlineAt: now + 5s`, instead of `'in_progress'` immediately. A new
`TournamentMatchAutoStartService` schedules an in-process `setTimeout` at creation time; when it
fires, it re-loads the match, and if still `auto_starting`, flips it to `in_progress`, sets a fresh
per-move `deadlineAt` (`now + moveTimeSeconds`), saves, and pushes a `match:started` event to
`match:{matchId}` (the same event name spec 008's gameboard already listens for). As a safety net for
the rare case a server restart drops the in-flight timer, `TournamentSchedulerService`'s existing
10s cron gains a third sweep: any `auto_starting` match whose `deadlineAt` has already passed is
transitioned the same way.

**Rationale**: The existing tournament-match creation path has no waiting phase at all ("auto-started,
no lobby"), which is the wrong shape for FR-008's "5s auto-start, no manual button" — spec 008's
`waiting_for_start`/`StartCountdown` is the wrong fit too, since that requires a manual creator
click. A dedicated short-lived in-process timer gives sub-second precision for a 5-second window
(a 10s cron alone could be up to 10s late, which would visibly desync the client's countdown from
when moves actually become acceptable). The cron sweep exists purely so a mid-window server restart
can't strand a match in `auto_starting` forever.

**Alternatives considered**: Lazy transition (flip status to `in_progress` the first time a move or
read happens after `deadlineAt`) — rejected because nothing would proactively push `match:started`
to the client at the 5s mark, so the client's countdown reaching zero wouldn't correspond to any
observable server event; the board would appear to "hang" until the first move attempt. Relying
solely on the 10s cron — rejected for imprecision, per Rationale above.

## §5. Standings pagination (FR-003)

**Decision**: Extend the existing `GET /api/caro/tournaments/{tournamentId}/participants` endpoint
(already the standings endpoint — ordered `tournament_points DESC, registered_at ASC`, already
returns `rank`) with `page`/`pageSize` query params (default `page=1`, `pageSize=20`, max 50,
mirroring `ListTournamentsQueryDto`'s existing `limit` bounds), returning `{ items, page, pageSize,
total }`. `ITournamentRegistrationRepository.findAllByTournament` gains an offset/limit and a
`COUNT(*)` alongside it.

**Rationale**: The endpoint already computes the exact ordering FR-002's tie-break needs
(`tournament_points DESC, registered_at ASC` — earlier registrant wins ties); it just doesn't
paginate yet. Adding params to it is smaller than introducing a parallel "standings" endpoint, and
keeps one source of truth for participant ordering.

**Alternatives considered**: Cursor-based pagination (matching `listTournaments`'s `cursor` param) —
rejected: FR-003 calls for page-number-style "controls to move between pages," which reads more
naturally as offset pagination for a fixed, ranked list than as an infinite-scroll cursor.

## §6. Realtime bridge extension

**Decision**: `apps/web/app/api/caro/realtime/route.ts` gains a `?tournamentId=` query param,
analogous to the existing `?matchId=` one. When present, it joins `tournament:{tournamentId}` (server
tracks presence per §2) and forwards a new `TOURNAMENT_EVENTS` group (`tournament:status-changed`,
`tournament:match-created`, `tournament:participant-updated`) — all three already emitted by
existing use-cases, just not yet forwarded to any client. Additionally, `match:started` is moved out
of the `matchId`-gated `MATCH_EVENTS` list into an always-forwarded set, since a participant
receiving their personal `match:started` push (`pushToUser`, not room-based) while sitting on the
tournament page — with no `matchId` yet — is exactly how FR-007's auto-navigation is supposed to
work; gating it behind an already-known `matchId` would make it unreachable from the one page that
needs it most.

**Rationale**: This is the mechanism spec 007/008 already established (SSE bridge, single shared
`EventSource`, room-scoped forwarding) — extending it the same way keeps one realtime pattern for
the whole app rather than introducing a second one for tournaments.

**Alternatives considered**: A second dedicated Route Handler for tournament events — rejected,
duplicates the existing bridge's token-handling and shared-connection logic for no benefit.

## §7. Tournament-end scoring cutoff (FR-013)

**Decision**: `RecordTournamentMatchResultUseCase.execute` loads the tournament (via
`tournamentMatchRepo.findByMatchId` → `tournamentRepo.findById`) and skips the
`atomicScoreUpdate`/streak calculation entirely if `tournament.status === 'ended'` or `'cancelled'`
— the match is still marked `completedAt` and both registrations still return to `'idle'` (though
idle no longer matters once the tournament has ended, since `PairIdlePlayersUseCase` already
early-returns unless `status === 'in_progress'`).

**Rationale**: Directly closes the gap FR-013 requires — today the use-case awards points
unconditionally. Elo update (`place-move.use-case.ts`) is a separate, already-unconditional code
path and needs no change, matching the spec's assumption that Elo always applies.

## §8. `tournamentId` on `MatchState`

**Decision**: Add `tournamentId: string | null` to `MatchStateDto` (backend) and `MatchState`
(`packages/caro-service`), sourced directly from the already-existing `Match.tournamentId` domain
field — no new column, just wiring it through the existing controller mapping and client type.

**Rationale**: The gameboard needs this to decide, per match, whether to render
`TournamentAutoStartCountdown` (state 2) and `BackToTournamentButton` (state 4) instead of spec
008's non-tournament equivalents. Without it, the client has no way to distinguish a tournament
match from a lobby/quick-pair one.

## §9. `MIN_PLAYERS = 5` cancellation (not in original spec, flagged not fixed)

`StartTournamentUseCase` cancels a tournament outright if fewer than 5 players are registered at
start time. spec.md doesn't mention a minimum-participants rule. This is pre-existing backend
behavior this feature doesn't need to change to satisfy any FR — left as-is; not in this plan's
scope. If the product intent differs, that's a separate spec/decision, not a tournament-page gap.
