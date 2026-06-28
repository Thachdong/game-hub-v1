# Quickstart Validation Guide: Account & Social API

**Feature**: `001-account-social` | **Date**: 2026-06-28
**Contract**: [contracts/openapi.yml](./contracts/openapi.yml)
**Data model**: [data-model.md](./data-model.md)

This guide describes how to run and validate each user story end-to-end.
It is a **validation run guide** — not an implementation guide. Exact code,
controller bodies, and migration files are defined in `tasks.md`.

---

## Prerequisites

1. **PostgreSQL 16** running locally (or via Docker):
   ```bash
   docker run -d --name gamehub-pg \
     -e POSTGRES_DB=gamehub -e POSTGRES_USER=gamehub -e POSTGRES_PASSWORD=gamehub \
     -p 5432:5432 postgres:16
   ```

2. **Environment variables** (`.env` at repo root):
   ```env
   PORT=3000
   DATABASE_URL=postgresql://gamehub:gamehub@localhost:5432/gamehub

   JWT_ACCESS_SECRET=dev-access-secret
   JWT_ACCESS_EXPIRES_IN=15m
   JWT_REFRESH_SECRET=dev-refresh-secret
   JWT_REFRESH_EXPIRES_IN=30d

   GOOGLE_CLIENT_ID=<your-google-client-id>
   GOOGLE_CLIENT_SECRET=<your-google-client-secret>
   GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

   PLATFORM_ADMIN_EMAILS=admin@example.com,dev@example.com
   ```

3. **Run migrations**:
   ```bash
   npm run migration:run
   ```

4. **Start the server**:
   ```bash
   npm run start:dev
   ```

5. **Seed a game** (until the platform-core module provides games):
   ```sql
   INSERT INTO platform.games (id, name, slug)
   VALUES ('a1b2c3d4-0000-0000-0000-000000000001', 'Caro', 'caro');
   ```

---

## User Story 1 — Google OAuth Authentication

**Goal**: Verify login creates/reuses accounts and returns valid tokens.

### Scenario 1a — First-time login (account auto-created)

1. Open in a browser: `http://localhost:3000/api/auth/google`
2. Complete Google consent with an email not previously seen on the platform.
3. **Expected**: HTTP 200 response with `accessToken`, `refreshToken`, and `account.id`.
4. In PostgreSQL, verify the account was created:
   ```sql
   SELECT * FROM account_social.accounts WHERE email = '<your-email>';
   ```

### Scenario 1b — Returning login (no duplicate account)

1. Repeat the OAuth flow with the same Google account.
2. **Expected**: Same `account.id` as Scenario 1a. Row count in `accounts` unchanged.

### Scenario 1c — Token refresh

```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "<refreshToken from 1a>"}'
```
**Expected**: HTTP 200 with a new `accessToken`. Decode it (e.g., jwt.io) to verify
`sub`, `email`, `type: "access"`, and updated `exp`.

### Scenario 1d — Platform Admin flag

1. Login with an email listed in `PLATFORM_ADMIN_EMAILS`.
2. Decode the returned `accessToken`.
3. **Expected**: `isPlatformAdmin: true` in the payload.

### Scenario 1e — Google OAuth unavailable (FR-022)

1. Temporarily set `GOOGLE_CLIENT_SECRET` to an invalid value.
2. Attempt login via `/api/auth/google/callback?code=fake_code`.
3. **Expected**: HTTP 503, body `{ code: "GOOGLE_OAUTH_UNAVAILABLE", ... }` (not 401).

---

## User Story 2 — Account Profile & Game List

**Prerequisites**: Valid `accessToken` from US1.

### Scenario 2a — Own profile

```bash
curl http://localhost:3000/api/accounts/me \
  -H "Authorization: Bearer <accessToken>"
```
**Expected**: HTTP 200 with `id`, `email`, `username`, `avatarUrl`.

### Scenario 2b — Game list (authenticated, no profile yet)

```bash
curl http://localhost:3000/api/games \
  -H "Authorization: Bearer <accessToken>"
```
**Expected**: `{ games: [{ id, name, slug, hasProfile: false }] }` (Caro seeded above).

### Scenario 2c — Game list after profile created

1. Simulate a game module emitting `game.profile.created`:
   ```sql
   INSERT INTO account_social.player_game_profiles (id, account_id, game_id)
   VALUES (gen_random_uuid(), '<account-id>', 'a1b2c3d4-0000-0000-0000-000000000001');
   ```
2. Re-call `GET /api/games` with the same access token.
3. **Expected**: `{ games: [{ ..., hasProfile: true }] }`.

### Scenario 2d — Game list (guest)

```bash
curl http://localhost:3000/api/games
```
**Expected**: HTTP 200 with game list, no `hasProfile` field on any entry.

---

## User Story 3 — Friend Request & Friendship Management

**Prerequisites**: Two accounts (A and B) with `accessToken`s from US1.

### Scenario 3a — Send to unknown email

```bash
curl -X POST http://localhost:3000/api/friends/requests \
  -H "Authorization: Bearer <tokenA>" \
  -H "Content-Type: application/json" \
  -d '{"targetEmail": "nobody@notregistered.com"}'
```
**Expected**: HTTP 404, `{ code: "ACCOUNT_NOT_FOUND" }`. Verify DB has no new row.

### Scenario 3b — Send and accept

1. A sends request to B's email → **Expected**: HTTP 201, status `pending`.
2. B lists incoming requests: `GET /api/friends/requests` → request appears in `incoming`.
3. B accepts: `PATCH /api/friends/requests/<id>` `{ action: "accept" }` → HTTP 200, status `accepted`.
4. Verify mutual friendship:
   - A calls `GET /api/friends` → B appears.
   - B calls `GET /api/friends` → A appears.
5. Verify notification event emitted:
   ```sql
   -- (Check that the listener ran — indirectly via player_game_profiles or add a log assertion)
   ```

### Scenario 3c — Send and reject

1. A sends request to B → pending.
2. B rejects → HTTP 200, status `rejected`.
3. A and B both call `GET /api/friends` → neither appears in the other's list.

### Scenario 3d — Retry after rejection (FR-020)

1. Continuing from 3c, A sends a new request to B.
2. **Expected**: HTTP 201. Old rejected record replaced:
   ```sql
   SELECT * FROM account_social.friend_requests
   WHERE sender_id = '<A>' AND receiver_id = '<B>';
   -- Should show exactly 1 row with status = 'pending'
   ```

### Scenario 3e — Duplicate pending (FR-008)

1. A sends request to B → pending.
2. A tries to send again.
3. **Expected**: HTTP 409, `{ code: "FRIEND_REQUEST_DUPLICATE" }`.

### Scenario 3f — Self-request (FR-008)

```bash
curl -X POST http://localhost:3000/api/friends/requests \
  -H "Authorization: Bearer <tokenA>" \
  -d '{"targetEmail": "<A own email>"}'
```
**Expected**: HTTP 400, `{ code: "FRIEND_REQUEST_SELF" }`.

### Scenario 3g — Cross-direction already friends (FR-019)

1. A→B pending AND B→A pending (send both without resolving).
2. B accepts A's request → friendship created.
3. A tries `PATCH /api/friends/requests/<B-to-A request id>` `{ action: "accept" }`.
4. **Expected**: HTTP 409, `{ code: "ALREADY_FRIENDS" }`.

---

## User Story 4 — Game Admin Role Management

**Prerequisites**: Platform Admin token (from US1 Scenario 1d) + a target account ID.

### Scenario 4a — Assign Game Admin

```bash
curl -X POST http://localhost:3000/api/admin/games/a1b2c3d4-.../admins \
  -H "Authorization: Bearer <platformAdminToken>" \
  -H "Content-Type: application/json" \
  -d '{"accountId": "<target-account-id>"}'
```
**Expected**: HTTP 201 with `accountId`, `gameId`, `grantedAt`.

Verify role in next token: call `POST /api/auth/refresh` with target's refresh token;
decode new access token → `gameAdminRoles` includes Caro's game ID.

### Scenario 4b — Idempotent assign (FR-014)

Repeat Scenario 4a with same inputs.
**Expected**: HTTP 201 with same `grantedAt`. No duplicate row in DB:
```sql
SELECT COUNT(*) FROM account_social.game_admin_roles
WHERE account_id = '<target>' AND game_id = 'a1b2c3d4-...';
-- Must be 1
```

### Scenario 4c — Revoke Game Admin

```bash
curl -X DELETE \
  http://localhost:3000/api/admin/games/a1b2c3d4-.../admins/<target-account-id> \
  -H "Authorization: Bearer <platformAdminToken>"
```
**Expected**: HTTP 204. Target's next access token has empty `gameAdminRoles`.

### Scenario 4d — Non-admin caller rejected (FR-003)

```bash
curl -X POST http://localhost:3000/api/admin/games/a1b2c3d4-.../admins \
  -H "Authorization: Bearer <regularPlayerToken>" \
  -d '{"accountId": "<any-id>"}'
```
**Expected**: HTTP 403, `{ code: "FORBIDDEN" }`.

### Scenario 4e — Game not registered (US4 AC-4)

```bash
curl -X POST http://localhost:3000/api/admin/games/00000000-0000-0000-0000-000000000000/admins \
  -H "Authorization: Bearer <platformAdminToken>" \
  -d '{"accountId": "<valid-account-id>"}'
```
**Expected**: HTTP 404, `{ code: "GAME_NOT_FOUND" }`.

---

## Validation Checklist

- [ ] US1: New account created on first login, reused on second login
- [ ] US1: Platform Admin flag present in access token for configured email
- [ ] US1: HTTP 503 (not 401) on Google OAuth unavailability
- [ ] US1: Token refresh returns new access token with current gameAdminRoles
- [ ] US2: Profile endpoint returns correct Google-sourced fields
- [ ] US2: Game list shows `hasProfile: true` after profile event written
- [ ] US2: Guest receives game list without `hasProfile`
- [ ] US3: Unknown email → 404, no DB row created
- [ ] US3: Accept path creates mutual Friendship, both see each other in friends list
- [ ] US3: Reject path creates no Friendship
- [ ] US3: Retry after rejection replaces old rejected record (1 row in DB)
- [ ] US3: Duplicate pending → 409 FRIEND_REQUEST_DUPLICATE
- [ ] US3: Self-request → 400 FRIEND_REQUEST_SELF
- [ ] US3: Cross-direction already-friends → 409 ALREADY_FRIENDS
- [ ] US4: Role assigned → appears in next token's gameAdminRoles
- [ ] US4: Idempotent assign → 1 row in DB, no error
- [ ] US4: Revoke → removed from next token's gameAdminRoles
- [ ] US4: Non-admin → 403 FORBIDDEN
- [ ] US4: Unknown game → 404 GAME_NOT_FOUND
