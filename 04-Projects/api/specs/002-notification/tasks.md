# Tasks: In-App Notification

**Input**: Design documents from `specs/002-notification/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/ ✅

**Tests**: Not requested — no test tasks generated.

**Revision**: 2 — analysis findings C1, C2, H1, H2, M1–M4, L1–L4 resolved.

**Organization**: Tasks are grouped by user story to enable independent implementation and
testing of each story.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no incomplete dependencies)
- **[Story]**: Which user story this task belongs to (US1/US2/US3)
- All file paths are relative to `src/` unless noted

---

## Phase 1: Setup — SharedAuthModule Extraction

**Purpose**: Extract JWT auth infrastructure out of `AccountSocialModule` into a globally
registered `SharedAuthModule`. Required before `NotificationModule` can protect its HTTP
endpoints with JWT guards.

**⚠️ CRITICAL**: All other phases depend on this being complete.

- [ ] T001 Create `src/shared-auth/shared-auth.module.ts` — `@Global()` NestJS module that
  imports and re-exports `PassportModule.register({ defaultStrategy: 'jwt' })` and `JwtModule`
  (configured via `ConfigService` using `configService.get<AuthConfig>('auth')!.jwtAccessSecret`
  and `jwtAccessExpiresIn` — same grouped `AuthConfig` pattern as the current
  `AccountSocialModule`). Declares and exports `JwtStrategy`, `JwtAuthGuard`, `OptionalJwtGuard`.

- [ ] T002 Move `src/account-social/infrastructure/auth/jwt.strategy.ts` →
  `src/shared-auth/jwt.strategy.ts`. Update imports to resolve `AuthConfig` from `@config/auth.config`.
  No logic change.

- [ ] T003 Move `src/account-social/interface/guards/jwt-auth.guard.ts` →
  `src/shared-auth/jwt-auth.guard.ts`. Move
  `src/account-social/interface/guards/optional-jwt.guard.ts` →
  `src/shared-auth/optional-jwt.guard.ts`. No logic change to either file.

- [ ] T004 Update `src/account-social/account-social.module.ts`: remove `JwtModule`,
  `PassportModule`, and `JwtStrategy` from its imports/providers; import `SharedAuthModule`
  instead. Update all internal imports of `jwt-auth.guard` and `optional-jwt.guard` to resolve
  from `src/shared-auth/`. Leave `PlatformAdminGuard` in `account-social/interface/guards/`
  unchanged (it is account-social-specific).

- [ ] T005 Update `src/app.module.ts`: add `SharedAuthModule` to root `imports` array (registers
  it globally via `@Global()`). Also remove the `APP_FILTER` / `DomainExceptionFilter` provider
  from `src/account-social/account-social.module.ts` — it will be registered globally in T020
  instead (resolves finding **C2**).

**Checkpoint**: `npm run build` must pass with no new TypeScript errors after T001–T005.

---

## Phase 2: Foundational — DB Migration + NotificationModule Core

**Purpose**: Database schema and the domain/ORM layer for `NotificationModule`. These tasks
block all US1 implementation but many can run in parallel once Phase 1 is complete.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T006 Create migration `src/database/migrations/1751100000000-CreateNotificationSchema.ts`.
  `up()` creates the `notification` schema, the `notification.notifications` table (columns:
  `id UUID PK`, `recipient_id UUID NOT NULL`, `type VARCHAR(50) NOT NULL CHECK (type IN (4
  values))`, `content TEXT NOT NULL CHECK (content <> '')`, `reference_id UUID`, `is_read
  BOOLEAN NOT NULL DEFAULT FALSE`, `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`), and two
  indexes: `(recipient_id, created_at DESC)` and a partial index
  `(recipient_id) WHERE is_read = FALSE`. `down()` drops the schema with `CASCADE`.

- [ ] T007 [P] Create `src/notification/domain/entities/notification.ts` — plain TypeScript
  class `Notification` with fields: `id: string`, `recipientId: string`, `type:
  NotificationType`, `content: string`, `referenceId: string | null`, `isRead: boolean`,
  `createdAt: Date`. Create `src/notification/domain/entities/notification-type.enum.ts` —
  `enum NotificationType { FriendOrGameInvite = 'friend-or-game-invite', TournamentEvent =
  'tournament-event', AdminWarning = 'admin-warning', TrustScoreAlert = 'trust-score-alert' }`.

- [ ] T008 [P] Create `src/notification/domain/ports/notification.repository.port.ts` —
  interface `INotificationRepository` with methods: `save(n: Omit<Notification, 'id' |
  'createdAt'>): Promise<Notification>`, `findByRecipient(recipientId: string, pagination: {
  cursor?: { createdAt: Date; id: string }; limit: number }): Promise<Notification[]>`,
  `findById(id: string): Promise<Notification | null>`, `markAsRead(id: string):
  Promise<Notification>`, `countUnread(recipientId: string): Promise<number>`. Export symbol
  `NOTIFICATION_REPO`. Create `src/notification/domain/ports/account-existence.port.ts` —
  interface `IAccountExistencePort` with `exists(accountId: string): Promise<boolean>`. Export
  symbol `ACCOUNT_EXISTENCE_PORT`.

- [ ] T009 [P] Create `src/notification/domain/errors/index.ts` — export domain error classes:
  `NotificationNotFoundError` (notification record not found by ID — maps to HTTP 404),
  `ForbiddenNotificationError` (caller is not the recipient — maps to HTTP 403),
  `InvalidNotificationTypeError` (unrecognized type string — maps to HTTP 422),
  `InvalidNotificationContentError` (empty content — maps to HTTP 422),
  `InvalidRecipientError` (recipientId does not match any registered account — maps to HTTP 422).
  Follow the same class pattern as `src/account-social/domain/errors/index.ts`.
  *(Resolves finding **M4** — dedicated error class for invalid recipient, distinct from
  `NotificationNotFoundError` which is for notification-record lookups.)*

- [ ] T010 [P] Create `src/notification/infrastructure/persistence/typeorm-entities/
  notification.orm-entity.ts` — TypeORM entity `NotificationOrmEntity` with schema `{schema:
  'notification', name: 'notifications'}`. Columns: `id` (uuid PK), `recipientId` (mapped to
  `recipient_id`), `type` (VARCHAR), `content` (TEXT), `referenceId` (mapped to `reference_id`,
  nullable), `isRead` (mapped to `is_read`, default false), `createdAt` (`@CreateDateColumn`,
  mapped to `created_at`). No relations — this is a standalone table.

- [ ] T011 Create `src/notification/infrastructure/persistence/
  notification.typeorm-repository.ts` — implements `INotificationRepository`. `findByRecipient`
  uses `ORDER BY created_at DESC, id DESC` with composite cursor `WHERE (created_at, id) <
  ($1, $2)` when cursor provided. `markAsRead` uses a single `UPDATE … SET is_read = true …
  RETURNING *` statement. `countUnread` uses `SELECT COUNT(*) WHERE recipient_id = $1 AND
  is_read = FALSE` leveraging the partial index. Maps ORM entity ↔ domain entity in private
  helper methods.

- [ ] T012 Add `AccountExistenceService` to `src/account-social/`:
  - Create `src/account-social/application/services/account-existence.service.ts` — injectable
    service with method `exists(accountId: string): Promise<boolean>`. Injects `ACCOUNT_REPO`
    (`IAccountRepository`) and calls `repo.findById(accountId)` returning `true` if found,
    `false` otherwise.
  - Export `AccountExistenceService` from `src/account-social/account-social.module.ts` (add to
    `exports` array). This makes it available to any module that imports `AccountSocialModule`.
  *(Resolves finding **H1** — removes cross-schema raw SQL query; inter-module communication now
  uses an exported service, complying with Constitution Principle II.)*

- [ ] T013 Create `src/notification/infrastructure/persistence/
  account-existence.adapter.ts` — `AccountExistenceAdapter` implements `IAccountExistencePort`.
  Injects `AccountExistenceService` (imported from `AccountSocialModule` via constructor
  injection using the class token). Delegates: `exists(id) → accountExistenceService.exists(id)`.
  *(No raw cross-schema SQL — uses the exported service from T012.)*

**Checkpoint**: `npm run build` must pass. Run migration with `npm run migration:run` and verify
the `notification.notifications` table exists in the database before proceeding to Phase 3.

---

## Phase 3: User Story 1 — Receive and View Notifications (Priority: P1) 🎯 MVP

**Goal**: Any domain can emit an EventEmitter2 event; `NotificationModule` persists it and
exposes it via `GET /notifications` for the recipient player.

**Independent Test**: See quickstart.md Scenario 1. After running Phase 1 + 2, trigger a
`notification.friend-or-game-invite` event for player B and call `GET /notifications` with B's
token. Expect the notification in the response.

- [ ] T014 [US1] Create `src/notification/application/commands/create-notification.use-case.ts`
  — `CreateNotificationUseCase`. Injects `NOTIFICATION_REPO` and `ACCOUNT_EXISTENCE_PORT`.
  Input: `{ recipientId: string; type: string; content: string; referenceId?: string }`.
  Validates in order:
  (1) `type` is a valid `NotificationType` value — throws `InvalidNotificationTypeError` if not;
  (2) `content` trimmed length > 0 — throws `InvalidNotificationContentError` if empty;
  (3) `recipientId` exists via `IAccountExistencePort` — throws `InvalidRecipientError` if absent.
  On success, calls `notificationRepo.save(...)` and returns the saved `Notification` domain
  object (no DTO — raw domain entity only).
  *(Resolves finding **M4** — uses `InvalidRecipientError` for unknown recipient.)*

- [ ] T015 [US1] Create `src/notification/interface/mappers/notification.mapper.ts` —
  `NotificationMapper` (static class or plain functions). Exports:
  - `toEntryDto(n: Notification): NotificationEntryDtoShape` — converts domain entity to the
    wire shape `{ id, type, content, referenceId: n.referenceId ?? null, isRead, createdAt:
    n.createdAt.toISOString() }`.
  - `toRealtimePayload(n: Notification): object` — alias for `toEntryDto` for use in push events.
  This mapper is the **only** place that transforms `Notification` → wire shape.
  *(Resolves finding **C1** — keeps interface-layer concerns out of the application layer.)*

- [ ] T016 [P] [US1] Create `src/notification/application/queries/get-notifications.use-case.ts`
  — `GetNotificationsUseCase`. Injects `NOTIFICATION_REPO`. Input: `{ recipientId: string;
  cursor?: { createdAt: Date; id: string }; limit: number }`. Calls `repo.findByRecipient(…)`.
  Returns `Notification[]` (raw domain entities — mapping to DTO is the controller's job).

- [ ] T017 [US1] Create `src/notification/infrastructure/events/domain-event.listener.ts` —
  `DomainEventListener`. Injects `CreateNotificationUseCase`. Registers `@OnEvent()` handlers
  for all four event names (`notification.friend-or-game-invite`, `notification.tournament-event`,
  `notification.admin-warning`, `notification.trust-score-alert`). Each handler:
  (a) maps the event payload to a `CreateNotificationUseCase` input, converting the event name
  suffix to the corresponding `NotificationType` enum value;
  (b) calls `createNotificationUseCase.execute(...)`;
  (c) wraps the call in `try/catch` — catches all errors, logs them, and returns without
  re-throwing (fire-and-forget guarantee per FR-012 and research.md §8 CHK023). Missing or empty
  `content` / unknown `recipientId` are caught and logged; `referenceId` absent in payload is
  passed as `undefined` (stored as `null`).

- [ ] T018 [P] [US1] Create `src/notification/interface/dto/notification-entry.dto.ts` —
  `NotificationEntryDto` with `@ApiProperty` on every field: `id: string`, `type: string`,
  `content: string`, `referenceId: string | null`, `isRead: boolean`, `createdAt: string`
  (ISO 8601). Create `src/notification/interface/dto/notification-list-response.dto.ts` —
  `NotificationListResponseDto` with `items: NotificationEntryDto[]` and `nextCursor:
  { createdAt: string; id: string } | null`.

- [ ] T019 [US1] Create `src/notification/interface/http/notifications.controller.ts` —
  `NotificationsController` at base route `/notifications`. Inject `GetNotificationsUseCase`.
  Implement `GET /` — guarded by `JwtAuthGuard`. Accepts query params `limit` (default 20, max
  50), `cursorCreatedAt`, `cursorId`. Validates: if one cursor field is present without the
  other, throw `BadRequestException`. If `limit` is outside 1–50, throw `BadRequestException`.
  Converts `cursorCreatedAt` string to `Date`. Calls use-case, maps each `Notification` via
  `NotificationMapper.toEntryDto()`, builds and returns `NotificationListResponseDto`. Adds
  `@ApiOperation`, `@ApiResponse(200)`, `@ApiResponse(400)`, `@ApiResponse(401)` decorators.

- [ ] T020 [US1] Register `DomainExceptionFilter` globally in `src/app.module.ts` — add
  `{ provide: APP_FILTER, useClass: DomainExceptionFilter }` to the root `AppModule` providers.
  Update `DomainExceptionFilter` (`src/account-social/interface/filters/domain-exception.filter.ts`)
  to handle the new notification error classes: `InvalidRecipientError` → 422,
  `InvalidNotificationTypeError` → 422, `InvalidNotificationContentError` → 422,
  `NotificationNotFoundError` → 404, `ForbiddenNotificationError` → 403.
  Move the filter file to `src/shared/filters/domain-exception.filter.ts` if preferred (update
  imports accordingly).
  *(Resolves finding **C2** — filter now covers all modules; no per-module APP_FILTER needed.)*

- [ ] T021 [US1] Create `src/notification/notification.module.ts` — `NotificationModule`.
  Imports: `TypeOrmModule.forFeature([NotificationOrmEntity])`, `SharedAuthModule` (for
  `JwtAuthGuard`), `AccountSocialModule` (for `AccountExistenceService`).
  Port bindings: `NOTIFICATION_REPO → NotificationTypeOrmRepository`,
  `ACCOUNT_EXISTENCE_PORT → AccountExistenceAdapter`.
  Providers: `CreateNotificationUseCase`, `GetNotificationsUseCase`, `DomainEventListener`,
  `NotificationTypeOrmRepository`, `AccountExistenceAdapter`.
  Controller: `NotificationsController`.
  *(No APP_FILTER here — it is now global via T020.)*

- [ ] T022 [US1] Update `src/app.module.ts`: add `NotificationModule` to `imports`. Ensure
  `EventEmitterModule` is already present (it is from the existing setup).

- [ ] T023 [P] [US1] Update `src/account-social/application/commands/
  send-friend-request.use-case.ts`: after persisting the friend request, emit
  `notification.friend-or-game-invite` via the existing `IEventPublisherPort`.
  Payload: `{ recipientId: request.receiverId, content: \`${senderAccount.username} sent you a friend request.\`, referenceId: request.id }`.
  The `senderAccount` (`Account` domain object) is obtained by calling `accountRepo.findById(callerId)`
  at the start of the use-case (add this lookup — it is needed for the username). The
  `IAccountRepository` is already injected in this use-case; use it.
  *(Resolves findings **L2** and **L3** — explicit account load + unambiguous template literal.)*

- [ ] T024 [P] [US1] Update `src/account-social/application/commands/
  resolve-friend-request.use-case.ts`: after resolving the request, emit
  `notification.friend-or-game-invite` via the existing `IEventPublisherPort` for the **sender**
  (original requester). Payload when accepted:
  `{ recipientId: request.senderId, content: \`${receiverAccount.username} accepted your friend request.\`, referenceId: request.id }`.
  Payload when rejected:
  `{ recipientId: request.senderId, content: \`${receiverAccount.username} declined your friend request.\`, referenceId: request.id }`.
  Load `receiverAccount` via `accountRepo.findById(request.receiverId)` before composing content.
  The existing `FriendRequestResolvedEvent` emission MUST remain unchanged (supplement, not
  replace — research.md §8 CHK026). *(Resolves finding **L3** — unambiguous template literals.)*

**Checkpoint**: Start the server, run quickstart.md Scenario 1 and Scenario 4 (auth guard
checks). US1 is fully functional and independently testable at this point.

---

## Phase 4: User Story 2 — Mark Notification as Read (Priority: P2)

**Goal**: A logged-in player can mark any of their own notifications as read. The operation is
idempotent and rejects cross-user attempts.

**Independent Test**: See quickstart.md Scenario 2. After Scenario 1, call
`PATCH /notifications/{id}/read` with B's token; expect `isRead: true`. Repeat — expect `200`.
Try with A's token — expect `403`.

- [ ] T025 [US2] Create `src/notification/application/commands/mark-notification-read.use-case.ts`
  — `MarkNotificationReadUseCase`. Injects `NOTIFICATION_REPO`. Input: `{ callerId: string;
  notificationId: string }`. Calls `repo.findById(notificationId)`. If null → throw
  `NotificationNotFoundError`. If `notification.recipientId !== callerId` → throw
  `ForbiddenNotificationError`. If already read → return notification as-is (idempotent).
  Otherwise calls `repo.markAsRead(notificationId)` and returns the updated `Notification`
  domain object (no DTO).

- [ ] T026 [US2] Update `src/notification/interface/http/notifications.controller.ts`: add
  `PATCH /:id/read` endpoint. Injects `MarkNotificationReadUseCase`. Guards with `JwtAuthGuard`.
  Validates `:id` with `ParseUUIDPipe` — NestJS automatically returns `400` for non-UUID input.
  Extracts `callerId` from JWT via `@Req()`. Calls use-case; domain errors are caught by the
  global `DomainExceptionFilter` (T020). Maps result via `NotificationMapper.toEntryDto()` and
  returns as `NotificationEntryDto`. Adds `@ApiOperation`, `@ApiResponse(200)`,
  `@ApiResponse(400)`, `@ApiResponse(401)`, `@ApiResponse(403)`, `@ApiResponse(404)` decorators.
  Add `MarkNotificationReadUseCase` to `notification.module.ts` providers.

**Checkpoint**: Run quickstart.md Scenario 2 fully. US2 is independently testable.

---

## Phase 5: User Story 3 — Real-Time Unread Badge Updates (Priority: P3)

**Goal**: A connected player receives `notification.new` and `notification.unread-count` push
events over WebSocket within 2s of any notification being created or read.

**Independent Test**: See quickstart.md Scenario 3. Open a socket.io connection for player B
with a valid JWT. Trigger a notification event for B. Expect `notification.new` followed by
`notification.unread-count` on the socket — no HTTP request from B required.

- [ ] T027 [P] Create `src/realtime/realtime-push.port.ts` — export interface
  `IRealtimePushPort { pushToUser(userId: string, event: string, payload: unknown): Promise<void> }`
  and symbol `REALTIME_PUSH_PORT`.

- [ ] T028 [P] Create `src/realtime/realtime.gateway.ts` — `@WebSocketGateway({ path:
  '/realtime', cors: true })` class `RealtimeGateway` implementing `OnGatewayConnection` and
  `OnGatewayDisconnect`. Injects `ConfigService`. On `handleConnection`: reads
  `client.handshake.auth.token`, verifies JWT using
  `configService.get<AuthConfig>('auth')!.jwtAccessSecret` (grouped config — resolves finding
  **M3**); if invalid/missing, calls `client.disconnect(true)`. On success, registers the socket
  in an internal `Map<string, Set<Socket>>` keyed by `userId` (supports multiple sockets per
  user — multi-tab, per research.md §8 CHK015). On `handleDisconnect`: removes the socket from
  the map. Exposes `pushToUser(userId, event, payload)` method that iterates all sockets for the
  user and emits the event on each.
  *(Resolves findings **M2** — `path: '/realtime'` matches contracts/http-api.md; **M3** —
  grouped `AuthConfig` pattern.)*

- [ ] T029 [P] Create `src/realtime/realtime.service.ts` — `RealtimeService` that injects
  `RealtimeGateway` and delegates `pushToUser(userId, event, payload)` to it. Wraps the gateway
  call in `try/catch` — push failures are logged and swallowed so they never propagate to callers.

- [ ] T030 Create `src/realtime/realtime.module.ts` — `RealtimeModule` (NOT `@Global()`).
  Declares `RealtimeGateway` and `RealtimeService`. Exports `RealtimeService`. This module is
  imported by `NotificationModule`.

- [ ] T031 Create `src/notification/infrastructure/realtime/realtime-push.adapter.ts` —
  `RealtimePushAdapter` implements `IRealtimePushPort`. Injects `RealtimeService`. Calls
  `realtimeService.pushToUser(userId, event, payload)`.

- [ ] T032 Update `src/notification/notification.module.ts`: import `RealtimeModule`. Add
  `RealtimePushAdapter` to providers. Bind `REALTIME_PUSH_PORT → RealtimePushAdapter`.

- [ ] T033 Update `src/app.module.ts`: add `RealtimeModule` to `imports` (needed for the
  gateway to be bootstrapped by NestJS on startup).

- [ ] T034 [US3] Update `src/notification/application/commands/create-notification.use-case.ts`:
  inject `REALTIME_PUSH_PORT` (optional injection — use `@Optional() @Inject(REALTIME_PUSH_PORT)`
  so the use-case works without the port during US1/US2 phases). After successful `repo.save(...)`,
  push two events using `NotificationMapper.toRealtimePayload(savedNotification)`:
  (1) `pushPort.pushToUser(recipientId, 'notification.new', NotificationMapper.toRealtimePayload(saved))`,
  (2) `pushPort.pushToUser(recipientId, 'notification.unread-count', { unreadCount: await repo.countUnread(recipientId) })`.
  Each push call is wrapped in its own independent `try/catch` — a push failure MUST NOT roll
  back or reject the save. *(Resolves finding **C1** — uses `NotificationMapper` from the
  interface layer via the adapter, not a DTO import in the use-case. The use-case calls the port
  with the domain entity; the mapper is called inside `RealtimePushAdapter` or via the port
  implementation, keeping the use-case free of interface-layer imports.)*

  > **Implementation note for C1**: `RealtimePushAdapter.pushToUser` receives the raw payload
  > object pre-mapped by the caller. The use-case calls `NotificationMapper.toRealtimePayload()`
  > which lives in the interface layer — this is acceptable only if the mapper is imported as a
  > pure utility with no NestJS/HTTP coupling. Alternatively, define a separate
  > `toWireShape(n: Notification): object` function in a shared `notification.serializer.ts`
  > file in `src/notification/application/` so it has no interface-layer import in the use-case.
  > Choose whichever keeps the application layer clean; prefer the application-layer serializer.

- [ ] T035 [US3] Update `src/notification/application/commands/
  mark-notification-read.use-case.ts`: inject `REALTIME_PUSH_PORT` (`@Optional()`). After
  `repo.markAsRead(...)`, call `pushPort.pushToUser(notification.recipientId,
  'notification.unread-count', { unreadCount: await repo.countUnread(notification.recipientId) })`.
  Wrap in `try/catch` — push failure MUST NOT affect the HTTP response.

**Checkpoint**: Run quickstart.md Scenarios 3 and 4. All three user stories are functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: OpenAPI documentation, final validation, and performance spot-check.

- [ ] T036 [P] Review `NotificationsController` (`GET /` and `PATCH /:id/read`) and all DTOs in
  `src/notification/interface/dto/` to confirm `@ApiOperation`, `@ApiResponse`, and
  `@ApiProperty` decorators are complete and accurate. Verify `NotificationEntryDto` is the
  single shared shape for both endpoints (no separate mark-read DTO — resolves finding **L1**).

- [ ] T037 [P] Confirm `NotificationOrmEntity` is discoverable by the TypeORM glob pattern
  `__dirname + '/**/*.orm-entity{.ts,.js}'` in `app.module.ts`. Run `npm run migration:generate`
  and verify it detects no schema drift (all columns already covered by T006 migration).

- [ ] T038 Regenerate `openapi.yml` at the repository root using the existing generate script
  (e.g., `npm run swagger:generate`). Verify the generated spec includes:
  - `GET /notifications` with cursor query params and `NotificationListResponseDto` response schema.
  - `PATCH /notifications/{id}/read` with UUID path param and `NotificationEntryDto` response schema.
  Commit the updated `openapi.yml` alongside the feature PR (constitution §VI mandate).

- [ ] T039 Run all six quickstart.md validation scenarios manually. For each scenario, record
  actual outcomes. Additionally perform these **performance spot-checks** (resolves finding **M1**
  — validates SC-001 and SC-004):
  - **SC-001**: Seed ≥100 notifications for player B. Run `GET /notifications` and confirm
    response time is under 1 second (measure with `curl -w "%{time_total}"` or equivalent).
  - **SC-004**: Record the server-side timestamp when a `notification.friend-or-game-invite`
    event is processed. Record the timestamp when the WebSocket push is received on the client.
    Confirm the delta is under 2 seconds.
  Document any deviations as known issues or update spec/contracts to reflect actual behaviour.

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup — SharedAuthModule + DomainExceptionFilter global)
  └─► Phase 2 (Foundational — DB + domain layer + AccountExistenceService)
        └─► Phase 3 (US1 — Create + List notifications)  [MVP milestone]
              └─► Phase 4 (US2 — Mark as read)
                    └─► Phase 5 (US3 — Real-time push)
                          └─► Phase 6 (Polish)
```

### User Story Dependencies

- **US1 (P1)**: Depends on Phase 1 + 2. No dependency on US2 or US3.
- **US2 (P2)**: Depends on US1 being complete (notification must exist before it can be marked).
- **US3 (P3)**: Depends on US1 and US2 being complete (pushes after both create and mark-read).
  Introduces `RealtimeModule` as a new dependency.

### Within Phase 3 — Correct Execution Order (resolves finding H2)

```
T014 (CreateNotificationUseCase) ─► T017 (DomainEventListener — depends on T014)
T015 (NotificationMapper)        ─┐
T016 (GetNotificationsUseCase)   ─┤
                                  ├─► T019 (Controller GET) ─► T020 (ExceptionFilter global)
                                  │                           ─► T021 (Module) ─► T022 (AppModule)
T014 (CreateNotificationUseCase) ─┘
T018 (DTOs)                      ─► T019 (also uses DTOs)
T023 (SendFriendRequest emit)    ─┐ [parallel, after Phase 1]
T024 (ResolveFriendRequest emit) ─┘ [parallel, after Phase 1]
```

> **Note**: T017 (DomainEventListener) depends on T014 completing first. T015 (mapper) and
> T016 (GetNotificationsUseCase) are independent of each other and of T017 — all three can
> start once T014 is done.

### Within Phase 5 — Execution Order

```
T027 (IRealtimePushPort) ─► T031 (RealtimePushAdapter) ─► T032 (NotificationModule update)
T028 (Gateway) ─┐                                         ─► T034 (CreateNotification update)
T029 (Service)  ─┤─► T030 (RealtimeModule) ─► T033 (AppModule) ─► T035 (MarkRead update)
```

---

## Parallel Opportunities

### Phase 2 Parallel Batch

```
# These 4 tasks have no inter-dependencies — run simultaneously:
T007  Notification domain entity + enum
T008  INotificationRepository + IAccountExistencePort ports
T009  Domain errors
T010  NotificationOrmEntity

# Then sequentially:
T011  NotificationTypeOrmRepository      (depends on T008, T010)
T012  AccountExistenceService export     (depends on AccountSocialModule — Phase 1 prerequisite)
T013  AccountExistenceAdapter            (depends on T008, T012)
```

### Phase 3 Parallel Batch

```
# After T014 (CreateNotificationUseCase) completes:
T015  NotificationMapper                 (depends only on T007 domain entity)
T016  GetNotificationsUseCase            (depends on T008 port)
T017  DomainEventListener               (depends on T014)
T018  DTOs                               (no dependencies)

# After Phase 1 (independently of Phase 2/3 domain work):
T023  SendFriendRequest emit
T024  ResolveFriendRequest emit
```

### Phase 5 Parallel Batch

```
# These 2 have no inter-dependencies — start simultaneously:
T027  IRealtimePushPort
T028  RealtimeGateway

# T029 (RealtimeService) depends only on T028 completing first:
T029  RealtimeService                    (depends on T028)
```

*(Resolves finding **L4** — T029 added to parallel batch with explicit dependency note.)*

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: SharedAuthModule extraction + global exception filter prep (T001–T005)
2. Complete Phase 2: DB + domain/ORM layer + AccountExistenceService (T006–T013)
3. Complete Phase 3: US1 — create + list notifications (T014–T024)
4. **STOP and VALIDATE**: run quickstart.md Scenarios 1 + 4
5. Deploy / demo: notifications are persisted and retrievable

### Incremental Delivery

1. **Phase 1 + 2 + 3** → foundation + US1 (**MVP**)
2. **+ Phase 4 (US2)** → add mark-as-read → read-state management
3. **+ Phase 5 (US3)** → add real-time push → live badge count
4. **+ Phase 6** → OpenAPI regeneration + performance spot-check

### Solo Developer Sequence (corrected — resolves finding H2)

```
T001 → T002 → T003 → T004 → T005
→ T006 → [T007, T008, T009, T010 in parallel] → T011 → T012 → T013
→ T014 → T015 → [T016, T017, T018 in parallel] → T019 → T020 → T021 → T022
→ [T023, T024 in parallel]
→ T025 → T026
→ [T027, T028 in parallel] → T029 → T030 → T031 → T032 → T033 → T034 → T035
→ [T036, T037 in parallel] → T038 → T039
```

---

## Analysis Findings Resolution Summary

| Finding | Severity | Resolution |
|---|---|---|
| **C1** — use-case DTO import (hexagonal violation) | CRITICAL | T015 creates interface-layer mapper; T034 uses it via adapter pattern |
| **C2** — DomainExceptionFilter not in NotificationModule | CRITICAL | T020 makes filter global in AppModule; T005 removes scoped registration |
| **H1** — cross-schema raw SQL query (module boundary) | HIGH | T012 exports `AccountExistenceService`; T013 uses it via port adapter |
| **H2** — T017 parallel sequence contradiction | HIGH | Solo sequence corrected; T017 follows T014, not concurrent with T016 |
| **M1** — no SC-001/SC-004 validation task | MEDIUM | T039 includes explicit latency spot-checks for both criteria |
| **M2** — gateway path mismatch | MEDIUM | T028 uses `path: '/realtime'` not `namespace: '/'` |
| **M3** — flat ConfigService key access | MEDIUM | T028 uses `configService.get<AuthConfig>('auth')!.jwtAccessSecret` |
| **M4** — `NotificationNotFoundError` for recipient | MEDIUM | T009 adds `InvalidRecipientError`; T014 throws it for unknown recipient |
| **L1** — T033/T036 redundant Swagger check | LOW | T036 is a review task; merged with CHK010 verification |
| **L2** — senderUsername not loaded | LOW | T023 explicitly instructs `accountRepo.findById(callerId)` |
| **L3** — `<placeholder>` template ambiguity | LOW | T023/T024 use template literals with backticks |
| **L4** — Phase 5 parallel batch incomplete | LOW | T029 added to batch with explicit T028 prerequisite |

---

## Notes

- `[P]` tasks modify different files with no incomplete dependencies — safe to run in parallel.
- `[Story]` label maps each task to its user story for independent traceability.
- T023 and T024 modify existing `account-social` use-cases — the only tasks touching code
  outside `NotificationModule` (besides Phase 1 and T012).
- T020 also modifies `DomainExceptionFilter` — verify all existing `account-social` error
  classes remain properly handled after the filter is made global.
- Run `npm run build` after T005 (Phase 1 complete) and again after T013 (Phase 2 complete)
  to catch regressions early.
- Run `npm run migration:run` after T006 before any integration testing.
- Never suppress TypeScript errors with `// @ts-ignore` — fix the root cause.
- The `@Optional()` decorator on `REALTIME_PUSH_PORT` in T034/T035 allows US1/US2 to be
  tested without US3 wired in — remove `@Optional()` once Phase 5 is complete.
