# Research: Caro Match & Leaderboard

**Feature**: 005-caro-match-leaderboard | **Date**: 2026-07-01

No NEEDS CLARIFICATION items existed in the Technical Context — all decisions are derivable from the existing codebase, accepted ADRs, and the project constitution. This document records the key architectural decisions and rationale so they are not re-derived during implementation.

---

## Decision 1 — Server-Authoritative Timer Implementation

**Decision**: Use per-match in-process `setTimeout` (Node.js built-in) stored in a `Map<matchId, NodeJS.Timeout>` inside `MatchTimerService`. The deadline timestamp is stored in DB (`deadline_at`). On timer fire, the service reads current match status from DB before acting — if status has already changed (e.g., player moved a moment before deadline), the timer is a no-op.

**Rationale**: Mandated by ADR-CARO-GAME-002. In-process timer is simplest for a single-process monolith. Storing `deadline_at` in DB means clients can compute their own countdown display and the timer survives a service that needs to re-register timers on startup (query all `in_progress` matches with `deadline_at` in the future).

**Alternatives considered**:
- NestJS `@nestjs/schedule` (cron-style): polling granularity is at best 1-second intervals — insufficient for per-second timer accuracy.
- Bull/BullMQ job queue: adds Redis dependency, violates constitution II (no external queue while single-process).
- Client-reports-timeout: violates constitution III (anti-cheat).

**Implementation note**: On process restart, `MatchTimerService.onModuleInit()` queries all matches in `in_progress` or `waiting_for_start` status, re-registers timers for remaining durations. Timers with `deadline_at` already in the past fire immediately (expired).

---

## Decision 2 — Board State Representation

**Decision**: Store moves as individual rows in `caro_match_moves` (sequence number, player, row, col, placed_at). Board state is computed from the move list on the fly for win detection and replay. The current board snapshot is NOT stored redundantly.

**Rationale**: Move-by-move storage naturally supports the move replay requirement (FR-029) without additional work. Win detection (5-in-a-row) runs on the last move only — O(1) check in any direction from the placed piece, not a full board scan. Storage is predictable: max `boardSize² / 2` moves per match (e.g., 25×25 = 625 max moves).

**Alternatives considered**:
- JSON board-snapshot column on match row: simpler reads but makes replay require separate storage anyway; bloats match row on every move write.
- Separate snapshot + moves: over-engineering for MVP.

---

## Decision 3 — Quick Pair Matching Algorithm

**Decision**: Single-table queue (`caro_quick_pair_requests`). When player A requests Quick Pair for config X, the use-case opens a transaction, runs `SELECT … FOR UPDATE SKIP LOCKED LIMIT 1` on rows with `config_id = X AND status = 'waiting'`, skipping any row locked by a concurrent request. If a waiting row is found, both rows are consumed atomically and a new match row is created in the same transaction. If no row found, a new `waiting` row is inserted for player A.

**Rationale**: Mandated by ADR-CARO-GAME-003. Guarantees each player is claimed by exactly one match pair regardless of concurrent requests.

**Implementation note**: After a successful pair, the use-case broadcasts a `quick_pair:matched` WebSocket event to both players via their user-scoped channel (existing `pushToUser`), sending them the new `matchId`. Both clients then navigate to the match screen and join the `match:{matchId}` WebSocket room.

---

## Decision 4 — ELO Update Strategy

**Decision**: ELO delta is computed in the application use-case (`end-match`) and written with a single atomic SQL: `UPDATE caro_player_profiles SET elo = elo + $delta, matches_played = matches_played + 1, wins/losses/draws = … + 1 WHERE id = $id RETURNING elo`. Two statements (one per player) run sequentially in the same DB transaction.

**Rationale**: Constitution IV forbids read-modify-write at the application layer for fields that can be concurrently modified. The delta is safe to compute in application code because: (a) a player can only be in one match at a time (FR-008b), so no two match-end events for the same player can race; (b) using `elo + $delta` rather than `SET elo = $newValue` is the atomic form regardless.

**K-factor logic**: Computed in the domain layer using `player.matchesPlayed` read before the match started (snapshotted). K = 40 if `matchesPlayed < 30`, else K = 20. Each player uses their own K independently.

---

## Decision 5 — WebSocket Room Strategy

**Decision**: Extend `src/realtime/` with:
1. `IRealtimeRoomPort` interface: `joinRoom(socketId, room)`, `pushToRoom(room, event, payload)`.
2. `RealtimeGateway` extended with a `handleJoinRoom(client, { room })` message handler (authenticated players and observer guests may join rooms).
3. Room names: `lobby` (all lobby updates), `match:{matchId}` (match-specific events).
4. Guest access: WebSocket handshake without a token is allowed; the socket is tagged as `role: 'observer'`. Observer sockets may join public match rooms and the lobby room. Server-side message handlers check role before executing any mutation.

**Rationale**: Socket.IO rooms are the standard mechanism for group broadcasting. The existing gateway already manages per-user socket sets; adding rooms is a natural extension. Guest observer access is required by FR-022 and SC-003 (lobby updates within 2 s).

**Alternatives considered**:
- SSE for guests only: would require two realtime stacks (WS + SSE); more complexity than extending the existing gateway.
- HTTP polling for guests: fails SC-003 (2-second lobby update guarantee).

---

## Decision 6 — Chat Message Persistence

**Decision**: Chat messages are persisted in `caro_chat_messages` table (sender, match, content, sent_at, is_visible). Muted viewer's messages are blocked at the use-case level before they reach the DB.

**Rationale**: Persisting chat provides an audit trail for reports submitted via FR-021 (platform admin needs evidence). The spec does not require chat history to be exposed as a read endpoint, but the data is available if needed for moderation. Storage volume is bounded by match duration × average messages per minute.

**Alternatives considered**:
- In-memory only (broadcast and forget): no audit trail for reports; rejected because reports depend on chat evidence.

---

## Decision 7 — Player Active State Guard

**Decision**: Before any create/join/queue action, the use-case queries: `SELECT id FROM caro_matches WHERE (player_x_id = $playerId OR player_o_id = $playerId) AND status IN ('looking_for_opponent', 'waiting_for_start', 'in_progress') UNION SELECT id FROM caro_quick_pair_requests WHERE player_id = $playerId AND status = 'waiting' LIMIT 1`. If any row is returned, the use-case throws `PlayerAlreadyInActiveStateError`.

**Rationale**: FR-008b enforces one active state per player. DB-level check (not application-level cache) is the correct approach in a concurrent system.

---

## Decision 8 — Leaderboard Staleness Window

**Decision**: Leaderboard is served by a direct `ORDER BY elo DESC LIMIT 10` query. No caching layer. After match end, the ELO update and the leaderboard query are independent — clients that call `GET /caro/leaderboard` within 5 seconds of match end will see the updated values because the ELO write completes synchronously within the match-end use-case.

**Rationale**: ADR-CARO-GAME-004 mandates direct DB query; SC-005 requires leaderboard to reflect new ELO within 5 s. Since the ELO write is synchronous and the leaderboard query reads the same DB, the guarantee is met without any additional mechanism.
