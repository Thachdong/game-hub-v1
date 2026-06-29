# Implementation Plan: In-App Notification

**Branch**: `feature/api/dongt/notification` | **Date**: 2026-06-29 | **Spec**: [spec.md](spec.md)
**Pass 2**: 2026-06-29 — contract gaps from [checklists/api.md](checklists/api.md) resolved

**Input**: Feature specification from `specs/002-notification/spec.md`

---

## Summary

Build a shared in-app notification module that persists notifications (4 types: friend-or-game-invite, tournament-event, admin-warning, trust-score-alert) per recipient player, exposes a JWT-protected HTTP list + mark-as-read API, and pushes real-time unread-count and new-notification events to connected clients over a shared WebSocket gateway. Notifications are created exclusively by subscribing to internal `EventEmitter2` domain events emitted by other modules (account-social, trust-report, game modules).

---

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20 (matches existing codebase)

**Primary Dependencies**: NestJS 10, TypeORM, `@nestjs/event-emitter` (EventEmitter2), `@nestjs/websockets` + `@nestjs/platform-socket.io` (WebSocket gateway), `class-validator`, `class-transformer`, `@nestjs/swagger`

**Storage**: PostgreSQL — dedicated `notification` schema, single `notifications` table

**Testing**: `@nestjs/testing`, `ts-jest`, `supertest` (matches existing devDependencies)

**Target Platform**: Linux server (NestJS HTTP + WebSocket, single-instance)

**Project Type**: NestJS modular-monolith API service

**Performance Goals**: Notification list < 1s (SC-001); real-time push < 2s (SC-004)

**Constraints**: Single PostgreSQL instance, no external cache, no message queue; constitutionally forbidden while running as a single process

**Scale/Scope**: Single deployable unit; WebSocket backplane (Redis) deferred to multi-instance phase

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked post-design.*

| Principle | Gate | Status |
|---|---|---|
| **I. Hexagonal Architecture** | Domain and application layers MUST NOT import NestJS, TypeORM, or adapters. Infrastructure adapters MUST implement exactly one port. | ✅ All ports defined in `domain/ports/`. Use-cases inject ports by symbol, never concrete classes. `NotificationOrmEntity` lives in infrastructure only. |
| **II. Modular Monolith** | Modules MUST NOT import each other's internal providers. Cross-module communication via exported service or domain events only. | ✅ `NotificationModule` consumes EventEmitter2 events; does not import `AccountSocialModule` internals. Recipient existence check uses a direct DB query via its own port (`IAccountExistencePort`), not a service call. |
| **III. Authentication & Security** | Protected endpoints MUST use JWT verification. | ✅ `GET /notifications` and `PATCH /notifications/:id/read` guarded by `JwtAuthGuard`. WebSocket handshake validates JWT. |
| **IV. Data Access** | TypeORM with migration files. No `synchronize: true`. Atomic updates where concurrent writes are possible. | ✅ Migration `1751100000000-CreateNotificationSchema.ts` covers schema creation. `markAsRead` is a single `UPDATE … RETURNING` statement. Unread count uses `SELECT COUNT(*)` with partial index. |
| **V. Event-Driven Communication & Realtime** | Internal domain events via EventEmitter2. Live updates via shared WebSocket/SSE gateway — NOT per-feature transport. | ✅ EventEmitter2 `@OnEvent` listeners in `DomainEventListener`. Shared `RealtimeGateway` + `RealtimeService` introduced once and reused. |
| **VI. NestJS Standards & API Documentation** | All env config via `ConfigModule`/`ConfigService`. Every public endpoint has `@ApiOperation`, `@ApiResponse`, DTO decorators. | ✅ No new env vars for notification itself; `RealtimeModule` may read a port config via existing `AppConfig`. All endpoints decorated for OpenAPI. |

**Post-design re-check**: ✅ No violations. `SharedAuthModule` extraction (see research.md §6) resolves the JWT reuse concern cleanly without duplicating the guard.

**Complexity Tracking**: None — no constitution deviations.

---

## Project Structure

### Documentation (this feature)

```text
specs/002-notification/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── contracts/
│   └── http-api.md      ← Phase 1 output
├── quickstart.md        ← Phase 1 output
└── tasks.md             ← Phase 2 output (/speckit-tasks — not created here)
```

### Source Code

```text
src/
├── shared-auth/                              # New — extracted JWT auth
│   ├── shared-auth.module.ts
│   ├── jwt.strategy.ts                       # Moved from account-social
│   └── jwt-auth.guard.ts                    # Moved from account-social (+ guards)
│
├── realtime/                                 # New — shared WebSocket gateway
│   ├── realtime.module.ts
│   ├── realtime.gateway.ts
│   ├── realtime.service.ts
│   └── realtime-push.port.ts
│
├── notification/                             # New — NotificationModule
│   ├── notification.module.ts
│   ├── domain/
│   │   ├── entities/notification.ts
│   │   ├── ports/
│   │   │   ├── notification.repository.port.ts
│   │   │   └── account-existence.port.ts
│   │   └── errors/index.ts
│   ├── application/
│   │   ├── commands/
│   │   │   ├── create-notification.use-case.ts
│   │   │   └── mark-notification-read.use-case.ts
│   │   └── queries/
│   │       └── get-notifications.use-case.ts
│   ├── infrastructure/
│   │   ├── events/domain-event.listener.ts
│   │   ├── persistence/
│   │   │   ├── notification.typeorm-repository.ts
│   │   │   ├── account-existence.typeorm-adapter.ts
│   │   │   └── typeorm-entities/notification.orm-entity.ts
│   │   └── realtime/realtime-push.adapter.ts
│   └── interface/
│       ├── http/notifications.controller.ts
│       └── dto/
│           ├── notification-entry.dto.ts
│           ├── notification-list-response.dto.ts
│           └── mark-read-response.dto.ts
│
├── account-social/                           # Modified — emit notification events
│   └── application/commands/
│       ├── send-friend-request.use-case.ts   # + emit notification.friend-or-game-invite
│       └── resolve-friend-request.use-case.ts # + emit notification.friend-or-game-invite
│
└── database/
    └── migrations/
        └── 1751100000000-CreateNotificationSchema.ts   # New migration
```

**Structure Decision**: Single project (Option 1). Hexagonal layers follow the pattern established in `account-social`. Two new supporting modules (`shared-auth`, `realtime`) are extracted/introduced first, then `notification` builds on them.

---

## Complexity Tracking

> No constitution violations — table left empty intentionally.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| — | — | — |
