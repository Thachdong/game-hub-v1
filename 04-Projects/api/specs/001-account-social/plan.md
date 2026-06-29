# Implementation Plan: Account & Social API

**Branch**: `feature/api/dongt/account-social` | **Date**: 2026-06-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-account-social/spec.md`

---

## Summary

Build the `account-social` NestJS module implementing Google OAuth2 login (auto-register on
first login), stateless JWT dual-token auth, account profile, platform game list with
`hasProfile` flag (populated via event subscription), friend request lifecycle with
concurrent-request handling, and Platform Admin–driven Game Admin role management — all
organised in strict hexagonal (Ports & Adapters) layers.

---

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20 LTS

**Primary Dependencies**:
- `@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express` — NestJS framework
- `@nestjs/passport`, `passport`, `passport-google-oauth20` — Google OAuth2 strategy
- `@nestjs/jwt`, `jsonwebtoken` — stateless JWT signing/verification
- `typeorm`, `pg`, `@nestjs/typeorm` — PostgreSQL ORM with migrations
- `@nestjs/config`, `joi` — validated/grouped env config
- `@nestjs/swagger` — OpenAPI decorator-driven docs
- `@nestjs/event-emitter`, `eventemitter2` — in-process domain events

**Storage**: PostgreSQL 16 — dedicated schema `account_social`

**Testing**: Jest (unit — domain + application layers with mocked ports), Supertest (e2e
integration against real PostgreSQL)

**Target Platform**: Linux server, Docker-deployable REST API

**Project Type**: NestJS web-service (one module inside a modular monolith)

**Performance Goals**:
- OAuth callback end-to-end: < 3 s (SC-001)
- Profile endpoint + game list endpoint: < 500 ms each (SC-002)

**Constraints**:
- Stateless JWT — no refresh token DB storage, no server-side revocation (clarified)
- Domain layer MUST NOT import NestJS, TypeORM, or any infrastructure class
- `synchronize: true` MUST be `false` in staging/production; all schema changes via
  numbered migration files in `src/database/migrations/`
- No cross-module queries at runtime (game profile status read from own registry)

**Scale/Scope**: Single-process modular monolith, one PostgreSQL schema per module,
no horizontal scaling concern in this release

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Hexagonal Architecture | ✅ PASS | 4-layer structure enforced: domain → application → infrastructure → interface. Domain entities and port interfaces import zero external libs. |
| II. Modular Monolith | ✅ PASS | Single `AccountSocialModule`. Schema `account_social`. Cross-module via EventEmitter2 only. No direct repo imports across modules. |
| III. Authentication & Security | ✅ PASS | JWT dual-token (15–30 min / 7–30 day), stateless (no denylist per clarification). Platform Admin derived from env config, baked into access token. No session cookies. |
| IV. Data Access | ✅ PASS | PostgreSQL + TypeORM. All schema changes via numbered migrations in `src/database/migrations/`. Idempotent `INSERT OR IGNORE` for GameAdminRole. Upsert pattern for FriendRequest retry (FR-020). No read-modify-write on concurrent counters (not applicable here). |
| V. Event-Driven | ✅ PASS | `EventEmitter2`: emits `FriendRequestResolvedEvent` (outgoing to notification domain); subscribes to `GameProfileCreatedEvent` (incoming from game modules). No distributed queue. |
| VI. NestJS Standards | ✅ PASS | `ConfigModule` with Joi validation schema, configs grouped by domain (`AuthConfig`, `GoogleOAuthConfig`, `AppConfig`). All endpoints decorated with `@ApiOperation`, `@ApiResponse`, DTOs with `@ApiProperty`. `openapi.yml` regenerated per PR. |

**Gate result: ALL PASS — proceeding to Phase 0.**

Post-design re-check: ✅ No violations introduced by data model or contract design (see
Complexity Tracking — no entries).

---

## Project Structure

### Documentation (this feature)

```text
specs/001-account-social/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── openapi.yml      # Phase 1 output — full REST contract
└── tasks.md             # Phase 2 output (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
src/
├── account-social/                          # Hexagonal NestJS module
│   ├── account-social.module.ts
│   ├── domain/                              # Pure TypeScript — zero external imports
│   │   ├── entities/
│   │   │   ├── account.ts
│   │   │   ├── friend-request.ts            # includes FriendRequestStatus enum
│   │   │   ├── friendship.ts
│   │   │   ├── game-admin-role.ts
│   │   │   └── player-game-profile.ts
│   │   ├── events/
│   │   │   ├── friend-request-resolved.event.ts   # outgoing
│   │   │   └── game-profile-created.event.ts      # incoming (contract with game modules)
│   │   └── ports/
│   │       ├── account.repository.port.ts
│   │       ├── friend-request.repository.port.ts
│   │       ├── friendship.repository.port.ts
│   │       ├── game-admin-role.repository.port.ts
│   │       ├── player-game-profile.repository.port.ts
│   │       ├── game-registry.port.ts               # read-only: lists platform games
│   │       ├── google-oauth.port.ts
│   │       └── event-publisher.port.ts
│   ├── application/                         # Use-cases — imports ports only
│   │   ├── commands/
│   │   │   ├── login-with-google.use-case.ts
│   │   │   ├── refresh-access-token.use-case.ts
│   │   │   ├── send-friend-request.use-case.ts
│   │   │   ├── resolve-friend-request.use-case.ts  # accept OR reject
│   │   │   ├── assign-game-admin.use-case.ts
│   │   │   └── revoke-game-admin.use-case.ts
│   │   └── queries/
│   │       ├── get-account-profile.use-case.ts
│   │       ├── get-game-list.use-case.ts
│   │       ├── get-friends.use-case.ts
│   │       └── get-friend-requests.use-case.ts
│   ├── infrastructure/                      # Adapters implementing ports
│   │   ├── persistence/
│   │   │   ├── account.typeorm-repository.ts
│   │   │   ├── friend-request.typeorm-repository.ts
│   │   │   ├── friendship.typeorm-repository.ts
│   │   │   ├── game-admin-role.typeorm-repository.ts
│   │   │   ├── player-game-profile.typeorm-repository.ts
│   │   │   ├── game-registry.typeorm-repository.ts  # reads platform.games table
│   │   │   └── typeorm-entities/            # @Entity classes (separate from domain)
│   │   │       ├── account.orm-entity.ts
│   │   │       ├── friend-request.orm-entity.ts
│   │   │       ├── friendship.orm-entity.ts
│   │   │       ├── game-admin-role.orm-entity.ts
│   │   │       └── player-game-profile.orm-entity.ts
│   │   ├── google-oauth/
│   │   │   └── google-oauth.adapter.ts      # passport-google-oauth20 strategy
│   │   └── events/
│   │       ├── event-publisher.adapter.ts   # implements EventPublisherPort via EventEmitter2
│   │       └── game-profile-created.listener.ts  # @OnEvent subscriber
│   └── interface/                           # NestJS HTTP layer
│       ├── http/
│       │   ├── auth.controller.ts
│       │   ├── account.controller.ts
│       │   ├── friends.controller.ts
│       │   └── admin.controller.ts
│       ├── dto/
│       │   ├── auth/
│       │   ├── account/
│       │   ├── friends/
│       │   └── admin/
│       └── guards/
│           ├── jwt-auth.guard.ts
│           ├── optional-jwt.guard.ts       # for guest-accessible endpoints
│           └── platform-admin.guard.ts
├── config/                                  # Grouped, validated configs
│   ├── auth.config.ts                       # JWT secrets, expiry
│   ├── google-oauth.config.ts               # client ID, secret, callback URL
│   └── app.config.ts                        # port, platform admin emails
└── database/
    └── migrations/                          # All TypeORM migration files
        └── 1751000000000-CreateAccountSocialSchema.ts
```

**Structure Decision**: Hexagonal (Ports & Adapters) within a single NestJS module.
Domain entities are plain TypeScript classes. TypeORM `@Entity` classes live exclusively in
`infrastructure/persistence/typeorm-entities/` and are never imported by application or domain
layers. The `GameRegistryPort` provides a clean read-only boundary for the externally-managed
platform games table.

---

## Complexity Tracking

> No constitution violations — this section intentionally empty.
