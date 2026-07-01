# REST API Contract: Caro Tournament

**Feature**: `006-caro-tournament` | **Date**: 2026-07-01

All endpoints are prefixed with `/caro`. Authentication via Bearer JWT unless marked **[PUBLIC]**.

---

## Tournament Creator Role Management (Admin)

### `POST /caro/tournament-creator-requests`
Request Tournament Creator role (any authenticated player).

**Auth**: JwtAuthGuard

**Request body**: _(empty)_

**Response 201**:
```json
{ "requestId": "uuid", "status": "pending", "createdAt": "ISO8601" }
```

**Errors**:
- `409` — player already has a pending request
- `409` — player already has the Tournament Creator role

---

### `GET /caro/admin/tournament-creator-requests`
List all pending Tournament Creator role requests.

**Auth**: JwtAuthGuard + GameAdminCaroGuard

**Query params**: `status?: 'pending' | 'approved' | 'rejected'` (default: `pending`)

**Response 200**:
```json
{
  "items": [
    { "requestId": "uuid", "playerId": "uuid", "playerUsername": "string", "status": "pending", "createdAt": "ISO8601" }
  ]
}
```

---

### `PATCH /caro/admin/tournament-creator-requests/:requestId`
Approve or reject a pending request.

**Auth**: JwtAuthGuard + GameAdminCaroGuard

**Request body**:
```json
{ "action": "approve" | "reject" }
```

**Response 200**:
```json
{ "requestId": "uuid", "status": "approved" | "rejected", "reviewedAt": "ISO8601" }
```

**Errors**:
- `404` — request not found
- `409` — request is not in `pending` status

**Side effects**:
- `approve`: sets `caro_player_profiles.is_tournament_creator = true`; emits `TournamentCreatorRoleGrantedEvent`
- `reject`: emits `TournamentCreatorRoleRejectedEvent`

---

### `DELETE /caro/admin/tournament-creators/:playerId`
Revoke Tournament Creator role from a player.

**Auth**: JwtAuthGuard + GameAdminCaroGuard

**Response 200**:
```json
{ "playerId": "uuid", "revokedAt": "ISO8601" }
```

**Errors**:
- `404` — player not found or does not have the Tournament Creator role

**Side effects**: Sets `caro_player_profiles.is_tournament_creator = false`. Existing tournaments created by this player continue unaffected (FR-005).

---

## Tournament CRUD (Player-Facing)

### `POST /caro/tournaments`
Create a new tournament.

**Auth**: JwtAuthGuard + TournamentCreatorGuard

**Request body**:
```json
{
  "gameConfigId": "uuid",
  "minElo": 1500,
  "startAt": "ISO8601",
  "endAt": "ISO8601"
}
```

**Validation**:
- `startAt` must be in the future (at least 1 minute from now)
- `endAt` must be after `startAt`
- `minElo` >= 0
- `gameConfigId` must reference an active game config

**Response 201**:
```json
{
  "tournamentId": "uuid",
  "status": "waiting",
  "startAt": "ISO8601",
  "endAt": "ISO8601",
  "minElo": 1500,
  "gameConfigId": "uuid",
  "createdAt": "ISO8601"
}
```

---

### `GET /caro/tournaments` **[PUBLIC]**
List all tournaments (paginated, most recent first).

**Auth**: None required

**Query params**:
- `status?: 'waiting' | 'in_progress' | 'ended' | 'cancelled'`
- `limit?: number` (default 20, max 50)
- `cursor?: string` (opaque pagination cursor)

**Response 200**:
```json
{
  "items": [
    {
      "tournamentId": "uuid",
      "status": "waiting",
      "startAt": "ISO8601",
      "endAt": "ISO8601",
      "minElo": 1500,
      "registrantCount": 12,
      "createdAt": "ISO8601"
    }
  ],
  "nextCursor": "string | null"
}
```

---

### `GET /caro/tournaments/:tournamentId` **[PUBLIC]**
Get tournament details.

**Auth**: None required

**Response 200**:
```json
{
  "tournamentId": "uuid",
  "status": "in_progress",
  "startAt": "ISO8601",
  "endAt": "ISO8601",
  "minElo": 1500,
  "gameConfig": { "id": "uuid", "name": "string", "timeLimitSeconds": 30 },
  "registrantCount": 24,
  "createdAt": "ISO8601"
}
```

**Errors**: `404` — tournament not found

---

### `GET /caro/tournaments/:tournamentId/participants` **[PUBLIC]**
Get participant leaderboard (ordered by tournament points DESC).

**Auth**: None required

**Response 200**:
```json
{
  "tournamentId": "uuid",
  "participants": [
    {
      "rank": 1,
      "playerId": "uuid",
      "username": "string",
      "tournamentPoints": 18,
      "winStreak": 4,
      "status": "idle" | "in_match"
    }
  ]
}
```

---

### `POST /caro/tournaments/:tournamentId/registrations`
Register for a tournament.

**Auth**: JwtAuthGuard

**Request body**: _(empty)_

**Response 201**:
```json
{
  "registrationId": "uuid",
  "tournamentId": "uuid",
  "playerId": "uuid",
  "eloAtRegistration": 1750,
  "registeredAt": "ISO8601"
}
```

**Errors**:
- `403` — player's current elo is below `tournament.minElo`
- `404` — tournament not found
- `409` — player is already registered
- `422` — tournament status is `ended` or `cancelled` (registration not allowed)

---

## Tournament Chat (Player-Facing)

### `POST /caro/tournaments/:tournamentId/chat`
Send a chat message in the tournament chat room.

**Auth**: JwtAuthGuard

**Request body**:
```json
{ "content": "string (max 500 chars)" }
```

**Response 201**:
```json
{
  "messageId": "uuid",
  "tournamentId": "uuid",
  "senderPlayerId": "uuid",
  "content": "string",
  "sentAt": "ISO8601"
}
```

**Errors**:
- `403` — player is not registered in this tournament
- `422` — content is empty or exceeds 500 characters

---

### `GET /caro/tournaments/:tournamentId/chat`
Retrieve recent chat history (for initial page load; subsequent messages arrive via WebSocket).

**Auth**: JwtAuthGuard (registered participants only)

**Query params**: `limit?: number` (default 50, max 100)

**Response 200**:
```json
{
  "messages": [
    {
      "messageId": "uuid",
      "senderPlayerId": "uuid",
      "senderUsername": "string",
      "content": "string",
      "sentAt": "ISO8601"
    }
  ]
}
```

---

## Error Response Shape

All error responses follow the existing platform convention:

```json
{ "statusCode": 4xx, "message": "Human-readable description", "error": "ErrorType" }
```
