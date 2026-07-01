# Data Model: Caro Tournament

**Feature**: `006-caro-tournament` | **Date**: 2026-07-01

---

## Entity Overview

| Entity | Table | New / Modified |
|--------|-------|----------------|
| Tournament | `caro_tournaments` | NEW |
| TournamentCreatorRequest | `caro_tournament_creator_requests` | NEW |
| TournamentRegistration | `caro_tournament_registrations` | NEW |
| TournamentMatch | `caro_tournament_matches` | NEW |
| TournamentChatMessage | `caro_tournament_chat_messages` | NEW |
| Match (extended) | `caro_matches` | MODIFY — add `tournament_id` nullable FK |
| PlayerProfile (extended) | `caro_player_profiles` | MODIFY — add `is_tournament_creator` boolean |

---

## New Tables

### `caro_tournaments`

Represents a single tournament event from creation through completion.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PK, default gen | |
| `creator_player_id` | UUID | NOT NULL, FK → accounts.id | Player who created it |
| `game_config_id` | UUID | NOT NULL, FK → caro_game_configs.id | Applied to all matches |
| `min_elo` | INTEGER | NOT NULL, >= 0 | Minimum elo to register |
| `status` | ENUM | NOT NULL | `waiting` \| `in_progress` \| `ended` \| `cancelled` |
| `start_at` | TIMESTAMPTZ | NOT NULL | Scheduled start time |
| `end_at` | TIMESTAMPTZ | NOT NULL | Scheduled end time |
| `started_at` | TIMESTAMPTZ | NULL | Actual start timestamp |
| `ended_at` | TIMESTAMPTZ | NULL | Actual end timestamp |
| `created_at` | TIMESTAMPTZ | NOT NULL, default NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, default NOW() | |

**Indexes**:
- `idx_caro_tournaments_status_start_at` on `(status, start_at)` — used by lifecycle cron to find overdue waiting tournaments
- `idx_caro_tournaments_status_end_at` on `(status, end_at)` — used by cron to find overdue in-progress tournaments

**Validation rules**:
- `end_at > start_at` (enforced at application layer on creation)
- `min_elo >= 0`

---

### `caro_tournament_creator_requests`

Tracks each player's request for the Tournament Creator role and its outcome.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PK, default gen | |
| `player_id` | UUID | NOT NULL, FK → accounts.id | Requesting player |
| `status` | ENUM | NOT NULL | `pending` \| `approved` \| `rejected` |
| `reviewed_by` | UUID | NULL, FK → accounts.id | Admin who reviewed |
| `reviewed_at` | TIMESTAMPTZ | NULL | When reviewed |
| `created_at` | TIMESTAMPTZ | NOT NULL, default NOW() | |

**Indexes**:
- `idx_caro_tcr_player_id` on `(player_id)` — player request history lookup
- `idx_caro_tcr_status` on `(status)` — Admin pending list

**Business rules**:
- Multiple requests per player are allowed (no limit on re-submission after rejection).
- Only one request per player can be `pending` at a time (enforced by unique partial index: `UNIQUE (player_id) WHERE status = 'pending'`).

---

### `caro_tournament_registrations`

Tracks each player's participation in a specific tournament, including their current tournament score and win streak.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PK, default gen | |
| `tournament_id` | UUID | NOT NULL, FK → caro_tournaments.id | |
| `player_id` | UUID | NOT NULL, FK → accounts.id | |
| `elo_at_registration` | INTEGER | NOT NULL | Elo snapshot; never changes after registration |
| `tournament_points` | INTEGER | NOT NULL, default 0 | Current total Arena points |
| `win_streak` | INTEGER | NOT NULL, default 0 | Consecutive wins; used for streak bonus calc |
| `status` | ENUM | NOT NULL | `idle` \| `in_match` |
| `registered_at` | TIMESTAMPTZ | NOT NULL, default NOW() | |

**Indexes**:
- `UNIQUE (tournament_id, player_id)` — prevents duplicate registration (FR edge case)
- `idx_caro_tr_tournament_idle` on `(tournament_id, status)` WHERE `status = 'idle'` — Swiss pairing scan target (SKIP LOCKED)
- `idx_caro_tr_tournament_points` on `(tournament_id, tournament_points DESC)` — participant list leaderboard

**Score update (atomic)**:
```sql
UPDATE caro_tournament_registrations
SET tournament_points = tournament_points + $1,
    win_streak        = $2,
    status            = 'idle'
WHERE id = $3
RETURNING tournament_points, win_streak;
```
The `$1` (points delta) and `$2` (new streak) are computed in the domain layer from the match result and the loaded registration.

---

### `caro_tournament_matches`

Links a regular `caro_matches` row to its tournament, and stores the awarded tournament points.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PK, default gen | |
| `tournament_id` | UUID | NOT NULL, FK → caro_tournaments.id | |
| `match_id` | UUID | NOT NULL, UNIQUE, FK → caro_matches.id | 1:1 — one tournament match per match |
| `white_registration_id` | UUID | NOT NULL, FK → caro_tournament_registrations.id | |
| `black_registration_id` | UUID | NOT NULL, FK → caro_tournament_registrations.id | |
| `white_points_awarded` | INTEGER | NULL | NULL until match completes |
| `black_points_awarded` | INTEGER | NULL | NULL until match completes |
| `created_at` | TIMESTAMPTZ | NOT NULL, default NOW() | |
| `completed_at` | TIMESTAMPTZ | NULL | |

**Indexes**:
- `idx_caro_tm_tournament_id` on `(tournament_id)` — list matches per tournament

---

### `caro_tournament_chat_messages`

Tournament-wide chat messages sent by registered participants.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PK, default gen | |
| `tournament_id` | UUID | NOT NULL, FK → caro_tournaments.id | |
| `sender_player_id` | UUID | NOT NULL, FK → accounts.id | Must be a registered participant |
| `content` | TEXT | NOT NULL, max 500 chars | |
| `sent_at` | TIMESTAMPTZ | NOT NULL, default NOW() | |

**Indexes**:
- `idx_caro_tcm_tournament_sent` on `(tournament_id, sent_at)` — chronological chat history

---

## Modified Tables

### `caro_matches` (EXTEND)

Add one nullable column:

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `tournament_id` | UUID | NULL, FK → caro_tournaments.id | NULL = regular match; NOT NULL = tournament match |

**Index**: `idx_caro_matches_tournament_id` on `(tournament_id)` WHERE `tournament_id IS NOT NULL`

---

### `caro_player_profiles` (EXTEND)

Add one boolean column:

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `is_tournament_creator` | BOOLEAN | NOT NULL, default FALSE | Set TRUE on role approval, FALSE on revoke |

---

## Domain Entity Definitions

### `Tournament`

```typescript
export class Tournament {
  id: string;
  creatorPlayerId: string;
  gameConfigId: string;
  minElo: number;
  status: 'waiting' | 'in_progress' | 'ended' | 'cancelled';
  startAt: Date;
  endAt: Date;
  startedAt: Date | null;
  endedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### `TournamentCreatorRequest`

```typescript
export class TournamentCreatorRequest {
  id: string;
  playerId: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
}
```

### `TournamentRegistration`

```typescript
export class TournamentRegistration {
  id: string;
  tournamentId: string;
  playerId: string;
  eloAtRegistration: number;
  tournamentPoints: number;
  winStreak: number;
  status: 'idle' | 'in_match';
  registeredAt: Date;
}
```

### `TournamentMatch`

```typescript
export class TournamentMatch {
  id: string;
  tournamentId: string;
  matchId: string;
  whiteRegistrationId: string;
  blackRegistrationId: string;
  whitePointsAwarded: number | null;
  blackPointsAwarded: number | null;
  createdAt: Date;
  completedAt: Date | null;
}
```

### `TournamentChatMessage`

```typescript
export class TournamentChatMessage {
  id: string;
  tournamentId: string;
  senderPlayerId: string;
  content: string;
  sentAt: Date;
}
```

---

## Arena Scoring Formula (Value Object)

Location: `src/caro-game/domain/value-objects/tournament-score-calculator.ts`

```
Input:  result ('win' | 'draw' | 'loss'), currentStreak (number)
Output: { pointsAwarded: number, newStreak: number }

Rules:
  LOSS  → pointsAwarded = 0, newStreak = 0
  DRAW  → if currentStreak >= 3: pointsAwarded = 2, newStreak = 0
           else:                  pointsAwarded = 1, newStreak = 0
  WIN   → newStreak = currentStreak + 1
           if newStreak >= 4 (streak was already >= 3): pointsAwarded = 4
           else:                                         pointsAwarded = 2
```

> Note: "streak" here counts only consecutive wins. It resets to 0 on any non-win result. The bonus draw (2 pts) applies only if the draw breaks a streak of ≥ 3.

---

## State Transitions

### Tournament Lifecycle

```
[created] → waiting
waiting   → in_progress   (start_at reached, registrant count >= 5)
waiting   → cancelled     (start_at reached, registrant count < 5)
in_progress → ended       (end_at reached)
```

### TournamentRegistration Status

```
[registered] → idle
idle         → in_match   (SKIP LOCKED claim by PairIdlePlayersUseCase)
in_match     → idle       (MatchCompletedEvent received, score updated)
```

---

## Migration Summary

**File**: `src/database/migrations/1751500000000-CaroTournament.ts`

Operations (in order):
1. `CREATE TYPE caro_tournament_status AS ENUM ('waiting', 'in_progress', 'ended', 'cancelled')`
2. `CREATE TYPE caro_tcr_status AS ENUM ('pending', 'approved', 'rejected')`
3. `CREATE TYPE caro_tr_status AS ENUM ('idle', 'in_match')`
4. `CREATE TABLE caro_tournaments (…)`
5. `CREATE TABLE caro_tournament_creator_requests (…)`
6. `CREATE TABLE caro_tournament_registrations (…)`
7. `CREATE TABLE caro_tournament_matches (…)`
8. `CREATE TABLE caro_tournament_chat_messages (…)`
9. `ALTER TABLE caro_matches ADD COLUMN tournament_id UUID NULL REFERENCES caro_tournaments(id)`
10. `ALTER TABLE caro_player_profiles ADD COLUMN is_tournament_creator BOOLEAN NOT NULL DEFAULT FALSE`
11. Create all indexes listed above
