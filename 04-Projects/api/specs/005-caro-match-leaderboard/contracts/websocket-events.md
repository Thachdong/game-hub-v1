# WebSocket Events Contract: Caro Match & Leaderboard

**Feature**: 005-caro-match-leaderboard | **Date**: 2026-07-01

All WebSocket communication goes through the existing `/realtime` Socket.IO endpoint. Authenticated clients connect with `{ auth: { token: "<access_token>" } }`. Unauthenticated guests connect without auth and receive an `observer` role (read-only).

---

## Client → Server Messages

### join_room
Join a WebSocket room to receive events for that scope.

```json
{ "room": "lobby | match:<matchId>" }
```

- `lobby`: lobby list updates. Available to all (auth + observer).
- `match:<matchId>`: match-specific events. Public matches: available to all. Private matches: server rejects non-participants with `error: "access_denied"`.

### leave_room
Leave a room to stop receiving its events.

```json
{ "room": "lobby | match:<matchId>" }
```

---

## Server → Client Events

### Lobby Room Events (`lobby`)

#### `lobby:match_added`
A new public match appeared in the lobby.

```json
{
  "event": "lobby:match_added",
  "data": {
    "id": "uuid",
    "boardSize": "25x25",
    "moveTimeSeconds": 15,
    "status": "looking_for_opponent",
    "creatorUsername": "string",
    "createdAt": "ISO8601"
  }
}
```

#### `lobby:match_updated`
A public match changed status (e.g., second player joined, match started, match ended/cancelled).

```json
{
  "event": "lobby:match_updated",
  "data": {
    "id": "uuid",
    "status": "waiting_for_start | in_progress | completed | cancelled",
    "secondPlayerUsername": "string | null"
  }
}
```

#### `lobby:match_removed`
A public match left the lobby (cancelled while `looking_for_opponent`, or `completed`).

```json
{
  "event": "lobby:match_removed",
  "data": { "id": "uuid" }
}
```

---

### Match Room Events (`match:<matchId>`)

#### `match:state`
Full match state snapshot. Sent to a client immediately after they join the room.

```json
{
  "event": "match:state",
  "data": {
    "id": "uuid",
    "status": "string",
    "playerX": { "id": "uuid", "username": "string", "elo": 1350, "winRate": 0.62 },
    "playerO": { "id": "uuid", "username": "string", "elo": 1200, "winRate": 0.50 },
    "currentTurnPlayerId": "uuid | null",
    "deadlineAt": "ISO8601 | null",
    "moves": [ { "playerId": "uuid", "row": 0, "col": 0, "sequenceNumber": 1 } ],
    "viewers": ["username1"],
    "pendingDrawRequestFromId": "uuid | null",
    "result": "null | x_wins | o_wins | draw | cancelled"
  }
}
```

#### `match:player_joined`
Second player joined / accepted invitation. Match is now in `waiting_for_start`.

```json
{
  "event": "match:player_joined",
  "data": {
    "matchId": "uuid",
    "secondPlayer": { "id": "uuid", "username": "string", "elo": 1200 },
    "status": "waiting_for_start",
    "startDeadlineAt": "ISO8601"
  }
}
```

#### `match:player_left`
Second player left before Start. Match returned to `looking_for_opponent`.

```json
{
  "event": "match:player_left",
  "data": { "matchId": "uuid", "status": "looking_for_opponent" }
}
```

#### `match:started`
Creator pressed Start. Game begins.

```json
{
  "event": "match:started",
  "data": {
    "matchId": "uuid",
    "playerXId": "uuid",
    "playerOId": "uuid",
    "currentTurnPlayerId": "uuid",
    "deadlineAt": "ISO8601"
  }
}
```

#### `match:move_made`
A piece was placed on the board.

```json
{
  "event": "match:move_made",
  "data": {
    "matchId": "uuid",
    "move": { "playerId": "uuid", "row": 12, "col": 12, "sequenceNumber": 5, "placedAt": "ISO8601" },
    "nextTurnPlayerId": "uuid",
    "deadlineAt": "ISO8601"
  }
}
```

#### `match:result`
Match ended (win, draw, timeout, surrender).

```json
{
  "event": "match:result",
  "data": {
    "matchId": "uuid",
    "result": "x_wins | o_wins | draw | cancelled",
    "winnerPlayerId": "uuid | null",
    "reason": "five_in_a_row | board_full | timeout | surrender | draw_accepted | start_timeout",
    "eloChanges": [
      { "playerId": "uuid", "eloBefore": 1200, "eloAfter": 1220, "delta": 20 },
      { "playerId": "uuid", "eloBefore": 1350, "eloAfter": 1330, "delta": -20 }
    ],
    "endedAt": "ISO8601"
  }
}
```

#### `match:draw_request`
A draw request was sent by one player.

```json
{
  "event": "match:draw_request",
  "data": { "matchId": "uuid", "fromPlayerId": "uuid" }
}
```

#### `match:draw_declined`
The draw request was declined. Match continues.

```json
{
  "event": "match:draw_declined",
  "data": { "matchId": "uuid" }
}
```

#### `match:chat`
New chat message received.

```json
{
  "event": "match:chat",
  "data": {
    "matchId": "uuid",
    "messageId": "uuid",
    "senderId": "uuid",
    "senderUsername": "string",
    "content": "string",
    "sentAt": "ISO8601"
  }
}
```

#### `match:viewer_joined`
A viewer started watching.

```json
{
  "event": "match:viewer_joined",
  "data": { "matchId": "uuid", "viewerUsername": "string" }
}
```

#### `match:viewer_left`
A viewer stopped watching.

```json
{
  "event": "match:viewer_left",
  "data": { "matchId": "uuid", "viewerUsername": "string" }
}
```

#### `match:viewer_muted`
Sent only to the muted viewer's socket. Informs them they can no longer send chat.

```json
{
  "event": "match:viewer_muted",
  "data": { "matchId": "uuid", "mutedByPlayerId": "uuid" }
}
```

---

### User-Scoped Events (delivered via `pushToUser`)

These events are sent directly to a specific user's socket(s), not to a room.

#### `quick_pair:matched`
Sent to both players when Quick Pair finds a match.

```json
{
  "event": "quick_pair:matched",
  "data": {
    "matchId": "uuid",
    "opponentId": "uuid",
    "opponentUsername": "string",
    "boardSize": "25x25",
    "moveTimeSeconds": 15,
    "startDeadlineAt": "ISO8601"
  }
}
```

#### `match_invitation:received`
Sent via the notification module (EventEmitter2 path) — delivered as an in-app notification. The client receives a standard notification event with `type: "match_invitation"` and `payload: { matchId, fromUsername }`.

#### `match_invitation:declined`
Sent to the match creator when an invitation is declined.

```json
{
  "event": "match_invitation:declined",
  "data": { "matchId": "uuid", "declinedByUsername": "string" }
}
```

---

## Error Event

Server sends this to the originating socket when a client message is invalid or unauthorized.

```json
{
  "event": "error",
  "data": { "code": "string", "message": "string" }
}
```

Common codes: `access_denied`, `match_not_found`, `invalid_room`, `not_your_turn`, `viewer_muted`.
