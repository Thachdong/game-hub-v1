---
description: "Task list for Account & Social API"
---

# Tasks: Account & Social API

**Input**: Design documents from `specs/001-account-social/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | data-model.md ✅ | contracts/openapi.yml ✅ | research.md ✅

**Tests**: Not requested — no test tasks generated.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)
- All paths are relative to the repository root (`/Users/dongt/Desktop/workspace/game-hub-v1/04-Projects/api/`)

## Path Conventions

- **Module root**: `src/account-social/`
- **Domain layer**: `src/account-social/domain/`
- **Application layer**: `src/account-social/application/`
- **Infrastructure layer**: `src/account-social/infrastructure/`
- **Interface layer**: `src/account-social/interface/`
- **Config**: `src/config/`
- **Migrations**: `src/database/migrations/`

---

## Phase 1: Setup

**Purpose**: Bootstrap project and install all dependencies.

- [x] T001 Initialize NestJS project (nest new or manual setup); add all runtime dependencies to package.json: @nestjs/core @nestjs/common @nestjs/platform-express @nestjs/passport passport passport-google-oauth20 @nestjs/jwt typeorm pg @nestjs/typeorm @nestjs/config joi @nestjs/swagger @nestjs/event-emitter eventemitter2 reflect-metadata rxjs; dev deps: @types/passport-google-oauth20 @types/pg ts-jest @nestjs/testing supertest @types/supertest
- [x] T002 [P] Configure tsconfig.json: strict true, experimentalDecorators true, emitDecoratorMetadata true, paths aliases for @domain/* @application/* @infrastructure/* @interface/*
- [x] T003 [P] Configure .eslintrc.js with @typescript-eslint/recommended; add no-restricted-imports rule to prevent src/account-social/domain and src/account-social/application from importing src/account-social/infrastructure or @nestjs/* (enforces hexagonal layer boundary)
- [x] T004 [P] Create full directory skeleton: mkdir -p for all directories in plan.md project structure (src/account-social/{domain/{entities,events,ports,errors},application/{commands,queries},infrastructure/{persistence/typeorm-entities,google-oauth,events},interface/{http,dto/{auth,account,games,friends,admin},guards,filters}}, src/config, src/database/migrations)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: All items here MUST be complete before any user story implementation begins.

**⚠️ CRITICAL**: No user story work starts until this phase is complete.

### Domain Error Base

- [x] T005 [P] Create DomainError base class and all domain error subclasses in src/account-social/domain/errors/: DomainError (extends Error), AccountNotFoundError, SelfFriendRequestError, FriendRequestDuplicateError, AlreadyFriendsError, FriendRequestNotFoundError, ForbiddenDomainError, InvalidRefreshTokenError, GameNotFoundError, GameAdminRoleNotFoundError — each with a readonly `code` string property matching the error codes in contracts/openapi.yml

### Config

- [x] T006 [P] Create src/config/auth.config.ts: export AuthConfig interface (jwtAccessSecret: string, jwtAccessExpiresIn: string, jwtRefreshSecret: string, jwtRefreshExpiresIn: string) and registerAs('auth', () => config factory)
- [x] T007 [P] Create src/config/google-oauth.config.ts: export GoogleOAuthConfig interface (clientId, clientSecret, callbackUrl) and registerAs('googleOAuth', factory)
- [x] T008 [P] Create src/config/app.config.ts: export AppConfig interface (port: number, platformAdminEmails: string[]) and registerAs('app', factory that splits PLATFORM_ADMIN_EMAILS env var on comma); include Joi validationSchema requiring JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET non-empty strings

### AppModule

- [x] T009 Create src/app.module.ts: @Module importing ConfigModule.forRoot({isGlobal:true, load:[authConfig,googleOAuthConfig,appConfig], validationSchema: JoiSchema from T008}), TypeOrmModule.forRootAsync({useFactory: builds DataSourceOptions from DATABASE_URL, synchronize:false, migrationsRun:false}), EventEmitterModule.forRoot({wildcard:false})
- [x] T009a Create src/main.ts: bootstrap NestJS app (NestFactory.create(AppModule)); app.setGlobalPrefix('api'); app.useGlobalPipes(new ValidationPipe({whitelist:true, transform:true})); read port from ConfigService.get<AppConfig>('app').port; app.listen(port); — GlobalExceptionFilter is registered at module level via APP_FILTER in T065, not here; this file is updated in T066 to add Swagger

### Domain Entities (pure TypeScript — zero external imports)

- [x] T010 [P] Create Account domain entity in src/account-social/domain/entities/account.ts (id: string; email: string; username: string; avatarUrl: string; createdAt: Date)
- [x] T011 [P] Create FriendRequest domain entity + FriendRequestStatus enum in src/account-social/domain/entities/friend-request.ts (id, senderId, receiverId, status: FriendRequestStatus, createdAt, resolvedAt: Date|null)
- [x] T012 [P] Create Friendship domain entity in src/account-social/domain/entities/friendship.ts (id, accountId1, accountId2, createdAt; doc comment: accountId1 is always the lexicographically smaller UUID — invariant enforced by use-case before insert)
- [x] T013 [P] Create GameAdminRole domain entity in src/account-social/domain/entities/game-admin-role.ts (id, accountId, gameId, grantedAt: Date)
- [x] T014 [P] Create PlayerGameProfile domain entity in src/account-social/domain/entities/player-game-profile.ts (id, accountId, gameId, recordedAt: Date)

### Port Interfaces (domain contracts — zero external imports)

- [x] T015 [P] Create IAccountRepository port in src/account-social/domain/ports/account.repository.port.ts: findByEmail(email: string): Promise<Account|null>; findById(id: string): Promise<Account|null>; save(account: Omit<Account,'id'|'createdAt'>): Promise<Account>
- [x] T016 [P] Create IFriendRequestRepository port in src/account-social/domain/ports/friend-request.repository.port.ts: upsert(data): Promise<FriendRequest>; findById(id): Promise<FriendRequest|null>; findPendingBetween(senderId, receiverId): Promise<FriendRequest|null>; findPendingSentBy(accountId): Promise<FriendRequest[]>; findPendingReceivedBy(accountId): Promise<FriendRequest[]>; updateStatus(id, status, resolvedAt): Promise<FriendRequest>
- [x] T017 [P] Create IFriendshipRepository port in src/account-social/domain/ports/friendship.repository.port.ts: existsBetween(accountIdA, accountIdB): Promise<boolean>; insert(accountId1, accountId2): Promise<Friendship>; findByAccount(accountId): Promise<{peerId: string}[]>
- [x] T018 [P] Create IGameAdminRoleRepository port in src/account-social/domain/ports/game-admin-role.repository.port.ts: upsert(accountId, gameId): Promise<GameAdminRole>; delete(accountId, gameId): Promise<void>; findByAccountId(accountId): Promise<string[]> (returns gameId array); existsForPair(accountId, gameId): Promise<boolean>
- [x] T019 [P] Create IPlayerGameProfileRepository port in src/account-social/domain/ports/player-game-profile.repository.port.ts: upsert(accountId, gameId): Promise<void>; findGameIdsByAccountId(accountId): Promise<string[]>
- [x] T020 [P] Create IGameRegistryPort in src/account-social/domain/ports/game-registry.port.ts: export type GameRef = {id:string; name:string; slug:string}; export interface IGameRegistryPort { findAll(): Promise<GameRef[]>; exists(gameId: string): Promise<boolean> }
- [x] T021 [P] Create IGoogleOAuthPort in src/account-social/domain/ports/google-oauth.port.ts: export type GoogleUserInfo = {email:string; name:string; avatarUrl:string}; export interface IGoogleOAuthPort { getProfile(accessToken: string): Promise<GoogleUserInfo> }
- [x] T022 [P] Create IEventPublisherPort in src/account-social/domain/ports/event-publisher.port.ts: publish(eventName: string, event: object): Promise<void>
- [x] T023 [P] Create ITokenService port in src/account-social/domain/ports/token.service.port.ts: signAccessToken(payload: AccessTokenPayload): string; signRefreshToken(sub: string): string; verifyRefreshToken(token: string): RefreshTokenPayload; export types AccessTokenPayload {sub,email,isPlatformAdmin,gameAdminRoles,type:'access'} and RefreshTokenPayload {sub,type:'refresh'}

### Domain Events

- [x] T024 [P] Create FriendRequestResolvedEvent in src/account-social/domain/events/friend-request-resolved.event.ts (static readonly EVENT_NAME = 'friend-request.resolved'; readonly requestId, senderId, receiverId, resolution:'accepted'|'rejected', resolvedAt: Date) and GameProfileCreatedEvent in src/account-social/domain/events/game-profile-created.event.ts (static readonly EVENT_NAME = 'game.profile.created'; readonly accountId: string, gameId: string)

### Migration

- [x] T025 Create TypeORM migration in src/database/migrations/1751000000000-CreateAccountSocialSchema.ts: up() runs in order: (1) CREATE SCHEMA IF NOT EXISTS account_social; (2) CREATE TABLE account_social.accounts (id uuid PK DEFAULT gen_random_uuid(), email varchar UNIQUE NOT NULL, username varchar NOT NULL, avatar_url text NOT NULL, created_at timestamptz DEFAULT now()); (3) CREATE TABLE account_social.friend_requests (id uuid PK, sender_id uuid NOT NULL, receiver_id uuid NOT NULL, status varchar NOT NULL DEFAULT 'pending', created_at timestamptz DEFAULT now(), resolved_at timestamptz, UNIQUE(sender_id, receiver_id)); CREATE INDEX ON account_social.friend_requests(receiver_id, status); CREATE INDEX ON account_social.friend_requests(sender_id, status); (4) CREATE TABLE account_social.friendships (id uuid PK, account_id_1 uuid NOT NULL, account_id_2 uuid NOT NULL, created_at timestamptz DEFAULT now(), UNIQUE(account_id_1, account_id_2)); CREATE INDEX ON account_social.friendships(account_id_1); CREATE INDEX ON account_social.friendships(account_id_2); (5) CREATE TABLE account_social.game_admin_roles (id uuid PK, account_id uuid NOT NULL, game_id uuid NOT NULL, granted_at timestamptz DEFAULT now(), UNIQUE(account_id, game_id)); CREATE INDEX ON account_social.game_admin_roles(account_id); (6) CREATE TABLE account_social.player_game_profiles (id uuid PK, account_id uuid NOT NULL, game_id uuid NOT NULL, recorded_at timestamptz DEFAULT now(), UNIQUE(account_id, game_id)); CREATE INDEX ON account_social.player_game_profiles(account_id); down() drops all tables and schema.
- [x] T025a Create src/database/data-source.ts: export const AppDataSource = new DataSource({ type:'postgres', url: process.env.DATABASE_URL, entities: ['src/**/*.orm-entity.ts'], migrations: ['src/database/migrations/*.ts'], schema: 'account_social', synchronize: false, logging: ['error'] }); this file is used exclusively by the TypeORM CLI (migration:run, migration:revert, migration:generate) — NOT imported by AppModule

### Guards

- [x] T026 [P] Create JwtAuthGuard in src/account-social/interface/guards/jwt-auth.guard.ts (extends AuthGuard('jwt') from @nestjs/passport — throws UnauthorizedException if no valid JWT) and OptionalJwtGuard in src/account-social/interface/guards/optional-jwt.guard.ts (overrides handleRequest: return null ONLY when no Authorization header is present at all; throw UnauthorizedException if a header is present but the token is malformed, expired, or fails signature validation — never silently swallow a bad token)
- [x] T027 [P] Create PlatformAdminGuard in src/account-social/interface/guards/platform-admin.guard.ts (implements CanActivate; reads request.user?.isPlatformAdmin; throws ForbiddenException with code FORBIDDEN if false or missing)

### Module Skeleton

- [x] T028 Create AccountSocialModule skeleton in src/account-social/account-social.module.ts with empty @Module({}) — full provider wiring completed in T062 (Polish phase)

**Checkpoint**: All domain contracts, migration, guards, and module skeleton are ready. User story implementation can begin.

---

## Phase 3: User Story 1 — Google OAuth Authentication & Token Issuance (Priority: P1) 🎯 MVP

**Goal**: Users can login via Google OAuth, receive JWT tokens, and refresh access tokens.

**Independent Test**: Call GET /api/auth/google → callback → receive token pair. Decode access token to verify claims. Call POST /api/auth/refresh to get new access token.

### Implementation for User Story 1

- [x] T029 [P] [US1] Create Account ORM entity in src/account-social/infrastructure/persistence/typeorm-entities/account.orm-entity.ts: @Entity({schema:'account_social', name:'accounts'}); @PrimaryGeneratedColumn('uuid') id; @Column({unique:true}) email; @Column() username; @Column({name:'avatar_url'}) avatarUrl; @CreateDateColumn({name:'created_at'}) createdAt
- [x] T030 [P] [US1] Create AccountTypeOrmRepository in src/account-social/infrastructure/persistence/account.typeorm-repository.ts: implements IAccountRepository; constructor(@InjectRepository(AccountOrmEntity) private repo; findByEmail uses WHERE email=:email; findById uses WHERE id=:id; save uses repo.save then maps ORM→domain entity
- [x] T031 [P] [US1] Create JwtTokenServiceAdapter in src/account-social/infrastructure/auth/jwt-token.adapter.ts: implements ITokenService; constructor injects JwtService (from @nestjs/jwt) and AuthConfig (from ConfigService); signAccessToken signs with accessSecret+expiry; signRefreshToken signs with refreshSecret+30d; verifyRefreshToken verifies with refreshSecret and asserts payload.type==='refresh'
- [x] T032 [P] [US1] Create GoogleOAuthAdapter in src/account-social/infrastructure/google-oauth/google-oauth.adapter.ts: extends PassportStrategy(Strategy, 'google') from passport-google-oauth20; constructor injects GoogleOAuthConfig via ConfigService; callbackURL, clientID, clientSecret from config; scope ['email','profile']; validate(accessToken, refreshToken, profile) returns GoogleUserInfo {email, name, avatarUrl from photos[0].value}
- [x] T033 [P] [US1] Create EventPublisherAdapter in src/account-social/infrastructure/events/event-publisher.adapter.ts: implements IEventPublisherPort; constructor injects EventEmitter2; publish(eventName, event) calls this.emitter.emit(eventName, event)
- [x] T034 [US1] Create LoginWithGoogleUseCase in src/account-social/application/commands/login-with-google.use-case.ts: injects IAccountRepository (token ACCOUNT_REPO), IGameAdminRoleRepository (token GAME_ADMIN_ROLE_REPO), ITokenService (token TOKEN_SERVICE), AppConfig via @Inject(APP_CONFIG) where APP_CONFIG is a Symbol DI token — do NOT inject ConfigService directly (application layer MUST NOT import NestJS classes per Principle I); execute(googleUser: GoogleUserInfo): find account by email or create new; load gameAdminRoles: string[] via IGameAdminRoleRepository.findByAccountId; check isPlatformAdmin = platformAdminEmails.includes(account.email); sign access+refresh tokens; return {accessToken, refreshToken, account}
- [x] T035 [US1] Create RefreshAccessTokenUseCase in src/account-social/application/commands/refresh-access-token.use-case.ts: injects ITokenService, IAccountRepository, IGameAdminRoleRepository, AppConfig via @Inject(APP_CONFIG) DI token (not ConfigService); execute(refreshToken): wrap ITokenService.verifyRefreshToken(refreshToken) in try/catch — on any error throw InvalidRefreshTokenError (domain error defined in T005); on success extract sub; load account by sub (throw AccountNotFoundError if not found); reload gameAdminRoles from DB; re-check isPlatformAdmin; sign new access token; return {accessToken}
- [x] T036 [P] [US1] Create auth DTOs in src/account-social/interface/dto/auth/: AccountInResponseDto (id,email,username,avatarUrl all @ApiProperty); LoginResponseDto (accessToken,refreshToken both @ApiProperty, account: AccountInResponseDto @ApiProperty); RefreshRequestDto (refreshToken: string @IsNotEmpty @ApiProperty); RefreshResponseDto (accessToken: string @ApiProperty)
- [x] T037 [US1] Create AuthController in src/account-social/interface/http/auth.controller.ts: @ApiTags('Auth') @Controller('auth'); GET /auth/google @UseGuards(AuthGuard('google')) @ApiOperation @ApiResponse(302 redirect); GET /auth/google/callback @UseGuards(AuthGuard('google')) calls LoginWithGoogleUseCase with req.user (GoogleUserInfo from Passport); catches GoogleOAuthUnavailableError→HttpException(503,'GOOGLE_OAUTH_UNAVAILABLE'); POST /auth/refresh @Body RefreshRequestDto calls RefreshAccessTokenUseCase; catches InvalidRefreshTokenError→HttpException(401,'AUTH_REFRESH_TOKEN_INVALID'); all responses follow LoginResponseDto/RefreshResponseDto; @ApiResponse for 200, 400, 401, 503 per openapi.yml

**Checkpoint**: US1 complete — GET /api/auth/google → callback → token pair works end-to-end.

---

## Phase 4: User Story 2 — Account Profile & Platform Game List (Priority: P2)

**Goal**: Logged-in player retrieves own profile and sees game list with `hasProfile` flag. Guests see game list without `hasProfile`.

**Independent Test**: GET /api/accounts/me returns profile. GET /api/games returns games with/without hasProfile depending on auth.

### Implementation for User Story 2

- [x] T038 [P] [US2] Create PlayerGameProfile ORM entity in src/account-social/infrastructure/persistence/typeorm-entities/player-game-profile.orm-entity.ts: @Entity({schema:'account_social',name:'player_game_profiles'}); @Unique(['accountId','gameId']); id uuid PK; accountId, gameId uuid columns; @CreateDateColumn() recordedAt
- [x] T039 [US2] Create PlayerGameProfileTypeOrmRepository in src/account-social/infrastructure/persistence/player-game-profile.typeorm-repository.ts: implements IPlayerGameProfileRepository; upsert(accountId, gameId) runs INSERT INTO account_social.player_game_profiles(id,account_id,game_id) VALUES(uuid,…) ON CONFLICT(account_id,game_id) DO NOTHING via DataSource.query; findGameIdsByAccountId returns string[] of game_id values
- [x] T040 [US2] Create GameRegistryTypeOrmRepository in src/account-social/infrastructure/persistence/game-registry.typeorm-repository.ts: implements IGameRegistryPort; constructor injects DataSource; findAll() SELECT id,name,slug FROM platform.games ORDER BY name; exists(gameId) SELECT COUNT(1) FROM platform.games WHERE id=$1; returns boolean. Note: reads from platform.games — a cross-schema read within the same DB connection (not a cross-module service call)
- [x] T041 [P] [US2] Create GameProfileCreatedListener in src/account-social/infrastructure/events/game-profile-created.listener.ts: @Injectable(); @OnEvent(GameProfileCreatedEvent.EVENT_NAME) handler(event: GameProfileCreatedEvent); validates event.accountId and event.gameId are non-empty strings; calls IPlayerGameProfileRepository.upsert(event.accountId, event.gameId); idempotent — duplicate events produce no error
- [x] T042 [US2] Create GetAccountProfileUseCase in src/account-social/application/queries/get-account-profile.use-case.ts: injects IAccountRepository; execute(accountId): finds account or throws AccountNotFoundError
- [x] T043 [US2] Create GetGameListUseCase in src/account-social/application/queries/get-game-list.use-case.ts: injects IGameRegistryPort, IPlayerGameProfileRepository; execute(accountId?: string): load games via IGameRegistryPort.findAll(); if accountId: load profileGameIds=new Set(IPlayerGameProfileRepository.findGameIdsByAccountId); map games to GameRef & {hasProfile: profileGameIds.has(game.id)}; if no accountId: return games without hasProfile
- [x] T044 [P] [US2] Create AccountProfileDto in src/account-social/interface/dto/account/account-profile.dto.ts (id,email,username,avatarUrl all @ApiProperty)
- [x] T045 [P] [US2] Create GameEntryDto (id,name,slug @ApiProperty; hasProfile @ApiPropertyOptional) and GameListResponseDto (games: GameEntryDto[] @ApiProperty) in src/account-social/interface/dto/games/
- [x] T046 [US2] Create AccountController in src/account-social/interface/http/account.controller.ts: @ApiTags('Account') @Controller('accounts'); GET /accounts/me @UseGuards(JwtAuthGuard) calls GetAccountProfileUseCase(req.user.sub); returns AccountProfileDto; @ApiOperation @ApiResponse(200) @ApiResponse(401)
- [x] T047 [US2] Create GamesController in src/account-social/interface/http/games.controller.ts: @ApiTags('Games') @Controller('games'); GET /games @UseGuards(OptionalJwtGuard) calls GetGameListUseCase(req.user?.sub); returns GameListResponseDto; @ApiOperation @ApiResponse(200)

**Checkpoint**: US1 + US2 independently functional. GET /api/accounts/me and GET /api/games work correctly.

---

## Phase 5: User Story 3 — Friend Request & Friendship Management (Priority: P3)

**Goal**: Players can send, accept, reject friend requests and view friends. Friendship is mutual-only.

**Independent Test**: Account A sends request to B, B accepts — both appear in each other's friend lists. Test all error guards (unknown email, self-request, duplicate, already-friends cross-direction).

### Implementation for User Story 3

- [x] T048 [P] [US3] Create FriendRequest ORM entity in src/account-social/infrastructure/persistence/typeorm-entities/friend-request.orm-entity.ts: @Entity account_social.friend_requests; @Unique(['senderId','receiverId']); id uuid PK; senderId, receiverId uuid NOT NULL; @Column({type:'enum', enum:FriendRequestStatus, default:'pending'}) status; @CreateDateColumn() createdAt; @Column({nullable:true}) resolvedAt: Date|null
- [x] T049 [P] [US3] Create Friendship ORM entity in src/account-social/infrastructure/persistence/typeorm-entities/friendship.orm-entity.ts: @Entity account_social.friendships; @Unique(['accountId1','accountId2']); id uuid PK; accountId1, accountId2 uuid NOT NULL; @CreateDateColumn() createdAt
- [x] T050 [US3] Create FriendRequestTypeOrmRepository in src/account-social/infrastructure/persistence/friend-request.typeorm-repository.ts: implements IFriendRequestRepository; upsert(senderId,receiverId): INSERT INTO account_social.friend_requests(id,sender_id,receiver_id,status,created_at) VALUES(uuid,…,'pending',now()) ON CONFLICT(sender_id,receiver_id) DO UPDATE SET status='pending', resolved_at=NULL, created_at=now() RETURNING *; findById: SELECT WHERE id=:id; findPendingBetween: WHERE sender_id=:s AND receiver_id=:r AND status='pending'; findPendingSentBy: WHERE sender_id=:id AND status='pending'; findPendingReceivedBy: WHERE receiver_id=:id AND status='pending'; updateStatus: UPDATE SET status=:s, resolved_at=:r WHERE id=:id RETURNING *
- [x] T051 [US3] Create FriendshipTypeOrmRepository in src/account-social/infrastructure/persistence/friendship.typeorm-repository.ts: implements IFriendshipRepository; insert(idA, idB): order ids so id1=min(idA,idB), id2=max(idA,idB); INSERT INTO account_social.friendships(id,account_id_1,account_id_2) VALUES(uuid,id1,id2); existsBetween(idA, idB): SELECT 1 WHERE (account_id_1=min AND account_id_2=max); findByAccount(accountId): SELECT account_id_1, account_id_2 WHERE account_id_1=:id OR account_id_2=:id, map to {peerId: the other id}
- [x] T052 [US3] Create SendFriendRequestUseCase in src/account-social/application/commands/send-friend-request.use-case.ts: injects IAccountRepository, IFriendRequestRepository, IFriendshipRepository; execute(senderId, targetEmail): (1) findByEmail(targetEmail) or throw AccountNotFoundError; (2) senderId===receiver.id → throw SelfFriendRequestError; (3) existsBetween(senderId, receiverId) → throw AlreadyFriendsError; (4) findPendingBetween(senderId, receiverId) (not null) → throw FriendRequestDuplicateError; (5) upsert FriendRequest; return FriendRequest
- [x] T053 [US3] Create ResolveFriendRequestUseCase in src/account-social/application/commands/resolve-friend-request.use-case.ts: injects IFriendRequestRepository, IFriendshipRepository, IEventPublisherPort; execute(callerId, requestId, action:'accept'|'reject'): (1) findById or throw FriendRequestNotFoundError; (2) request.receiverId !== callerId → throw ForbiddenDomainError; (3) existsBetween(request.senderId, request.receiverId) → throw AlreadyFriendsError (FR-019 guard); (4) if ACCEPT: FriendshipRepository.insert(senderId, receiverId); (5) updateStatus(requestId, action==='accept'?ACCEPTED:REJECTED, new Date()); (6) publish(FriendRequestResolvedEvent.EVENT_NAME, new FriendRequestResolvedEvent({requestId, senderId, receiverId, resolution: action, resolvedAt})); return updated FriendRequest
- [x] T054 [P] [US3] Create GetFriendsUseCase in src/account-social/application/queries/get-friends.use-case.ts: injects IFriendshipRepository, IAccountRepository; execute(accountId): friendships=findByAccount(accountId); peerIds=[...friendships.map(f=>f.peerId)]; return Promise.all(peerIds.map(id=>findById(id))).then(accounts=>accounts.filter(Boolean))
- [x] T055 [P] [US3] Create GetFriendRequestsUseCase in src/account-social/application/queries/get-friend-requests.use-case.ts: injects IFriendRequestRepository; execute(accountId): returns {incoming: findPendingReceivedBy(accountId), outgoing: findPendingSentBy(accountId)}
- [x] T056 [P] [US3] Create friend DTOs in src/account-social/interface/dto/friends/: SendFriendRequestDto (targetEmail: @IsEmail @ApiProperty); ResolveFriendRequestDto (action: 'accept'|'reject' @IsIn @ApiProperty); FriendRequestRecordDto (id,senderId,receiverId,status,createdAt,resolvedAt all @ApiProperty); FriendProfileDto (id,email,username,avatarUrl @ApiProperty); FriendsResponseDto (friends: FriendProfileDto[]); FriendRequestsResponseDto (incoming: FriendRequestRecordDto[], outgoing: FriendRequestRecordDto[])
- [x] T057 [US3] Create FriendsController in src/account-social/interface/http/friends.controller.ts: @ApiTags('Friends') @Controller('friends') @UseGuards(JwtAuthGuard); POST /friends/requests @Body SendFriendRequestDto → SendFriendRequestUseCase(req.user.sub, dto.targetEmail) → 201 FriendRequestRecordDto; GET /friends/requests → GetFriendRequestsUseCase(req.user.sub) → 200 FriendRequestsResponseDto; PATCH /friends/requests/:id @Body ResolveFriendRequestDto → ResolveFriendRequestUseCase(req.user.sub, params.id, dto.action) → 200 FriendRequestRecordDto; GET /friends → GetFriendsUseCase(req.user.sub) → 200 FriendsResponseDto; error map: AccountNotFoundError→404 ACCOUNT_NOT_FOUND, SelfFriendRequestError→400 FRIEND_REQUEST_SELF, FriendRequestDuplicateError→409 FRIEND_REQUEST_DUPLICATE, AlreadyFriendsError→409 ALREADY_FRIENDS, FriendRequestNotFoundError→404 NOT_FOUND, ForbiddenDomainError→403 FORBIDDEN; full @ApiOperation @ApiResponse per openapi.yml

**Checkpoint**: US1+US2+US3 all independently functional. Full friend lifecycle works end-to-end.

---

## Phase 6: User Story 4 — Game Admin Role Assignment & Revocation (Priority: P4)

**Goal**: Platform Admins can assign and revoke Game Admin roles per game per account.

**Independent Test**: Platform Admin token assigns role to account X for game G. Refresh X's token — gameAdminRoles includes G. Revoke — role absent from next token. Non-admin caller gets 403.

### Implementation for User Story 4

- [x] T058 [P] [US4] Create GameAdminRole ORM entity in src/account-social/infrastructure/persistence/typeorm-entities/game-admin-role.orm-entity.ts: @Entity({schema:'account_social',name:'game_admin_roles'}); @Unique(['accountId','gameId']); id uuid PK; accountId, gameId uuid NOT NULL; @CreateDateColumn({name:'granted_at'}) grantedAt
- [x] T059 [US4] Create GameAdminRoleTypeOrmRepository in src/account-social/infrastructure/persistence/game-admin-role.typeorm-repository.ts: implements IGameAdminRoleRepository; upsert(accountId, gameId): INSERT INTO account_social.game_admin_roles(id,account_id,game_id,granted_at) VALUES(uuid,…,now()) ON CONFLICT(account_id,game_id) DO NOTHING RETURNING *; if DO NOTHING fired, re-SELECT the existing row; delete(accountId, gameId): DELETE WHERE account_id=:a AND game_id=:g; findByAccountId(accountId): SELECT game_id WHERE account_id=:a; existsForPair: SELECT 1 WHERE account_id=:a AND game_id=:g
- [x] T060 [US4] Create AssignGameAdminUseCase in src/account-social/application/commands/assign-game-admin.use-case.ts: injects IGameAdminRoleRepository, IGameRegistryPort, IAccountRepository; execute(targetAccountId, gameId): findById(targetAccountId) or throw AccountNotFoundError; IGameRegistryPort.exists(gameId) false → throw GameNotFoundError; upsert(targetAccountId, gameId); return GameAdminRole
- [x] T061 [US4] Create RevokeGameAdminUseCase in src/account-social/application/commands/revoke-game-admin.use-case.ts: injects IGameAdminRoleRepository; execute(targetAccountId, gameId): existsForPair(targetAccountId, gameId) false → throw GameAdminRoleNotFoundError; delete(targetAccountId, gameId)
- [x] T062 [P] [US4] Create admin DTOs in src/account-social/interface/dto/admin/: AssignGameAdminDto (accountId: @IsUUID @ApiProperty); GameAdminRoleRecordDto (accountId, gameId, grantedAt @ApiProperty)
- [x] T063 [US4] Create AdminController in src/account-social/interface/http/admin.controller.ts: @ApiTags('Admin') @Controller('admin') @UseGuards(JwtAuthGuard, PlatformAdminGuard); POST /admin/games/:gameId/admins @Body AssignGameAdminDto → AssignGameAdminUseCase(dto.accountId, params.gameId) → 201 GameAdminRoleRecordDto; DELETE /admin/games/:gameId/admins/:accountId → RevokeGameAdminUseCase(params.accountId, params.gameId) → 204; error map: AccountNotFoundError→404 ACCOUNT_NOT_FOUND, GameNotFoundError→404 GAME_NOT_FOUND, GameAdminRoleNotFoundError→404 GAME_ADMIN_ROLE_NOT_FOUND; full @ApiOperation @ApiResponse per openapi.yml

**Checkpoint**: All 4 user stories independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Wire module, standardize errors, configure docs, smoke test.

- [ ] T064 Create GlobalExceptionFilter in src/account-social/interface/filters/domain-exception.filter.ts: @Catch(DomainError) maps AccountNotFoundError→404+ACCOUNT_NOT_FOUND, SelfFriendRequestError→400+FRIEND_REQUEST_SELF, FriendRequestDuplicateError→409+FRIEND_REQUEST_DUPLICATE, AlreadyFriendsError→409+ALREADY_FRIENDS, FriendRequestNotFoundError→404+NOT_FOUND, GameNotFoundError→404+GAME_NOT_FOUND, GameAdminRoleNotFoundError→404+GAME_ADMIN_ROLE_NOT_FOUND, ForbiddenDomainError→403+FORBIDDEN, unknown DomainError→500+INTERNAL_ERROR; response shape: {code: string, message: string} matching openapi.yml ErrorResponse schema
- [ ] T065 Complete AccountSocialModule wiring in src/account-social/account-social.module.ts: TypeOrmModule.forFeature([AccountOrmEntity, FriendRequestOrmEntity, FriendshipOrmEntity, GameAdminRoleOrmEntity, PlayerGameProfileOrmEntity]); providers: (1) bind all 6 repos to port tokens (useClass); (2) { provide: APP_CONFIG, inject:[ConfigService], useFactory:(cs)=>cs.get<AppConfig>('app') } — this is the typed POJO injected into use-cases via @Inject(APP_CONFIG), never ConfigService itself; (3) GoogleOAuthAdapter, EventPublisherAdapter, JwtTokenServiceAdapter, JwtStrategy, all 6 use-case commands, all 4 use-case queries, GameProfileCreatedListener, GlobalExceptionFilter (APP_FILTER); controllers: [AuthController, AccountController, GamesController, FriendsController, AdminController]; imports: PassportModule.register({defaultStrategy:'jwt'}), JwtModule.registerAsync({useFactory injects AuthConfig via ConfigService, returns {secret,signOptions:{expiresIn}} from accessSecret+expiresIn})
- [ ] T066 [P] Configure Swagger in src/main.ts: DocumentBuilder title('Game Hub API').description('Account & Social Module').version('1.0.0').addBearerAuth(); SwaggerModule.setup('api/docs', app, doc); after app.listen, write yaml.stringify(SwaggerModule.generateDocument(app,builder)) to openapi.yml at repo root (fs.writeFileSync)
- [ ] T067 [P] Add npm scripts to package.json: "migration:run": "ts-node -r tsconfig-paths/register ./node_modules/.bin/typeorm migration:run -d src/database/data-source.ts"; "migration:revert": same with migration:revert; "openapi:generate": "ts-node src/scripts/generate-openapi.ts"
- [ ] T068 Wire AccountSocialModule into AppModule imports array in src/app.module.ts; run npm run migration:run; start server (npm run start:dev); execute quickstart.md Scenario 1a (new user OAuth login → receive token pair) to confirm end-to-end wiring is correct

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 completion. Blocks all user stories.
- **US1 (Phase 3)**: Depends on Foundational. No dependency on US2/US3/US4.
- **US2 (Phase 4)**: Depends on Foundational. Can run in parallel with US1 after Foundation.
- **US3 (Phase 5)**: Depends on Foundational + US1 (needs AccountRepository for email lookup).
- **US4 (Phase 6)**: Depends on Foundational + US1 (needs GameAdminRoleRepo loaded in token).
- **Polish (Phase 7)**: Depends on all user story phases complete.

### Within Each User Story

- ORM entities [P] → Repositories → Use-Cases → DTOs [P] → Controller (in this order)
- Use-cases depend on their repository implementations being available for DI

### Parallel Opportunities

- All [P] tasks within a phase can be launched simultaneously
- US1 and US2 can be built in parallel once Foundation is done
- US3 and US4 can begin in parallel once US1 repositories are available

---

## Parallel Example: Foundational Phase (T005–T028)

```bash
# All these can run simultaneously — different files, no dependencies:
Task T005: Create src/config/auth.config.ts
Task T006: Create src/config/google-oauth.config.ts
Task T007: Create src/config/app.config.ts
Task T010: Create src/account-social/domain/entities/account.ts
Task T011: Create src/account-social/domain/entities/friend-request.ts
Task T012: Create src/account-social/domain/entities/friendship.ts
Task T013: Create src/account-social/domain/entities/game-admin-role.ts
Task T014: Create src/account-social/domain/entities/player-game-profile.ts
Task T015: Create IAccountRepository port
... all T015–T027 port interfaces and guards
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks everything)
3. Complete Phase 3: US1 (Google OAuth + JWT)
4. **STOP and VALIDATE**: Run quickstart.md Scenarios 1a–1e
5. Deploy/demo MVP login flow

### Incremental Delivery

1. Foundation → US1 → validate → commit
2. Add US2 → validate profile + game list → commit
3. Add US3 → validate full friend lifecycle → commit
4. Add US4 → validate role management → commit
5. Polish → wire module, configure docs, final smoke test → commit

### Parallel Team Strategy

With 2+ developers after Foundation:
- Dev A: US1 (T029–T037)
- Dev B: US2 (T038–T047)
- After both complete: Dev A → US3, Dev B → US4

---

## Notes

- [P] tasks = different files, no shared dependencies — run in parallel
- Story label [USn] maps task to specific user story for traceability
- Domain layer (T010–T024) must have zero imports from NestJS, TypeORM, or any external lib — enforced by ESLint rule in T003
- Migration T025 must run before any endpoint can be tested
- Module wiring T065 is intentionally deferred to Polish — implement it once all providers are ready to avoid import cycles during development
- Error codes in T064 MUST match the `code` values in contracts/openapi.yml exactly
