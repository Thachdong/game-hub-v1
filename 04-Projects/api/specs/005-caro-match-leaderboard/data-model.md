# Data Model: Caro Match & Leaderboard

**Feature**: 005-caro-match-leaderboard | **Date**: 2026-07-01

---

## Domain Entities

### Match

Represents one Caro 1v1 game session from creation to completion.

| Field | Type | Rules |
|-------|------|-------|
| `id` | UUID | PK; generated on creation |
| `configId` | UUID | FK → GameConfig; must be an active config at creation time |
| `boardSize` | `'18x18' \| '25x25' \| '40x40'` | Snapshotted from config at creation; immutable after creation |
| `moveTimeSeconds` | `5\|10\|15\|25\|35\|45\|60` | Snapshotted from config at creation; immutable |
| `visibility` | `'public' \| 'private'` | Set at creation; immutable |
| `status` | `MatchStatus` (enum) | See state machine below |
| `creatorId` | UUID | FK → account; the player who created the match |
| `playerXId` | `UUID \| null` | Assigned on Start; may be creator or joiner |
| `playerOId` | `UUID \| null` | Assigned on Start; the other participant |
| `secondPlayerId` | `UUID \| null` | The player who joined/accepted; set before Start |
| `currentTurnPlayerId` | `UUID \| null` | Set when match starts; toggles on each move |
| `pendingDrawRequestFromId` | `UUID \| null` | Set when a draw request is outstanding; cleared on response |
| `result` | `'x_wins' \| 'o_wins' \| 'draw' \| 'cancelled' \| null` | Set when status = `completed` or `cancelled` |
| `winnerPlayerId` | `UUID \| null` | Set on win result; null for draw/cancelled |
| `deadlineAt` | `Date \| null` | Server-side deadline for current timed action (Start window or move timer) |
| `startedAt` | `Date \| null` | When status transitioned to `in_progress` |
| `endedAt` | `Date \| null` | When status transitioned to `completed` or `cancelled` |
| `createdAt` | `Date` | Immutable; set on creation |
| `updatedAt` | `Date` | Updated on every state change |

**State Machine**:

```
[creation]
    │
    ▼
looking_for_opponent ──(creator cancels)──────────────────────► cancelled
    │                ──(second player leaves before start)──────► looking_for_opponent (self-loop)
    │
    │ second player joins/accepts
    ▼
waiting_for_start ──(Start deadline expires without click)──────► cancelled
    │             ──(creator cancels)────────────────────────────► cancelled
    │             ──(second player leaves)──────────────────────► looking_for_opponent
    │
    │ creator clicks Start (within 15s deadline)
    ▼
in_progress ──(5-in-a-row, timeout, surrender, accepted draw)───► completed
    │        ──(board full, no winner)───────────────────────────► completed (draw)
    ▼
completed  (terminal)
cancelled  (terminal)
```

---

### MatchMove

One piece placement within a match.

| Field | Type | Rules |
|-------|------|-------|
| `id` | UUID | PK |
| `matchId` | UUID | FK → Match |
| `playerId` | UUID | FK → account; must be current turn player at time of placement |
| `row` | `integer` | 0-indexed; 0 ≤ row < board height |
| `col` | `integer` | 0-indexed; 0 ≤ col < board width |
| `sequenceNumber` | `integer` | 1-based; strictly increasing per match |
| `placedAt` | `Date` | Server timestamp |

**Constraints**: (matchId, row, col) is unique — no two pieces on the same cell. (matchId, sequenceNumber) is unique.

---

### PlayerProfile

Per-player Caro statistics and ELO rating. Created on first completed match.

| Field | Type | Rules |
|-------|------|-------|
| `id` | UUID | PK |
| `playerId` | UUID | FK → account; unique (one profile per player) |
| `elo` | `integer` | Default 1200; updated atomically after each completed match |
| `matchesPlayed` | `integer` | Count of completed matches (win + loss + draw); excludes cancelled |
| `wins` | `integer` | Count of wins |
| `losses` | `integer` | Count of losses |
| `draws` | `integer` | Count of draws |
| `createdAt` | `Date` | When profile was first created |
| `updatedAt` | `Date` | After each ELO update |

**ELO formula** (computed in application layer, written atomically):
- Starting ELO: 1200
- K-factor: 40 if `matchesPlayed < 30`; 20 if `matchesPlayed ≥ 30` (each player uses their own K)
- Expected score: `E_A = 1 / (1 + 10^((R_B - R_A) / 400))`
- New rating: `R_A' = R_A + K × (S_A - E_A)` where S_A = 1 (win), 0.5 (draw), 0 (loss)
- Delta is rounded to nearest integer

**DB constraint**: `elo` has a B-tree index for leaderboard queries.

---

### QuickPairRequest

A player's request to be automatically matched. Acts as a matchmaking queue row.

| Field | Type | Rules |
|-------|------|-------|
| `id` | UUID | PK |
| `playerId` | UUID | FK → account; unique constraint on (`playerId`, `status = 'waiting'`) — one active request per player |
| `configId` | UUID | FK → GameConfig; desired config |
| `boardSize` | `'18x18' \| '25x25' \| '40x40'` | Snapshotted |
| `moveTimeSeconds` | integer | Snapshotted |
| `status` | `'waiting' \| 'matched' \| 'cancelled'` | |
| `matchId` | `UUID \| null` | Set when status = `matched` |
| `createdAt` | `Date` | Used for FIFO ordering within same config |

**Claim query** (inside DB transaction):
```sql
SELECT * FROM caro_quick_pair_requests
WHERE board_size = $1 AND move_time_seconds = $2 AND status = 'waiting'
  AND player_id != $3
ORDER BY created_at ASC
FOR UPDATE SKIP LOCKED
LIMIT 1
```

---

### ChatMessage

One chat message sent during a match.

| Field | Type | Rules |
|-------|------|-------|
| `id` | UUID | PK |
| `matchId` | UUID | FK → Match |
| `senderId` | UUID | FK → account |
| `content` | `string` | Max 500 characters |
| `sentAt` | `Date` | Server timestamp |

**Mute enforcement**: Checked in the `send-chat-message` use-case before persisting. A muted sender's message is rejected with `ViewerMutedError` — it never reaches the DB.

---

## DB Schema Summary

```sql
-- caro_matches
CREATE TABLE caro_matches (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id                  UUID NOT NULL REFERENCES caro_game_configs(id),
  board_size                 VARCHAR(10) NOT NULL,
  move_time_seconds          SMALLINT NOT NULL,
  visibility                 VARCHAR(10) NOT NULL,
  status                     VARCHAR(30) NOT NULL DEFAULT 'looking_for_opponent',
  creator_id                 UUID NOT NULL,
  second_player_id           UUID,
  player_x_id                UUID,
  player_o_id                UUID,
  current_turn_player_id     UUID,
  pending_draw_request_from_id UUID,
  result                     VARCHAR(20),
  winner_player_id           UUID,
  deadline_at                TIMESTAMPTZ,
  started_at                 TIMESTAMPTZ,
  ended_at                   TIMESTAMPTZ,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_caro_matches_status ON caro_matches(status);
CREATE INDEX idx_caro_matches_creator ON caro_matches(creator_id);
CREATE INDEX idx_caro_matches_players ON caro_matches(player_x_id, player_o_id);

-- caro_match_moves
CREATE TABLE caro_match_moves (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id        UUID NOT NULL REFERENCES caro_matches(id),
  player_id       UUID NOT NULL,
  row             SMALLINT NOT NULL,
  col             SMALLINT NOT NULL,
  sequence_number INTEGER NOT NULL,
  placed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (match_id, row, col),
  UNIQUE (match_id, sequence_number)
);

CREATE INDEX idx_caro_match_moves_match ON caro_match_moves(match_id, sequence_number);

-- caro_player_profiles
CREATE TABLE caro_player_profiles (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id      UUID NOT NULL UNIQUE,
  elo            INTEGER NOT NULL DEFAULT 1200,
  matches_played INTEGER NOT NULL DEFAULT 0,
  wins           INTEGER NOT NULL DEFAULT 0,
  losses         INTEGER NOT NULL DEFAULT 0,
  draws          INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_caro_player_profiles_elo ON caro_player_profiles(elo DESC);

-- caro_quick_pair_requests
CREATE TABLE caro_quick_pair_requests (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id          UUID NOT NULL,
  config_id          UUID NOT NULL REFERENCES caro_game_configs(id),
  board_size         VARCHAR(10) NOT NULL,
  move_time_seconds  SMALLINT NOT NULL,
  status             VARCHAR(20) NOT NULL DEFAULT 'waiting',
  match_id           UUID REFERENCES caro_matches(id),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_caro_quick_pair_waiting ON caro_quick_pair_requests(board_size, move_time_seconds, status, created_at)
  WHERE status = 'waiting';

-- caro_chat_messages
CREATE TABLE caro_chat_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id   UUID NOT NULL REFERENCES caro_matches(id),
  sender_id  UUID NOT NULL,
  content    VARCHAR(500) NOT NULL,
  sent_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_caro_chat_messages_match ON caro_chat_messages(match_id, sent_at);
```

---

## Mute State

Mute is not stored as a separate DB table for MVP. It is tracked in-memory within `MatchTimerService` (or a `MuteRegistry` singleton scoped to the match service) as `Map<matchId, Set<mutedViewerId>>`. Mute persists only for the lifetime of the match (lost on process restart, acceptable since matches end within hours). Chat blocking is checked in `send-chat-message` use-case.

*Trade-off*: In-memory mute is sufficient for single-process MVP. If the service is ever scaled horizontally, mute state would need to move to a shared store (Redis). This is flagged as a future concern, not an immediate requirement.

---

## Key Relationships

```
GameConfig ──< Match (config snapshotted at creation)
Match ──< MatchMove (ordered by sequence_number)
Match ──< ChatMessage
PlayerProfile (1:1) ── account
QuickPairRequest ──> Match (when matched)
QuickPairRequest ──> GameConfig
```
