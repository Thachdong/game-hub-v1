# Phase 0 Research: Caro Guest (Unauthenticated) Access

No `NEEDS CLARIFICATION` markers remained in the spec's Technical Context — this feature is a scoped fix over an already-audited, existing codebase, so research here is about confirming/choosing among existing patterns rather than evaluating new technology.

## Decision 1: How guests get read access to the lobby/gameboard routes

**Decision**: Move `@UseGuards(JwtAuthGuard)` off the `MatchController` class and apply it per-route; put `@UseGuards(OptionalJwtGuard)` on the three view-only routes (`GET lobby`, `GET :id`, `GET :id/moves`).

**Rationale**: `OptionalJwtGuard` already exists in `src/shared-auth/optional-jwt.guard.ts`, is exported `@Global()` from `SharedAuthModule`, and is already used for exactly this purpose in `src/account-social/interface/http/games.controller.ts` (`GET /games`, populating an optional `hasProfile` flag when a token is present). Reusing it keeps one guest-access mechanism for the whole codebase instead of inventing a second one for `caro-game`.

**Alternatives considered**:
- A new caro-game-local optional guard — rejected: pure duplication of `OptionalJwtGuard`'s logic for no benefit.
- A global `@Public()` decorator + app-wide default guard — rejected: the codebase has no such convention today; every controller opts into guards explicitly and per-route, so introducing a global-guard-plus-bypass convention here would be a bigger, unrelated architectural change.

## Decision 2: Expired/invalid token on a view-only route (FR-015)

**Decision**: Fix `OptionalJwtGuard.handleRequest` so any authentication failure (missing header, expired token, invalid signature/malformed token) falls back to a guest (`return null`), not just the "no Authorization header" case.

**Rationale**: Today's implementation only treats a *missing* header as "guest"; if a header is present but the token is expired or invalid, it throws `UnauthorizedException`. That means a returning visitor with a stale token in local storage would be blocked from viewing the lobby/a match/a tournament — exactly the failure mode FR-015 and the spec's Edge Cases call out. This is a latent bug the audit surfaced, not something this feature introduces.

**Blast radius check**: `OptionalJwtGuard` has exactly one existing consumer today, `GamesController#list` in `account-social`. No test in the repo asserts the old throw-on-invalid-token behavior (`grep` for `OptionalJwtGuard`/`handleRequest`/`isNoAuthHeader` across `*.spec.ts` returned nothing), so the fix is behavior-preserving for the happy path and strictly fixes the one broken edge case for both consumers.

**Alternatives considered**:
- Leave the guard alone and add a caro-game-local subclass that overrides `handleRequest` — rejected: would leave `GamesController` with the same latent bug, and creates two divergent guest-access behaviors in the same codebase for no reason.

## Decision 3: Keeping private matches hidden from guests (FR-005)

**Decision**: Add an authorization branch inside `GetMatchStateUseCase.execute(matchId, requesterId?)`: if the fetched match's `visibility === 'private'` and `requesterId` is not the match's `creatorId`, `playerXId`, or `playerOId`, throw the existing `MatchNotFoundError` — the same error already thrown when the match genuinely doesn't exist.

**Rationale**: Before this feature, `GetMatchStateUseCase` had no visibility check at all — any caller with a match ID (previously: any authenticated user, since the whole controller required a JWT) could read a private match's state. Making the view routes public without this check would make the gap worse (any anonymous guest, not just any account holder, could read a private match). Reusing `MatchNotFoundError` for the "not authorized to view" case (rather than a distinct forbidden error) matches the spec's edge case that a guest — or any unrelated player — sees the identical "not accessible" outcome, so a private match's mere existence is never confirmed to someone who isn't part of it. Placing the check in the application layer (not the controller) keeps it framework-agnostic per Gate I.

**Alternatives considered**:
- Filter/authorize in the controller — rejected: business rule would leak into the interface layer (Gate I).
- Return a distinct 403 Forbidden — rejected: reveals that a private match with that ID exists, which the spec's edge case explicitly avoids ("the guest sees the same 'not accessible' outcome an unrelated logged-in player would see").

## Decision 4: Realtime (WebSocket) viewing needs no change for this feature

**Decision**: No change to `RealtimeGateway`.

**Rationale**: `handleConnection` already assigns any socket connecting with no token, or an invalid one, the `role: 'observer'` — this is exactly what makes FR-004 (guests see live moves) already true today without any change. This was true before this feature and is unaffected by it.

**Deferred / explicitly out of scope**: `handleJoinRoom` does not check a match's `visibility` before letting a socket join a `match:{id}` room, so a guest who already knows a private match's ID could still receive its live moves over the socket, even after this feature closes the equivalent REST gap. This is a pre-existing gap in shared, multi-consumer gateway code (also used by tournament rooms), and closing it is a larger change than "make lobby/tournament/gameboard pages guest-viewable." It is recorded here for visibility and left out of this feature's task list; it should be picked up as its own follow-up if/when private-match spectating over WebSocket is confirmed to be a real risk worth addressing.

## Decision 5: No schema, dependency, or new-endpoint changes

**Decision**: No new tables, columns, migrations, npm packages, or HTTP/WebSocket routes.

**Rationale**: Every allowed guest capability in the spec (browse lobby, browse tournaments, view a match, view a tournament + its participant list) is already backed by an existing endpoint; the only work is correcting which guard sits in front of three of them, correcting one guard's fallback behavior, and adding one authorization check that was missing regardless of the guest-access question.
