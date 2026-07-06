# Phase 1 Data Model: Domain Service Layer for Backend Integration

Entities below are the service layer's typed view of backend data — shaped from
`04-Projects/api/openapi.yml`'s component schemas, expressed as the TypeScript contracts this
feature exposes to callers (not the backend's internal persistence model).

## Cross-cutting envelope types

- **ServiceResult\<T\>** = `ServiceSuccess<T> | ServiceFailure`
  - **ServiceSuccess\<T\>**: `{ ok: true; data: T; message: string; statusCode: number }`
  - **ServiceFailure**: `{ ok: false; reason: ServiceErrorReason; statusCode: number; message:
    string; fieldErrors?: Record<string, string[]> }`
  - **ServiceErrorReason**: `'UNAUTHENTICATED' | 'UNAUTHORIZED' | 'VALIDATION' | 'NOT_FOUND' |
    'SERVER_ERROR' | 'NETWORK_ERROR'`
- **CursorPage\<T\>**: `{ items: T[]; nextCursor: Cursor | null }` — used only by the endpoints
  that actually paginate (notifications, admin reports, match history). `Cursor`:
  `{ createdAt: string; id: string }`.
- Endpoints that return a full array with no pagination (friends, friend requests, report types,
  admin game configs, caro game configs, leaderboard) are typed as a plain `T[]`, not `CursorPage`
  — the spec's edge case about "consistent pagination shape" resolves to: *paginate only where the
  backend paginates; every service function's output type makes that explicit rather than
  guessing.*

## Session (authentication package) — SUPERSEDED 2026-07-02

> The `packages/auth-service` implementation described below was removed; session/token lifecycle
> is now delegated to NextAuth (Auth.js) inside the future `apps/*` Next.js app. See constitution
> v2.0.0 Principle VI and research.md §5. Kept for historical reference.

| Field | Type | Notes |
|---|---|---|
| accessToken | string | JWT; held in memory on the client only |
| account | Account | embedded on login |

Refresh token is never part of this client-visible type — see `research.md` §5. State transitions:
`anonymous → authenticating → authenticated → (expired → refreshing → authenticated) → anonymous`.

## Account (account package)

| Field | Type | Source |
|---|---|---|
| id | string | AccountInResponseDto / AccountProfileDto |
| email | string | |
| username | string | |
| avatarUrl | string | |

## Game (account package)

| Field | Type | Source |
|---|---|---|
| id | string | GameEntryDto |
| name | string | |
| slug | string | |
| hasProfile | boolean? | optional |

## Friend Request (profiles package)

| Field | Type | Source |
|---|---|---|
| id | string | FriendRequestRecordDto |
| senderId | string | |
| receiverId | string | |
| status | string (`pending` \| `accepted` \| `rejected`, backend sends free-form string) | |
| createdAt | string (ISO) | |
| resolvedAt | string \| null | |

Listing returns `{ incoming: FriendRequest[]; outgoing: FriendRequest[] }` (not a flat array —
`FriendRequestsResponseDto`).

## Friend (profiles package)

| Field | Type | Source |
|---|---|---|
| id | string | FriendProfileDto |
| email | string | |
| username | string | |
| avatarUrl | string | |

## Notification (profiles package)

| Field | Type | Source |
|---|---|---|
| id | string | NotificationEntryDto |
| type | `'friend-or-game-invite' \| 'tournament-event' \| 'admin-warning' \| 'trust-score-alert'` | |
| content | string | |
| referenceId | string \| null | |
| isRead | boolean | |
| createdAt | string (ISO) | |

List output: `CursorPage<Notification>`.

## Report Type (profiles + admin packages)

| Field | Type | Source |
|---|---|---|
| id | string | PlayerReportTypeDto / AdminReportTypeEntryDto |
| name | string | |
| deductionPoints | number | admin view only |
| active | boolean | admin view only |
| createdAt / updatedAt | string (ISO) | admin view only |

## Report (profiles package: submit; admin package: moderate)

| Field | Type | Source |
|---|---|---|
| id | string | SubmitReportResponseDto / AdminReportEntryDto |
| reporterId | string | admin view only |
| reportedUserId | string | |
| reportTypeId | string | |
| context | string | |
| status | `'pending' \| 'valid' \| 'invalid'` | |
| appliedPoints | number \| null | admin view only |
| submittedAt | string (ISO) | |
| resolvedAt | string \| null | admin view only |
| resolvedBy | string \| null | admin view only |

Admin listing output: `CursorPage<AdminReportEntry>`. Confirming a report returns
`ConfirmReportResponseDto`, including an optional embedded `TrustScoreSnapshot` for the reported
user.

## Trust Score (profiles package: own score; admin: snapshot embedded in report confirmation)

| Field | Type | Source |
|---|---|---|
| score | number | TrustScoreResponseDto / TrustScoreSnapshotDto |
| gameLocked / locked | boolean | field name differs by endpoint — normalized to `locked` in this package's output type |
| gameLockedUntil / lockedUntil | string \| null | normalized to `lockedUntil` |
| lastRecoveryDate | string \| null | own-score view only |
| updatedAt | string (ISO) | own-score view only |

## Admin Assignment (admin package)

| Field | Type | Source |
|---|---|---|
| accountId | string | GameAdminRoleRecordDto |
| gameId | string | |
| grantedAt | string (ISO) | |

## Caro Game Config (game-caro package)

| Field | Type | Source |
|---|---|---|
| id | string | GameConfigDto / AdminGameConfigDto |
| boardSize | `'18x18' \| '25x25' \| '40x40'` | |
| moveTimeSeconds | `5\|10\|15\|25\|35\|45\|60` | |
| createdAt | string (ISO) | |
| active | boolean | admin view only |
| createdBy | string | admin view only |
| updatedAt | string (ISO) | admin view only |
| deactivatedBy / deactivatedAt | string \| null | admin view only |

## Caro Match (game-caro package)

| Field | Type | Source |
|---|---|---|
| id | string | LobbyMatchDto / CreateMatchResponseDto / MatchStateDto |
| configId | string | |
| boardSize | string | |
| moveTimeSeconds | number | |
| visibility | `'public' \| 'private'` | |
| status | string (`lobby` \| `active` \| `finished` \| ... — backend sends free-form string) | |
| creatorId / creatorUsername | string | shape differs between lobby listing and full state |
| playerX / playerO | CaroPlayerInMatch \| null | full state only |
| currentTurnPlayerId | string \| null | full state only |
| deadlineAt | string \| null | full state only — server-authoritative deadline (constitution Principle VI); client renders countdown from this value only |
| moves | CaroMove[] | full state only |
| viewers | string[] | full state only |
| pendingDrawRequestFromId | string \| null | full state only |
| result / winnerPlayerId | string \| null | full state only |
| startedAt / endedAt | string \| null | full state only |
| createdAt | string (ISO) | |

**CaroPlayerInMatch**: `{ id: string; username: string; elo: number; winRate: number }`.

## Caro Move (game-caro package)

| Field | Type | Source |
|---|---|---|
| playerId | string | MoveDto / PlaceMoveResponseDto |
| row | number | |
| col | number | |
| sequenceNumber | number | |
| placedAt | string (ISO) | |
| isGameOver | boolean | move-submission response only |
| result / winnerPlayerId | string \| null | move-submission response only |

## Caro Chat Message (game-caro package)

| Field | Type | Source |
|---|---|---|
| id | string | ChatMessageResponseDto |
| matchId | string | |
| senderId | string | |
| content | string | |
| sentAt | string (ISO) | |

## Caro Leaderboard Entry (game-caro package)

| Field | Type | Source |
|---|---|---|
| rank | number | LeaderboardEntryDto |
| playerId | string | |
| elo | number | |
| matchesPlayed / wins / losses / draws | number | |
| winRate | number | |

## Caro Player Profile (game-caro package)

| Field | Type | Source |
|---|---|---|
| playerId | string | PlayerProfileResponseDto |
| elo | number | |
| matchesPlayed / wins / losses / draws | number | |
| winRate | number | |
| createdAt | string (ISO) | |

Match history output: `CursorPage<CaroMatchHistoryItem>`, where `CaroMatchHistoryItem` = `{ id,
boardSize, moveTimeSeconds, result, winnerPlayerId, playerXEloChange, playerOEloChange, startedAt,
endedAt }`.

## Caro Tournament / Registration / Tournament-Creator Request (game-caro package)

| Field | Type | Source |
|---|---|---|
| gameConfigId | string | CreateTournamentDto (input) |
| minElo | number | input |
| startAt / endAt | string | input |

Full tournament/registration/creator-request response shapes are read directly from the
corresponding backend response schemas at implementation time (`/api/caro/tournaments*`,
`/api/caro/admin/tournament-creator-requests*`) — the OpenAPI contract for these did not expose
named response DTOs at the same level of detail as the rest of the surface, so tasks.md should
include a verification step against the live contract before finalizing these types.

## Relationships

- Session → Account (1:1, embedded at login)
- Account → Friend Request (1:many, as sender or receiver)
- Account → Notification (1:many)
- Account → Report (1:many, as reporter or reported)
- Account → Trust Score (1:1)
- Account + Game → Admin Assignment (many:many junction)
- Caro Game Config → Caro Match (1:many)
- Caro Match → Caro Move (1:many, ordered by sequenceNumber)
- Caro Match → Caro Chat Message (1:many)
- Account → Caro Player Profile (1:1, per-game stats)
- Caro Game Config → Caro Tournament (1:many)
- Caro Tournament → Tournament Registration (1:many)
