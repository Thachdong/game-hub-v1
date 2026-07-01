# Research: Caro Tournament

**Feature**: `006-caro-tournament` | **Date**: 2026-07-01

All NEEDS CLARIFICATION items from the Technical Context were resolvable from the existing codebase, ADRs, and constitution without external research. Decisions are documented below.

---

## Decision 1 — Tournament Match Integration Strategy

**Question**: Should tournament matches be separate from the existing `caro_matches` infrastructure, or reuse it?

**Decision**: Reuse `caro_matches` by adding a nullable `tournament_id` FK column. Tournament matches are standard `caro_matches` rows with `tournament_id IS NOT NULL`.

**Rationale**:
- All match mechanics (move placement, timers, draw, surrender, chat, spectating) are already implemented in the 005 feature.
- Duplicating or abstracting them would violate the simplicity principle and the Modular Monolith gate (no unnecessary new module).
- A nullable FK is the minimal extension needed; it does not break any existing query or behaviour.
- The `MatchCompletedEvent` (already emitted by the match domain on completion) naturally carries the `tournamentId`, allowing the tournament handler to react without any change to existing match code.

**Alternatives considered**:
- Separate `caro_tournament_matches` table as the primary match record — rejected (duplicates all match logic).
- New `TournamentMatch` entity with its own move/timer system — rejected (massive duplication, wrong layer).

---

## Decision 2 — Swiss Arena Pairing Concurrency

**Question**: How to safely pair idle players when multiple "match completed" events fire concurrently?

**Decision**: `SELECT … FOR UPDATE SKIP LOCKED` on `caro_tournament_registrations WHERE status = 'idle'` inside a DB transaction, per ADR-CARO-GAME-003.

**Rationale**:
- ADR-CARO-GAME-003 ratified this exact pattern for all matchmaking/queue systems (Quick Pair and Swiss/Arena). No new decision required.
- The transaction claim-and-create atomically picks 2 idle registrations, inserts the `caro_matches` row, and updates both registrations to `status = 'in_match'`. If the transaction rolls back, both registrations revert to `idle` automatically.

**Alternatives considered**: In-memory queue (rejected — not restart-safe), optimistic locking (rejected — more complex, no advantage here).

---

## Decision 3 — Tournament Lifecycle Timer

**Question**: Should tournament start/end be driven by per-tournament `setTimeout` (like `MatchTimerService`) or by a cron job scanning overdue tournaments?

**Decision**: `@Cron('*/10 * * * * *')` NestJS scheduled job running every 10 seconds, scanning `caro_tournaments` for rows where `status = 'waiting' AND start_at <= NOW()` (start) or `status = 'in_progress' AND end_at <= NOW()` (end).

**Rationale**:
- SC-003 requires tournament start within 10 seconds of scheduled time — a 10-second cron achieves worst-case 10 s latency.
- `setTimeout` with hour-scale delays is unreliable (JS 32-bit timer limit, process restarts lose in-memory timers).
- The cron approach is idempotent and restart-safe: any missed transitions are caught on the next tick.
- The `status` field and DB timestamp are the authoritative state; the cron is merely the activation mechanism.
- Constitution III: server-authoritative deadline stored as `start_at` / `end_at` TIMESTAMP — satisfied.

**Alternatives considered**: Per-tournament `setTimeout` (rejected — not restart-safe for hour-long timers), external scheduler/queue (rejected — adds infrastructure beyond what's needed in a monolith).

---

## Decision 4 — Tournament Creator Role Storage

**Question**: How is the Tournament Creator role persisted and checked?

**Decision**: Add `is_tournament_creator BOOLEAN NOT NULL DEFAULT FALSE` to `caro_player_profiles`. At approve/revoke time, update this flag. Include the claim in the JWT at login/refresh. `TournamentCreatorGuard` checks the JWT claim (not DB) per constitution III.

**Rationale**:
- Consistent with how `GameAdminCaroGuard` handles the game-admin role — JWT claim checked in the guard.
- Revocation updates the DB flag immediately; the JWT claim reflects the change at the player's next token refresh (within 15–30 min). This delay is acceptable: the spec does not require instantaneous revocation, only that existing tournaments survive it (FR-005).
- Simpler than a separate role table; the `TournamentCreatorRequest` table already captures the full request history.

**Alternatives considered**: Separate `caro_tournament_creator_roles` table — rejected (unnecessary for a boolean flag; request history is in `TournamentCreatorRequest`). DB lookup on every tournament-creation request — rejected (constitution III forbids DB auth lookups under normal operation).

---

## Decision 5 — Tournament Score Atomicity

**Question**: Scoring requires reading the current `win_streak` before calculating points. Is this a read-modify-write violation of constitution IV?

**Decision**: Not a violation — the calculation runs inside the `TournamentMatchCompletedEventHandler`, which executes once per match result. Since a player can be in at most one match at a time (`status = 'in_match'` during the match), there are no concurrent writers to that player's registration row during the relevant window. The write is a single atomic statement: `UPDATE … SET tournament_points = tournament_points + $1, win_streak = $2`.

**Rationale**:
- The `tournament_points` increment is atomic (`col = col + delta`).
- The `win_streak` is a derived value (calculated in domain from the match result and the loaded streak), then SET atomically in the same statement.
- A `SELECT … FOR UPDATE` on the registration row is used before the read-compute-write to guard against any edge-case concurrent access.

---

## Decision 6 — Late Registration Flow

**Question**: What does the system do when a player registers during an "in progress" tournament?

**Decision**: `RegisterForTournamentUseCase` allows registration while `status IN ('waiting', 'in_progress')` and `end_at > NOW()`. After creating the `TournamentRegistration` row (status = `idle`, points = 0, streak = 0), the use-case immediately triggers `PairIdlePlayersUseCase` for the tournament. If a partner is available, a match is created; otherwise the player waits.

**Rationale**: FR-010 and FR-010a clarified in the spec. Elo is checked only at registration. The late joiner starts at 0 points — consistent with the BRD reset rule (points start at 0 per tournament).

---

## Decision 7 — WebSocket Room for Tournament

**Question**: Should the tournament use the existing match-room pattern or a new room namespace?

**Decision**: New room key `tournament:{tournamentId}` on the existing shared Socket.IO gateway in `src/realtime/`. All tournament-scoped broadcasts (participant list, status changes, chat, new matches) go to this room.

**Rationale**: Consistent with the `match:{matchId}` and `lobby` room pattern from 005. The shared gateway already supports dynamic room joining (`socket.join(roomKey)`). No additional gateway or namespace needed.

---

## Decision 8 — Tournament Chat vs Match Chat

**Question**: Is tournament chat the same as the existing match chat, or a separate implementation?

**Decision**: Separate persistence (`caro_tournament_chat_messages`) and separate use-case (`SendTournamentChatMessageUseCase`), but the same realtime delivery mechanism (broadcast to `tournament:{id}` room). The existing `SendChatMessageUseCase` handles match-scoped chat and is not modified.

**Rationale**: Tournament chat is scoped to registered participants (FR-024), not match participants. Sharing the same use-case would require conditional logic. A separate use-case is simpler and keeps concerns isolated.
