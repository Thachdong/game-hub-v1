# Tasks: Game Admin Config (Caro)

**Input**: Design documents from `specs/004-game-admin-config/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/ ✅

**Tests**: Not requested — test tasks are excluded per spec. Validation is via quickstart.md scenarios.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Parallelizable — different files, no dependency on in-progress tasks
- **[Story]**: User story scope (US1 = Create config, US2 = Manage configs, US3 = Player list)
- Exact file paths included in every task

---

## Phase 1: Setup (Cross-Cutting Prerequisite)

**Purpose**: One blocking change in an existing module that must land before any new code can
rely on game-slug-based role verification. No new module files yet.

**Why first**: `GameAdminCaroGuard` (Phase 2) reads `gameAdminRoles` from the JWT. Currently
`findByAccountId` returns UUID strings; it must return slug strings (e.g. `'caro'`) so the
guard can check `gameAdminRoles.includes('caro')` without a DB lookup (Constitution III).

- [x] T001 Update `GameAdminRoleTypeOrmRepository.findByAccountId()` in
  `src/account-social/infrastructure/persistence/game-admin-role.typeorm-repository.ts`
  to JOIN `platform.games` and return game slugs instead of game UUIDs
  (see `data-model.md` "Cross-Cutting Change" for exact SQL)

**Checkpoint**: `gameAdminRoles` in issued JWTs now contains slug strings. Existing guards
are unaffected (no guard currently reads `gameAdminRoles`).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Domain layer, infrastructure adapter, guard, and DB migration — shared by all
three user stories. No story can be implemented until this phase is complete.

**⚠️ CRITICAL**: All user story phases depend on this phase being complete.

- [x] T002 Create migration `src/database/migrations/1751300000000-CreateCaroGameSchema.ts`
  — seeds `platform.games ('Caro', 'caro')`, creates `caro_game` schema, creates
  `game_configs` table with CHECK constraints, partial unique index
  `uq_game_configs_active_combo`, and active-filter index
  (see `data-model.md` "Database Schema" for full SQL)

- [x] T003 [P] Create domain entity `src/caro-game/domain/entities/game-config.ts`
  — `GameConfig` class with fields: `id`, `boardSize: BoardSize`, `moveTimeSeconds: MoveTimeSeconds`,
  `active`, `createdBy`, `createdAt`, `updatedAt`, `deactivatedBy | null`, `deactivatedAt | null`;
  export `BoardSize`, `MoveTimeSeconds` union types and `VALID_BOARD_SIZES`,
  `VALID_MOVE_TIMES` constant arrays

- [x] T004 [P] Create domain errors `src/caro-game/domain/errors/index.ts`
  — export `GameConfigNotFoundError`, `GameConfigDuplicateError`,
  `GameConfigInvalidBoardSizeError`, `GameConfigInvalidMoveTimeError`

- [x] T005 Create port interface `src/caro-game/domain/ports/game-config.repository.port.ts`
  — export `GAME_CONFIG_REPOSITORY_PORT` constant and `IGameConfigRepositoryPort` interface
  with methods: `findAllActive()`, `findAll()`, `findById(id)`, `findActiveByCombo(boardSize, moveTimeSeconds)`,
  `save(data)`, `update(id, fields)`, `deactivate(id, deactivatedBy)`, `reactivate(id)`
  (depends on T003)

- [x] T006 [P] Create TypeORM ORM entity
  `src/caro-game/infrastructure/persistence/typeorm-entities/game-config.orm-entity.ts`
  — `@Entity({ schema: 'caro_game', name: 'game_configs' })` with columns:
  `id (uuid PK)`, `boardSize (varchar)`, `moveTimeSeconds (int)`, `active (boolean, default true)`,
  `createdBy (uuid)`, `@CreateDateColumn createdAt`, `@UpdateDateColumn updatedAt`,
  `deactivatedBy (uuid, nullable)`, `deactivatedAt (timestamptz, nullable)`

- [x] T007 Create TypeORM repository
  `src/caro-game/infrastructure/persistence/game-config.typeorm-repository.ts`
  — `GameConfigTypeOrmRepository` implementing `IGameConfigRepositoryPort`;
  implement all 8 port methods; `deactivate()` uses atomic UPDATE with `SET active=false,
  deactivated_by=$2, deactivated_at=now()`; `reactivate()` uses atomic UPDATE with
  `SET active=true, deactivated_by=NULL, deactivated_at=NULL`; catch `QueryFailedError`
  code `23505` and throw `GameConfigDuplicateError`
  (depends on T005, T006)

- [x] T008 [P] Create guard `src/caro-game/interface/guards/game-admin-caro.guard.ts`
  — `GameAdminCaroGuard implements CanActivate`; reads
  `request.user?.gameAdminRoles as string[]`; throws `ForbiddenException` if
  `!gameAdminRoles?.includes('caro')`; follows `PlatformAdminGuard` pattern (zero DB calls)

**Checkpoint**: Migration, domain, infrastructure, and guard are ready. Run
`npm run migration:run` to apply schema. User story implementation can now begin.

---

## Phase 3: User Story 1 — Game Admin Creates a Configuration (Priority: P1) 🎯 MVP

**Goal**: A Game Admin (Caro) can create a new game configuration with a valid
`(boardSize, moveTimeSeconds)` pair. The new configuration immediately appears in the
player-facing list.

**Independent Test**: With a Game Admin JWT (`gameAdminRoles: ['caro']`):
`POST /admin/caro/game-configs` with `{"boardSize":"25x25","moveTimeSeconds":15}` → 201
with `AdminGameConfigDto`. Invalid values return 400. Duplicate active combos return 409.
See quickstart.md Scenarios 1–3.

- [x] T009 Create admin DTOs file `src/caro-game/interface/dto/admin-game-config.dto.ts`
  — `CreateGameConfigDto` (class-validator: `@IsIn(['18x18','25x25','40x40'])` on `boardSize`,
  `@IsIn([5,10,15,25,35,45,60])` on `moveTimeSeconds`);
  `AdminGameConfigDto` (Swagger `@ApiProperty` on all fields: `id`, `boardSize`,
  `moveTimeSeconds`, `active`, `createdBy`, `createdAt`, `updatedAt`, `deactivatedBy`,
  `deactivatedAt`);
  `AdminListGameConfigsResponseDto` wrapping `items: AdminGameConfigDto[]`

- [x] T010 Create `CreateGameConfigUseCase`
  `src/caro-game/application/commands/create-game-config.use-case.ts`
  — inject `IGameConfigRepositoryPort` via `@Inject(GAME_CONFIG_REPOSITORY_PORT)`;
  validate `boardSize` against `VALID_BOARD_SIZES` (throw `GameConfigInvalidBoardSizeError`);
  validate `moveTimeSeconds` against `VALID_MOVE_TIMES` (throw `GameConfigInvalidMoveTimeError`);
  call `repo.save({ boardSize, moveTimeSeconds, createdBy: actorId })`; let
  `GameConfigDuplicateError` propagate (DB partial unique index catches race conditions)
  (depends on T003, T004, T005)

- [x] T011 Create admin controller (US1 slice: POST only)
  `src/caro-game/interface/http/admin/admin-game-configs.controller.ts`
  — `@ApiTags('Admin — Caro Game Configs')`, `@ApiBearerAuth()`,
  `@UseGuards(JwtAuthGuard, GameAdminCaroGuard)`, `@Controller('admin/caro/game-configs')`;
  implement `@Post()` → calls `CreateGameConfigUseCase`, returns 201 with `AdminGameConfigDto`;
  add `@ApiOperation`, `@ApiResponse(201)`, `@ApiResponse(400)`, `@ApiResponse(401)`,
  `@ApiResponse(403)`, `@ApiResponse(409)` decorators
  (depends on T008, T009, T010)

- [x] T012 Scaffold `CaroGameModule` `src/caro-game/caro-game.module.ts`
  — `TypeOrmModule.forFeature([GameConfigOrmEntity])`, import `SharedAuthModule`;
  register `{ provide: GAME_CONFIG_REPOSITORY_PORT, useClass: GameConfigTypeOrmRepository }`;
  register `CreateGameConfigUseCase`; declare `AdminGameConfigsController`
  (depends on T006, T007, T010, T011)

- [x] T013 Register `CaroGameModule` in `src/app.module.ts` imports array
  (depends on T012)

**Checkpoint**: `POST /admin/caro/game-configs` is fully functional and testable end-to-end.
Run quickstart.md Scenarios 1–3 to validate.

---

## Phase 4: User Story 2 — Game Admin Edits or Deletes a Configuration (Priority: P2)

**Goal**: A Game Admin (Caro) can update (PATCH), deactivate (DELETE), reactivate (POST
/reactivate), and list all configurations including inactive ones (GET admin view).
Updates and deactivation do not affect ongoing games.

**Independent Test**: With the config created in US1:
- `GET /admin/caro/game-configs` → 200 with both active and inactive entries
- `PATCH /admin/caro/game-configs/:id` with `{"moveTimeSeconds":25}` → 200 updated config
- `DELETE /admin/caro/game-configs/:id` → 204; config disappears from player list but
  appears in admin list with `active: false`
- `POST /admin/caro/game-configs/:id/reactivate` → 200 active config
See quickstart.md Scenarios 5–7.

- [x] T014 [P] Create `ListAllGameConfigsUseCase`
  `src/caro-game/application/queries/list-all-game-configs.use-case.ts`
  — inject port; call `repo.findAll()`; return `GameConfig[]` ordered by `createdAt ASC`
  (depends on T005)

- [x] T015 [P] Create `UpdateGameConfigUseCase`
  `src/caro-game/application/commands/update-game-config.use-case.ts`
  — inject port; validate provided `boardSize` (if present) and `moveTimeSeconds` (if present)
  against valid enumerations; call `repo.findById(id)` (throw `GameConfigNotFoundError` if null);
  call `repo.update(id, fields)`; let `GameConfigDuplicateError` propagate
  (depends on T003, T004, T005)

- [x] T016 [P] Create `DeactivateGameConfigUseCase`
  `src/caro-game/application/commands/deactivate-game-config.use-case.ts`
  — inject port; call `repo.findById(id)` (throw `GameConfigNotFoundError` if null);
  call `repo.deactivate(id, actorId)` (atomic UPDATE: `active=false`, `deactivated_by`,
  `deactivated_at=now()`)
  (depends on T003, T004, T005)

- [x] T017 [P] Create `ReactivateGameConfigUseCase`
  `src/caro-game/application/commands/reactivate-game-config.use-case.ts`
  — inject port; call `repo.findById(id)` (throw `GameConfigNotFoundError` if null);
  call `repo.reactivate(id)` (atomic UPDATE: `active=true`, clear `deactivated_by/at`);
  let `GameConfigDuplicateError` propagate (partial unique index blocks duplicate active combos)
  (depends on T003, T004, T005)

- [x] T018 Add `UpdateGameConfigDto` to `src/caro-game/interface/dto/admin-game-config.dto.ts`
  — `@IsOptional()` + `@IsIn([...])` validators on both fields; add
  `@ApiProperty({ required: false })` decorators; at least one field required (add class-level
  validation or guard in use-case)
  (depends on T009)

- [x] T019 Extend admin controller with US2 endpoints in
  `src/caro-game/interface/http/admin/admin-game-configs.controller.ts`:
  `@Get()` → `ListAllGameConfigsUseCase` → 200 `AdminListGameConfigsResponseDto`;
  `@Patch(':id')` → `UpdateGameConfigUseCase` → 200 `AdminGameConfigDto`;
  `@Delete(':id')` → `DeactivateGameConfigUseCase` → 204 No Content;
  `@Post(':id/reactivate')` → `ReactivateGameConfigUseCase` → 200 `AdminGameConfigDto`;
  add all `@ApiOperation` / `@ApiResponse` decorators per `contracts/endpoints.md`
  (depends on T011, T014, T015, T016, T017, T018)

- [x] T020 Register US2 use-cases in `src/caro-game/caro-game.module.ts` providers array:
  `ListAllGameConfigsUseCase`, `UpdateGameConfigUseCase`, `DeactivateGameConfigUseCase`,
  `ReactivateGameConfigUseCase`
  (depends on T012, T014, T015, T016, T017)

**Checkpoint**: All six admin endpoints are functional. Run quickstart.md Scenarios 5–7 to
validate deactivation, audit fields, and reactivation with duplicate guard.

---

## Phase 5: User Story 3 — Player Browses Available Configurations (Priority: P3)

**Goal**: Any authenticated player can retrieve the list of currently active game
configurations to choose from when creating a new game. The list reflects deactivation
and reactivation immediately.

**Independent Test**: With a Player JWT (no Caro game-admin role):
`GET /caro/game-configs` → 200 with only `active: true` configs; each item exposes
only player-facing fields (`id`, `boardSize`, `moveTimeSeconds`, `createdAt`).
After deactivation → config absent. After reactivation → config present.
See quickstart.md Scenario 4.

- [x] T021 [P] Create player DTOs `src/caro-game/interface/dto/game-config.dto.ts`
  — `GameConfigDto` (`@ApiProperty` on: `id`, `boardSize`, `moveTimeSeconds`, `createdAt`;
  NO `active`, `createdBy`, `deactivatedBy` fields);
  `ListGameConfigsResponseDto` wrapping `items: GameConfigDto[]`

- [x] T022 [P] Create `ListActiveGameConfigsUseCase`
  `src/caro-game/application/queries/list-active-game-configs.use-case.ts`
  — inject port; call `repo.findAllActive()`; return `GameConfig[]` ordered by `createdAt ASC`
  (depends on T005)

- [x] T023 Create player controller
  `src/caro-game/interface/http/game-configs.controller.ts`
  — `@ApiTags('Caro — Game Configs')`, `@ApiBearerAuth()`,
  `@UseGuards(JwtAuthGuard)`, `@Controller('caro/game-configs')`;
  implement `@Get()` → calls `ListActiveGameConfigsUseCase`, maps to `GameConfigDto[]`,
  returns 200 `ListGameConfigsResponseDto`; add `@ApiOperation`, `@ApiResponse(200)`,
  `@ApiResponse(401)` decorators
  (depends on T021, T022)

- [x] T024 Register US3 providers in `src/caro-game/caro-game.module.ts`:
  add `ListActiveGameConfigsUseCase` to providers;
  add `GameConfigsController` to controllers
  (depends on T020, T022, T023)

**Checkpoint**: `GET /caro/game-configs` is functional. Run quickstart.md Scenario 4 to
validate player list. Verify deactivated configs are absent from the response.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Error-to-HTTP mapping, OpenAPI contract, and full end-to-end validation.

- [x] T025 Map `caro-game` domain errors to HTTP responses — register `GameConfigNotFoundError`
  → 404, `GameConfigDuplicateError` → 409, `GameConfigInvalidBoardSizeError` → 400,
  `GameConfigInvalidMoveTimeError` → 400 in `src/common/filters/global-exception.filter.ts`
  (or throw `HttpException` wrappers in the use-cases/controllers if the filter uses a
  whitelist approach — match the existing pattern in the codebase)

- [x] T026 Apply migration and verify schema: run `npm run migration:run`, confirm
  `caro_game.game_configs` table exists with correct columns, CHECK constraints, and
  partial unique index `uq_game_configs_active_combo`; confirm `platform.games` row
  `slug='caro'` is present

- [x] T027 Regenerate OpenAPI spec: run `npm run generate:openapi`, confirm `openapi.yml`
  at repository root includes all six `/caro/game-configs` and
  `/admin/caro/game-configs` endpoints with correct `@ApiOperation`, `@ApiResponse`,
  and DTO schemas; commit the updated `openapi.yml` as part of the PR

- [x] T028 Run end-to-end quickstart validation: execute all 9 scenarios in
  `specs/004-game-admin-config/quickstart.md` against the running local server and confirm
  each expected HTTP status and response shape is returned

**Checkpoint**: All constitution gates pass (see plan.md Constitution Check table),
`openapi.yml` committed, quickstart scenarios green. Feature is PR-ready.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 (T001) — **BLOCKS all user stories**
- **Phase 3 (US1)**: Depends on Phase 2 — MVP deliverable
- **Phase 4 (US2)**: Depends on Phase 2 (and builds on Phase 3 controller/module)
- **Phase 5 (US3)**: Depends on Phase 2 (independent of US1/US2 for new files)
- **Phase 6 (Polish)**: Depends on Phases 3–5 all complete

### User Story Dependencies

- **US1 (P1)**: Can start after Phase 2 — no dependency on US2 or US3
- **US2 (P2)**: Can start after Phase 2 — reuses admin controller created in US1 (T011/T019)
- **US3 (P3)**: Can start after Phase 2 — entirely independent new controller and use-case

### Within Each Phase — Internal Dependencies

**Phase 2**: T003 and T004 are parallel → T005 depends on T003 → T006 and T007 in parallel
after T005 → T008 parallel to T007

**Phase 3**: T009 → T010 (needs T003/T005) → T011 (needs T008/T009/T010) → T012 → T013

**Phase 4**: T014/T015/T016/T017 all parallel (different files, all depend on T005) →
T018 (extends T009 file) → T019 (depends on T011 + T014–T018) → T020

**Phase 5**: T021 and T022 parallel → T023 (depends on T021/T022) → T024

### Parallel Opportunities

```bash
# Phase 2 parallel group A (after T001):
T002  # migration
T003  # domain entity
T004  # domain errors
T008  # guard

# Phase 2 parallel group B (after T003):
T005  # port interface

# Phase 2 parallel group C (after T005):
T006  # ORM entity
T007  # TypeORM repository (wait for T006 too)

# Phase 4 parallel group (after Phase 2):
T014  # ListAllGameConfigs use-case
T015  # UpdateGameConfig use-case
T016  # DeactivateGameConfig use-case
T017  # ReactivateGameConfig use-case

# Phase 5 parallel group (after Phase 2):
T021  # player DTOs
T022  # ListActiveGameConfigs use-case
```

---

## Implementation Strategy

### MVP (User Story 1 only — T001–T013)

1. Complete Phase 1 (T001) — prerequisite change in account-social
2. Complete Phase 2 (T002–T008) — domain, infra, guard, migration
3. Complete Phase 3 (T009–T013) — US1: create config + app.module registration
4. **VALIDATE**: Run quickstart.md Scenarios 1–3 → `POST /admin/caro/game-configs` works
5. **STOP HERE for MVP demo if needed**

### Incremental Delivery

| Increment | Tasks | Deliverable |
|---|---|---|
| MVP | T001–T013 | Game Admin can create config; player list endpoint not yet available |
| + US2 | T014–T020 | Game Admin can update, deactivate, reactivate; admin management view |
| + US3 | T021–T024 | Player can browse active configs |
| + Polish | T025–T028 | Error mapping, OpenAPI spec, full validation |

### Single Developer Sequential Order

T001 → T002 → T003 → T004 → T005 → T006 → T007 → T008 → T009 → T010 → T011 → T012 →
T013 → T014 → T015 → T016 → T017 → T018 → T019 → T020 → T021 → T022 → T023 → T024 →
T025 → T026 → T027 → T028

---

## Notes

- [P] tasks operate on different files — safe to parallelize within the same phase
- `GameConfigTypeOrmRepository.deactivate()` and `reactivate()` MUST use atomic single-statement
  UPDATEs (Constitution Principle IV — no read-modify-write)
- `GameAdminCaroGuard` MUST NOT make any DB calls (Constitution Principle III)
- `CaroGameModule` MUST NOT import internal providers from other modules — only exported
  services (Constitution Principle II)
- Commit `openapi.yml` as part of this PR (Constitution Principle VI)
- The `gameAdminRoles` JWT change (T001) is non-breaking but triggers re-login for existing
  sessions to get slug-based tokens
