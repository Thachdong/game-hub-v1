# Data Model: In-App Notification

**Feature**: specs/002-notification  
**Date**: 2026-06-29

---

## Domain Entities

### Notification

```
Notification
├── id: string (UUID)
├── recipientId: string (UUID — references account_social account)
├── type: NotificationType
├── content: string (non-empty)
├── referenceId: string | null (UUID — opaque reference to triggering entity)
├── isRead: boolean (default: false)
└── createdAt: Date
```

**Validation rules**:
- `type` MUST be one of the four `NotificationType` values; any other value is rejected at the
  domain boundary.
- `content` MUST be non-empty (trimmed length > 0).
- `recipientId` MUST correspond to an existing account; validated at the application layer before
  persisting.
- `referenceId` is optional and stored opaquely — the domain does not resolve or validate it.

**State transitions**:
```
UNREAD (isRead = false) ──mark-as-read──► READ (isRead = true)
```
The transition is one-way and idempotent (marking READ again is a no-op returning success).

---

### NotificationType (Enumeration)

| Value | Trigger |
|---|---|
| `friend-or-game-invite` | Friend invite sent to recipient; game invite from another player |
| `tournament-event` | Tournament status change relevant to recipient (emitted by game modules) |
| `admin-warning` | Warning issued by a platform administrator |
| `trust-score-alert` | Trust score milestone reached or account locked (emitted by trust-report) |

This enumeration is **closed** in this version. Adding a new type requires a spec amendment.

---

## ORM / Persistence Model

### PostgreSQL Schema

```sql
-- Schema
CREATE SCHEMA IF NOT EXISTS notification;

-- Table
CREATE TABLE notification.notifications (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID        NOT NULL,
  type         VARCHAR(50) NOT NULL
                           CHECK (type IN (
                             'friend-or-game-invite',
                             'tournament-event',
                             'admin-warning',
                             'trust-score-alert'
                           )),
  content      TEXT        NOT NULL CHECK (content <> ''),
  reference_id UUID,
  is_read      BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX ON notification.notifications (recipient_id, created_at DESC);
CREATE INDEX ON notification.notifications (recipient_id, is_read) WHERE is_read = FALSE;
```

**Cross-module note**: `recipient_id` logically references `account_social.accounts.id` but
carries no FK constraint — cross-schema FK would couple modules at the DB level.

---

## ORM Entity (TypeORM)

**File**: `src/notification/infrastructure/persistence/typeorm-entities/notification.orm-entity.ts`

```
NotificationOrmEntity
├── @PrimaryGeneratedColumn('uuid') id: string
├── @Column({ name: 'recipient_id' }) recipientId: string
├── @Column() type: string
├── @Column() content: string
├── @Column({ name: 'reference_id', nullable: true }) referenceId: string | null
├── @Column({ name: 'is_read', default: false }) isRead: boolean
└── @CreateDateColumn({ name: 'created_at' }) createdAt: Date
```

Schema: `{ schema: 'notification', name: 'notifications' }`

---

## Port Interfaces

### INotificationRepository

```typescript
interface INotificationRepository {
  save(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification>;
  findByRecipient(
    recipientId: string,
    pagination: { cursor?: { createdAt: Date; id: string }; limit: number }
  ): Promise<Notification[]>;
  findById(id: string): Promise<Notification | null>;
  markAsRead(id: string): Promise<Notification>;
  countUnread(recipientId: string): Promise<number>;
}
```

### IAccountExistencePort

```typescript
interface IAccountExistencePort {
  exists(accountId: string): Promise<boolean>;
}
```

Implemented by a lightweight adapter that issues a `SELECT 1 FROM account_social.accounts WHERE id = $1` query — no ORM entity import needed.

---

## Realtime Push Model

The `RealtimeModule` exposes a `RealtimeService` with:

```typescript
interface IRealtimePushPort {
  pushToUser(userId: string, event: string, payload: unknown): Promise<void>;
}
```

Event emitted to the user's socket after notification creation:

```json
{
  "event": "notification.unread-count",
  "data": { "unreadCount": 5 }
}
```

Optionally, the new notification payload can also be pushed:

```json
{
  "event": "notification.new",
  "data": {
    "id": "...",
    "type": "friend-or-game-invite",
    "content": "...",
    "referenceId": null,
    "isRead": false,
    "createdAt": "2026-06-29T..."
  }
}
```

Event emitted after mark-as-read:

```json
{
  "event": "notification.unread-count",
  "data": { "unreadCount": 4 }
}
```

---

## Domain Events Consumed (emitted by other modules)

The `NotificationModule` subscribes to these `EventEmitter2` events:

| Event name | Expected payload |
|---|---|
| `notification.friend-or-game-invite` | `{ recipientId, content, referenceId? }` |
| `notification.tournament-event` | `{ recipientId, content, referenceId? }` |
| `notification.admin-warning` | `{ recipientId, content }` |
| `notification.trust-score-alert` | `{ recipientId, content, referenceId? }` |

**Required change to account-social**: `SendFriendRequestUseCase` must emit
`notification.friend-or-game-invite` for the friend-request *recipient* when the request is
sent. `ResolveFriendRequestUseCase` must emit `notification.friend-or-game-invite` for the
original *sender* when the request is accepted or rejected, replacing or supplementing the
existing `friend-request.resolved` event for notification purposes.

---

## Module Structure

```
src/
├── shared-auth/                         # New: extracted JWT auth (SharedAuthModule)
│   ├── shared-auth.module.ts
│   ├── jwt.strategy.ts                  # Moved from account-social
│   └── jwt-auth.guard.ts               # Moved from account-social
│
├── realtime/                            # New: shared WebSocket gateway (RealtimeModule)
│   ├── realtime.module.ts
│   ├── realtime.gateway.ts             # @WebSocketGateway — handles connect/disconnect
│   ├── realtime.service.ts             # pushToUser(userId, event, payload)
│   └── realtime-push.port.ts           # IRealtimePushPort interface
│
├── notification/                        # New: NotificationModule
│   ├── notification.module.ts
│   ├── domain/
│   │   ├── entities/
│   │   │   └── notification.ts
│   │   ├── ports/
│   │   │   ├── notification.repository.port.ts
│   │   │   └── account-existence.port.ts
│   │   └── errors/
│   │       └── index.ts
│   ├── application/
│   │   ├── commands/
│   │   │   ├── create-notification.use-case.ts
│   │   │   └── mark-notification-read.use-case.ts
│   │   └── queries/
│   │       └── get-notifications.use-case.ts
│   ├── infrastructure/
│   │   ├── events/
│   │   │   └── domain-event.listener.ts    # @OnEvent handlers for all 4 event types
│   │   ├── persistence/
│   │   │   ├── notification.typeorm-repository.ts
│   │   │   ├── account-existence.typeorm-adapter.ts
│   │   │   └── typeorm-entities/
│   │   │       └── notification.orm-entity.ts
│   │   └── realtime/
│   │       └── realtime-push.adapter.ts    # delegates to RealtimeService
│   └── interface/
│       ├── http/
│       │   └── notifications.controller.ts
│       └── dto/
│           ├── notification-entry.dto.ts
│           ├── notification-list-response.dto.ts
│           └── mark-read-response.dto.ts
│
└── database/
    └── migrations/
        └── 1751100000000-CreateNotificationSchema.ts   # New migration
```
