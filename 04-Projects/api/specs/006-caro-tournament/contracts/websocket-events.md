# WebSocket Events Contract: Caro Tournament

**Feature**: `006-caro-tournament` | **Date**: 2026-07-01

All tournament WebSocket events are delivered via the shared Socket.IO gateway (`src/realtime/`).

---

## Room Management

### Joining the Tournament Room

A client joins the tournament room after registering or navigating to a tournament page.

**Client emits** (existing `joinRoom` event):
```json
{ "room": "tournament:{tournamentId}" }
```

**Server response** (existing `roomJoined` event):
```json
{ "room": "tournament:{tournamentId}" }
```

Observers (non-registered viewers) may also join the room to receive public events (participant list, status changes, match creation). Chat messages are sent to the room but only registered participants can post via the REST endpoint.

---

## Server → Client Events (broadcast to `tournament:{tournamentId}`)

### `tournament:status-changed`
Fired when the tournament transitions to a new status (in-progress, ended, cancelled).

```json
{
  "tournamentId": "uuid",
  "newStatus": "in_progress" | "ended" | "cancelled",
  "changedAt": "ISO8601"
}
```

---

### `tournament:participant-updated`
Fired when a player registers (new participant) or when any participant's tournament score changes after a match result.

```json
{
  "tournamentId": "uuid",
  "participant": {
    "rank": 3,
    "playerId": "uuid",
    "username": "string",
    "tournamentPoints": 10,
    "winStreak": 2,
    "status": "idle" | "in_match"
  }
}
```

> The full participant list is NOT re-broadcast on every update. The client merges this delta into its local list and re-ranks accordingly.

---

### `tournament:match-created`
Fired when the matchmaking system pairs two idle players and creates a new match.

```json
{
  "tournamentId": "uuid",
  "matchId": "uuid",
  "whitePlayerId": "uuid",
  "blackPlayerId": "uuid",
  "createdAt": "ISO8601"
}
```

The two matched players will also receive the standard `match:started` event in their individual `match:{matchId}` room (handled by existing match infrastructure).

---

### `tournament:chat-message`
Fired when a registered participant sends a chat message.

```json
{
  "tournamentId": "uuid",
  "messageId": "uuid",
  "senderPlayerId": "uuid",
  "senderUsername": "string",
  "content": "string",
  "sentAt": "ISO8601"
}
```

---

## Client → Server Events

Tournament clients do not emit custom tournament-specific events. All mutations go through the REST API:
- Register: `POST /caro/tournaments/:id/registrations`
- Send chat: `POST /caro/tournaments/:id/chat`

Room join/leave uses the existing gateway's `joinRoom` / `leaveRoom` events.

---

## Event Delivery Guarantees

- Events are broadcast to all sockets in `tournament:{tournamentId}` at the time of the broadcast. Clients that join after an event has fired will NOT receive it retroactively; they must call the REST endpoints to bootstrap initial state.
- Participant list initial state: `GET /caro/tournaments/:id/participants`
- Chat history initial state: `GET /caro/tournaments/:id/chat`
- Tournament status initial state: `GET /caro/tournaments/:id`
