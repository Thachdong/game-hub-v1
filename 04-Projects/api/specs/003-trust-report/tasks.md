# Tasks: Trust & Report

**Input**: Design documents from `specs/003-trust-report/`

**Prerequisites**: [plan.md](plan.md) · [spec.md](spec.md) · [data-model.md](data-model.md) ·
[contracts/http-api.md](contracts/http-api.md) · [contracts/domain-events.md](contracts/domain-events.md) ·
[research.md](research.md) · [quickstart.md](quickstart.md)

**Tests**: Not requested — no test tasks included.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing
of each story. All file paths are relative to the repo root.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no in-phase dependencies)
- **[Story]**: Which user story this task belongs to (US1–US5 from spec.md)

---

## Phase 1: Setup (Directory Structure)

**Purpose**: Create the source tree skeleton so all subsequent tasks know where to write files.

- [x] T001 Create directory tree for the new module: `src/trust-report/domain/{entities,ports,errors}`, `src/trust-report/application/{commands,queries}`, `src/trust-report/infrastructure/{events,persistence/typeorm-entities,lock-status}`, `src/trust-report/interface/{http/admin,dto}`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: All artifacts in this phase must exist before any user story can be implemented.
They are either pure TypeScript (no NestJS imports), cross-module modifications, or the database
schema.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T002 [P] Write `Report` domain entity + `ReportStatus` enum (PENDING/VALID/INVALID) in
  `src/trust-report/domain/entities/report.ts` — pure TypeScript class, fields: id, reporterId,
  reportedUserId, reportTypeId, context, status, appliedPoints(number|null), submittedAt,
  resolvedAt(Date|null), resolvedBy(string|null). No NestJS or TypeORM imports.

- [x] T003 [P] Write `ReportType` domain entity in
  `src/trust-report/domain/entities/report-type.ts` — pure TypeScript class, fields: id, name,
  deductionPoints(number 1–100), active(boolean), createdAt, updatedAt. No NestJS or TypeORM
  imports.

- [x] T004 [P] Write `TrustScore` domain entity in
  `src/trust-report/domain/entities/trust-score.ts` — pure TypeScript class, fields: accountId,
  score(number 0–100), gameLockedUntil(Date|null), lastRecoveryDate(string|null, YYYY-MM-DD),
  updatedAt. No NestJS or TypeORM imports.

- [x] T005 [P] Write all domain error classes in `src/trust-report/domain/errors/index.ts`:
  `SelfReportError`, `AccountNotFoundError`, `ReportTypeNotFoundError`,
  `ReportTypeInactiveError`, `ReportNotFoundError`, `ReportAlreadyResolvedError`,
  `ReportTypeNameTakenError`. Each extends a base `DomainError` with a `code` string property
  (use the error-code strings from `contracts/http-api.md`).

- [x] T006 [P] Write the five port interfaces in `src/trust-report/domain/ports/`:
  - `report.repository.port.ts` — `IReportRepositoryPort`: `save(report: Report): Promise<Report>`,
    `findById(id: string): Promise<Report | null>`,
    `findByStatusPaginated(status: ReportStatus, cursor: {submittedAt: Date; id: string} | undefined, limit: number): Promise<Report[]>`,
    `update(id: string, fields: Partial<Pick<Report, 'status' | 'appliedPoints' | 'resolvedAt' | 'resolvedBy'>>): Promise<Report>`
  - `report-type.repository.port.ts` — `IReportTypeRepositoryPort`: `findAllActive(): Promise<ReportType[]>`,
    `findById(id: string, includeInactive?: boolean): Promise<ReportType | null>`,
    `save(data: Omit<ReportType, 'id' | 'createdAt' | 'updatedAt'>): Promise<ReportType>`,
    `update(id: string, fields: Partial<Pick<ReportType, 'name' | 'deductionPoints' | 'active'>>): Promise<ReportType>`,
    `findAll(): Promise<ReportType[]>`
  - `trust-score.repository.port.ts` — `ITrustScoreRepositoryPort`:
    `applyDeduction(accountId: string, points: number): Promise<{oldScore: number; newScore: number; gameLockedUntil: Date | null}>`,
    `findByAccountId(accountId: string): Promise<TrustScore | null>`,
    `initByAccountId(accountId: string): Promise<void>`,
    `dailyRecovery(accountId: string): Promise<{newScore: number} | null>`
  - `account-existence.port.ts` — `IAccountExistencePort`: `exists(accountId: string): Promise<boolean>`
  - `event-publisher.port.ts` — `IEventPublisherPort`:
    `publishTrustScoreAlert(recipientId: string, content: string, referenceId?: string): Promise<void>`

- [x] T007 [P] Write `ReportTypeOrmEntity` in
  `src/trust-report/infrastructure/persistence/typeorm-entities/report-type.orm-entity.ts` —
  `@Entity({ schema: 'trust_report', name: 'report_types' })`, columns: id(PrimaryGeneratedColumn uuid),
  name(unique), deductionPoints(int, column name `deduction_points`), active(bool default true),
  createdAt(`@CreateDateColumn`), updatedAt(`@UpdateDateColumn`). Add CHECK constraint
  `deduction_points BETWEEN 1 AND 100` in the migration (not here).

- [x] T008 [P] Write `ReportOrmEntity` in
  `src/trust-report/infrastructure/persistence/typeorm-entities/report.orm-entity.ts` —
  `@Entity({ schema: 'trust_report', name: 'reports' })`, columns: id(uuid PK), reporterId(uuid),
  reportedUserId(uuid), reportTypeId(uuid), context(text), status(enum ReportStatus, default PENDING),
  appliedPoints(int nullable), submittedAt(`@CreateDateColumn`), resolvedAt(timestamptz nullable),
  resolvedBy(uuid nullable). CHECK constraint `reporter_id != reported_user_id` goes in migration.

- [x] T009 [P] Write `TrustScoreOrmEntity` in
  `src/trust-report/infrastructure/persistence/typeorm-entities/trust-score.orm-entity.ts` —
  `@Entity({ schema: 'trust_report', name: 'trust_scores' })`, columns: accountId(PrimaryColumn uuid),
  score(int default 100), gameLockedUntil(timestamptz nullable), lastRecoveryDate(date nullable),
  updatedAt(`@UpdateDateColumn`). CHECK constraint `score BETWEEN 0 AND 100` goes in migration.

- [x] T010 Write migration `src/database/migrations/1751200000000-CreateTrustReportSchema.ts`
  with these 5 operations in order:
  1. `CREATE SCHEMA IF NOT EXISTS trust_report`
  2. Create `trust_report.report_types` — columns per T007, `UNIQUE(name)`,
     `CHECK (deduction_points BETWEEN 1 AND 100)`, `CREATE INDEX … WHERE active = true`
  3. Create `trust_report.reports` — columns per T008,
     `CHECK (reporter_id != reported_user_id)`,
     `CREATE INDEX … WHERE status = 'pending'`,
     `CREATE INDEX ON reports(reported_user_id)`
  4. Create `trust_report.trust_scores` — columns per T009,
     `CHECK (score BETWEEN 0 AND 100)`
  5. Seed two default active report types:
     `INSERT INTO trust_report.report_types(id, name, deduction_points) VALUES (gen_random_uuid(), 'cheating', 20), (gen_random_uuid(), 'harassment', 10)`

- [x] T011 [P] Promote `PlatformAdminGuard` to `shared-auth`:
  - Copy `src/account-social/interface/guards/platform-admin.guard.ts` →
    `src/shared-auth/platform-admin.guard.ts` (verify it is a stateless `CanActivate` checking
    `request.user.isPlatformAdmin === true`; remove or replace the import of its previous location)
  - Add `PlatformAdminGuard` to `exports` array in `src/shared-auth/shared-auth.module.ts`
  - Remove or re-export `PlatformAdminGuard` from `src/account-social/` to avoid breaking
    existing account-social consumers (keep a re-export if other account-social code imports it
    internally)

- [x] T012 Add `auth.request-authenticated` fire-and-forget emit to `src/shared-auth/jwt-auth.guard.ts`:
  after successful `super.canActivate(context)` and payload extraction, add
  `this.eventEmitter.emit('auth.request-authenticated', { accountId: payload.sub, occurredAt: new Date() })`
  **without `await`** — inject `EventEmitter2` via constructor. Do not change any existing logic.

- [x] T013 Bootstrap `TrustReportModule` and register with `AppModule`:
  - Create `src/trust-report/trust-report.module.ts` with:
    `TypeOrmModule.forFeature([ReportTypeOrmEntity, ReportOrmEntity, TrustScoreOrmEntity])`,
    import `SharedAuthModule` (for `JwtAuthGuard`, `PlatformAdminGuard`),
    import `AccountSocialModule` (for `AccountExistenceService`) — no controllers or providers yet
  - Add `TrustReportModule` to `imports` in `src/app.module.ts`

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 — Player Reports Another User (Priority: P1) 🎯 MVP

**Goal**: A player can browse active report types and submit a report against another user; the
report is persisted in `pending` status with full audit trail.

**Independent Test**:
1. `GET /report-types` with a valid JWT → `200 OK`, list contains the two seeded types, no
   `deductionPoints` field exposed.
2. `POST /reports` with valid body (reportedUserId ≠ reporterId, active reportTypeId, context
   1–2000 chars) → `201 Created`, `status: "pending"`.
3. `POST /reports` with `reportedUserId = own accountId` → `400 SELF_REPORT_NOT_ALLOWED`.
4. `POST /reports` with `reportedUserId` of a non-existent account → `404 ACCOUNT_NOT_FOUND`.
5. `POST /reports` with an inactive `reportTypeId` → `422 REPORT_TYPE_INACTIVE`.

### Implementation for User Story 1

- [x] T014 [P] [US1] Create `ReportTypeOrmRepository` implementing `IReportTypeRepositoryPort`
  in `src/trust-report/infrastructure/persistence/report-type.typeorm-repository.ts` — implement
  only `findAllActive()` (WHERE active = true, ORDER BY name) and `findById(id, includeInactive=false)`
  (returns null if not found, or if active=false and includeInactive=false).

- [x] T015 [P] [US1] Create `AccountExistenceAdapter` implementing `IAccountExistencePort` in
  `src/trust-report/infrastructure/persistence/account-existence.adapter.ts` — inject
  `AccountExistenceService` from `account-social` module, delegate `exists()` call to it.

- [x] T016 [P] [US1] Create `ReportOrmRepository` implementing `IReportRepositoryPort` in
  `src/trust-report/infrastructure/persistence/report.typeorm-repository.ts` — implement only
  `save(report: Report): Promise<Report>` for now (convert domain → ORM entity, insert, convert
  back). Leave other methods as stubs throwing `NotImplementedError` until Phase 4.

- [x] T017 [P] [US1] Create `ListReportTypesUseCase` (player-facing) in
  `src/trust-report/application/queries/list-report-types.use-case.ts` — calls
  `IReportTypeRepositoryPort.findAllActive()`, returns `Array<{id: string; name: string}>` (no
  `deductionPoints` — omit it at this layer).

- [x] T018 [US1] Create `SubmitReportUseCase` in
  `src/trust-report/application/commands/submit-report.use-case.ts` with this logic in order:
  1. If `command.reporterId === command.reportedUserId` → throw `SelfReportError`
  2. `IAccountExistencePort.exists(reportedUserId)` → if false → throw `AccountNotFoundError`
  3. `IReportTypeRepositoryPort.findById(reportTypeId)` → if null → throw `ReportTypeNotFoundError`
  4. If found but `active === false` → throw `ReportTypeInactiveError`
  5. `IReportRepositoryPort.save(new Report(...))` → return saved Report

- [x] T019 [P] [US1] Write player-facing DTOs:
  - `src/trust-report/interface/dto/player-report-type.dto.ts` — `{ id: string; name: string }`
  - `src/trust-report/interface/dto/submit-report.dto.ts` — `reportedUserId` (IsUUID),
    `reportTypeId` (IsUUID), `context` (IsString, MinLength 1, MaxLength 2000)
  - `src/trust-report/interface/dto/submit-report-response.dto.ts` — `{ id, reportedUserId, reportTypeId, context, status, submittedAt }`
    (no `reporterId` per contract)

- [x] T020 [US1] Create `ReportTypesController` in
  `src/trust-report/interface/http/report-types.controller.ts` — `@Controller('report-types')`,
  `@UseGuards(JwtAuthGuard)`, single `GET /` handler calling `ListReportTypesUseCase`, return
  `{ items: PlayerReportTypeDto[] }`.

- [x] T021 [US1] Create `ReportsController` in
  `src/trust-report/interface/http/reports.controller.ts` — `@Controller('reports')`,
  `@UseGuards(JwtAuthGuard)`, single `POST /` handler: extract `accountId` from
  `request.user.sub` as `reporterId`, call `SubmitReportUseCase`, map domain errors to HTTP
  (`SelfReportError → 400`, `AccountNotFoundError → 404`, `ReportTypeNotFoundError → 404`,
  `ReportTypeInactiveError → 422`), return `201 Created` with `SubmitReportResponseDto`.

- [x] T022 [US1] Register US1 providers in `src/trust-report/trust-report.module.ts`:
  add `ReportTypesController`, `ReportsController` to `controllers`; add
  `ReportTypeOrmRepository`, `ReportOrmRepository`, `AccountExistenceAdapter`,
  `ListReportTypesUseCase`, `SubmitReportUseCase` to `providers`, binding repository tokens to
  port injection tokens.

**Checkpoint**: US1 fully functional and independently testable. Foundation + US1 = MVP.

---

## Phase 4: User Story 2 — Admin Reviews and Confirms a Report (Priority: P2)

**Goal**: A Platform Admin can list pending reports and confirm each as valid (triggers trust-score
deduction + threshold/lockout notifications) or invalid (no score change). A confirmed report
cannot be re-reviewed.

**Independent Test**:
1. `GET /admin/reports?status=pending` with admin JWT → list includes the report from US1.
2. `PATCH /admin/reports/{id}/confirm` body `{ "decision": "valid" }` → `200 OK`,
   `status: "valid"`, `appliedPoints` equals the report type's `deductionPoints`,
   `reportedUserTrustScore.score = 100 - appliedPoints`.
3. `PATCH /admin/reports/{id}/confirm` body `{ "decision": "invalid" }` → `200 OK`,
   `status: "invalid"`, no `reportedUserTrustScore`.
4. Confirm the same report a second time → `409 REPORT_ALREADY_RESOLVED`.
5. `GET /admin/reports?status=pending` (non-admin JWT) → `403 Forbidden`.

### Implementation for User Story 2

- [x] T023 [P] [US2] Create `TrustScoreOrmRepository` implementing `ITrustScoreRepositoryPort` in
  `src/trust-report/infrastructure/persistence/trust-score.typeorm-repository.ts` — implement:
  - `applyDeduction(accountId, points)`: execute the CTE atomic SQL from `data-model.md §1`
    (WITH prev AS (SELECT score …) UPDATE … SET score = GREATEST(0, score - $2), game_locked_until =
    CASE WHEN GREATEST(0,score-$2)=0 THEN now()+interval '7 days' ELSE game_locked_until END
    WHERE account_id = $1 RETURNING old_score, score AS new_score, game_locked_until);
    return `{ oldScore, newScore, gameLockedUntil }`
  - `findByAccountId(accountId)`: SELECT * FROM trust_scores WHERE account_id = $1, return mapped
    TrustScore domain entity or null
  - Leave `initByAccountId` and `dailyRecovery` as stubs for Phase 7 (US5)

- [x] T024 [P] [US2] Extend `ReportOrmRepository` in
  `src/trust-report/infrastructure/persistence/report.typeorm-repository.ts` — implement:
  - `findById(id)`: SELECT by PK, return Report | null
  - `findByStatusPaginated(status, cursor?, limit)`: WHERE status = $1
    AND (cursor IS NULL OR (submitted_at, id) < (cursor.submittedAt, cursor.id))
    ORDER BY submitted_at DESC, id DESC LIMIT $limit; implements both-or-neither cursor rule
  - `update(id, fields)`: UPDATE reports SET ... WHERE id = $1 RETURNING *

- [x] T025 [P] [US2] Create `EventPublisherAdapter` implementing `IEventPublisherPort` in
  `src/trust-report/infrastructure/events/event-publisher.adapter.ts` — inject `EventEmitter2`,
  implement `publishTrustScoreAlert(recipientId, content, referenceId?)` by calling
  `this.eventEmitter.emit('notification.trust-score-alert', { recipientId, content, referenceId })`

- [x] T026 [US2] Create `ReviewReportUseCase` in
  `src/trust-report/application/commands/review-report.use-case.ts`:
  1. `IReportRepositoryPort.findById(id)` → if null → throw `ReportNotFoundError`
  2. If `report.status !== PENDING` → throw `ReportAlreadyResolvedError`
  3. If `decision === 'valid'`:
     a. Fetch `reportType = IReportTypeRepositoryPort.findById(report.reportTypeId, true)` to
        get `deductionPoints` (current value at confirmation time, snapshotted per FR-010;
        `includeInactive = true` so a since-deactivated type can still be fetched)
     b. **Single atomic write** — set status and appliedPoints in ONE call with no null window:
        `IReportRepositoryPort.update(id, { status: 'valid', appliedPoints: deductionPoints, resolvedAt: new Date(), resolvedBy: adminId })`
     c. `{ oldScore, newScore, gameLockedUntil } = ITrustScoreRepositoryPort.applyDeduction(report.reportedUserId, deductionPoints)`
     d. For each threshold t in [50, 20, 10]: if `oldScore >= t && newScore < t` →
        `IEventPublisherPort.publishTrustScoreAlert(report.reportedUserId, \`Your trust score dropped below ${t}.\`, id)`
     e. If `newScore === 0` →
        `IEventPublisherPort.publishTrustScoreAlert(report.reportedUserId, "Your account is locked from game participation for 7 days.", id)`
  4. If `decision === 'invalid'`:
     Single write: `IReportRepositoryPort.update(id, { status: 'invalid', appliedPoints: null, resolvedAt: new Date(), resolvedBy: adminId })`
  5. Return updated Report + (if `decision === 'valid'`) trust score snapshot
     `{ score: newScore, locked: gameLockedUntil !== null && gameLockedUntil > new Date(), lockedUntil: gameLockedUntil }`

- [x] T027 [US2] Create `ListReportsUseCase` (admin) in
  `src/trust-report/application/queries/list-reports.use-case.ts` — accepts `{ status, cursor?, limit }`,
  delegates to `IReportRepositoryPort.findByStatusPaginated`, returns
  `{ items: Report[], nextCursor: {submittedAt, id} | null }` (nextCursor is last item's cursor
  or null if items < limit).

- [x] T028 [P] [US2] Write admin report DTOs:
  - `src/trust-report/interface/dto/admin-report-entry.dto.ts` — full admin view:
    id, reporterId, reportedUserId, reportTypeId, context, status, appliedPoints, submittedAt,
    resolvedAt, resolvedBy
  - `src/trust-report/interface/dto/admin-list-reports-response.dto.ts` —
    `{ items: AdminReportEntryDto[], nextCursor: { submittedAt: string; id: string } | null }`
  - `src/trust-report/interface/dto/review-report.dto.ts` — `{ decision: 'valid' | 'invalid' }`
    (IsIn validator)
  - `src/trust-report/interface/dto/trust-score-snapshot.dto.ts` — `{ score: number; locked: boolean; lockedUntil: Date | null }`

- [x] T029 [US2] Create `AdminReportsController` in
  `src/trust-report/interface/http/admin/admin-reports.controller.ts` —
  `@Controller('admin/reports')`, `@UseGuards(JwtAuthGuard, PlatformAdminGuard)`:
  - `GET /` — `status` query param (default 'pending'), `limit` (default 20, max 50),
    `cursorSubmittedAt` + `cursorId` (both-or-neither: if exactly one present → throw
    `BadRequestException`); call `ListReportsUseCase`; return `AdminListReportsResponseDto`
  - `PATCH /:id/confirm` — call `ReviewReportUseCase`; map `ReportNotFoundError → 404`,
    `ReportAlreadyResolvedError → 409`; return `200` with report fields +
    `reportedUserTrustScore` (only when `decision = 'valid'`)

- [x] T030 [US2] Register US2 providers in `src/trust-report/trust-report.module.ts`:
  add `AdminReportsController` to `controllers`; add `TrustScoreOrmRepository`,
  `EventPublisherAdapter`, `ReviewReportUseCase`, `ListReportsUseCase` to `providers`, binding
  to port tokens.

**Checkpoint**: US1 + US2 fully functional. Threshold warnings (US4) fire automatically through
the event publisher already wired in ReviewReportUseCase.

---

## Phase 5: User Story 3 — Admin Manages Report Types (Priority: P3)

**Goal**: A Platform Admin can create, edit, and soft-delete report types without a code deploy.
New types are immediately available to players. Deactivated types are no longer selectable.

**Independent Test**:
1. `POST /admin/report-types { "name": "toxicity", "deductionPoints": 15 }` → `201 Created`.
2. `GET /report-types` (player) → "toxicity" now appears.
3. `PATCH /admin/report-types/{id} { "deductionPoints": 25 }` → `200 OK`, updated value.
4. `PATCH /admin/report-types/{id}` with empty body → `400 Bad Request`.
5. `DELETE /admin/report-types/{id}` → `204 No Content`; calling DELETE again → `204` (idempotent).
6. `GET /report-types` (player) → "toxicity" no longer appears.
7. `GET /admin/report-types` → "toxicity" still listed with `active: false`.
8. `POST /admin/report-types { "name": "cheating" }` (duplicate) → `409 REPORT_TYPE_NAME_TAKEN`.

### Implementation for User Story 3

- [x] T031 [P] [US3] Extend `ReportTypeOrmRepository` in
  `src/trust-report/infrastructure/persistence/report-type.typeorm-repository.ts` — add:
  - `save(data)`: INSERT, check UNIQUE constraint (catch DB unique-violation and rethrow as
    `ReportTypeNameTakenError`), return created ReportType
  - `update(id, fields)`: UPDATE partial fields, check name uniqueness if name provided
    (rethrow as `ReportTypeNameTakenError`), return updated ReportType; throw
    `ReportTypeNotFoundError` if id not found
  - `findById(id, includeInactive=false)`: already exists from T014 — ensure `includeInactive=true`
    path works (no WHERE active = true filter)
  - `findAll()`: SELECT all including inactive, ORDER BY created_at ASC

- [x] T032 [P] [US3] Create `CreateReportTypeUseCase` in
  `src/trust-report/application/commands/create-report-type.use-case.ts` — validate that
  `deductionPoints` is 1–100 (throw `DomainError` 'INVALID_DEDUCTION_POINTS' if not), call
  `IReportTypeRepositoryPort.save({ name, deductionPoints, active: true })`, propagate
  `ReportTypeNameTakenError` (handled in controller as 409).

- [x] T033 [P] [US3] Create `UpdateReportTypeUseCase` in
  `src/trust-report/application/commands/update-report-type.use-case.ts` — if fields object is
  empty (no keys) throw a `DomainError` 'EMPTY_UPDATE'; if `deductionPoints` provided validate
  1–100; call `IReportTypeRepositoryPort.update(id, fields)`; propagate
  `ReportTypeNotFoundError` (→ 404) and `ReportTypeNameTakenError` (→ 409).

- [x] T034 [P] [US3] Create `DeactivateReportTypeUseCase` in
  `src/trust-report/application/commands/deactivate-report-type.use-case.ts` — call
  `IReportTypeRepositoryPort.findById(id, true)`: if null throw `ReportTypeNotFoundError`;
  if already inactive return without error (idempotent); otherwise call
  `IReportTypeRepositoryPort.update(id, { active: false })`.

- [x] T035 [P] [US3] Create `ListAllReportTypesUseCase` (admin) in
  `src/trust-report/application/queries/list-all-report-types.use-case.ts` — calls
  `IReportTypeRepositoryPort.findAll()`, returns full `ReportType[]` including `deductionPoints`
  and `active` fields.

- [x] T036 [P] [US3] Write admin report-type DTOs:
  - `src/trust-report/interface/dto/admin-report-type.dto.ts` — full admin view:
    id, name, deductionPoints, active, createdAt, updatedAt
  - `src/trust-report/interface/dto/create-report-type.dto.ts` — `name` (IsString, not empty),
    `deductionPoints` (IsInt, Min 1, Max 100)
  - `src/trust-report/interface/dto/update-report-type.dto.ts` — all optional (PartialType or
    manual optionals: `name?`, `deductionPoints?` (IsInt Min 1 Max 100 if present), `active?`
    boolean)

- [x] T037 [US3] Create `AdminReportTypesController` in
  `src/trust-report/interface/http/admin/admin-report-types.controller.ts` —
  `@Controller('admin/report-types')`, `@UseGuards(JwtAuthGuard, PlatformAdminGuard)`:
  - `GET /` → `ListAllReportTypesUseCase`, return `{ items: AdminReportTypeDto[] }`
  - `POST /` → `CreateReportTypeUseCase`; map `ReportTypeNameTakenError → 409`; return `201`
  - `PATCH /:id` → `UpdateReportTypeUseCase`; map empty-update `DomainError → 400`,
    `ReportTypeNotFoundError → 404`, `ReportTypeNameTakenError → 409`; return `200`
  - `DELETE /:id` → `DeactivateReportTypeUseCase`; map `ReportTypeNotFoundError → 404`;
    return `204 No Content`

- [x] T038 [US3] Register US3 providers in `src/trust-report/trust-report.module.ts`:
  add `AdminReportTypesController` to `controllers`; add `CreateReportTypeUseCase`,
  `UpdateReportTypeUseCase`, `DeactivateReportTypeUseCase`, `ListAllReportTypesUseCase` to
  `providers`.

**Checkpoint**: US1 + US2 + US3 all independently functional.

---

## Phase 6: User Story 4 — Trust-Score Threshold Warnings (Priority: P4)

**Goal**: Players can view their own trust score. Threshold warning notifications already fire
automatically from `ReviewReportUseCase` + `EventPublisherAdapter` (built in US2). This phase
exposes the score to the player via `GET /trust-score/me`.

**Independent Test**:
1. After a confirmed-valid report reduces player B's score below 50: `GET /trust-score/me` with
   B's token → `score < 50`.
2. Drive score to 45 (crosses 50), then to 40 (no new threshold): verify only one notification
   for the 50 milestone (notification module already validates this — trust-report side already
   emits correctly from US2).
3. `GET /trust-score/me` without a JWT → `401 Unauthorized`.

### Implementation for User Story 4

- [x] T039 [P] [US4] Create `GetTrustScoreUseCase` in
  `src/trust-report/application/queries/get-trust-score.use-case.ts` — calls
  `ITrustScoreRepositoryPort.findByAccountId(accountId)`; if row is null (missing initialization
  event edge case) returns `{ score: 100, gameLockedUntil: null, lastRecoveryDate: null }` as
  safe default (per `contracts/http-api.md §GET /trust-score/me`); computes
  `locked = gameLockedUntil !== null && gameLockedUntil > new Date()`.

- [x] T040 [P] [US4] Write `TrustScoreResponseDto` in
  `src/trust-report/interface/dto/trust-score-response.dto.ts` —
  `{ score: number; locked: boolean; lockedUntil: Date | null }`.

- [x] T041 [US4] Create `TrustScoreController` in
  `src/trust-report/interface/http/trust-score.controller.ts` —
  `@Controller('trust-score')`, `@UseGuards(JwtAuthGuard)`:
  single `GET /me` handler — extract `accountId` from `request.user.sub`, call
  `GetTrustScoreUseCase`, return `TrustScoreResponseDto` with `200 OK`.

- [x] T042 [US4] Register US4 providers in `src/trust-report/trust-report.module.ts`:
  add `TrustScoreController` to `controllers`; add `GetTrustScoreUseCase` to `providers`.

**Checkpoint**: US1 + US2 + US3 + US4 all independently functional.

---

## Phase 7: User Story 5 — Lockout and Daily Recovery (Priority: P5)

**Goal**: Every new account gets a trust-score row initialized at 100. When score hits 0, game
participation is locked for 7 days (lock logic is already in the atomic SQL from US2). After
the lock expires, each calendar day the user makes any authenticated request, the score recovers
+1. The module exports `ITrustStatusPort` for future game modules.

**Independent Test**:
1. Register a new account → `GET /trust-score/me` immediately → `score: 100, locked: false`.
2. Drive score to 0 via confirmed reports → `locked: true`, `lockedUntil ≈ now + 7 days`.
3. Advance `game_locked_until` to the past in the test DB; make any authenticated request on a
   new calendar day → `GET /trust-score/me` shows score + 1.
4. Make a second authenticated request the same calendar day → score unchanged (FR-019).
5. Confirm another report while locked → `lockedUntil` resets to now + 7 days from this
   confirmation (already handled in US2's atomic SQL — verify via GET /trust-score/me).

### Implementation for User Story 5

- [x] T043 [US5] Edit `src/account-social/application/commands/login-with-google.use-case.ts` —
  the first-time creation branch is `if (!account) { account = await this.accountRepo.save({...}); }`
  (currently lines 29–34). After `this.accountRepo.save(...)` resolves, still inside the
  `if (!account)` block, add a fire-and-forget emit:
  `this.eventEmitter.emit('account-social.account-created', { accountId: account.id })`
  **without `await`**. Do NOT place the emit below the closing `}` of the `if` block — it must
  only fire on first-time creation, not on repeat logins. Add `EventEmitter2` to the constructor:
  `private readonly eventEmitter: EventEmitter2` (import from `@nestjs/event-emitter`).

- [x] T044 [P] [US5] Create `AccountCreatedListener` in
  `src/trust-report/infrastructure/events/account-created.listener.ts` —
  `@Injectable()` class with `@OnEvent('account-social.account-created')` method that calls
  `InitializeTrustScoreUseCase.execute({ accountId })`.

- [x] T045 [P] [US5] Create `InitializeTrustScoreUseCase` in
  `src/trust-report/application/commands/initialize-trust-score.use-case.ts` — calls
  `ITrustScoreRepositoryPort.initByAccountId(accountId)`; idempotent by design (ON CONFLICT DO
  NOTHING); no error thrown if row already exists.

- [x] T046 [US5] Extend `TrustScoreOrmRepository` in
  `src/trust-report/infrastructure/persistence/trust-score.typeorm-repository.ts` — implement
  the two remaining stubs:
  - `initByAccountId(accountId)`: execute
    `INSERT INTO trust_report.trust_scores (account_id, score, game_locked_until, last_recovery_date) VALUES ($1, 100, NULL, NULL) ON CONFLICT (account_id) DO NOTHING`
  - `dailyRecovery(accountId)`: execute the daily-recovery SQL from `data-model.md §2`:
    `UPDATE trust_report.trust_scores SET score = LEAST(100, score + 1), last_recovery_date = CURRENT_DATE WHERE account_id = $1 AND game_locked_until IS NOT NULL AND game_locked_until <= now() AND (last_recovery_date IS NULL OR last_recovery_date < CURRENT_DATE) RETURNING score`
    — if 0 rows updated (lock not yet expired, or no lock, or already recovered today) return
    null; otherwise return `{ newScore: row.score }`

- [x] T047 [P] [US5] Create `RequestAuthenticatedListener` in
  `src/trust-report/infrastructure/events/request-authenticated.listener.ts` —
  `@Injectable()` class with `@OnEvent('auth.request-authenticated')` method that calls
  `RecordDailyRecoveryUseCase.execute({ accountId })`. This is invoked on every authenticated
  request; the use-case's WHERE clause ensures it's a cheap no-op on all but the first qualifying
  call each calendar day.

- [x] T048 [P] [US5] Create `RecordDailyRecoveryUseCase` in
  `src/trust-report/application/commands/record-daily-recovery.use-case.ts` — calls
  `ITrustScoreRepositoryPort.dailyRecovery(accountId)`; if null (no eligible row or already
  applied today), does nothing. No event emitted for recovery increments (recovery is not
  alert-worthy per `contracts/domain-events.md`).

- [x] T049 [US5] Create `TrustStatusAdapter` implementing `ITrustStatusPort` in
  `src/trust-report/infrastructure/lock-status/trust-status.adapter.ts` —
  `isLocked(accountId): Promise<{locked: boolean; until: Date | null}>` calls
  `ITrustScoreRepositoryPort.findByAccountId(accountId)`, returns
  `{ locked: row?.gameLockedUntil != null && row.gameLockedUntil > new Date(), until: row?.gameLockedUntil ?? null }`.

- [x] T050 [US5] Register US5 providers + export ITrustStatusPort in
  `src/trust-report/trust-report.module.ts`:
  add `AccountCreatedListener`, `RequestAuthenticatedListener`, `InitializeTrustScoreUseCase`,
  `RecordDailyRecoveryUseCase`, `TrustStatusAdapter` to `providers`; add `TrustStatusAdapter`
  (with injection token `ITrustStatusPort`) to `exports` so future game modules can call
  `isLocked()`.

**Checkpoint**: All 5 user stories fully functional and independently testable.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: OpenAPI documentation (required by Constitution §VI) + end-to-end validation.

- [ ] T051 [P] Add `@ApiProperty` to every field in all DTO classes in
  `src/trust-report/interface/dto/` (player-report-type.dto.ts, submit-report.dto.ts,
  submit-report-response.dto.ts, admin-report-entry.dto.ts, admin-list-reports-response.dto.ts,
  review-report.dto.ts, trust-score-snapshot.dto.ts, trust-score-response.dto.ts,
  admin-report-type.dto.ts, create-report-type.dto.ts, update-report-type.dto.ts). Include
  `type`, `example`, `nullable`, and `required` metadata on each decorator.

- [ ] T052 [P] Add `@ApiOperation`, `@ApiResponse` (for each distinct HTTP status), and
  `@ApiBearerAuth` to every controller handler across all 5 controller files:
  `src/trust-report/interface/http/report-types.controller.ts`,
  `src/trust-report/interface/http/reports.controller.ts`,
  `src/trust-report/interface/http/trust-score.controller.ts`,
  `src/trust-report/interface/http/admin/admin-reports.controller.ts`,
  `src/trust-report/interface/http/admin/admin-report-types.controller.ts`.
  Cover all success and error responses listed in `contracts/http-api.md`.

- [ ] T053 Run the project's Swagger generation script (e.g., `npm run swagger:generate` or
  equivalent from `package.json`) to regenerate `openapi.yml` at the repository root; commit
  the updated file as part of the trust-report PR (Constitution §VI requirement).

- [ ] T054 Start `docker-compose up -d` and run the 6 quickstart scenarios from
  `quickstart.md` (US1 submit, US2 valid confirm, US2 invalid confirm, US3 report-type CRUD,
  US4 threshold warnings, US5 lockout + recovery) using an HTTP client (Postman, curl, or
  Insomnia). Fix any divergence from the expected behavior before marking tasks complete.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately.
- **Phase 2 (Foundational)**: Depends on Phase 1. **BLOCKS all user stories.**
- **Phase 3 (US1)**: Depends on Phase 2 only. No dependency on other user stories.
- **Phase 4 (US2)**: Depends on Phase 2 + Phase 3 (requires reports to exist to review).
- **Phase 5 (US3)**: Depends on Phase 2 only. Can run in parallel with Phase 4.
- **Phase 6 (US4)**: Depends on Phase 4 (GetTrustScoreUseCase reads TrustScoreOrmRepository from US2).
- **Phase 7 (US5)**: Depends on Phase 4 (extends TrustScoreOrmRepository with initByAccountId + dailyRecovery).
- **Phase 8 (Polish)**: Depends on all story phases being complete.

### User Story Dependencies

| Story | Can start after | Depends on story |
|---|---|---|
| US1 (P1) | Phase 2 complete | None |
| US2 (P2) | Phase 2 complete | US1 (reports need to exist) |
| US3 (P3) | Phase 2 complete | None (independent) |
| US4 (P4) | Phase 4 complete | US2 (TrustScoreOrmRepository.findByAccountId from T023) |
| US5 (P5) | Phase 4 complete | US2 (extends TrustScoreOrmRepository from T023) |

### Files Modified Outside `trust-report/`

| Task | File | Change |
|---|---|---|
| T010 | `src/database/migrations/1751200000000-CreateTrustReportSchema.ts` | New migration |
| T011 | `src/shared-auth/platform-admin.guard.ts` | New (moved from account-social) |
| T011 | `src/shared-auth/shared-auth.module.ts` | Add PlatformAdminGuard to exports |
| T012 | `src/shared-auth/jwt-auth.guard.ts` | Add auth.request-authenticated emit |
| T013 | `src/app.module.ts` | Add TrustReportModule to imports |
| T043 | `src/account-social/application/commands/[oauth-use-case].ts` | Add account-created emit |

### Within-Phase Parallel Opportunities

**Phase 2**: T002–T009 + T011 are all [P] and can be written simultaneously (9 tasks in parallel).

**Phase 3 (US1)**: T014, T015, T016, T017, T019 are [P] (5 in parallel) → then T018 → then T020, T021 → then T022.

**Phase 4 (US2)**: T023, T024, T025, T028 are [P] (4 in parallel) → then T026, T027 → then T029 → then T030.

**Phase 5 (US3)**: T031–T036 are [P] (6 in parallel) → then T037 → then T038.

**Phase 6 (US4)**: T039, T040 are [P] → then T041 → then T042.

**Phase 7 (US5)**: T044, T045, T047, T048 are [P] (4 in parallel, can overlap with T043) → T046 → T049 → T050.

**Phase 8 (Polish)**: T051, T052 are [P] → then T053 → then T054.

---

## Parallel Example: Phase 2 (Foundational)

```bash
# Launch all 9 parallel foundational tasks together:
Task T002: domain entity Report          → src/trust-report/domain/entities/report.ts
Task T003: domain entity ReportType      → src/trust-report/domain/entities/report-type.ts
Task T004: domain entity TrustScore      → src/trust-report/domain/entities/trust-score.ts
Task T005: domain errors                 → src/trust-report/domain/errors/index.ts
Task T006: port interfaces (5 files)     → src/trust-report/domain/ports/
Task T007: ReportTypeOrmEntity           → src/trust-report/infrastructure/persistence/typeorm-entities/
Task T008: ReportOrmEntity               → src/trust-report/infrastructure/persistence/typeorm-entities/
Task T009: TrustScoreOrmEntity           → src/trust-report/infrastructure/persistence/typeorm-entities/
Task T011: PlatformAdminGuard promotion  → src/shared-auth/
# Then sequentially:
Task T010: Migration (depends on T007-T009)
Task T012: JWT auth event emit (depends on T011's module context)
Task T013: TrustReportModule + AppModule (depends on T010-T012)
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational (T002–T013) — **must fully complete before anything else**
3. Complete Phase 3: US1 (T014–T022)
4. **STOP and VALIDATE**: `GET /report-types` and `POST /reports` work end-to-end
5. Deploy/demo if ready

### Incremental Delivery

| Milestone | Phases | What's usable |
|---|---|---|
| MVP | 1 + 2 + 3 | Players can submit reports; seeded types visible |
| Admin review | + 4 | Admins can review; trust scores deducted; threshold warnings fire |
| Config management | + 5 | Admins can manage report types without deploy |
| Score visibility | + 6 | Players can see their own trust score |
| Full enforcement | + 7 | Lockout, recovery, ITrustStatusPort ready for game modules |
| PR-ready | + 8 | OpenAPI regenerated; all scenarios validated |

### Parallel Team Strategy

After Phase 2 completes:
- **Agent A**: US1 (Phase 3)
- **Agent B**: US3 (Phase 5) — independent of US1
- After Phase 3: **Agent A** continues to US2 (Phase 4); **Agent B** can continue to US5 (Phase 7) once Phase 4's TrustScoreOrmRepository (T023) exists

---

## Notes

- `[P]` tasks target different files and can be done simultaneously with no write conflicts
- `[USN]` label maps each task to a specific user story for traceability
- Each story's "Checkpoint" marks an independently testable increment
- The atomic SQL statements from `data-model.md` must be implemented verbatim in T023 and T046
  — do not simplify them; they encode ADR-TRUST-REPORT-002 compliance
- `TrustReportModule` is updated incrementally (T013, T022, T030, T038, T042, T050); each update
  registers only the providers introduced in that story's phase
- Quickstart validation (T054) is the acceptance gate — it tests all 6 end-to-end scenarios and
  all 5 user stories from `quickstart.md` against a real database
