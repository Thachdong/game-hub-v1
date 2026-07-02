# Feature Specification: Account & Social API

**Feature Branch**: `feature/api/dongt/account-social`

**Created**: 2026-06-28

**Status**: Draft

**Input**: BRD-ACCOUNT-SOCIAL-001 (Đăng nhập & Trang Account) + BRD-ACCOUNT-SOCIAL-002 (Kết bạn)
— API perspective only.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Google OAuth Authentication & Token Issuance (Priority: P1)

A user opens the platform and initiates login via Google. The system redirects to Google's OAuth
consent screen, receives the callback, and either creates a new account (first-time email) or
reuses the existing one. The system issues a short-lived access token and a long-lived refresh
token. If the user's email is in the Platform Admin list, the issued token carries the admin flag.

**Why this priority**: All other user stories require an authenticated session. Nothing else can
be tested or delivered without this working first.

**Independent Test**: Hit the OAuth initiation endpoint, simulate a Google callback with a valid
auth code, and verify: (a) tokens are returned, (b) a new account is created on first login,
(c) no duplicate account on subsequent login, (d) Platform Admin flag is present when email
matches the configured list.

**Acceptance Scenarios**:

1. **Given** a Google email never previously seen on the platform, **When** the OAuth callback
   is processed, **Then** a new account is created and both access token and refresh token are
   returned.
2. **Given** a Google email with an existing account, **When** the OAuth callback is processed,
   **Then** no new account is created and tokens are returned for the existing account.
3. **Given** a valid, non-expired refresh token, **When** a refresh request is made, **Then**
   a new access token is issued without requiring re-authentication with Google.
4. **Given** a Google email present in the Platform Admin email list (env config), **When**
   login completes, **Then** the returned access token encodes the Platform Admin privilege.
5. **Given** an expired or invalid refresh token, **When** a refresh request is made, **Then**
   the request is rejected with an authentication error.

---

### User Story 2 — Account Profile & Platform Game List (Priority: P2)

A logged-in player retrieves their own profile information and sees the full list of games
available on the platform, with a flag per game showing whether they already have a game profile
there.

**Why this priority**: Provides the data powering the Account page — depends only on US1.

**Independent Test**: After completing US1 login, call the profile endpoint and the game-list
endpoint. Verify correct profile data and that `hasProfile` is accurate for each game.

**Acceptance Scenarios**:

1. **Given** a logged-in player, **When** they request their profile, **Then** the response
   contains their username, email, and avatar URL.
2. **Given** a platform with N registered games, **When** a logged-in player requests the game
   list, **Then** all N games are returned, each including a boolean `hasProfile` that is `true`
   only for games where the player already has a game profile.
3. **Given** an unauthenticated (guest) caller, **When** they request the game list, **Then**
   the full game list is returned without any `hasProfile` field.

---

### User Story 3 — Friend Request & Friendship Management (Priority: P3)

A logged-in player can send a friend request to another registered user by email, view their
pending incoming and outgoing requests, and accept or reject incoming ones. Acceptance creates a
mutual friendship visible in both players' friend lists. The notification domain is informed of
the outcome so it can alert the original sender.

**Why this priority**: Social foundation required before game-level features that depend on the
friends graph (e.g., inviting a friend into a game).

**Independent Test**: Use two test accounts — A sends a request to B, B accepts. Verify both see
each other in their friends lists. Then test rejection path and error cases (unknown email,
duplicate request, self-request).

**Acceptance Scenarios**:

1. **Given** player A submits a friend request to an email with no registered account, **When**
   the request is processed, **Then** an error is returned immediately and no request is stored.
2. **Given** player A submits a friend request to player B's registered email, **When** the
   request is processed, **Then** a pending friend request is created; neither A nor B appears
   in the other's friends list yet.
3. **Given** a pending request from A to B, **When** B accepts, **Then** A and B become mutual
   friends (both appear in each other's friends lists) and an internal event is emitted to the
   notification domain.
4. **Given** a pending request from A to B, **When** B rejects, **Then** no friendship is
   created, the request is marked rejected, and an internal event is emitted to the notification
   domain.
5. **Given** a pending request already exists from A to B, **When** A attempts to send another
   request to B in the same direction, **Then** an error is returned (no duplicate pending
   request allowed).
6. **Given** player A, **When** they attempt to send a friend request to their own account,
   **Then** an error is returned.
7. **Given** A and B are already friends, **When** A attempts to send a friend request to B,
   **Then** an error is returned.
8. **Given** A→B and B→A are both pending, and A accepts B's request (creating a friendship),
   **When** B subsequently tries to accept or reject A's still-pending request, **Then** an
   error is returned indicating A and B are already friends.
9. **Given** player A previously sent a friend request to B that B rejected, **When** A sends
   a new friend request to B, **Then** the old rejected record is replaced by a new pending
   request and B can accept or reject it.

---

### User Story 4 — Game Admin Role Assignment & Revocation (Priority: P4)

A Platform Admin can grant or revoke the Game Admin role for a specific game on any registered
account. The role is per-game; an account may be Game Admin for multiple games independently.

**Why this priority**: Required for game administration (e.g., tournament creation in Caro) but
does not block the core player experience.

**Independent Test**: With a Platform Admin token, assign Game Admin for game G to account X.
Verify X's next token includes the role. Revoke and verify the role is absent. Verify a
non-Platform Admin cannot perform either action.

**Acceptance Scenarios**:

1. **Given** a Platform Admin, **When** they assign Game Admin of game G to account X, **Then**
   account X gains the Game Admin role scoped to game G only; their status in other games is
   unchanged.
2. **Given** account X holds Game Admin for game G, **When** the Platform Admin revokes the
   role, **Then** X loses Game Admin for game G; roles in other games are unaffected.
3. **Given** a non-Platform Admin caller, **When** they attempt to assign or revoke a Game Admin
   role, **Then** the request is rejected with an authorisation error.
4. **Given** a Platform Admin, **When** they try to assign Game Admin for a game ID that is not
   registered on the platform, **Then** an error is returned.

---

### Edge Cases

- What happens when A and B are already friends and A sends a request to B? → Error (FR-008
  extends to existing friendships).
- What happens when A→B and B→A are both pending and one party accepts first? → Friendship is
  created immediately. The other party's subsequent accept/reject on the remaining pending
  request returns an "already friends" error. The pending request in the other direction is
  not automatically cancelled at the time of acceptance; the error surfaces on the next action.
- Can a sender retry after their request was rejected? → Yes — a new request replaces the old
  rejected record (one record per direction per pair at a time). Retry is always allowed after
  rejection; there is no cooldown period.
- What happens when a Platform Admin assigns a Game Admin role that the target already holds?
  → Idempotent: no error, no duplicate row created.
- What happens when the Google OAuth callback email differs from a previously stored email for
  the same Google sub (account ID)? → Out of scope — identity key is email; accounts are
  immutable after creation.
- What happens if the Platform Admin email list is empty at startup? → No user is Platform
  Admin; role-management endpoints are inaccessible.
- What happens when Google's OAuth service is unavailable during login? → The system returns
  a service-unavailable error immediately with no retries. This error is distinct from an
  authentication failure so clients can show the correct message (e.g., "Login service
  temporarily unavailable" vs. "Invalid credentials").

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide an endpoint to initiate the Google OAuth flow and a
  callback endpoint to complete it, issuing an access token and a refresh token on success.
- **FR-002**: The system MUST automatically create a new account on the first successful OAuth
  callback for a previously unseen email; no separate registration endpoint exists.
- **FR-003**: The system MUST detect a Platform Admin by comparing the authenticated user's
  email against an email list loaded from environment configuration at startup; the flag MUST
  be encoded into the issued access token.
- **FR-004**: The system MUST provide an endpoint for a logged-in player to retrieve their own
  profile (username, email, avatar URL).
- **FR-005**: The system MUST provide an endpoint that returns the full list of platform-
  registered games; for authenticated callers, each game entry MUST include a boolean
  `hasProfile` derived from the account-social module's own player-game-profile registry
  (see FR-021) — no cross-module query is made at request time.
- **FR-006**: The system MUST allow a logged-in player to send a friend request to another
  registered account identified by email.
- **FR-007**: The system MUST reject a friend request when the target email does not match any
  registered account; no pending request MUST be stored in this case.
- **FR-008**: The system MUST reject a friend request when a pending request already exists
  between the same two accounts in the same direction, or when they are already friends, or
  when the sender targets their own account.
- **FR-009**: The system MUST allow the recipient of a pending friend request to accept it,
  creating a mutual friendship record for both accounts.
- **FR-010**: The system MUST allow the recipient of a pending friend request to reject it,
  marking the request as rejected without creating a friendship.
- **FR-011**: After a friend request is accepted or rejected, the system MUST emit an internal
  domain event so the notification domain can inform the original sender of the outcome.
- **FR-012**: The system MUST provide an endpoint for a logged-in player to retrieve their
  friends list.
- **FR-013**: The system MUST provide an endpoint for a logged-in player to retrieve their
  pending incoming and outgoing friend requests.
- **FR-014**: The system MUST allow a Platform Admin to assign the Game Admin role for a
  specific game to any registered account; the operation MUST be idempotent.
- **FR-015**: The system MUST allow a Platform Admin to revoke the Game Admin role for a
  specific game from an account that currently holds it.
- **FR-016**: Game Admin role assignment or revocation for one game MUST NOT affect the
  account's Game Admin status for any other game.
- **FR-017**: The system MUST provide an endpoint to issue a new access token given a valid,
  non-expired refresh token, without re-authenticating with Google.
- **FR-018**: The game list endpoint (FR-005) MUST be accessible to unauthenticated (guest)
  callers, returning the game list without profile-status fields.
- **FR-019**: When a player attempts to accept or reject a pending friend request and the two
  accounts are already friends (because the request in the other direction was accepted first),
  the system MUST reject the action with an "already friends" error; the pending request record
  is not required to be automatically cancelled at the time friendship is formed.
- **FR-020**: When a player sends a new friend request to an account where a previously
  rejected request (in the same direction) exists, the system MUST replace the old rejected
  record with a new pending request rather than blocking the sender. Only one record per
  direction per account pair is retained at any time.
- **FR-021**: The account-social module MUST maintain an internal player-game-profile registry
  that records which players have an active profile in each game. This registry is populated
  by subscribing to profile-creation domain events emitted by game modules — the account-social
  module MUST NOT query individual game modules at request time to determine profile existence.
- **FR-022**: When Google's OAuth service is unavailable or returns an error during the login
  callback, the system MUST immediately return a service-unavailable error to the caller with
  no internal retries. This error MUST be distinguishable from an authentication failure
  (e.g., invalid or expired auth code) so that callers can display an appropriate message.

### Key Entities

- **Account**: A registered platform user. Key attributes: unique identifier, email (sourced
  from Google, immutable), username, avatar URL, registration timestamp. Platform Admin status
  is derived at login from env config and is NOT a stored attribute.
- **GameAdminRole**: A granted permission record linking an Account to a specific Game for
  administrative purposes. Key attributes: account reference, game reference, grant timestamp.
- **FriendRequest**: A directed invitation from a sender Account to a receiver Account.
  Key attributes: sender reference, receiver reference, status (pending / accepted / rejected),
  creation timestamp, resolution timestamp. Only one record per direction per account pair
  exists at any time; a new request from the same sender replaces a previous rejected record.
- **Friendship**: A confirmed mutual relationship between two Accounts, created only when a
  FriendRequest is accepted. Key attributes: references to both accounts, creation timestamp.
- **PlayerGameProfile**: A platform-level record owned by the account-social module that
  tracks whether a given Account has an active profile in a given Game. Key attributes: account
  reference, game reference, recorded timestamp. Written when the account-social module
  receives a profile-creation domain event from a game module; read by FR-005 to populate
  the `hasProfile` flag.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user completes the full Google OAuth login flow and receives tokens within
  3 seconds under normal operating conditions.
- **SC-002**: The profile endpoint and the game list endpoint each respond within 500 ms for
  a single authenticated caller under normal load.
- **SC-003**: A friend request to a non-existent email is rejected in a single response with
  a descriptive error; no data is persisted as a result.
- **SC-004**: Mutual friendship is established within one API round-trip after the recipient
  accepts the request.
- **SC-005**: A Platform Admin can assign or revoke a Game Admin role in a single API call;
  the change is reflected in the target account's next issued token.
- **SC-006**: Every protected endpoint returns a standardised authorisation error when accessed
  by an unauthenticated caller or a caller without the required role.
- **SC-007**: The duplicate-request guard (FR-008) rejects a second pending request between
  the same pair in the same direction without creating any additional records.

---

## Assumptions

- Google OAuth is the sole identity provider for this release; email/password login is out
  of scope.
- Each Google account maps to exactly one platform account; linking multiple Google identities
  to one platform account is out of scope.
- The Platform Admin email list is loaded once at service startup from environment
  configuration; changing the list requires a service restart.
- The platform game registry (the source of truth for which games exist) is managed outside
  this feature; this spec assumes it is readable by the account-social module.
- Unfriending (removing an established friendship) is out of scope for this version.
- No maximum friend count or rate limit on friend requests is enforced in this version; these
  can be added when an anti-spam requirement arises.
- The notification event emitted in FR-011 is consumed asynchronously by the notification
  domain; this spec does not define notification content or delivery channel.
- Avatar URL and username are provided by Google at first login; user-editable profile fields
  (custom username, custom avatar) are out of scope for this version.
- The `hasProfile` flag per game (FR-005) is determined from the account-social module's own
  `PlayerGameProfile` registry (FR-021), populated by domain events emitted by each game
  module when a player profile is created. No cross-module query is made at request time.
- **Token lifecycle is stateless**: explicit logout and server-side refresh token revocation
  are out of scope. Sessions end naturally when the access token expires (15–30 min) or the
  refresh token expires (7–30 days). No server-side token storage or denylist is required.

## Clarifications

### Session 2026-06-28

- Q: Does the system need explicit logout or server-side refresh token revocation? → A: No — stateless only; tokens expire naturally, no server-side revocation required.
- Q: When A→B and B→A friend requests coexist, what happens when the first acceptance creates a friendship? → A: Both pending requests coexist. The first acceptance creates the friendship. When the second party then tries to accept or reject the remaining request, the system returns an "already friends" error.
- Q: Can a sender retry a friend request after it was rejected? → A: Yes — retry always allowed; the new pending request replaces the old rejected record. No cooldown period. One record per direction per pair at a time.
- Q: How does the account-social module determine `hasProfile` per game — platform-level shared table or per-game query at runtime? → A: Platform-level registry (PlayerGameProfile) owned by account-social module, populated via domain events from game modules on profile creation; no cross-module query at request time.
- Q: What should happen when Google's OAuth service is unavailable during the login callback? → A: Fail fast — return a service-unavailable error immediately with no internal retries; error must be distinguishable from an authentication failure.
