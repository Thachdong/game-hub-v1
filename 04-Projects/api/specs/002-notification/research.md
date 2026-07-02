# Research: In-App Notification

**Feature**: specs/002-notification  
**Date**: 2026-06-29  
**Status**: Complete — updated in pass 2 to resolve checklist/api.md gaps (CHK001–CHK029)

---

## 1. Event Subscription Pattern (how other modules trigger notifications)

**Decision**: Other modules emit a domain event via `EventEmitter2`. `NotificationModule`
subscribes with `@OnEvent()` listeners.

**Rationale**: Matches ADR-NOTIFICATION-001 Decision 1 and the pattern already live in
`account-social` (`GameProfileCreatedListener`). The emitting module has no import dependency
on `NotificationModule`; `NotificationModule` can fail without affecting the emitting module's
core flow.

**Alternatives considered**:
- Direct exported-service call — rejected: creates a hard import dependency; Notification failure
  propagates to the caller.
- Message queue (Kafka/RabbitMQ) — rejected: constitution forbids distributed queues while the
  service runs as a single process.

**Concrete event names & payloads** (to be emitted by other modules):

| Event name | Emitting module | Payload fields |
|---|---|---|
| `notification.friend-or-game-invite` | account-social | `recipientId`, `content`, `referenceId?` |
| `notification.tournament-event` | game modules | `recipientId`, `content`, `referenceId?` |
| `notification.admin-warning` | future admin module | `recipientId`, `content` |
| `notification.trust-score-alert` | trust-report module | `recipientId`, `content`, `referenceId?` |

`referenceId` is an optional opaque ID pointing to the triggering entity (e.g., friend-request
ID). The notification module stores it but does not resolve it.

**Existing event already emitted by account-social** (`FriendRequestResolvedEvent` with
`EVENT_NAME = 'friend-request.resolved'`) needs to be supplemented or replaced by a
`notification.friend-or-game-invite` event. The cleanest approach: account-social emits the new
`notification.friend-or-game-invite` event alongside (or instead of) the existing resolved event
when creating a friend invite notification for the recipient. The existing `friend-request.resolved`
event is for the sender; a new event is needed for the *recipient* of an invite (i.e., when a
friend request is *sent* to B, B should get a notification).

**Updated account-social emit map**:
- When friend request is **sent** → emit `notification.friend-or-game-invite` for the receiver.
- When friend request is **resolved** → emit `notification.friend-or-game-invite` for the sender
  (accepted/rejected outcome).

---

## 2. Real-Time Push Transport (WebSocket/SSE gateway)

**Decision**: Introduce a shared `RealtimeGateway` using NestJS `@WebSocketGateway()` with
`socket.io`. This gateway lives in its own module (`RealtimeModule`) importable by any feature
needing live updates.

**Rationale**: ADR-NOTIFICATION-001 Decision 2 mandates WebSocket/SSE as the default realtime
transport. The notification feature is the first consumer; the gateway is designed as a shared
resource (constitution Principle V).

**Why WebSocket over SSE for the first implementation**:
- `socket.io` (included via `@nestjs/platform-socket.io`) is already in NestJS ecosystem and
  supports bidirectional communication, which is needed for game state updates downstream.
- SSE is simpler but unidirectional (server→client only) and harder to upgrade later.
- When the service scales horizontally, adding a Redis pub/sub backplane to `socket.io` is a
  well-known pattern (`@socket.io/redis-adapter`); no architectural change required at that point.

**Connection authentication**: Each socket connection MUST authenticate by sending a valid JWT
access token in the handshake (via `auth.token` or `Authorization` header). The gateway verifies
the token and maps `socket.id` → `userId` for targeted broadcasts.

**Scaling note** (single-instance phase): Redis backplane not required now; the gateway stores
the `userId → socket` map in memory. The interface (emit API) is designed so a Redis adapter can
be swapped in without client changes.

**Alternatives considered**:
- SSE — rejected for now: unidirectional; future game state requires bidirectional.
- Polling — rejected: constitution Principle V mandates WebSocket/SSE for live updates.
- Separate per-feature gateway — rejected: constitution Principle V mandates a single shared
  gateway, not per-feature transport stacks.

---

## 3. Notification Persistence (PostgreSQL schema)

**Decision**: Dedicated `notification` PostgreSQL schema with a single `notifications` table.
ORM entity follows the pattern in `account-social` (separate domain entity + ORM entity).

**Schema**:
```sql
CREATE SCHEMA IF NOT EXISTS notification;

CREATE TABLE notification.notifications (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID        NOT NULL,
  type         VARCHAR(50) NOT NULL,
  content      TEXT        NOT NULL,
  reference_id UUID,
  is_read      BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON notification.notifications (recipient_id, created_at DESC);
CREATE INDEX ON notification.notifications (recipient_id, is_read);
```

`recipient_id` references `account_social.accounts.id` logically; no FK constraint across
schemas (cross-module FK would violate modular-monolith module boundary rule).

**Rationale**: Follows the established pattern (one schema per bounded context). Index on
`(recipient_id, created_at DESC)` for list queries; index on `(recipient_id, is_read)` for
badge-count queries.

---

## 4. Unread Count Computation

**Decision**: Compute unread count with a direct `SELECT COUNT(*) WHERE recipient_id = ? AND
is_read = FALSE` query at the database level — no in-memory counter, no Redis counter.

**Rationale**: Constitution Principle IV forbids external sorted sets/caches unless a concrete
NFR requires it. Current NFR (SC-001: list < 1s, SC-004: realtime push < 2s) is achievable with
a simple indexed count query. A partial index on `(recipient_id) WHERE is_read = FALSE` makes
this O(unread_count) not O(all_notifications).

---

## 5. Module Wiring (NestJS)

**Decision**: Two new NestJS modules:
1. `RealtimeModule` — houses the WebSocket gateway and the connection registry (userId → socket
   mapping). Exports a `RealtimeService` with `pushToUser(userId, event, payload)` method.
2. `NotificationModule` — houses domain, application, and infrastructure layers for notification.
   Imports `RealtimeModule` to push badge updates after persist.

`AppModule` imports both. `NotificationModule` does NOT import `AccountSocialModule`.

**Cross-module validation** (recipient existence): `NotificationModule` needs to verify that the
`recipientId` in each incoming event corresponds to a real account. Two options:
- Query `account_social.accounts` directly (cross-schema DB query but no cross-module service
  call — acceptable since it is read-only and uses only the account ID, not domain logic).
- Skip validation (trust the emitting module). This is acceptable given constitution Principle II
  states modules MUST NOT import each other's internal providers; the DB is shared.

**Decision**: Validate recipient existence via a direct DB query against `account_social.accounts`
(read-only, keyed by UUID). The notification domain port is `IAccountExistencePort` with a single
`exists(id: string): Promise<boolean>` method. The infrastructure adapter queries
`account_social.accounts` directly (no ORM entity import needed — raw query suffices).

---

## 6. mark-as-read Authorization

**Decision**: Use the JWT guard (already available via `AccountSocialModule`'s exported
`JwtStrategy`) — the `NotificationModule` controller registers `JwtAuthGuard` for its endpoints.
The mark-as-read use case compares `callerId` (from token) with `notification.recipientId` and
throws `ForbiddenDomainError` if they differ.

**Note**: The `JwtStrategy` is registered in the Passport module inside `AccountSocialModule`.
To reuse it, `AccountSocialModule` must export `JwtStrategy` (or the module configures Passport
globally). Current implementation: `PassportModule.register({ defaultStrategy: 'jwt' })` is
inside `AccountSocialModule` — not global. The cleanest solution is to extract `JwtModule`,
`PassportModule`, and `JwtStrategy` into a shared `AuthModule` (exported globally). This is a
small refactor needed before `NotificationModule` can protect its endpoints.

**Alternative**: Duplicate the JWT guard in `NotificationModule`. Rejected — DRY violation.

**Chosen path**: Extract shared auth infrastructure into a `SharedAuthModule` (exported globally
from `AppModule`). `AccountSocialModule` imports it; `NotificationModule` imports it.

---

## 7. Notification List Pagination

**Decision**: Cursor-based pagination using `created_at` + `id` as the cursor (newest-first
order). Default page size: 20. Maximum page size: 50.

**Rationale**: `created_at` is not unique (two notifications can arrive at the same millisecond),
so a composite cursor `(created_at, id)` guarantees stable pagination. This matches the `ORDER BY
created_at DESC, id DESC` query with a `WHERE (created_at, id) < (cursor_ts, cursor_id)` clause.
Offset-based pagination would become slow at large offsets.

---

## 8. Checklist Gap Resolutions (Pass 2 — CHK001–CHK029)

The following decisions were deferred in pass 1 and are now resolved. All are reflected in the
updated `contracts/http-api.md`.

### CHK015 — Multi-Tab / Multi-Connection Behaviour

**Decision**: Push `notification.unread-count` and `notification.new` to **all** active socket
connections for a user simultaneously.

**Rationale**: A user with two open tabs expects both to show the correct badge. Broadcasting
to all connections is the correct behaviour; it is the client's responsibility to be idempotent
when re-rendering the badge count from a `notification.unread-count` push.

**Alternative considered**: Push only to the "primary" (most recent) connection. Rejected —
tracking a primary connection adds server complexity and still leaves secondary tabs stale.

### CHK026 — Existing `friend-request.resolved` Event: Supplement vs. Replace

**Decision**: **Supplement** — the existing `FriendRequestResolvedEvent` (event name
`'friend-request.resolved'`) continues to be emitted unchanged. The new
`notification.friend-or-game-invite` event is emitted **in addition to** it.

**Rationale**: `friend-request.resolved` may have other consumers (analytics, trust-report,
future modules). Removing it could silently break those consumers. Adding the notification event
alongside it is the safest incremental change and avoids coordination with other teams at this
point.

### CHK028 — Content Composition Ownership

**Decision**: The **emitting module** is responsible for composing the human-readable `content`
string. `NotificationModule` stores and returns it verbatim.

**Rationale**: Each domain knows the context of the event better than the notification module
does. For example, `account-social` knows the sender's username; `trust-report` knows the
specific trust score threshold. Pushing content composition into `NotificationModule` would
require it to know about domain-specific entity data from other modules, violating module
boundaries.

**Implication**: Each emitting module must document the content template it sends as part of its
own contract. The notification event payload schema (`content: string`) is a pass-through; the
`NotificationModule` makes no assumptions about the string's format.

### CHK013 — JWT Expiry While Socket Is Connected

**Decision**: The server does **not** proactively disconnect an authenticated socket when its
JWT access token expires. The connection identity is fixed at handshake time and remains valid
for the connection lifetime.

**Rationale**: Implementing server-side token expiry on WebSocket connections requires polling
the token expiry timestamp and scheduling a disconnect — significant added complexity for minimal
security gain, given that push events carry only the recipient's own notifications (low
sensitivity). This matches common practice for notification-only WebSocket channels.

### CHK019 — `referenceId` — `null` vs. `undefined`

**Decision**: `referenceId` is always present in HTTP responses as either a UUID string or
**`null`** (never absent). In EventEmitter2 payloads, it is an optional field (`referenceId?`)
which may be `undefined` — the infrastructure adapter maps `undefined` to `null` before
persisting.

**Rationale**: Consistent HTTP response shapes are easier for client SDKs to type. The DB column
uses SQL `NULL`; the TypeScript ORM entity uses `string | null`.

### CHK024/CHK025 — SharedAuthModule Backward Compatibility

**Decision**: After extracting `JwtModule`, `PassportModule`, and `JwtStrategy` into
`SharedAuthModule` (registered as `@Global()`), `AccountSocialModule` will import
`SharedAuthModule` in place of its current local imports. Existing `AccountSocialModule` tests
that bootstrap the module will need to import `SharedAuthModule` as well.

**Backward-compatibility rule**: No existing endpoint behaviour changes. The refactor is
internal wiring only — the JWT verification logic is identical. `JwtStrategy` remains the same
class; only its NestJS module home changes.

**`PassportModule` scope**: Registering `PassportModule` inside `SharedAuthModule` with
`@Global()` makes the `jwt` strategy globally available, removing the need for any other module
to import `PassportModule` directly.
