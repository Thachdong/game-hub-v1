# REST API Contract Changes: Caro Guest (Unauthenticated) Access

All endpoints below already exist. This feature changes only their authentication requirement and, for two of them, adds an authorization check for private matches. No request/response body shapes change.

## Now public (no `Authorization` header required)

### `GET /caro/matches/lobby`

- **Before**: 401 without a valid JWT.
- **After**: 200 for guest and authenticated callers alike. Response body unchanged (`LobbyMatchDto[]`) — already filtered server-side to public, waiting/in-progress matches only.

### `GET /caro/matches/:id`

- **Before**: 401 without a valid JWT.
- **After**:
  - 200 with `MatchStateDto` if the match is `visibility: public` (guest or authenticated).
  - 200 with `MatchStateDto` if the caller is authenticated **and** is the match's creator, `playerX`, or `playerO`, even if the match is `visibility: private`.
  - 404 (`MatchNotFoundError`, same body as a genuinely nonexistent match ID) if the match is `visibility: private` and the caller is a guest or an authenticated user who is not a participant. This is a new authorization branch, not just a guard change — see [data-model.md](../data-model.md).

### `GET /caro/matches/:id/moves`

- Same before/after behavior as `GET /caro/matches/:id` (backed by the same use-case).

## Unchanged — already public (confirmed by audit, not modified)

- `GET /caro/tournaments`
- `GET /caro/tournaments/:tournamentId`
- `GET /caro/tournaments/:tournamentId/participants`

## Unchanged — already requires `Authorization: Bearer <token>`, refuses guests with 401

- `POST /caro/matches` (create match)
- `POST /caro/matches/:id/join`
- `DELETE /caro/matches/:id` (cancel)
- `POST /caro/matches/:id/leave`
- `POST /caro/matches/:id/invite`
- `PUT /caro/matches/:id/invitation/respond`
- `POST /caro/quick-pair`, `DELETE /caro/quick-pair`
- `GET /caro/matches/:matchId/chat`, `POST /caro/matches/:matchId/chat`, `POST /caro/matches/:matchId/chat/mute`
- `POST /caro/tournament-creator-requests`
- `POST /caro/tournaments` (create tournament; also requires `TournamentCreatorGuard`)
- `POST /caro/tournaments/:tournamentId/registrations`
- `GET /caro/tournaments/:tournamentId/chat`, `POST /caro/tournaments/:tournamentId/chat`

## Cross-cutting change: guest identity resolution

Applies to every endpoint now guarded by `OptionalJwtGuard` (the three `MatchController` view routes above, and — as a side effect of the shared-guard fix — `GET /games` in `account-social`):

- **Before**: a present-but-expired/invalid token → 401, even on a view-only route.
- **After**: a present-but-expired/invalid token → treated identically to no token at all (guest). Only a route with `JwtAuthGuard` still rejects an expired/invalid token with 401.
