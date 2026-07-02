---

description: "Task list template for feature implementation"
---

# Tasks: Domain Service Layer for Backend Integration

**Input**: Design documents from `/specs/001-domain-service-layer/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Not explicitly requested in spec.md. A small set of unit tests is still included for
`service-core` (Phase 2) because research.md §8 commits to verifying the HOF's runtime
normalization and retry behavior — types alone can't check that, and every one of the ~50 service
functions in Phases 3–7 depends on this shared logic being correct. Per-endpoint contract tests
were intentionally left out to keep task count proportionate; add them later if desired.

**Organization**: Tasks are grouped by user story (from spec.md) to enable independent
implementation and testing of each of the five domain packages.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1–US5)
- Every task includes an exact file path

## Path Conventions

Turborepo monorepo, `packages/*` variant (see plan.md Project Structure) — no `apps/*` in this
feature. Six packages: `service-core`, `auth-service`, `account-service`, `profiles-service`,
`admin-service`, `caro-service`, each under `packages/<name>/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Scaffold the Turborepo monorepo itself — none of this exists yet in the workspace.

- [ ] T001 Create root Turborepo scaffolding: `package.json` (private, pnpm workspaces), `pnpm-workspace.yaml` (`packages: ["packages/*"]`), `turbo.json` (pipeline: `build`, `dev`, `lint`, `test`, `typecheck`), and `tsconfig.base.json` (strict mode, ES2022 target, NodeNext module) at the repository root
- [ ] T002 [P] Configure root-level shared ESLint + Prettier config at the repository root (`.eslintrc.cjs` or `eslint.config.js`, `.prettierrc`)
- [ ] T003 [P] Add root `.gitignore` entries for `node_modules/`, `dist/`, `.turbo/` if not already present
- [ ] T004 [P] Scaffold `packages/service-core/package.json` (name `@game-hub/service-core`, `main`/`types`/`exports` entries, `axios` dependency, `typescript` + `vitest` devDependencies, extends root `tsconfig.base.json` via `packages/service-core/tsconfig.json`)
- [ ] T005 [P] Scaffold `packages/auth-service/package.json` (name `@game-hub/auth-service`, dependency on `@game-hub/service-core` via `workspace:*`, `exports` map with a `.` entry for `client.ts`/`types.ts` and a `./bff` entry for `bff.ts`, `packages/auth-service/tsconfig.json`)
- [ ] T006 [P] Scaffold `packages/account-service/package.json` (name `@game-hub/account-service`, depends on `@game-hub/service-core` via `workspace:*`, `packages/account-service/tsconfig.json`)
- [ ] T007 [P] Scaffold `packages/profiles-service/package.json` (name `@game-hub/profiles-service`, depends on `@game-hub/service-core` via `workspace:*`, `packages/profiles-service/tsconfig.json`)
- [ ] T008 [P] Scaffold `packages/admin-service/package.json` (name `@game-hub/admin-service`, depends on `@game-hub/service-core` via `workspace:*`, `packages/admin-service/tsconfig.json`)
- [ ] T009 [P] Scaffold `packages/caro-service/package.json` (name `@game-hub/caro-service`, depends on `@game-hub/service-core` via `workspace:*`, `packages/caro-service/tsconfig.json`)

**Checkpoint**: `pnpm install` resolves the workspace with no errors; six empty-but-typed packages exist.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: `service-core` — the uniform response shape, HTTP client, and retry policy every
domain package depends on. Per plan.md Constitution Check (Principle V), this is justified because
all five domain packages need it simultaneously, not speculatively.

**⚠️ CRITICAL**: No user story (Phase 3+) can begin until this phase is complete.

- [ ] T010 [P] Create `ServiceResult`/`ServiceSuccess`/`ServiceFailure`/`ServiceErrorReason`/`Cursor`/`CursorPage` types per `contracts/service-core.ts` in `packages/service-core/src/types.ts`
- [ ] T011 Implement `createHttpClient` axios factory (base URL, `getAccessToken` header injection, `onUnauthenticated` 401 hook, 10s timeout per research.md §9) in `packages/service-core/src/http-client.ts` (depends on T010)
- [ ] T012 [P] Implement the transient-failure retry/backoff policy — `GET` requests only, up to 2 retries, 300ms exponential backoff, per research.md §6 — in `packages/service-core/src/retry.ts` (depends on T010)
- [ ] T013 Implement the `withServiceResult` higher-order function composing the http client + retry policy + the FR-005 failure-reason mapping (401→UNAUTHENTICATED, 403→UNAUTHORIZED, 400→VALIDATION, 404→NOT_FOUND, 5xx/unmapped→SERVER_ERROR, request-never-sent→NETWORK_ERROR) in `packages/service-core/src/with-service-result.ts` (depends on T011, T012)
- [ ] T014 Create the public barrel export in `packages/service-core/src/index.ts` (depends on T010, T011, T012, T013)
- [ ] T015 [P] Unit test: `withServiceResult` normalizes mocked 200/400/401/403/404/5xx axios responses to the correct `ServiceResult` shape and `reason`, per research.md §4, in `packages/service-core/src/with-service-result.test.ts`
- [ ] T016 [P] Unit test: retry policy retries a `GET` exactly 2 times with backoff on `NETWORK_ERROR`/`SERVER_ERROR` and never retries `POST`/`PUT`/`PATCH`/`DELETE`, per research.md §6, in `packages/service-core/src/retry.test.ts`

**Checkpoint**: `service-core` builds, typechecks, and its unit tests pass. All five domain
packages can now be implemented in parallel.

---

## Phase 3: User Story 1 - Authenticate and maintain a session (Priority: P1) 🎯 MVP

**Goal**: Deliver `@game-hub/auth-service` — Google login initiation, callback exchange, session
refresh via the BFF proxy, and logout, per FR-007, FR-023, FR-024 and research.md §5.

**Independent Test**: Run quickstart.md §4 against a running backend — `getGoogleLoginUrl()`
produces a valid redirect URL, `exchangeGoogleCallback` returns `ok: true` with a differing
`accessToken` after `rotateAccessToken` is called, with no other package involved.

### Implementation for User Story 1

- [ ] T017 [P] [US1] Define `Account`, `GoogleCallbackParams`, `ExchangeGoogleCallbackResult`, and session-related types per `contracts/auth-service.ts` in `packages/auth-service/src/types.ts`
- [ ] T018 [US1] Implement `getGoogleLoginUrl` and the in-memory token store (`getAccessToken`/`setAccessToken`) in `packages/auth-service/src/client.ts` (depends on T017)
- [ ] T019 [US1] Implement `refreshSession` and `logout`, calling same-origin proxy routes (configurable path, not the backend directly) in `packages/auth-service/src/client.ts` (depends on T018)
- [ ] T020 [P] [US1] Implement the server-only `exchangeGoogleCallback`, `rotateAccessToken`, `clearSession` functions (calling the backend's `/api/auth/google/callback` and `/api/auth/refresh` directly) in `packages/auth-service/src/bff.ts` (depends on T017, and `service-core`'s `withServiceResult`)
- [ ] T021 [US1] Wire `service-core`'s `onUnauthenticated` hook (used when constructing this package's own http client) to call `refreshSession` and retry the original request once on success in `packages/auth-service/src/client.ts` (depends on T019)
- [ ] T022 [US1] Create the public entry point exporting only `client.ts` + shared types (never `bff.ts`, so server-only code can't be bundled into client code) in `packages/auth-service/src/index.ts` (depends on T018, T019, T020, T021)
- [ ] T023 [P] [US1] Add the `./bff` subpath export wiring in `packages/auth-service/package.json` `exports` map so a future Route Handler can `import { exchangeGoogleCallback } from '@game-hub/auth-service/bff'` without pulling in `client.ts` (depends on T020)
- [ ] T024 [P] [US1] Unit test: token store get/set, and `refreshSession` success/failure paths (including the "refresh also fails → UNAUTHENTICATED" edge case) in `packages/auth-service/src/client.test.ts`
- [ ] T025 [P] [US1] Unit test: `exchangeGoogleCallback` and `rotateAccessToken` correctly map `LoginResponseDto`/`RefreshResponseDto` per data-model.md in `packages/auth-service/src/bff.test.ts`

**Checkpoint**: User Story 1 is fully functional and independently testable — `@game-hub/auth-service` builds, typechecks, and its tests pass without any other domain package existing.

---

## Phase 4: User Story 2 - Manage the current account (Priority: P2)

**Goal**: Deliver `@game-hub/account-service` — read the signed-in user's account and list
available games, per FR-008, FR-009.

**Independent Test**: Run quickstart.md §5's account-service rows with a valid access token —
`getCurrentAccount()` and `listGames()` both return `ok: true` with correctly typed data.

### Implementation for User Story 2

- [ ] T026 [P] [US2] Define `Account`, `Game` types per `contracts/account-service.ts` in `packages/account-service/src/types.ts`
- [ ] T027 [US2] Implement `getCurrentAccount` (`GET /api/accounts/me`) using `withServiceResult` in `packages/account-service/src/index.ts` (depends on T026, `service-core`)
- [ ] T028 [US2] Implement `listGames` (`GET /api/games`) in `packages/account-service/src/index.ts` (depends on T026)
- [ ] T029 [P] [US2] Unit test: `getCurrentAccount`/`listGames` response mapping against mocked backend payloads in `packages/account-service/src/index.test.ts`

**Checkpoint**: User Stories 1 AND 2 both work independently.

---

## Phase 5: User Story 3 - Manage social & profile-adjacent features (Priority: P3)

**Goal**: Deliver `@game-hub/profiles-service` — friends, notifications, reports, trust score, per
FR-010–FR-013.

**Independent Test**: Run quickstart.md §5's profiles-service rows — `listFriends()` and
`getMyTrustScore()` both return `ok: true` with correctly typed data, independent of admin/game-caro.

### Implementation for User Story 3

- [ ] T030 [P] [US3] Define `Friend`, `FriendRequestRecord`, `FriendRequestsList`, `Notification`, `ReportType`, `Report`, `TrustScore` types per `contracts/profiles-service.ts` in `packages/profiles-service/src/types.ts`
- [ ] T031 [P] [US3] Implement `sendFriendRequest`, `listFriendRequests`, `resolveFriendRequest`, `listFriends` in `packages/profiles-service/src/friends.ts` (depends on T030, `service-core`)
- [ ] T032 [P] [US3] Implement `listNotifications` (returns `CursorPage<Notification>`), `markNotificationRead` in `packages/profiles-service/src/notifications.ts` (depends on T030)
- [ ] T033 [P] [US3] Implement `listReportTypes`, `submitReport` in `packages/profiles-service/src/reports.ts` (depends on T030)
- [ ] T034 [P] [US3] Implement `getMyTrustScore`, normalizing the backend's `gameLocked`/`gameLockedUntil` fields to this package's `locked`/`lockedUntil` per data-model.md, in `packages/profiles-service/src/trust-score.ts` (depends on T030)
- [ ] T035 [US3] Create the public entry point in `packages/profiles-service/src/index.ts` (depends on T031, T032, T033, T034)
- [ ] T036 [P] [US3] Unit tests for the friends/notifications/reports/trust-score modules, including a `listNotifications` pagination (`nextCursor`) test, in `packages/profiles-service/src/*.test.ts`

**Checkpoint**: User Stories 1, 2, AND 3 all work independently.

---

## Phase 6: User Story 4 - Perform platform administration (Priority: P4)

**Goal**: Deliver `@game-hub/admin-service` — game-admin assignment and report moderation, per
FR-014, FR-015. Platform-wide only; Caro-specific admin lives in Phase 7.

**Independent Test**: Run quickstart.md §5's admin-service row with a **non-admin** access token —
`listReportsForModeration()` returns `ok: false, reason: 'UNAUTHORIZED'`, confirming the failure
taxonomy without needing any other package.

### Implementation for User Story 4

- [ ] T037 [P] [US4] Define `AdminAssignment`, `AdminReportEntry`, `ConfirmReportResult`, `AdminReportType`, `TrustScoreSnapshot` types per `contracts/admin-service.ts` in `packages/admin-service/src/types.ts`
- [ ] T038 [P] [US4] Implement `assignGameAdmin`, `removeGameAdmin` in `packages/admin-service/src/game-admins.ts` (depends on T037, `service-core`)
- [ ] T039 [P] [US4] Implement `listReportsForModeration` (returns `CursorPage<AdminReportEntry>`), `confirmReport`, `listReportTypesAdmin`, `createReportType`, `updateReportType` in `packages/admin-service/src/reports.ts` (depends on T037)
- [ ] T040 [US4] Create the public entry point in `packages/admin-service/src/index.ts` (depends on T038, T039)
- [ ] T041 [P] [US4] Unit tests for game-admins/reports modules, including the non-admin → `UNAUTHORIZED` case, in `packages/admin-service/src/*.test.ts`

**Checkpoint**: User Stories 1–4 all work independently.

---

## Phase 7: User Story 5 - Play and manage Caro games (Priority: P5)

**Goal**: Deliver `@game-hub/caro-service` — game configs (incl. Caro-specific admin), match
lifecycle, gameplay, quick-pair, chat, leaderboard, player profiles, tournaments, per
FR-016–FR-022.

**Independent Test**: Run quickstart.md §5's caro-service rows — `listGameConfigs()` and
`getLeaderboard()` both return `ok: true`, independent of account/profiles/admin.

### Implementation for User Story 5

- [ ] T042 [P] [US5] Define shared Caro types (`BoardSize`, `MoveTimeSeconds`, `GameConfig`, `AdminGameConfig`, `LobbyMatch`, `CaroPlayerInMatch`, `CaroMove`, `MatchState`) per `contracts/caro-service.ts` in `packages/caro-service/src/types.ts`
- [ ] T043 [P] [US5] Implement `listGameConfigs`, `listGameConfigsAdmin`, `createGameConfig`, `updateGameConfig`, `deactivateGameConfig`, `reactivateGameConfig` in `packages/caro-service/src/game-configs.ts` (depends on T042, `service-core`)
- [ ] T044 [P] [US5] Implement `listLobbyMatches`, `createMatch`, `joinMatch`, `getMatch`, `leaveMatch`, `inviteToMatch`, `respondToMatchInvitation` in `packages/caro-service/src/matches.ts` (depends on T042)
- [ ] T045 [P] [US5] Implement `startMatch`, `submitMove`, `surrenderMatch`, `requestDraw`, `respondToDrawRequest` in `packages/caro-service/src/gameplay.ts` (depends on T042)
- [ ] T046 [P] [US5] Implement `requestQuickPair`, `cancelQuickPair` in `packages/caro-service/src/quick-pair.ts` (depends on T042)
- [ ] T047 [P] [US5] Implement `listMatchChat`, `sendMatchChat`, `muteMatchViewer` in `packages/caro-service/src/chat.ts` (depends on T042)
- [ ] T048 [P] [US5] Implement `getLeaderboard` in `packages/caro-service/src/leaderboard.ts` (depends on T042)
- [ ] T049 [P] [US5] Implement `getMyPlayerProfile`, `getPlayerProfile`, `getMyMatchHistory`, `getPlayerMatchHistory` (both history functions return `CursorPage<CaroMatchHistoryItem>`) in `packages/caro-service/src/players.ts` (depends on T042)
- [ ] T050 [US5] Verify the tournament endpoints' actual response schemas against the current `04-Projects/api/openapi.yml` (data-model.md flagged these as unconfirmed), then implement `requestTournamentCreatorStatus`, `createTournament`, `listTournaments`, `getTournament`, `registerForTournament`, `listTournamentParticipants`, `listTournamentChat`, `sendTournamentChat`, `listTournamentCreatorRequests`, `reviewTournamentCreatorRequest`, `revokeTournamentCreator` in `packages/caro-service/src/tournaments.ts` (depends on T042)
- [ ] T051 [US5] Create the public entry point in `packages/caro-service/src/index.ts` (depends on T043, T044, T045, T046, T047, T048, T049, T050)
- [ ] T052 [P] [US5] Unit tests for game-configs/matches/gameplay/quick-pair/chat/leaderboard/players modules, including a mutating-call (`submitMove`) test asserting it is NOT auto-retried on a simulated transient failure, in `packages/caro-service/src/*.test.ts`

**Checkpoint**: All five user stories are independently functional.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Validation and documentation spanning all six packages.

- [ ] T053 [P] Add a root `README.md` documenting the package layout, the `ServiceResult` pattern, and how to add a new service function
- [ ] T054 Run `pnpm turbo run typecheck --filter=@game-hub/*` and fix any cross-package type errors (validates SC-005)
- [ ] T055 Run `pnpm turbo run test --filter=@game-hub/*` and confirm every package's unit tests pass
- [ ] T056 Execute quickstart.md's manual smoke-test steps (§4–§5) against a running backend and record the results
- [ ] T057 Re-review `checklists/api.md` (CHK001–CHK027) against the finished implementation and check off any items the implementation itself resolved beyond spec level

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup (needs `tsconfig.base.json`, `service-core`'s
  `package.json`) — BLOCKS every user story
- **User Stories (Phase 3–7)**: All depend only on Foundational completion; independent of each
  other — can proceed in parallel or in P1→P5 priority order
- **Polish (Phase 8)**: Depends on whichever user stories are in scope for a given release being complete

### User Story Dependencies

- **US1 (P1, auth-service)**: No dependency on other domain packages
- **US2 (P2, account-service)**: No dependency on other domain packages (uses `service-core`
  directly; does not import `auth-service` — the consuming app wires the access token getter)
- **US3 (P3, profiles-service)**: No dependency on other domain packages
- **US4 (P4, admin-service)**: No dependency on other domain packages
- **US5 (P5, caro-service)**: No dependency on other domain packages

### Within Each User Story

- Types before implementation modules
- Implementation modules before the package's public entry point (`index.ts`)
- Entry point before that story's tests (tests import from the entry point)

### Parallel Opportunities

- Setup: T002–T009 in parallel once T001 exists
- Foundational: T010 first; then T011 and T012 in parallel; T013 after both; T014 after T013; T015/T016 in parallel once T013 exists
- Once Foundational (Phase 2) is checkpointed, **all five of Phase 3–7 can run fully in parallel** (different packages, zero cross-dependencies) — this is the biggest parallelization opportunity in this feature
- Within Phase 7 (US5), T043–T049 (7 files) are all parallel once T042 exists

---

## Parallel Example: Foundational → User Stories handoff

```bash
# After Phase 2 checkpoint, launch all five user stories' first task together:
Task: "Define Account, GoogleCallbackParams... types in packages/auth-service/src/types.ts"        # T017 [US1]
Task: "Define Account, Game types in packages/account-service/src/types.ts"                        # T026 [US2]
Task: "Define Friend, FriendRequestRecord... types in packages/profiles-service/src/types.ts"       # T030 [US3]
Task: "Define AdminAssignment, AdminReportEntry... types in packages/admin-service/src/types.ts"    # T037 [US4]
Task: "Define shared Caro types in packages/caro-service/src/types.ts"                              # T042 [US5]
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1 (`@game-hub/auth-service`)
4. **STOP and VALIDATE**: run quickstart.md §4 against a running backend
5. This alone unblocks every future webapp screen that needs to know "is the user logged in"

### Incremental Delivery

1. Setup + Foundational → shared foundation ready
2. Add US1 (auth) → validate → this is the MVP, nothing else can be built without it in practice
3. Add US2 (account) → validate independently
4. Add US3 (profiles) → validate independently
5. Add US4 (admin) → validate independently
6. Add US5 (game-caro) → validate independently
7. Phase 8 polish once the desired subset of stories is complete

### Parallel Team Strategy

With multiple developers, once Phase 2 (Foundational) is done:

- Developer A: US1 (auth-service) — start first if the team is small, since every other package
  assumes a working access-token getter is available from the consuming app
- Developer B: US2 (account-service)
- Developer C: US3 (profiles-service)
- Developer D: US4 (admin-service)
- Developer E: US5 (caro-service) — largest story, may itself benefit from splitting T043–T049
  across two people since those seven files are mutually independent

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each of the five domain packages is independently buildable, typeable, and testable — per
  constitution Principle I (no package forced to depend on another) and FR-003
- Commit after each task or logical group
- Stop at any checkpoint to validate a story independently
- T050 (tournament types) carries a known data-gap forward from data-model.md — do not skip its
  verification step even though it's listed as non-parallel within its story
