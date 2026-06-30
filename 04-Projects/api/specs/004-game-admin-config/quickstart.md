# Quickstart Validation Guide: Game Admin Config (Caro)

**Phase**: 1 — Design
**Date**: 2026-06-30
**Purpose**: End-to-end validation scenarios that prove the feature works after implementation.
Not implementation instructions — see `tasks.md` for those.

---

## Prerequisites

1. PostgreSQL running and `DATABASE_URL` set in `.env`
2. Migration applied: `npm run migration:run` — confirms `caro_game.game_configs` table and
   `platform.games` row for `caro` slug exist
3. API server running: `npm run start:dev`
4. At least one account with Game Admin (Caro) role assigned — use
   `POST /admin/accounts/:id/game-admin` with Platform Admin JWT for setup
5. Tools: `curl` or any HTTP client; `jq` for JSON parsing (optional)

---

## Scenario 1: Create a Valid Configuration (FR-001, US1-AC1)

**Setup**: Obtain a JWT access token for a Game Admin (Caro) account.

```bash
# Create config: 25x25 board, 15s move time
curl -X POST http://localhost:3000/admin/caro/game-configs \
  -H "Authorization: Bearer <GAME_ADMIN_JWT>" \
  -H "Content-Type: application/json" \
  -d '{"boardSize": "25x25", "moveTimeSeconds": 15}'
```

**Expected**: HTTP 201, response body contains `AdminGameConfigDto` with `active: true`,
`boardSize: "25x25"`, `moveTimeSeconds: 15`, and non-null `createdBy` matching the admin's
account ID.

---

## Scenario 2: Invalid Board Size Rejected (FR-005, US1-AC2)

```bash
curl -X POST http://localhost:3000/admin/caro/game-configs \
  -H "Authorization: Bearer <GAME_ADMIN_JWT>" \
  -H "Content-Type: application/json" \
  -d '{"boardSize": "20x20", "moveTimeSeconds": 15}'
```

**Expected**: HTTP 400, error code `VALIDATION_ERROR`.

---

## Scenario 3: Duplicate Active Config Rejected (FR-009, US1-AC4)

**Setup**: A config with (25x25, 15s) was created in Scenario 1.

```bash
curl -X POST http://localhost:3000/admin/caro/game-configs \
  -H "Authorization: Bearer <GAME_ADMIN_JWT>" \
  -H "Content-Type: application/json" \
  -d '{"boardSize": "25x25", "moveTimeSeconds": 15}'
```

**Expected**: HTTP 409, error code `GAME_CONFIG_DUPLICATE`.

---

## Scenario 4: Player Lists Active Configs (FR-004, US3-AC1)

```bash
curl http://localhost:3000/caro/game-configs \
  -H "Authorization: Bearer <PLAYER_JWT>"
```

**Expected**: HTTP 200, `items` array contains the config created in Scenario 1. All
returned items have no `active`, `createdBy`, `deactivatedBy` fields — player DTO only.

---

## Scenario 5: Deactivate a Config (FR-003, US2-AC2)

**Setup**: Note the `id` of the config created in Scenario 1.

```bash
curl -X DELETE http://localhost:3000/admin/caro/game-configs/<CONFIG_ID> \
  -H "Authorization: Bearer <GAME_ADMIN_JWT>"
```

**Expected**: HTTP 204 No Content.

**Verify — player list no longer includes it**:
```bash
curl http://localhost:3000/caro/game-configs \
  -H "Authorization: Bearer <PLAYER_JWT>"
```
**Expected**: `items` is empty (or does not include the deactivated config).

**Verify — admin view still shows it**:
```bash
curl http://localhost:3000/admin/caro/game-configs \
  -H "Authorization: Bearer <GAME_ADMIN_JWT>"
```
**Expected**: The config appears with `active: false`, non-null `deactivatedBy` and
`deactivatedAt`.

---

## Scenario 6: Audit Fields Populated (FR-010)

After Scenario 5, the admin list response for the deactivated config must show:
- `createdBy`: UUID of the Game Admin who ran Scenario 1
- `deactivatedBy`: UUID of the Game Admin who ran Scenario 5
- `deactivatedAt`: non-null timestamp
- `updatedAt`: ≥ `createdAt`

---

## Scenario 7: Reactivation + Duplicate Block (FR-011, US2-AC5, US2-AC6)

**7a — Reactivate the config from Scenario 5**:
```bash
curl -X POST http://localhost:3000/admin/caro/game-configs/<CONFIG_ID>/reactivate \
  -H "Authorization: Bearer <GAME_ADMIN_JWT>"
```
**Expected**: HTTP 200, config returned with `active: true`, `deactivatedBy: null`,
`deactivatedAt: null`.

**7b — Create another config with same combo, then try to reactivate the first**:
```bash
# Create a fresh (25x25, 15s) config
curl -X POST http://localhost:3000/admin/caro/game-configs \
  -H "Authorization: Bearer <GAME_ADMIN_JWT>" \
  -H "Content-Type: application/json" \
  -d '{"boardSize": "25x25", "moveTimeSeconds": 15}'
# Note new ID

# Deactivate the original config again
curl -X DELETE http://localhost:3000/admin/caro/game-configs/<ORIGINAL_ID> \
  -H "Authorization: Bearer <GAME_ADMIN_JWT>"

# Attempt reactivation — should fail (new config is still active with same combo)
curl -X POST http://localhost:3000/admin/caro/game-configs/<ORIGINAL_ID>/reactivate \
  -H "Authorization: Bearer <GAME_ADMIN_JWT>"
```
**Expected**: HTTP 409, error code `GAME_CONFIG_DUPLICATE`.

---

## Scenario 8: Unauthorized Access Blocked (FR-007, US3 implied)

```bash
# Player JWT (no gameAdminRoles = 'caro') attempts admin create
curl -X POST http://localhost:3000/admin/caro/game-configs \
  -H "Authorization: Bearer <PLAYER_JWT>" \
  -H "Content-Type: application/json" \
  -d '{"boardSize": "25x25", "moveTimeSeconds": 15}'
```
**Expected**: HTTP 403, error code `FORBIDDEN`.

---

## Scenario 9: Update Does Not Affect Active Games (FR-002, US2-AC4)

*This scenario is validated at the game creation feature level (BRD-CARO-GAME-002) since
the game-config feature itself only exposes the update endpoint. Validate here that the
update succeeds and returns the new values:*

```bash
curl -X PATCH http://localhost:3000/admin/caro/game-configs/<CONFIG_ID> \
  -H "Authorization: Bearer <GAME_ADMIN_JWT>" \
  -H "Content-Type: application/json" \
  -d '{"moveTimeSeconds": 25}'
```
**Expected**: HTTP 200, returned config shows `moveTimeSeconds: 25`. Previously created
games (tested in game creation feature) retain their original 15s parameter.

---

## OpenAPI Spec Regeneration (Constitution Principle VI)

After implementation, run:
```bash
npm run generate:openapi
```
Confirm `openapi.yml` at repo root includes all six Caro config endpoints with correct
`@ApiOperation`, `@ApiResponse` entries. This file must be committed as part of the PR.
