# Feature Specification: In-App Notification

**Feature Branch**: `feature/api/dongt/notification`

**Created**: 2026-06-29

**Status**: Draft

**Input**: BRD-NOTIFICATION-001 (Thông báo in-app) — API perspective only.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Receive and View Notifications (Priority: P1)

A logged-in player opens their notification list and sees all notifications addressed to them,
with each entry showing its type (friend-or-game-invite, tournament-event, admin-warning,
trust-score-alert), its content, and whether it has been read. When another domain triggers a
notification (e.g., a friend request accepted by the other party), the entry appears in the
player's list without requiring them to refresh.

**Why this priority**: The notification list is the foundation of the feature. Mark-as-read (US2)
and real-time badge updates (US3) both depend on notifications existing and being retrievable
first. Nothing else delivers value without this working.

**Independent Test**: Trigger a notification for player B via an internal event (friend-invite
type). Call the notification list endpoint for player B. Verify: (a) the notification is present
with type "friend-or-game-invite" and unread status, (b) an attempt to create a notification
with an unrecognized type is rejected, (c) player A's list does not contain player B's
notifications.

**Acceptance Scenarios**:

1. **Given** the account-social module emits a friend-invite event for player B, **When** the
   notification module processes the event, **Then** a notification of type "friend-or-game-invite"
   appears in B's notification list with unread status.
2. **Given** the trust-report module emits a trust-score-alert event for a player, **When** the
   notification module processes the event, **Then** a notification of type "trust-score-alert"
   appears in that player's notification list with unread status.
3. **Given** a player has received notifications of multiple different types, **When** they
   request their notification list, **Then** all notifications are returned ordered newest-first,
   each with its correct type, content, and read status.
4. **Given** player A requests their own notification list, **When** the response is returned,
   **Then** only notifications addressed to player A are included; no other player's notifications
   are visible.
5. **Given** a notification creation event carries an unrecognized type, **When** the notification
   module processes it, **Then** the event is rejected with an error and no notification is stored.
6. **Given** a notification creation event targets a player ID not registered on the platform,
   **When** the notification module processes it, **Then** the event is rejected with an error
   and no notification is stored.

---

### User Story 2 — Mark Notification as Read (Priority: P2)

A logged-in player views their notification list and marks a notification as read. The status
change is immediately reflected in subsequent list responses. Marking an already-read notification
as read again is harmless.

**Why this priority**: Unread tracking is a core BRD requirement; depends only on US1 (the
notification must exist before it can be marked).

**Independent Test**: Create a notification for player B. Confirm the list returns it with unread
status. Call the mark-as-read endpoint. Retrieve the list again and confirm the notification now
shows read status. Repeat the mark-as-read call and verify it returns success without error.
Attempt the same operation using player A's token against player B's notification — verify
rejection.

**Acceptance Scenarios**:

1. **Given** a player has an unread notification, **When** they mark it as read, **Then** the
   notification status changes to "read" and it is no longer counted as unread in subsequent
   list responses.
2. **Given** a player has an already-read notification, **When** they attempt to mark it as read
   again, **Then** the request succeeds with no error and the status remains unchanged.
3. **Given** player A attempts to mark a notification belonging to player B as read, **When** the
   request is processed, **Then** the request is rejected with an authorization error and player
   B's notification status is unchanged.

---

### User Story 3 — Real-Time Unread Badge Updates (Priority: P3)

A logged-in player has the application open with a persistent connection. When another domain
triggers a new notification for that player, the unread count displayed in the notification badge
updates immediately without the player refreshing or making a new request.

**Why this priority**: UX enhancement that makes notifications feel live. Requires US1 (storage
and retrieval) to be complete first; does not block core notification functionality.

**Independent Test**: Open a persistent connection for player B. Trigger a notification creation
event for B. Verify that B's connection receives a real-time push event with an updated unread
count (≥1) without any explicit polling request from B. Then have B mark the notification as
read and verify a second push event arrives with the decremented count.

**Acceptance Scenarios**:

1. **Given** player B is connected and has 0 unread notifications, **When** a new notification is
   created for B, **Then** B receives a real-time push event with an updated unread count of at
   least 1 — without making any new HTTP request.
2. **Given** player B is connected and has unread notifications, **When** B marks one notification
   as read, **Then** B receives a real-time push event reflecting the new (lower) unread count.
3. **Given** player B is disconnected when a notification is created for them, **When** B connects
   later and retrieves their notification list, **Then** the notification is present and the unread
   count is accurate (the notification was not lost).

---

### Edge Cases

- What happens when two domains emit events that create notifications for the same player at nearly
  the same time? → Both notifications are persisted; each appears independently in the list. No
  deduplication is applied at the notification module level.
- What if the source domain emits the same event twice (duplicate delivery)? → Two separate
  notification records are created. The notification module does not guarantee idempotency on
  event delivery; deduplication is the caller's responsibility if needed.
- What happens when a player's connection drops while a push event is in flight? → The
  notification is already persisted; the player retrieves it via the list endpoint on reconnect.
  The missed push event is not retried.
- Can a player delete their own notifications? → Out of scope for this version; notifications
  persist indefinitely until a future data-management feature is introduced.
- What if the content payload in the triggering event is empty? → The notification module rejects
  the event; a non-empty content payload is required.
- What if a game module emits a tournament-event notification for a player who has no game
  profile in that game? → The notification module does not validate cross-domain game-profile
  existence; it creates the notification as long as the recipient player ID is valid.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST accept notification creation requests carrying exactly one of four
  recognized types: friend-or-game-invite, tournament-event, admin-warning, trust-score-alert.
  Requests with any other type MUST be rejected with an error and MUST NOT result in a stored
  notification.
- **FR-002**: The system MUST persist each accepted notification with the following attributes:
  unique identifier, recipient player reference, notification type, content payload, read status
  (default: unread), and creation timestamp.
- **FR-003**: The system MUST reject a notification creation request that targets a player ID not
  registered on the platform; no notification MUST be stored in this case.
- **FR-004**: The system MUST require a non-empty content payload on every notification creation
  request; requests with absent or empty content MUST be rejected.
- **FR-005**: The system MUST provide an endpoint for a logged-in player to retrieve their own
  notification list, ordered from newest to oldest.
- **FR-006**: Each notification entry in the list MUST expose at minimum: notification type,
  content, read/unread status, and creation timestamp.
- **FR-007**: The system MUST allow a logged-in player to mark a single notification — identified
  by its ID — as read. The operation MUST be idempotent: marking an already-read notification
  succeeds without error.
- **FR-008**: A player MUST NOT be able to mark another player's notification as read; such
  requests MUST be rejected with an authorization error. The target notification's status MUST
  NOT be changed.
- **FR-009**: After a new notification is persisted for a player who has an active connection,
  the system MUST push a real-time event to that connection containing at minimum the player's
  updated unread notification count.
- **FR-010**: After a player marks a notification as read, the system MUST push a real-time event
  to any active connection for that player with the updated (decremented) unread count.
- **FR-011**: The real-time push channel MUST be the shared platform gateway — the notification
  module MUST NOT introduce a separate transport or connection endpoint.
- **FR-012**: Notification creation MUST be triggered exclusively via internal domain events
  emitted by other modules (account-social, trust-report, game modules). The notification module
  MUST NOT expose a public HTTP endpoint for direct notification creation from external callers.

### Key Entities

- **Notification**: A message delivered to a specific player. Key attributes: unique identifier,
  recipient player reference, notification type (one of four fixed values), content payload
  (non-empty), read status (unread / read), creation timestamp.
- **NotificationType**: A fixed enumeration of four values — friend-or-game-invite,
  tournament-event, admin-warning, trust-score-alert. This enumeration is closed in this
  version; adding a new type requires a spec amendment.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A player's notification list loads in under 1 second under normal operating
  conditions for a list of up to 100 notifications.
- **SC-002**: A notification created from an internal domain event is present in the recipient's
  list on the very next list request — no polling delay is introduced by the notification module.
- **SC-003**: Marking a notification as read completes in a single API call; the updated status
  is reflected in the player's next list retrieval.
- **SC-004**: A real-time unread-count push event reaches a connected player within 2 seconds of
  the notification being persisted.
- **SC-005**: Every attempt to access or modify a notification belonging to a different player
  is rejected with an authorization error; no cross-player data leakage occurs.
- **SC-006**: Notifications of all four recognized types are stored and returned with the correct
  type label; no type is silently coerced or dropped.

---

## Assumptions

- The notification module is responsible for storage and display only; it does not decide when
  a business event occurs. That responsibility belongs to the emitting domain.
- Each notification is addressed to exactly one recipient player. Broadcast notifications
  (one event → many recipients) are out of scope.
- Notifications persist indefinitely in this version. No automatic expiry or deletion policy
  is applied; this can be revisited when storage or compliance requirements arise.
- The notification list is paginated with a server-set default page size. Client-controlled
  pagination parameters (custom page size) are not required for this version.
- The content payload is a plain-text or structured message supplied by the emitting domain
  event. The notification module stores it as-is without reformatting or validating its internal
  structure.
- The platform player registry is owned by another module. The notification module verifies
  recipient existence by checking that registry; it does not maintain its own player table.
- Real-time delivery reuses the shared WebSocket/SSE gateway already established for the
  platform (per ADR-NOTIFICATION-001). No new connection infrastructure is introduced.
- The real-time push event carries at minimum the updated unread count (badge). Whether it also
  carries the full notification payload is an implementation detail to be resolved at the planning
  stage; this spec requires only the unread count.
- Notification content definition and triggering logic for tournament events belong to individual
  game BRDs. This module only stores and delivers what is supplied.
