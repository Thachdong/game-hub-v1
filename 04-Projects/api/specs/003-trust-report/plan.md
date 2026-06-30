# Implementation Plan: Trust & Report

**Branch**: `feature/api/dongt/trust-and-report` | **Date**: 2026-06-30 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/003-trust-report/spec.md`

---

## Summary

Build a `trust-report` module that lets a player file a report against another user, lets a
Platform Admin review pending reports and confirm them valid/invalid, lets a Platform Admin
manage report types (name + trust-score deduction points) without a deploy, and maintains a
per-account trust score (init 100) that is atomically deducted when a report is confirmed valid.
Crossing the 50/20/10 warning thresholds, or the score reaching/staying at 0, emits the existing
`notification.trust-score-alert` domain event so the notification module (built in
`002-notification`) delivers the alert. A score of 0 sets/extends a 7-day game-participation
lock (platform-wide, new-participation only — in-progress sessions are unaffected); once unlocked,
the score recovers +1 per calendar day on which the account has any authenticated activity, capped
at 100. The module exports a lock-status port for future game modules to consume.

---

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20 (matches existing codebase)

**Primary Dependencies**: NestJS 10, TypeORM, `@nestjs/event-emitter` (EventEmitter2),
`class-validator`, `class-transformer`, `@nestjs/swagger` — all already in use; no new
dependencies introduced.

**Storage**: PostgreSQL — dedicated `trust_report` schema, three tables (`report_types`,
`reports`, `trust_scores`)

**Testing**: `@nestjs/testing`, `ts-jest`, `supertest` (matches existing devDependencies)

**Target Platform**: Linux server (NestJS HTTP, single-instance)

**Project Type**: NestJS modular-monolith API service

**Performance Goals**: Report submission and admin review actions respond in well under 1s
(supports SC-001); trust-score deduction/recovery is a single atomic statement per change, no
multi-step transactions.

**Constraints**: Single PostgreSQL instance, no external cache, no message queue (constitution
Principle II); every trust-score mutation MUST be a single atomic `UPDATE … RETURNING` statement
(constitution Principle IV; reaffirms ADR-TRUST-REPORT-002); report-type config MUST live in a DB
table read directly at use time, no cache (reaffirms ADR-TRUST-REPORT-001).

**Scale/Scope**: Single deployable unit. Admin-driven report volume is low (tens/day); the
daily-recovery check runs once per authenticated request but is a no-op after the first
successful write each calendar day per account (enforced by the atomic statement's `WHERE`
clause, not application-level caching).

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked post-design.*

| Principle | Gate | Status |
|---|---|---|
| **I. Hexagonal Architecture** | Domain/application layers MUST NOT import NestJS, TypeORM, or adapters. Infrastructure adapters MUST implement exactly one port. | ✅ `Report`, `ReportType`, `TrustScore` are plain domain entities in `domain/entities/`. Use-cases depend only on port interfaces (`IReportRepositoryPort`, `IReportTypeRepositoryPort`, `ITrustScoreRepositoryPort`, `IAccountExistencePort`). TypeORM entities live in `infrastructure/persistence/typeorm-entities/` only. |
| **II. Modular Monolith** | Modules MUST NOT import another module's internal providers. Cross-module calls via exported service or domain events only. | ✅ `trust-report` owns the `trust_report` schema exclusively. Reporter/reported-user existence is checked via `AccountExistenceAdapter` wrapping account-social's already-exported `AccountExistenceService` (same pattern notification uses). Outgoing alerts use the existing `notification.trust-score-alert` event; account creation is consumed via a new `account-social.account-created` event (account-social emits, trust-report subscribes) rather than a direct call. |
| **III. Authentication & Security** | Protected endpoints MUST use JWT verification. | ✅ All player endpoints guarded by `JwtAuthGuard` (shared-auth). Admin endpoints additionally guarded by `PlatformAdminGuard`, promoted from `account-social` into `shared-auth` in this feature (mirrors how `JwtAuthGuard`/`OptionalJwtGuard` were promoted during `002-notification`) so `trust-report` does not import an account-social-internal guard. |
| **IV. Data Access** | TypeORM + migrations, no `synchronize: true`. Atomic updates for concurrently-written fields. | ✅ New migration `CreateTrustReportSchema`. `trust_scores.score` and `game_locked_until` are written exclusively via single `UPDATE … SET … WHERE … RETURNING` statements (deduction, lockout set/extend, daily recovery) — no read-modify-write in the application layer, per ADR-TRUST-REPORT-002. |
| **V. Event-Driven Communication & Realtime** | Internal events via EventEmitter2; consuming modules MUST subscribe, not call directly. | ✅ `trust-report` subscribes to `account-social.account-created` (new) and a new lightweight `auth.request-authenticated` event (emitted by `JwtAuthGuard` on every successful validation) to drive trust-score init and daily recovery. `trust-report` emits `notification.trust-score-alert` (existing contract, no change needed on the notification side). |
| **VI. NestJS Standards & API Documentation** | Env config via `ConfigModule`/`ConfigService`; every public endpoint has Swagger decorators. | ✅ No new env vars. All controllers (`reports`, `admin/reports`, `admin/report-types`, `trust-score`) get `@ApiOperation`/`@ApiResponse`/DTO `@ApiProperty` decorators; `openapi.yml` regenerated as part of this feature's PR. |

**Post-design re-check**: ✅ No violations. The two cross-module additions (promoting
`PlatformAdminGuard`, adding the `account-social.account-created` and `auth.request-authenticated`
events) are additive and event-driven — they do not create a synchronous dependency from
account-social/shared-auth back into trust-report.

**Complexity Tracking**: None — no constitution deviations.

---

## Project Structure

### Documentation (this feature)

```text
specs/003-trust-report/
├── plan.md              ← this file
├── research.md           ← Phase 0 output
├── data-model.md          ← Phase 1 output
├── contracts/
│   ├── http-api.md        ← Phase 1 output
│   └── domain-events.md   ← Phase 1 output
├── quickstart.md           ← Phase 1 output
└── tasks.md                ← Phase 2 output (/speckit-tasks — not created here)
```

### Source Code

```text
src/
├── shared-auth/                                # Modified — promote PlatformAdminGuard here
│   ├── shared-auth.module.ts                   # + export PlatformAdminGuard
│   ├── jwt-auth.guard.ts                       # + emit 'auth.request-authenticated' on success
│   └── platform-admin.guard.ts                 # Moved from account-social
│
├── trust-report/                                # New — TrustReportModule
│   ├── trust-report.module.ts
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── report.ts
│   │   │   ├── report-type.ts
│   │   │   └── trust-score.ts
│   │   ├── ports/
│   │   │   ├── report.repository.port.ts
│   │   │   ├── report-type.repository.port.ts
│   │   │   ├── trust-score.repository.port.ts
│   │   │   ├── account-existence.port.ts
│   │   │   └── event-publisher.port.ts
│   │   └── errors/index.ts
│   ├── application/
│   │   ├── commands/
│   │   │   ├── submit-report.use-case.ts                # US1
│   │   │   ├── review-report.use-case.ts                 # US2 (confirm valid/invalid + deduct)
│   │   │   ├── create-report-type.use-case.ts             # US3
│   │   │   ├── update-report-type.use-case.ts             # US3
│   │   │   ├── deactivate-report-type.use-case.ts         # US3
│   │   │   ├── initialize-trust-score.use-case.ts          # listener-driven, FR-011
│   │   │   └── record-daily-recovery.use-case.ts           # listener-driven, FR-018/019
│   │   └── queries/
│   │       ├── list-pending-reports.use-case.ts            # US2
│   │       ├── list-report-types.use-case.ts               # US3
│   │       └── get-trust-score.use-case.ts                 # self-view support
│   ├── infrastructure/
│   │   ├── events/
│   │   │   ├── account-created.listener.ts                 # consumes account-social event
│   │   │   ├── request-authenticated.listener.ts            # consumes shared-auth event
│   │   │   └── event-publisher.adapter.ts                   # emits notification.trust-score-alert
│   │   ├── persistence/
│   │   │   ├── report.typeorm-repository.ts
│   │   │   ├── report-type.typeorm-repository.ts
│   │   │   ├── trust-score.typeorm-repository.ts            # atomic UPDATE...RETURNING methods
│   │   │   ├── account-existence.adapter.ts                  # wraps account-social's exported service
│   │   │   └── typeorm-entities/
│   │   │       ├── report.orm-entity.ts
│   │   │       ├── report-type.orm-entity.ts
│   │   │       └── trust-score.orm-entity.ts
│   │   └── lock-status/
│   │       └── trust-status.port.ts                         # exported port for future game modules
│   └── interface/
│       ├── http/
│       │   ├── reports.controller.ts                       # POST /reports
│       │   ├── report-types.controller.ts                  # GET /report-types (active list)
│       │   ├── trust-score.controller.ts                   # GET /trust-score/me
│       │   └── admin/
│       │       ├── admin-reports.controller.ts              # GET/PATCH /admin/reports
│       │       └── admin-report-types.controller.ts          # POST/PATCH/DELETE /admin/report-types
│       └── dto/
│           ├── submit-report.dto.ts
│           ├── report-entry.dto.ts
│           ├── review-report.dto.ts
│           ├── report-type.dto.ts
│           └── trust-score.dto.ts
│
├── account-social/                              # Modified — emit account-created event
│   └── application/commands/
│       └── (Google OAuth login/account-creation use-case)  # + emit account-social.account-created
│                                                              #   only on first-time account creation
│
└── database/
    └── migrations/
        └── 1751200000000-CreateTrustReportSchema.ts          # New migration
```

**Structure Decision**: Single project (Option 1). Hexagonal layers follow the pattern
established in `account-social` and `002-notification`. `PlatformAdminGuard` is promoted into
`shared-auth` first (small, additive change), then the `trust-report` module is built on top of
it and on the existing `notification.trust-score-alert` event contract.

---

## Complexity Tracking

> No constitution violations — table left empty intentionally.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| — | — | — |
