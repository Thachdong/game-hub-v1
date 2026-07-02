# Research: Account & Social API

**Feature**: `001-account-social` | **Date**: 2026-06-28

All decisions below are derived from the project constitution (v1.0.0), BRD clarifications,
and NestJS/TypeORM ecosystem best practices. No open unknowns remain.

---

## 1. Google OAuth2 Integration

**Decision**: Use `passport-google-oauth20` strategy wrapped in a NestJS infrastructure
adapter (`GoogleOAuthAdapter`) that implements the domain-level `IGoogleOAuthPort`.

**Rationale**: Passport is the NestJS-idiomatic OAuth library. Wrapping it in an adapter
keeps the domain/application layers free of Passport types. The port interface exposes
only what the use-case needs: `exchangeCode(code: string): Promise<GoogleUserInfo>`.

**Flow**:
1. `GET /api/auth/google` — NestJS controller activates Passport Google strategy, which
   redirects to Google's OAuth consent screen.
2. Google redirects to `GET /api/auth/google/callback?code=...`.
3. Passport calls the strategy's `validate()` callback, which delegates to
   `LoginWithGoogleUseCase` via the port.
4. Use-case: lookup account by email → create if new → encode JWT tokens → return.

**Google unavailability (FR-022)**: Passport catches errors from the Google token exchange.
The adapter re-throws as a typed `GoogleOAuthUnavailableError`; the interface layer maps
this to HTTP 503 with a distinct error code (`GOOGLE_OAUTH_UNAVAILABLE`) vs. auth failure
(`AUTH_INVALID_CODE`).

**Alternatives considered**:
- Raw `axios` to Google endpoints — rejected: more code, less maintainable than Passport.
- `@nestjs/passport` `AuthGuard` for callback — accepted: standard NestJS pattern.

---

## 2. Stateless JWT Dual-Token Strategy

**Decision**: Two JWTs signed with separate secrets (or the same secret with type claim):
- **Access token**: HS256, 15 min expiry, payload: `{ sub, email, isPlatformAdmin, gameAdminRoles[], type: 'access' }`.
- **Refresh token**: HS256, 30 day expiry, payload: `{ sub, type: 'refresh' }`.

Both tokens are stateless — no DB storage, no revocation (confirmed in clarification Q1).

**Rationale**: The spec (clarification Q1) explicitly chose stateless operation. The
constitution (Principle III) confirms no session storage. Separate `type` claims prevent
a refresh token from being used as an access token and vice versa.

**Token refresh flow** (FR-017):
1. Client POSTs `{ refreshToken }` to `/api/auth/refresh`.
2. `RefreshAccessTokenUseCase` verifies signature and `type: 'refresh'` claim.
3. Fetches current `gameAdminRoles` from DB for the account (roles may have changed since last login).
4. Issues a new access token; returns it.

**Platform Admin flag** (FR-003): At token issuance time, the use-case checks whether
`account.email` is in the `platformAdminEmails` config array (loaded once at startup via
`AppConfig`). The flag `isPlatformAdmin` is embedded in the access token. It is NOT
stored in the DB — a service restart with an updated env list takes effect on the next login.

**Alternatives considered**:
- RS256 asymmetric signing — deferred: adds key rotation complexity without benefit at
  this scale. Revisit if microservice split occurs.
- Short access + blacklist for revocation — rejected per clarification Q1.

---

## 3. TypeORM Schema Strategy

**Decision**: Use PostgreSQL schema `account_social` for all tables owned by this module.
TypeORM entity `@Entity({ schema: 'account_social', name: 'accounts' })`.

**Rationale**: Constitution Principle II prefers schema-per-domain. TypeORM 0.3.x supports
this via the `schema` property on `@Entity`. A single migration creates the schema before
tables: `CREATE SCHEMA IF NOT EXISTS account_social`.

**Migration naming**: `src/database/migrations/<timestamp>-<Description>.ts`.
First migration for this module: `CreateAccountSocialSchema`.

**Cross-module game reference**: The `game_admin_roles` and `player_game_profiles` tables
store `game_id UUID NOT NULL` without a FK constraint to the `platform.games` table (owned
by another module). Application-level validation in `AssignGameAdminUseCase` calls
`GameRegistryPort.exists(gameId)` before inserting. This avoids cross-schema FK
dependencies while preserving data integrity at the use-case boundary.

**Alternatives considered**:
- Table-name prefix (`account_social_accounts`) instead of schema — rejected: constitution
  prefers dedicated schema; schema isolation is cleaner for future module extraction.
- FK to games table — rejected: cross-module coupling violates Principle II.

---

## 4. FriendRequest Concurrency Design

**Decision**: Use a PostgreSQL `UNIQUE(sender_id, receiver_id)` constraint on the
`account_social.friend_requests` table. The `SendFriendRequestUseCase` performs an
**upsert** (INSERT … ON CONFLICT (sender_id, receiver_id) DO UPDATE) to replace a
`rejected` record with a new `pending` one (FR-020). For truly simultaneous sends of the
same pair-direction, the DB constraint ensures only one row exists; the second concurrent
call receives a `UniqueViolationError` mapped to HTTP 409.

**Cross-direction race** (clarification Q2): A→B and B→A are two distinct DB rows
(different sender/receiver). Both can be pending simultaneously. When A accepts B's
request (`resolve-friend-request` use-case), a `Friendship` row is inserted. On B's
subsequent attempt to resolve A's request, the use-case checks for an existing friendship
before acting and returns the "already friends" error (FR-019). No row-level lock needed
for this read-then-check because the friendship check is fast and the "already friends"
error is safe to return on a race (both parties already friends — correct outcome).

**Alternatives considered**:
- SELECT FOR UPDATE on friend_request rows — unnecessary: the friendship-existence check
  is idempotent and the worst case (two concurrent accepts) creates two friendship inserts,
  the second of which fails on the UNIQUE constraint and is mapped to the same "already
  friends" error.

---

## 5. PlayerGameProfile Event Subscription

**Decision**: An `@OnEvent('game.profile.created')` listener in
`infrastructure/events/game-profile-created.listener.ts` calls
`PlayerGameProfileRepository.upsert({ accountId, gameId })`. Idempotent — a duplicate
event produces no error (INSERT … ON CONFLICT DO NOTHING).

**Event contract** (resolves CHK030):
```typescript
// src/account-social/domain/events/game-profile-created.event.ts
export class GameProfileCreatedEvent {
  accountId: string;   // UUID of the platform account
  gameId: string;      // UUID of the game (from platform game registry)
}
```
Game modules emit this event using the event name `'game.profile.created'`.

**Lost events**: Not handled in this release (assumption: in-process EventEmitter2 does
not drop events under normal operation within a single process). If the game module and
account-social module run in the same process, delivery is synchronous. Durability across
restarts is a future concern when message queues are introduced.

**Alternatives considered**:
- HTTP call from game module to account-social module — rejected: violates Principle II
  (cross-module direct call) and couples modules at deploy time.
- Outbox pattern for event durability — deferred: constitution prohibits distributed queues
  at this stage; revisit when horizontal scaling requires it.

---

## 6. Game Registry Access

**Decision**: Define `IGameRegistryPort` in the domain layer with one method:
`findAll(): Promise<GameRef[]>` where `GameRef = { id: string; name: string; slug: string }`.
The TypeORM adapter reads from a `platform.games` table (owned by a future platform-core
module; for initial development, seeded via a migration or fixture).

**No cross-module query at request time** (FR-005): The game list endpoint calls
`GetGameListUseCase` which calls `GameRegistryPort.findAll()` in the same DB query
cycle. The `hasProfile` flag is joined from `account_social.player_game_profiles` in a
single query: `SELECT g.*, (pgp.game_id IS NOT NULL) AS has_profile FROM platform.games g
LEFT JOIN account_social.player_game_profiles pgp ON pgp.game_id = g.id AND pgp.account_id = ?`.

This is a cross-schema SQL join within the same PostgreSQL instance — permitted under
Principle II (same DB, not a cross-module service call) and does not violate the "no
cross-module query at request time" rule since it is a read-only join on the account-social
module's own registry, not a call to another module's application layer.

---

## 7. Config Grouping (Principle VI)

Three validated `ConfigService` groups:

```typescript
// src/config/auth.config.ts
export interface AuthConfig {
  jwtAccessSecret: string;          // JWT_ACCESS_SECRET
  jwtAccessExpiresIn: string;       // JWT_ACCESS_EXPIRES_IN (default: '15m')
  jwtRefreshSecret: string;         // JWT_REFRESH_SECRET
  jwtRefreshExpiresIn: string;      // JWT_REFRESH_EXPIRES_IN (default: '30d')
}

// src/config/google-oauth.config.ts
export interface GoogleOAuthConfig {
  clientId: string;                 // GOOGLE_CLIENT_ID
  clientSecret: string;             // GOOGLE_CLIENT_SECRET
  callbackUrl: string;              // GOOGLE_CALLBACK_URL
}

// src/config/app.config.ts
export interface AppConfig {
  port: number;                     // PORT (default: 3000)
  platformAdminEmails: string[];    // PLATFORM_ADMIN_EMAILS (comma-separated)
}
```

Joi validation schema enforced at startup; missing required values cause an immediate
process exit with a descriptive error (fail-fast on misconfiguration).
