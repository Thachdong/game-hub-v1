# HTTP API Contract: In-App Notification

**Module**: `notification`
**Base path**: `/notifications`
**Auth**: JWT Bearer token required on all endpoints (via `JwtAuthGuard`)
**Revision**: 2 — gaps from checklist/api.md CHK001–CHK029 resolved

---

## Shared Notification Object Shape

All endpoints that return a notification (list items and PATCH response) use the **same shape**:

```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "type": "friend-or-game-invite",
  "content": "Player Alice sent you a friend request.",
  "referenceId": null,
  "isRead": false,
  "createdAt": "2026-06-29T10:00:00.000Z"
}
```

**Field constraints**:

| Field | Type | Notes |
|---|---|---|
| `id` | UUID string | Always present |
| `type` | `"friend-or-game-invite" \| "tournament-event" \| "admin-warning" \| "trust-score-alert"` | Closed enum — clients MUST NOT receive any other value |
| `content` | non-empty string | Always present |
| `referenceId` | UUID string **or `null`** | Explicitly `null` when no reference entity — never absent from the response |
| `isRead` | boolean | `false` = unread, `true` = read |
| `createdAt` | ISO 8601 UTC datetime | Always present |

---

## GET /notifications

Retrieve the authenticated player's notification list, ordered newest-first.

### Query Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `limit` | integer 1–50 | No | Page size. Default: 20. Maximum: 50. |
| `cursorCreatedAt` | ISO 8601 datetime | No | Pagination cursor timestamp from previous page's `nextCursor` |
| `cursorId` | UUID | No | Pagination cursor ID from previous page's `nextCursor` |

**Cursor coupling rule**: `cursorCreatedAt` and `cursorId` MUST be provided together or not at
all. Providing one without the other is a `400 Bad Request`.

**Ordering guarantee**: Items are ordered by `(createdAt DESC, id DESC)`. When two notifications
share the same `createdAt` timestamp, `id` (UUID) breaks the tie deterministically. The
composite cursor preserves this guarantee across pages — no duplicate or skipped items.

### Response `200 OK`

```json
{
  "items": [
    {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "type": "friend-or-game-invite",
      "content": "Player Alice sent you a friend request.",
      "referenceId": null,
      "isRead": false,
      "createdAt": "2026-06-29T10:00:00.000Z"
    }
  ],
  "nextCursor": {
    "createdAt": "2026-06-29T09:59:00.000Z",
    "id": "4ab85f64-5717-4562-b3fc-2c963f66afa7"
  }
}
```

**Empty list**: `{ "items": [], "nextCursor": null }` — `items` is always an array (never
absent); `nextCursor` is always `null` (not absent) when no more pages exist.

### Error Responses

| Status | Condition |
|---|---|
| `400 Bad Request` | `limit` is outside 1–50, or only one cursor field provided without the other |
| `401 Unauthorized` | Missing or invalid JWT |

---

## PATCH /notifications/:id/read

Mark a single notification as read. Idempotent — marking an already-read notification returns
`200` with the unchanged notification object.

### Path Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | UUID | Yes | Notification ID. MUST be a valid UUID v4 format. |

**Invalid UUID format** (e.g., `id = "not-a-uuid"`): returns `400 Bad Request` before any DB
lookup.

### Response `200 OK`

Returns the notification in the [shared shape](#shared-notification-object-shape) with
`isRead: true`. Identical shape to a list item — no separate DTO.

**Idempotent case**: if the notification was already read, the response is `200 OK` with the
same body; no state change occurs and no error is returned.

### Error Responses

| Status | Condition |
|---|---|
| `400 Bad Request` | `:id` is not a valid UUID format |
| `401 Unauthorized` | Missing or invalid JWT |
| `403 Forbidden` | Notification exists but belongs to a different user |
| `404 Not Found` | No notification found for the given ID |

---

## WebSocket Events (Server → Client)

**Gateway path**: `/realtime` (shared platform gateway — `RealtimeGateway`)
**Protocol**: socket.io v4 over WebSocket

### Authentication Handshake

The client MUST send the JWT access token in the socket.io handshake `auth` object:

```json
{ "auth": { "token": "<access_token>" } }
```

**Rejection behavior**: If the token is missing, malformed, or invalid (including expired), the
server emits a socket.io `connect_error` event with `message: "Unauthorized"` and immediately
disconnects. The client MUST re-authenticate with a fresh token before reconnecting.

**Token expiry while connected**: If a JWT expires after the connection is already established,
the server does NOT proactively disconnect the socket. The connection remains open until the
client disconnects or the server restarts. This is acceptable because:
(a) the connection's identity is fixed at handshake time, and
(b) real-time push events carry no sensitive data beyond the recipient's own notifications.

### Multi-Connection Behaviour (Multiple Tabs / Devices)

A single user MAY have multiple concurrent socket connections (e.g., two browser tabs). The
server pushes `notification.unread-count` and `notification.new` to **all** active connections
for that user simultaneously. Clients MUST handle receiving duplicate push events and MUST be
idempotent when re-rendering badge counts from a `notification.unread-count` event.

### Event: `notification.unread-count`

Pushed to **all** active connections for the user after:
- A new notification is created for that user, OR
- The user marks a notification as read from any connection.

```json
{
  "event": "notification.unread-count",
  "data": { "unreadCount": 5 }
}
```

**`unreadCount` constraints**: integer ≥ 0. Clients MUST treat any received value as the current
authoritative count and MUST NOT compute a delta from a previous value.

### Event: `notification.new`

Pushed to **all** active connections for the user immediately after a new notification is
persisted. This event is **always emitted alongside `notification.unread-count`** — never alone.

**Ordering guarantee**: `notification.new` is emitted first; `notification.unread-count` follows
in the same flush cycle. Clients MUST NOT rely on strict ordering for correctness; both events
carry self-contained data.

**Client guidance**: `notification.new` provides the full notification payload so the client can
display the item immediately without an extra HTTP request. Clients MUST NOT assume this event
is always delivered (e.g., if the connection drops between creation and push). The notification
is always retrievable via `GET /notifications`.

```json
{
  "event": "notification.new",
  "data": {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "type": "friend-or-game-invite",
    "content": "Player Alice sent you a friend request.",
    "referenceId": null,
    "isRead": false,
    "createdAt": "2026-06-29T10:00:00.000Z"
  }
}
```

---

## Internal Domain Events (EventEmitter2)

These events are **consumed** by `NotificationModule` via `@OnEvent()` listeners. They are
in-process EventEmitter2 payloads — not HTTP contracts.

### Event Payload Schema

| Event name | Required fields | Optional fields |
|---|---|---|
| `notification.friend-or-game-invite` | `recipientId: string (UUID)`, `content: string` | `referenceId: string (UUID)` |
| `notification.tournament-event` | `recipientId: string (UUID)`, `content: string` | `referenceId: string (UUID)` |
| `notification.admin-warning` | `recipientId: string (UUID)`, `content: string` | — |
| `notification.trust-score-alert` | `recipientId: string (UUID)`, `content: string` | `referenceId: string (UUID)` |

**Field rules**:
- `recipientId`: MUST be a valid UUID. `NotificationModule` validates existence against
  `account_social.accounts`. Invalid or non-existent IDs cause the listener to log an error and
  discard the event — **no exception is propagated back to the emitting module** (fire-and-forget).
- `content`: MUST be a non-empty string (trimmed length > 0). Empty content causes the listener
  to log an error and discard the event — no exception propagated.
- `referenceId`: optional. When present, MUST be a valid UUID. Stored opaquely — the
  `NotificationModule` does not resolve it. Absent field is stored as `null`.

**Content composition responsibility**: The **emitting module** is responsible for composing the
human-readable `content` string in the language/format appropriate for its domain. The
`NotificationModule` stores and returns content as-is; it does not localise, template, or
reformat it.

**Unknown event names**: Events that do not match any of the four registered names are silently
ignored by the gateway — NestJS `@OnEvent()` simply has no matching handler. No error is logged.
This is expected behaviour.

**Fire-and-forget guarantee**: `NotificationModule` event listeners MUST NOT throw exceptions
that propagate to the emitting use-case. All errors inside a listener (validation failures, DB
errors, push errors) are caught, logged, and suppressed so that the emitting module's primary
flow is never affected.

### account-social — Required Changes

**`SendFriendRequestUseCase`** (new emission, CHK027 resolved):
- After persisting the friend request, emit `notification.friend-or-game-invite` for the
  **receiver** (the player who received the request).
- `content` example: `"<senderUsername> sent you a friend request."`
- `referenceId`: the friend-request record UUID.

**`ResolveFriendRequestUseCase`** (new emission, CHK027 resolved):
- After resolving the request, emit `notification.friend-or-game-invite` for the **sender** (the
  player who originally sent the request).
- `content` example: `"<receiverUsername> accepted your friend request."` or
  `"<receiverUsername> declined your friend request."`
- `referenceId`: the friend-request record UUID.

**Existing `friend-request.resolved` event** (CHK026 resolved — **supplement, not replace**):
- The existing `FriendRequestResolvedEvent` (event name `'friend-request.resolved'`) MUST
  continue to be emitted unchanged. It serves consumers other than `NotificationModule` (e.g.,
  future analytics, trust-report listeners). The new `notification.friend-or-game-invite` event
  is **emitted in addition to** the existing event, not instead of it.
