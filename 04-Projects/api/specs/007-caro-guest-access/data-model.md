# Phase 1 Data Model: Caro Guest (Unauthenticated) Access

No new entities, fields, or migrations. This feature only changes *who is allowed to read* two already-existing entities, and closes one pre-existing authorization gap on one of them. It reuses the domain model already defined for the match and tournament sub-domains (see `src/caro-game/domain/entities/match.ts` and `specs/006-caro-tournament/data-model.md` for `Tournament`).

## Match (existing entity — no field changes)

Relevant existing fields consulted by this feature's new authorization check (`GetMatchStateUseCase`):

| Field | Type | Used for |
|-------|------|----------|
| `visibility` | `'public' \| 'private'` | Determines whether a match is eligible for guest/non-participant viewing at all |
| `creatorId` | `string` | Participant identity check for private matches |
| `playerXId` | `string \| null` | Participant identity check for private matches |
| `playerOId` | `string \| null` | Participant identity check for private matches |
| `status` | `MatchStatus` | Already filtered at the repository level (`findLobbyMatches` only returns `looking_for_opponent` / `in_progress`, `visibility: 'public'`) — unchanged |

### Access rule (new, application-layer only)

```
canView(match, requesterId?) =
  match.visibility === 'public'
    OR requesterId === match.creatorId
    OR requesterId === match.playerXId
    OR requesterId === match.playerOId
```

`requesterId` is `undefined` for a guest. If `canView` is false, `GetMatchStateUseCase` throws the existing `MatchNotFoundError` — no new error type.

## Tournament (existing entity — no changes)

Already fully public for reads (list, details, participant list) per the existing `006-caro-tournament` feature. Nothing in this feature changes its shape or access rules; it's included in the spec's scope to confirm/lock in behavior, not to modify it.

## Guest Viewer (conceptual, not a persisted entity)

Represented at runtime simply as the absence of a `requesterId` — i.e., `req.user` is `undefined` on a request that passed through `OptionalJwtGuard` with no valid token. No new domain object, table, or session record is created for a guest.

## State / Access Matrix (summary)

| Route | Guard before | Guard after | Guest result |
|---|---|---|---|
| `GET /caro/matches/lobby` | `JwtAuthGuard` (class-level) | `OptionalJwtGuard` | 200, public matches only (unchanged filter) |
| `GET /caro/matches/:id` | `JwtAuthGuard` (class-level) | `OptionalJwtGuard` + new visibility check | 200 if public; same "not found" as a genuinely missing match if private |
| `GET /caro/matches/:id/moves` | `JwtAuthGuard` (class-level) | `OptionalJwtGuard` + new visibility check (via same use-case) | Same as above |
| `POST /caro/matches` (create) | `JwtAuthGuard` | `JwtAuthGuard` (unchanged) | 401 |
| `POST /caro/matches/:id/join` | `JwtAuthGuard` | `JwtAuthGuard` (unchanged) | 401 |
| `DELETE /caro/matches/:id` (cancel) | `JwtAuthGuard` | `JwtAuthGuard` (unchanged) | 401 |
| `POST /caro/matches/:id/leave` | `JwtAuthGuard` | `JwtAuthGuard` (unchanged) | 401 |
| `POST /caro/matches/:id/invite` | `JwtAuthGuard` | `JwtAuthGuard` (unchanged) | 401 |
| `PUT /caro/matches/:id/invitation/respond` | `JwtAuthGuard` | `JwtAuthGuard` (unchanged) | 401 |
| `POST/DELETE /caro/quick-pair` | `JwtAuthGuard` | unchanged | 401 |
| `GET/POST /caro/matches/:matchId/chat`, `POST .../chat/mute` | `JwtAuthGuard` | unchanged | 401 |
| `GET /caro/tournaments`, `GET /caro/tournaments/:id`, `GET /caro/tournaments/:id/participants` | none (already public) | unchanged | 200 |
| `POST /caro/tournaments`, `.../registrations`, `.../chat` (get+post) | `JwtAuthGuard` (+`TournamentCreatorGuard` on create) | unchanged | 401 |
