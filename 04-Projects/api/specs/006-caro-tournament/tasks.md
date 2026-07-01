# Tasks: Caro Tournament

**Input**: Design documents from `specs/006-caro-tournament/`

**Prerequisites**: [plan.md](plan.md) · [spec.md](spec.md) · [research.md](research.md) · [data-model.md](data-model.md) · [contracts/rest-api.md](contracts/rest-api.md) · [contracts/websocket-events.md](contracts/websocket-events.md)

**Tests**: Not explicitly requested. No test tasks included.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks in same phase)
- **[Story]**: Which user story this task belongs to (US1–US7)
- File paths use the `src/caro-game/` hexagonal layout defined in plan.md

---

## Phase 1: Setup

**Purpose**: Create the database migration — the only new project infrastructure needed. The rest builds on the existing NestJS monolith.

- [ ] T001 Create TypeORM migration file `src/database/migrations/1751500000000-CaroTournament.ts` implementing all operations from data-model.md Migration Summary (5 new tables, 2 column additions, all ENUMs, all indexes, unique partial index on `caro_tournament_creator_requests`)

**Checkpoint**: Run `npm run migration:run` — all new tables and indexes exist in the database.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Domain entities, ports, value objects, and extended ORM entities that ALL user stories depend on. No user story work can begin until this phase is complete.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Domain entities (new)

- [ ] T002 [P] Create domain entity `src/caro-game/domain/entities/tournament.ts` with fields: id, creatorPlayerId, gameConfigId, minElo, status ('waiting'|'in_progress'|'ended'|'cancelled'), startAt, endAt, startedAt, endedAt, createdAt, updatedAt
- [ ] T003 [P] Create domain entity `src/caro-game/domain/entities/tournament-creator-request.ts` with fields: id, playerId, status ('pending'|'approved'|'rejected'), reviewedBy, reviewedAt, createdAt
- [ ] T004 [P] Create domain entity `src/caro-game/domain/entities/tournament-registration.ts` with fields: id, tournamentId, playerId, eloAtRegistration, tournamentPoints, winStreak, status ('idle'|'in_match'), registeredAt
- [ ] T005 [P] Create domain entity `src/caro-game/domain/entities/tournament-match.ts` with fields: id, tournamentId, matchId, whiteRegistrationId, blackRegistrationId, whitePointsAwarded, blackPointsAwarded, createdAt, completedAt
- [ ] T006 [P] Create domain entity `src/caro-game/domain/entities/tournament-chat-message.ts` with fields: id, tournamentId, senderPlayerId, content, sentAt

### Domain value object & errors

- [ ] T007 Create `src/caro-game/domain/value-objects/tournament-score-calculator.ts` implementing the Arena scoring formula from data-model.md (inputs: result, currentStreak → outputs: pointsAwarded, newStreak). Must be a pure function with no imports outside the domain layer.
- [ ] T008 Extend `src/caro-game/domain/errors/index.ts` with tournament-specific error classes: `TournamentNotFoundError`, `TournamentAlreadyStartedError`, `TournamentRegistrationClosedError`, `InsufficientEloError`, `AlreadyRegisteredError`, `NotRegisteredError`, `TournamentCreatorRoleAlreadyExistsError`, `PendingRequestAlreadyExistsError`

### Domain events

- [ ] T009 Create `src/caro-game/domain/events/tournament.events.ts` with event classes: `TournamentCreatorRoleGrantedEvent` (playerId), `TournamentCreatorRoleRejectedEvent` (playerId), `TournamentCancelledEvent` (tournamentId, registrantPlayerIds[])

### Domain ports (repository interfaces)

- [ ] T010 [P] Create port `src/caro-game/domain/ports/tournament.repository.port.ts` with methods: `create(tournament)`, `findById(id)`, `findOverdueWaiting(now)`, `findOverdueInProgress(now)`, `save(tournament)`
- [ ] T011 [P] Create port `src/caro-game/domain/ports/tournament-creator-request.repository.port.ts` with methods: `create(request)`, `findById(id)`, `findPendingByPlayerId(playerId)`, `findAll(status?)`, `save(request)`
- [ ] T012 [P] Create port `src/caro-game/domain/ports/tournament-registration.repository.port.ts` with methods: `create(registration)`, `findByTournamentAndPlayer(tournamentId, playerId)`, `findAllByTournament(tournamentId)`, `claimTwoIdlePlayers(tournamentId)` (SKIP LOCKED), `save(registration)`, `atomicScoreUpdate(id, pointsDelta, newStreak)`
- [ ] T013 [P] Create port `src/caro-game/domain/ports/tournament-match.repository.port.ts` with methods: `create(tournamentMatch)`, `findByMatchId(matchId)`, `save(tournamentMatch)`
- [ ] T014 [P] Create port `src/caro-game/domain/ports/tournament-chat.repository.port.ts` with methods: `create(message)`, `findRecentByTournament(tournamentId, limit)`

### Extend existing domain entities

- [ ] T015 Extend `src/caro-game/domain/entities/match.ts` — add optional field `tournamentId?: string`
- [ ] T016 Extend `src/caro-game/domain/entities/player-profile.ts` — add field `isTournamentCreator: boolean`

### Extend existing ORM entities

- [ ] T017 Extend `src/caro-game/infrastructure/persistence/typeorm-entities/match.orm-entity.ts` — add `@Column({ nullable: true }) tournamentId: string | null` with FK to `caro_tournaments`
- [ ] T018 Extend `src/caro-game/infrastructure/persistence/typeorm-entities/player-profile.orm-entity.ts` — add `@Column({ default: false }) isTournamentCreator: boolean`

**Checkpoint**: All domain types compile. `npm run build` passes. No runtime is needed yet.

---

## Phase 3: User Story 1 — Tournament Creator Role Request & Approval (Priority: P1)

**Goal**: Game Admin can approve/reject role requests; approved players gain Tournament Creator capability; Admin can revoke it at any time; revocation does not affect existing tournaments.

**Independent Test**: `POST /caro/tournament-creator-requests` → `GET /caro/admin/tournament-creator-requests` → `PATCH /caro/admin/tournament-creator-requests/:id` with `approve` → attempt `POST /caro/tournaments` succeeds; revoke → attempt `POST /caro/tournaments` fails after token refresh. Verify a running tournament created before revocation continues normally.

### ORM entity & repository

- [ ] T019 [US1] Create `src/caro-game/infrastructure/persistence/typeorm-entities/tournament-creator-request.orm-entity.ts` mapping `TournamentCreatorRequest` domain entity to `caro_tournament_creator_requests` table (use `TcStatusEnum` for the status column)
- [ ] T020 [US1] Create `src/caro-game/infrastructure/persistence/tournament-creator-request.typeorm-repository.ts` implementing `ITournamentCreatorRequestRepository` port; include unique-pending-request enforcement using the partial unique index

### Application use-cases

- [ ] T021 [US1] Create `src/caro-game/application/commands/request-tournament-creator-role.use-case.ts` — validates no existing `pending` or active role, creates `TournamentCreatorRequest` with status `pending`
- [ ] T022 [US1] Create `src/caro-game/application/commands/review-tournament-creator-request.use-case.ts` — accepts `{ requestId, action: 'approve'|'reject', adminPlayerId }`, transitions request status, on approve sets `isTournamentCreator = true` on PlayerProfile and emits `TournamentCreatorRoleGrantedEvent`, on reject emits `TournamentCreatorRoleRejectedEvent`
- [ ] T023 [US1] Create `src/caro-game/application/commands/revoke-tournament-creator-role.use-case.ts` — finds PlayerProfile, sets `isTournamentCreator = false`, does NOT touch any existing tournaments (FR-005)
- [ ] T024 [US1] Create `src/caro-game/application/queries/list-tournament-creator-requests.use-case.ts` — returns all requests filtered by optional `status` parameter

### Infrastructure (event handler + guard)

- [ ] T025 [US1] Create `src/caro-game/infrastructure/events/tournament-role.handler.ts` — `@OnEvent(TournamentCreatorRoleGrantedEvent)` and `@OnEvent(TournamentCreatorRoleRejectedEvent)` handlers that publish notification events to the notification module
- [ ] T026 [US1] Create `src/caro-game/interface/guards/tournament-creator.guard.ts` — checks `request.user.isTournamentCreator === true` from JWT claim; throws `ForbiddenException` if false

### DTOs & controllers

- [ ] T027 [US1] Create tournament creator request DTOs in `src/caro-game/interface/dto/tournament-creator-request.dto.ts`: `ReviewRequestDto` (action: 'approve'|'reject'), `TournamentCreatorRequestResponseDto` (requestId, playerId, playerUsername, status, createdAt)
- [ ] T028 [US1] Create `src/caro-game/interface/http/tournament.controller.ts` with the player-facing role endpoint: `POST /caro/tournament-creator-requests` → `RequestTournamentCreatorRoleUseCase` (JwtAuthGuard only)
- [ ] T029 [US1] Create `src/caro-game/interface/http/tournament-admin.controller.ts` with admin role endpoints: `GET /caro/admin/tournament-creator-requests`, `PATCH /caro/admin/tournament-creator-requests/:requestId`, `DELETE /caro/admin/tournament-creators/:playerId` (JwtAuthGuard + GameAdminCaroGuard); apply `@ApiTags('tournament-admin')`, `@ApiBearerAuth()`, `@ApiOperation()`, `@ApiResponse()` to each endpoint

### Module wiring

- [ ] T030 [US1] Extend `src/caro-game/caro-game.module.ts` — register `TournamentCreatorRequestTypeOrmRepository`, `TournamentCreatorRoleHandler`, `TournamentCreatorGuard`, and all US1 use-cases as providers; export `TournamentCreatorGuard`

**Checkpoint**: US1 fully functional. An admin can approve a role request, the player's JWT (after refresh) allows tournament creation, and a revoke does not affect an existing running tournament.

---

## Phase 4: User Story 2 — Tournament Creation (Priority: P1)

**Goal**: An active Tournament Creator can create a tournament by specifying start/end time, game config, and minimum elo. The tournament is immediately visible (status: `waiting`).

**Independent Test**: `POST /caro/tournaments` returns 201 with `status: "waiting"`. `GET /caro/tournaments/:id` (no auth) returns the same tournament. A non-Tournament-Creator receives 403.

### ORM entity & repository

- [ ] T031 [US2] Create `src/caro-game/infrastructure/persistence/typeorm-entities/tournament.orm-entity.ts` mapping `Tournament` domain entity to `caro_tournaments` table with status enum, nullable `startedAt`/`endedAt`, and FK to `caro_game_configs`
- [ ] T032 [US2] Create `src/caro-game/infrastructure/persistence/tournament.typeorm-repository.ts` implementing `ITournamentRepository` port; include `findOverdueWaiting(now: Date)` and `findOverdueInProgress(now: Date)` using the indexed status+time columns

### Application use-cases

- [ ] T033 [US2] Create `src/caro-game/application/commands/create-tournament.use-case.ts` — validates `endAt > startAt`, `startAt > now`, active `gameConfigId`, `minElo >= 0`; creates `Tournament` with `status = 'waiting'`; returns saved tournament
- [ ] T034 [US2] Create `src/caro-game/application/queries/list-tournaments.use-case.ts` — returns paginated tournaments ordered by `createdAt DESC`, with optional `status` filter and cursor-based pagination
- [ ] T035 [US2] Create `src/caro-game/application/queries/get-tournament-details.use-case.ts` — returns tournament with game config details and registrant count

### DTOs & controller extension

- [ ] T036 [US2] Create `src/caro-game/interface/dto/create-tournament.dto.ts` (`gameConfigId`, `minElo`, `startAt`, `endAt` with class-validator decorators) and `src/caro-game/interface/dto/tournament.dto.ts` (response shape per contracts/rest-api.md)
- [ ] T037 [US2] Extend `src/caro-game/interface/http/tournament.controller.ts` — add `POST /caro/tournaments` (JwtAuthGuard + TournamentCreatorGuard → CreateTournamentUseCase), `GET /caro/tournaments` (public → ListTournamentsUseCase), `GET /caro/tournaments/:id` (public → GetTournamentDetailsUseCase); apply full `@nestjs/swagger` decorators

### Module wiring

- [ ] T038 [US2] Extend `src/caro-game/caro-game.module.ts` — register `TournamentTypeOrmRepository`, `CreateTournamentUseCase`, `ListTournamentsUseCase`, `GetTournamentDetailsUseCase`

**Checkpoint**: US2 fully functional. Tournament Creator creates a tournament; any caller (including no-auth) sees it at `GET /caro/tournaments/:id` with `status: "waiting"`.

---

## Phase 5: User Story 3 — Tournament Discovery & Elo-Gated Registration (Priority: P2)

**Goal**: Players with sufficient elo can register. Below-elo players can view but cannot register. Late registration (during "in_progress") is also supported. Participant list visible to everyone.

**Independent Test**: Register 3 players (1 below elo, 2 above). Verify below-elo gets 403. Verify participant count increases. Verify `GET /caro/tournaments/:id/participants` returns 2 entries. Register a 3rd player after the tournament starts (late join) — they appear in the participant list.

### ORM entity & repository

- [ ] T039 [US3] Create `src/caro-game/infrastructure/persistence/typeorm-entities/tournament-registration.orm-entity.ts` mapping `TournamentRegistration` to `caro_tournament_registrations` with status enum, unique constraint on `(tournament_id, player_id)`, and the `atomicScoreUpdate` native query
- [ ] T040 [US3] Create `src/caro-game/infrastructure/persistence/tournament-registration.typeorm-repository.ts` implementing `ITournamentRegistrationRepository` port; `claimTwoIdlePlayers` uses `SELECT … FOR UPDATE SKIP LOCKED LIMIT 2` inside a transaction (ADR-CARO-GAME-003)

### Application use-cases

- [ ] T041 [US3] Create `src/caro-game/application/commands/register-for-tournament.use-case.ts` — loads tournament (must be `waiting` or `in_progress`), checks player elo vs `minElo`, checks no duplicate registration, creates `TournamentRegistration` (status: `idle`, points: 0, streak: 0); after success, broadcasts `tournament:participant-updated` to `tournament:{id}` room via realtime port
- [ ] T042 [US3] Create `src/caro-game/application/queries/get-tournament-participant-list.use-case.ts` — returns all registrations for a tournament ordered by `tournament_points DESC`, mapped to the participant shape from contracts/rest-api.md

### DTOs & controller extension

- [ ] T043 [US3] Create `src/caro-game/interface/dto/tournament-registration.dto.ts` (response for `POST /caro/tournaments/:id/registrations`) and participant list response DTO (array of rank, playerId, username, tournamentPoints, winStreak, status)
- [ ] T044 [US3] Extend `src/caro-game/interface/http/tournament.controller.ts` — add `POST /caro/tournaments/:tournamentId/registrations` (JwtAuthGuard → RegisterForTournamentUseCase) and `GET /caro/tournaments/:tournamentId/participants` (public → GetTournamentParticipantListUseCase); apply swagger decorators

### Module wiring

- [ ] T045 [US3] Extend `src/caro-game/caro-game.module.ts` — register `TournamentRegistrationTypeOrmRepository`, `RegisterForTournamentUseCase`, `GetTournamentParticipantListUseCase`

**Checkpoint**: US3 fully functional. Elo gate enforced at registration. Participant list readable without auth. Late registration during "in_progress" accepted and participant list updates.

---

## Phase 6: User Story 4 — Automatic Start, Minimum Player Check & Auto-Cancellation (Priority: P1)

**Goal**: At `startAt`, if ≥ 5 players registered → status becomes `in_progress`; if < 5 → status becomes `cancelled` and all registrants are notified. At `endAt`, status becomes `ended`. All transitions happen within 10 seconds of the scheduled time.

**Independent Test**: Create two tournaments: one with 5+ registrants (becomes `in_progress`), one with 3 registrants (becomes `cancelled` + notifications sent). Wait ≤ 10 seconds from each `startAt`. Verify status changes and WS `tournament:status-changed` events arrive.

### Application use-cases

- [ ] T046 [US4] Create `src/caro-game/application/commands/start-tournament.use-case.ts` — loads tournament (must be `waiting`), counts registrations; if count >= 5: sets `status = 'in_progress'`, `startedAt = now()`, saves, broadcasts `tournament:status-changed` via realtime port, then calls `PairIdlePlayersUseCase` for all idle registrations; if count < 5: delegates to `CancelTournamentUseCase`
- [ ] T047 [US4] Create `src/caro-game/application/commands/cancel-tournament.use-case.ts` — sets `status = 'cancelled'`, saves, emits `TournamentCancelledEvent` (carries list of registrant player IDs), broadcasts `tournament:status-changed`
- [ ] T048 [US4] Create `src/caro-game/application/commands/end-tournament.use-case.ts` — sets `status = 'ended'`, `endedAt = now()`, saves, broadcasts `tournament:status-changed`

### Infrastructure (scheduler & event handler)

- [ ] T049 [US4] Create `src/caro-game/infrastructure/scheduling/tournament-scheduler.service.ts` — NestJS injectable decorated with `@Injectable()`; two `@Cron('*/10 * * * * *')` methods: `handleTournamentStarts()` calls `ITournamentRepository.findOverdueWaiting(now)` then `StartTournamentUseCase.execute()` for each; `handleTournamentEnds()` calls `ITournamentRepository.findOverdueInProgress(now)` then `EndTournamentUseCase.execute()` for each. Use `@InjectRepository` tokens via DI.
- [ ] T050 [US4] Create `src/caro-game/infrastructure/events/tournament-cancelled.handler.ts` — `@OnEvent(TournamentCancelledEvent)` that publishes per-player cancellation notifications to the notification module (one event per registrant)

### Module wiring

- [ ] T051 [US4] Extend `src/caro-game/caro-game.module.ts` — register `TournamentSchedulerService`, `StartTournamentUseCase`, `CancelTournamentUseCase`, `EndTournamentUseCase`, `TournamentCancelledHandler`; import `ScheduleModule.forRoot()` if not already imported at app level

**Checkpoint**: US4 fully functional. Scheduler fires every 10 seconds. Tournament transitions to `in_progress` or `cancelled` within ≤ 10 seconds of `startAt`. All registrants receive notification on cancellation.

---

## Phase 7: User Story 5 — Continuous Swiss Arena Matchmaking (Priority: P1)

**Goal**: Idle players are continuously paired with opponents of nearest tournament score using SKIP LOCKED concurrency safety. Pairing happens within 5 seconds of a player becoming idle. No new pairings after `endAt`.

**Independent Test**: Start a tournament with 6 idle players (all at 0 points). Within 5 seconds: 3 `tournament:match-created` WebSocket events arrive. Each event references a unique `matchId` and unique player pairs (no player appears twice).

### ORM entity & repository

- [ ] T052 [US5] Create `src/caro-game/infrastructure/persistence/typeorm-entities/tournament-match.orm-entity.ts` mapping `TournamentMatch` to `caro_tournament_matches` with FK to `caro_matches` and `caro_tournament_registrations`
- [ ] T053 [US5] Create `src/caro-game/infrastructure/persistence/tournament-match.typeorm-repository.ts` implementing `ITournamentMatchRepository` port

### Infrastructure (matchmaking adapter)

- [ ] T054 [US5] Create `src/caro-game/infrastructure/matchmaking/tournament-matchmaking.service.ts` — implements the SKIP LOCKED claim from `ITournamentRegistrationRepository.claimTwoIdlePlayers(tournamentId)`; inside the same DB transaction: inserts `caro_tournament_matches` row, creates a `caro_matches` row via `IMatchRepository.createTournamentMatch(whitePlayerId, blackPlayerId, gameConfigId, tournamentId)` (auto-started, no lobby), updates both registrations to `status = 'in_match'`; returns the new match details

### Application use-case

- [ ] T055 [US5] Create `src/caro-game/application/commands/pair-idle-players.use-case.ts` — receives `tournamentId`; calls `TournamentMatchmakingService.pairNextTwo(tournamentId)` in a loop until no pair can be formed (returns null); after each successful pair: broadcasts `tournament:match-created` to `tournament:{id}` room and `match:started` to each player via realtime port. Guard: only runs if tournament `status === 'in_progress'`.

### Trigger points

- [ ] T056 [US5] Extend `src/caro-game/application/commands/start-tournament.use-case.ts` (T046) — after status transitions to `in_progress`, call `PairIdlePlayersUseCase.execute(tournamentId)` to create initial pairings for all idle players
- [ ] T057 [US5] Ensure `src/caro-game/application/commands/register-for-tournament.use-case.ts` (T041) — after late registration creates idle registration, call `PairIdlePlayersUseCase.execute(tournamentId)` if tournament is `in_progress`

### Module wiring

- [ ] T058 [US5] Extend `src/caro-game/caro-game.module.ts` — register `TournamentMatchmakingService`, `TournamentMatchTypeOrmRepository`, `PairIdlePlayersUseCase`

**Checkpoint**: US5 fully functional. After tournament start with 6 idle players, 3 matches are created within 5 seconds. No player is matched to two simultaneous matches (verified by checking `status = 'in_match'` on all 6 registrations).

---

## Phase 8: User Story 6 — Arena Scoring & Elo Calculation (Priority: P1)

**Goal**: Every tournament match result updates the winner's/loser's tournament points (using the Arena formula with streak bonus) atomically in the DB. Elo for both players is recalculated via the existing match completion flow. After score update, both players return to `idle` and re-enter the matchmaking queue.

**Independent Test**: Arrange Player D to win 3 consecutive matches. After match 3, verify `tournament_points = 6`, `win_streak = 3`. After match 4 (win), verify `tournament_points = 10`, `win_streak = 4`. After match 5 (draw), verify `tournament_points = 12`, `win_streak = 0`. Separately verify Player D's elo changed by the same amount as a non-tournament match.

### Application use-case

- [ ] T059 [US6] Create `src/caro-game/application/commands/record-tournament-match-result.use-case.ts` — receives `{ matchId, winnerId?, isDraw }` (derived from `MatchCompletedEvent`); loads `TournamentMatch` by `matchId` (if none, no-op — regular match); loads both `TournamentRegistration` rows with `FOR UPDATE`; uses `TournamentScoreCalculator.calculate(result, registration.winStreak)` for each player; calls `ITournamentRegistrationRepository.atomicScoreUpdate(id, pointsDelta, newStreak)` twice (white then black); sets both registrations `status = 'idle'`; broadcasts `tournament:participant-updated` twice to `tournament:{id}` room

### Infrastructure (event handler)

- [ ] T060 [US6] Create `src/caro-game/infrastructure/events/tournament-match-completed.handler.ts` — `@OnEvent('match.completed')` (or whatever event name the existing `MatchCompletedEvent` uses); checks `event.tournamentId != null`; delegates to `RecordTournamentMatchResultUseCase`; after use-case completes, calls `PairIdlePlayersUseCase.execute(event.tournamentId)` to immediately re-pair both players (if a partner is available)

### Module wiring

- [ ] T061 [US6] Extend `src/caro-game/caro-game.module.ts` — register `RecordTournamentMatchResultUseCase`, `TournamentMatchCompletedHandler`

**Checkpoint**: US6 fully functional. After every tournament match: (a) tournament points updated with correct streak bonus, (b) both players set to `idle` and re-queued for matchmaking, (c) elo changes visible in player profile (existing flow unmodified).

---

## Phase 9: User Story 7 — Realtime Participant List & Tournament Chat (Priority: P2)

**Goal**: All viewers receive live participant-list updates. Registered participants can send and receive chat messages in the shared tournament room. Non-registered viewers cannot post chat.

**Independent Test**: Two WebSocket clients join `tournament:{id}` room. A match completes (score changes). Both clients receive `tournament:participant-updated` within 3 seconds. A registered player posts a chat message. Both clients receive `tournament:chat-message`. A non-registered player gets 403 on `POST /caro/tournaments/:id/chat`.

### ORM entity & repository

- [ ] T062 [US7] Create `src/caro-game/infrastructure/persistence/typeorm-entities/tournament-chat-message.orm-entity.ts` mapping `TournamentChatMessage` to `caro_tournament_chat_messages`
- [ ] T063 [US7] Create `src/caro-game/infrastructure/persistence/tournament-chat.typeorm-repository.ts` implementing `ITournamentChatRepository` port with `findRecentByTournament(tournamentId, limit)` ordered by `sent_at ASC`

### Application use-cases

- [ ] T064 [US7] Create `src/caro-game/application/commands/send-tournament-chat-message.use-case.ts` — validates sender is a registered participant (`TournamentRegistration` exists for player+tournament); validates content length <= 500; saves `TournamentChatMessage`; broadcasts `tournament:chat-message` to `tournament:{id}` room via realtime port
- [ ] T065 [US7] Create `src/caro-game/application/queries/get-tournament-chat.use-case.ts` — validates caller is a registered participant; returns up to `limit` most-recent messages (default 50, max 100) for the given tournament

### DTOs & controller extension

- [ ] T066 [US7] Create `src/caro-game/interface/dto/tournament-chat.dto.ts` — `SendTournamentChatDto` (`content`: string, max 500), `TournamentChatMessageResponseDto` (messageId, senderPlayerId, senderUsername, content, sentAt)
- [ ] T067 [US7] Extend `src/caro-game/interface/http/tournament.controller.ts` — add `POST /caro/tournaments/:tournamentId/chat` (JwtAuthGuard → SendTournamentChatMessageUseCase) and `GET /caro/tournaments/:tournamentId/chat` (JwtAuthGuard → GetTournamentChatUseCase); apply swagger decorators

### WebSocket room join (observer support)

- [ ] T068 [US7] Verify that the shared `src/realtime/realtime.gateway.ts` already handles the `joinRoom` / `leaveRoom` pattern for dynamic rooms. If not, extend `realtime.gateway.ts` to support `tournament:{id}` room keys alongside existing `match:{id}` and `lobby` rooms. Unauthenticated observers may join to receive public events; authentication is validated at the use-case level for mutations.

### Module wiring

- [ ] T069 [US7] Extend `src/caro-game/caro-game.module.ts` — register `TournamentChatTypeOrmRepository`, `SendTournamentChatMessageUseCase`, `GetTournamentChatUseCase`

**Checkpoint**: US7 fully functional. Registered players chat in tournament room. All WebSocket subscribers (registered and observers) receive `tournament:chat-message` and `tournament:participant-updated` events in real time.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Ensure API documentation, module completeness, and end-to-end integration.

- [ ] T070 [P] Run `npm run openapi:generate` (or equivalent project command) to regenerate `openapi.yml` from the new Swagger decorators and verify all new endpoints appear in the spec with correct request/response schemas
- [ ] T071 [P] Verify all new domain entities, use-cases, and infrastructure services compile without errors (`npm run build`) and the NestJS dependency injection graph resolves without circular-dependency warnings
- [ ] T072 Run all validation scenarios from `specs/006-caro-tournament/quickstart.md` (Scenarios 1–8) against the running local API; document any deviations and fix
- [ ] T073 Perform a final constitution compliance self-review against all 6 gates in `plan.md` Constitution Check section; confirm: no direct TypeORM imports in domain/application layers, all score updates are atomic, SKIP LOCKED used for pairing, no `process.env` direct access, `openapi.yml` committed

**Checkpoint**: All quickstart scenarios pass. `openapi.yml` committed. Constitution gates confirmed.

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup)        → No dependencies — start immediately
Phase 2 (Foundation)   → Depends on Phase 1 — BLOCKS all user stories
Phase 3 (US1)          → Requires Phase 2
Phase 4 (US2)          → Requires Phase 2; independent of Phase 3 (US1)
Phase 5 (US3)          → Requires Phase 2 + Phase 4 (needs Tournament to exist)
Phase 6 (US4)          → Requires Phase 5 (needs Registrations to exist)
Phase 7 (US5)          → Requires Phase 6 (needs in_progress tournament)
Phase 8 (US6)          → Requires Phase 7 (needs TournamentMatch to exist)
Phase 9 (US7)          → Requires Phase 5 (chat needs Registration check); Phase 8 recommended for full realtime test
Phase 10 (Polish)      → Requires all phases complete
```

### User Story Dependencies

- **US1 (Phase 3)**: Independent of US2–US7 — can be developed after Foundation
- **US2 (Phase 4)**: Independent of US1 — can start in parallel with US1 after Foundation
- **US3 (Phase 5)**: Depends on US2 (tournament must exist to register)
- **US4 (Phase 6)**: Depends on US3 (registrations trigger start/cancel logic)
- **US5 (Phase 7)**: Depends on US4 (matchmaking only runs in `in_progress` tournaments)
- **US6 (Phase 8)**: Depends on US5 (score update triggered by match completion)
- **US7 (Phase 9)**: Depends on US3 (registration check for chat); US6 recommended for full realtime scenario

### Within Each User Story

- ORM entity / repository before use-cases
- Use-cases before controllers
- All providers registered in module before integration test

---

## Parallel Execution Examples

### Foundation (Phase 2) — run all in parallel after T001

```
Parallel group A (domain entities):     T002 T003 T004 T005 T006
Parallel group B (ports):               T010 T011 T012 T013 T014
Sequential after A+B:                   T007 T008 T009 T015 T016 T017 T018
```

### US1 + US2 after Foundation — run phases in parallel

```
Developer A: T019 → T020 → T021 → T022 → T023 → T024 → T025 → T026 → T027 → T028 → T029 → T030
Developer B: T031 → T032 → T033 → T034 → T035 → T036 → T037 → T038
```

### US5 + US6 — sequential dependency, but internal tasks parallel

```
Within US5 (Phase 7):   T052 [P] T053 [P] → T054 → T055 → T056 T057 → T058
Within US6 (Phase 8):   T059 → T060 → T061
```

---

## Implementation Strategy

### MVP First (US2 + US3 + US4 only)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundation (T002–T018)
3. Complete Phase 4: US2 — tournament creation (T031–T038)
4. Complete Phase 5: US3 — registration (T039–T045)
5. Complete Phase 6: US4 — lifecycle start/cancel/end (T046–T051)
6. **STOP and VALIDATE**: Tournaments can be created, players can register, tournament auto-starts or auto-cancels. Role management (US1) can be done separately.

### Incremental Delivery

1. Foundation → US2 (create tournament) → US3 (register) → US4 (lifecycle) → **demo: basic tournament flow**
2. Add US5 (matchmaking) → US6 (scoring) → **demo: full competitive play**
3. Add US1 (role management) → **demo: admin workflow**
4. Add US7 (realtime + chat) → **demo: community engagement**
5. Polish → Ship

### Parallel Team Strategy

With 2 developers after Foundation:
- **Dev A**: US1 (role management, Phase 3) then US4 (lifecycle, Phase 6)
- **Dev B**: US2 (creation, Phase 4) → US3 (registration, Phase 5) → US5+US6 (matchmaking + scoring, Phases 7–8)
- Both: US7 (chat + realtime, Phase 9) → Polish

---

## Notes

- [P] tasks operate on different files with no incomplete-task dependencies — safe to parallelize
- [US*] label maps each task to its source user story for traceability
- Constitution IV: every score update must use the atomic `UPDATE col = col + delta` pattern — never read-compute-write at app layer for `tournament_points`
- Constitution III: `TournamentCreatorGuard` checks JWT claim only; DB is NOT queried per request for the role check
- ADR-CARO-GAME-003: `claimTwoIdlePlayers` must use `FOR UPDATE SKIP LOCKED` inside a transaction — this is the only approved pattern for the matchmaking claim
- Tournament matches reuse existing `caro_matches` infrastructure; only `tournament_id` FK differentiates them
- `TournamentScoreCalculator` (T007) is the single source of truth for the Arena formula — it must be a pure function with no side effects, imported only by application-layer use-cases
