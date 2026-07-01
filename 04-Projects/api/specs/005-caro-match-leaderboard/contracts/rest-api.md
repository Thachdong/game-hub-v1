# REST API Contract: Caro Match & Leaderboard

**Feature**: 005-caro-match-leaderboard | **Date**: 2026-07-01

All endpoints use JSON. All mutation endpoints require `Authorization: Bearer <access_token>` unless marked **public**. Response envelope follows the existing `ApiDataResponse` / `ApiErrorResponse` pattern used throughout the project.

---

## Match Lifecycle

### POST /caro/matches
Create a new match.

**Auth**: Required (player)

**Request body**:
```json
{
  "configId": "uuid",
  "visibility": "public | private"
}
```

**Response 201**:
```json
{
  "data": {
    "id": "uuid",
    "configId": "uuid",
    "boardSize": "25x25",
    "moveTimeSeconds": 15,
    "visibility": "public",
    "status": "looking_for_opponent",
    "creatorId": "uuid",
    "createdAt": "ISO8601"
  }
}
```

**Errors**: 400 invalid config / inactive config; 409 player already in active state

---

### GET /caro/lobby
List public matches in lobby (`looking_for_opponent` or `in_progress`).

**Auth**: Public (guests allowed)

**Query params**: none (all active public matches)

**Response 200**:
```json
{
  "data": [
    {
      "id": "uuid",
      "boardSize": "25x25",
      "moveTimeSeconds": 15,
      "status": "looking_for_opponent | in_progress",
      "creatorUsername": "string",
      "secondPlayerUsername": "string | null",
      "createdAt": "ISO8601"
    }
  ]
}
```

---

### GET /caro/matches/:id
Get full match state. Public matches accessible without auth; private matches only accessible to participants.

**Auth**: Public for public matches; JWT required for private matches

**Response 200**:
```json
{
  "data": {
    "id": "uuid",
    "boardSize": "25x25",
    "moveTimeSeconds": 15,
    "visibility": "public",
    "status": "in_progress",
    "creatorId": "uuid",
    "playerX": { "id": "uuid", "username": "string", "elo": 1350, "winRate": 0.62 },
    "playerO": { "id": "uuid", "username": "string", "elo": 1200, "winRate": 0.50 },
    "currentTurnPlayerId": "uuid",
    "deadlineAt": "ISO8601 | null",
    "moves": [
      { "playerId": "uuid", "row": 12, "col": 12, "sequenceNumber": 1, "placedAt": "ISO8601" }
    ],
    "viewers": ["username1", "username2"],
    "pendingDrawRequestFromId": "uuid | null",
    "result": "null | x_wins | o_wins | draw | cancelled",
    "winnerPlayerId": "uuid | null",
    "startedAt": "ISO8601 | null",
    "endedAt": "ISO8601 | null"
  }
}
```

**Errors**: 404 match not found; 403 private match, not participant

---

### DELETE /caro/matches/:id
Cancel match (creator, `looking_for_opponent` only) or leave before start (second player, `waiting_for_start` only).

**Auth**: Required

**Response 200**:
```json
{ "data": { "id": "uuid", "status": "cancelled | looking_for_opponent" } }
```

**Errors**: 403 caller is neither creator nor second player; 409 match not in valid state for this action

---

### POST /caro/matches/:id/invite
Invite a friend to a match.

**Auth**: Required (must be match creator)

**Request body**:
```json
{ "friendId": "uuid" }
```

**Response 200**:
```json
{ "data": { "matchId": "uuid", "invitedPlayerId": "uuid" } }
```

**Errors**: 403 not the creator; 404 match not found; 409 match not in `looking_for_opponent`; 422 friendId is not in caller's friend list

---

### POST /caro/matches/:id/invitation/respond
Accept or decline a match invitation.

**Auth**: Required (invited player only)

**Request body**:
```json
{ "action": "accept | decline" }
```

**Response 200**:
```json
{ "data": { "matchId": "uuid", "status": "waiting_for_start | looking_for_opponent" } }
```

**Errors**: 403 not the invited player; 404 no pending invitation; 409 match no longer available

---

### POST /caro/matches/:id/join
Join a public match as second player from the lobby.

**Auth**: Required (player, not already in active state)

**Response 200**:
```json
{ "data": { "matchId": "uuid", "status": "waiting_for_start" } }
```

**Errors**: 403 match is private; 404 not found; 409 match not in `looking_for_opponent` / player already in active state

---

### POST /caro/matches/:id/start
Start the match (creator only, within 15-second Start window).

**Auth**: Required (creator only)

**Response 200**:
```json
{
  "data": {
    "matchId": "uuid",
    "status": "in_progress",
    "playerXId": "uuid",
    "playerOId": "uuid",
    "currentTurnPlayerId": "uuid",
    "deadlineAt": "ISO8601"
  }
}
```

**Errors**: 403 not creator; 409 Start window expired or match not in `waiting_for_start`

---

## Gameplay

### POST /caro/matches/:id/moves
Place a piece.

**Auth**: Required (must be active participant whose turn it is)

**Request body**:
```json
{ "row": 12, "col": 12 }
```

**Response 201**:
```json
{
  "data": {
    "move": { "playerId": "uuid", "row": 12, "col": 12, "sequenceNumber": 5, "placedAt": "ISO8601" },
    "matchStatus": "in_progress | completed",
    "result": "null | x_wins | o_wins | draw",
    "nextTurnPlayerId": "uuid | null",
    "deadlineAt": "ISO8601 | null"
  }
}
```

**Errors**: 403 not active player / not their turn; 409 cell already occupied / match not `in_progress`; 400 coordinates out of bounds

---

### POST /caro/matches/:id/surrender
Surrender the match.

**Auth**: Required (active participant)

**Response 200**:
```json
{ "data": { "matchId": "uuid", "result": "x_wins | o_wins", "winnerPlayerId": "uuid" } }
```

**Errors**: 403 not a participant; 409 match not `in_progress`

---

### POST /caro/matches/:id/draw-request
Send a draw request.

**Auth**: Required (active participant; no pending draw request already sent by caller)

**Response 200**:
```json
{ "data": { "matchId": "uuid", "pendingDrawRequestFromId": "uuid" } }
```

**Errors**: 403 not a participant; 409 draw request already pending from caller / match not `in_progress`

---

### PATCH /caro/matches/:id/draw-request
Accept or decline the pending draw request.

**Auth**: Required (the OTHER participant, not the requester)

**Request body**:
```json
{ "action": "accept | decline" }
```

**Response 200**:
```json
{
  "data": {
    "matchId": "uuid",
    "action": "accept | decline",
    "matchStatus": "in_progress | completed",
    "result": "null | draw"
  }
}
```

**Errors**: 403 caller is the requester / not a participant; 404 no pending draw request; 409 match not `in_progress`

---

## Chat & Moderation

### POST /caro/matches/:id/chat
Send a chat message.

**Auth**: Required (logged-in player or viewer; not a muted viewer)

**Request body**:
```json
{ "content": "string (max 500 chars)" }
```

**Response 201**:
```json
{ "data": { "id": "uuid", "senderId": "uuid", "content": "string", "sentAt": "ISO8601" } }
```

**Errors**: 403 viewer is muted in this match; 404 match not found; 409 match not `in_progress`

---

### POST /caro/matches/:id/mute/:viewerId
Mute a viewer.

**Auth**: Required (active match participant only)

**Response 200**:
```json
{ "data": { "matchId": "uuid", "mutedViewerId": "uuid" } }
```

**Errors**: 403 not a participant; 404 viewer not currently watching this match

---

## Quick Pair

### POST /caro/quick-pair
Request automatic matchmaking.

**Auth**: Required (player, not in active state)

**Request body**:
```json
{ "configId": "uuid" }
```

**Response 202**:
```json
{
  "data": {
    "status": "queued | matched",
    "requestId": "uuid",
    "matchId": "uuid | null"
  }
}
```

- `status: "queued"` — player added to waiting queue; client should subscribe to `quick_pair:matched` WebSocket event.
- `status: "matched"` — opponent found immediately; `matchId` is set.

**Errors**: 400 invalid config; 409 player already in active state

---

### DELETE /caro/quick-pair
Cancel a pending Quick Pair request.

**Auth**: Required

**Response 200**:
```json
{ "data": { "requestId": "uuid", "status": "cancelled" } }
```

**Errors**: 404 no active Quick Pair request for this player

---

## Leaderboard & Profile

### GET /caro/leaderboard
Fetch top 10 players by ELO.

**Auth**: Public (guests allowed)

**Response 200**:
```json
{
  "data": [
    { "rank": 1, "playerId": "uuid", "username": "string", "elo": 1850, "matchesPlayed": 120, "wins": 80, "losses": 30, "draws": 10 }
  ]
}
```

---

### GET /caro/profiles/:playerId
Fetch a player's Caro profile.

**Auth**: Required (logged-in player; can view own or others' profiles)

**Response 200**:
```json
{
  "data": {
    "playerId": "uuid",
    "username": "string",
    "elo": 1350,
    "matchesPlayed": 45,
    "wins": 25,
    "losses": 15,
    "draws": 5,
    "winRate": 0.556
  }
}
```

**Errors**: 404 player has no Caro profile yet

---

### GET /caro/profiles/:playerId/matches
Paginated match history (most recent first).

**Auth**: Required

**Query params**: `limit` (default 20, max 50), `cursor` (opaque pagination cursor from previous response)

**Response 200**:
```json
{
  "data": {
    "matches": [
      {
        "id": "uuid",
        "boardSize": "25x25",
        "moveTimeSeconds": 15,
        "opponentId": "uuid",
        "opponentUsername": "string",
        "result": "win | loss | draw",
        "eloChange": 15,
        "endedAt": "ISO8601"
      }
    ],
    "nextCursor": "opaque_string | null"
  }
}
```

---

### GET /caro/matches/:id/moves
Full move history for a completed match (for replay).

**Auth**: Required (logged-in player; private match accessible to participants only)

**Response 200**:
```json
{
  "data": {
    "boardSize": "25x25",
    "playerXId": "uuid",
    "playerOId": "uuid",
    "moves": [
      { "playerId": "uuid", "row": 12, "col": 12, "sequenceNumber": 1, "placedAt": "ISO8601" }
    ],
    "result": "x_wins | o_wins | draw"
  }
}
```

**Errors**: 404 not found; 403 private match, not participant; 409 match not yet completed
