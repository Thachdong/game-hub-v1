# API Contract: Game Admin Config (Caro)

**Phase**: 1 — Design
**Date**: 2026-06-30
**Auth scheme**: Bearer JWT (all endpoints require `Authorization: Bearer <access_token>`)

---

## Shared Types

### `GameConfigDto` (player-facing)

```json
{
  "id": "uuid",
  "boardSize": "25x25",
  "moveTimeSeconds": 15,
  "createdAt": "2026-06-30T10:00:00Z"
}
```

### `AdminGameConfigDto` (admin-facing — includes full audit fields)

```json
{
  "id": "uuid",
  "boardSize": "25x25",
  "moveTimeSeconds": 15,
  "active": true,
  "createdBy": "uuid",
  "createdAt": "2026-06-30T10:00:00Z",
  "updatedAt": "2026-06-30T10:00:00Z",
  "deactivatedBy": null,
  "deactivatedAt": null
}
```

### Error Response (shared format — matches existing `GlobalExceptionFilter`)

```json
{
  "statusCode": 409,
  "code": "GAME_CONFIG_DUPLICATE",
  "message": "An active configuration with this board size and move time already exists"
}
```

---

## Player Endpoints

### `GET /caro/game-configs`

Returns all **active** game configurations. Ordered by `createdAt ASC`.

**Auth**: `JwtAuthGuard` (any authenticated user)

**Response 200**:
```json
{
  "items": [
    { "id": "uuid", "boardSize": "18x18", "moveTimeSeconds": 5, "createdAt": "..." },
    { "id": "uuid", "boardSize": "25x25", "moveTimeSeconds": 15, "createdAt": "..." }
  ]
}
```

**Response 200 (empty — no active configs)**:
```json
{ "items": [] }
```

**Errors**: 401 Unauthorized

---

## Admin Endpoints

All admin endpoints require:
- `JwtAuthGuard` — valid access token
- `GameAdminCaroGuard` — `gameAdminRoles` claim in JWT includes `'caro'`

### `GET /admin/caro/game-configs`

Returns **all** configurations (active and inactive). Ordered by `createdAt ASC`.

**Response 200**:
```json
{
  "items": [
    {
      "id": "uuid",
      "boardSize": "25x25",
      "moveTimeSeconds": 15,
      "active": true,
      "createdBy": "uuid",
      "createdAt": "...",
      "updatedAt": "...",
      "deactivatedBy": null,
      "deactivatedAt": null
    },
    {
      "id": "uuid",
      "boardSize": "18x18",
      "moveTimeSeconds": 5,
      "active": false,
      "createdBy": "uuid",
      "createdAt": "...",
      "updatedAt": "...",
      "deactivatedBy": "uuid",
      "deactivatedAt": "..."
    }
  ]
}
```

**Errors**: 401, 403

---

### `POST /admin/caro/game-configs`

Creates a new active game configuration.

**Request body**:
```json
{
  "boardSize": "25x25",
  "moveTimeSeconds": 15
}
```

**Validation**:
- `boardSize`: must be one of `"18x18"`, `"25x25"`, `"40x40"` — `400` otherwise
- `moveTimeSeconds`: must be one of `5`, `10`, `15`, `25`, `35`, `45`, `60` — `400` otherwise
- Combination must not already exist as an active config — `409` otherwise

**Response 201** — `AdminGameConfigDto` of the created record

**Errors**:

| Status | Code | Condition |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid boardSize or moveTimeSeconds |
| 401 | `UNAUTHORIZED` | Missing or expired JWT |
| 403 | `FORBIDDEN` | Not a Game Admin (Caro) |
| 409 | `GAME_CONFIG_DUPLICATE` | Active config with same combo already exists |

---

### `PATCH /admin/caro/game-configs/:id`

Updates boardSize and/or moveTimeSeconds of an existing configuration. Only affects future
games — active games retain parameters from creation time (enforced by game creation feature).

**Request body** (all fields optional, at least one required):
```json
{
  "boardSize": "40x40",
  "moveTimeSeconds": 60
}
```

**Validation**:
- If `boardSize` provided: must be a valid value — `400` otherwise
- If `moveTimeSeconds` provided: must be a valid value — `400` otherwise
- Resulting combination must not already exist as another active config — `409` otherwise
- At least one field must be provided — `400` otherwise

**Response 200** — `AdminGameConfigDto` of the updated record

**Errors**:

| Status | Code | Condition |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid enum or empty body |
| 401 | `UNAUTHORIZED` | Missing or expired JWT |
| 403 | `FORBIDDEN` | Not a Game Admin (Caro) |
| 404 | `GAME_CONFIG_NOT_FOUND` | Config ID does not exist |
| 409 | `GAME_CONFIG_DUPLICATE` | Updated combo already exists as another active config |

---

### `DELETE /admin/caro/game-configs/:id`

Soft-deletes (deactivates) a configuration. Sets `active = false`, records `deactivatedBy`
and `deactivatedAt`. The configuration is no longer visible in the player list.
Ongoing games referencing this config are unaffected (they snapshot parameters at creation).

**Response 204** — No content

**Errors**:

| Status | Code | Condition |
|---|---|---|
| 401 | `UNAUTHORIZED` | Missing or expired JWT |
| 403 | `FORBIDDEN` | Not a Game Admin (Caro) |
| 404 | `GAME_CONFIG_NOT_FOUND` | Config ID does not exist |

---

### `POST /admin/caro/game-configs/:id/reactivate`

Restores a deactivated configuration to active. Clears `deactivatedBy` and `deactivatedAt`.
The configuration becomes immediately visible to players again.

**Request body**: empty

**Response 200** — `AdminGameConfigDto` of the reactivated record

**Errors**:

| Status | Code | Condition |
|---|---|---|
| 401 | `UNAUTHORIZED` | Missing or expired JWT |
| 403 | `FORBIDDEN` | Not a Game Admin (Caro) |
| 404 | `GAME_CONFIG_NOT_FOUND` | Config ID does not exist |
| 409 | `GAME_CONFIG_DUPLICATE` | Another active config with the same combo already exists |

---

## Guard: `GameAdminCaroGuard`

```typescript
// src/caro-game/interface/guards/game-admin-caro.guard.ts
// Checks: request.user.gameAdminRoles.includes('caro')
// Returns 403 ForbiddenException if not present
```

Follows the same pattern as `PlatformAdminGuard` — pure JWT claim check, zero DB calls.
