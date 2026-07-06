# Feature Specification: Domain Service Layer for Backend Integration

**Feature Branch**: `001-domain-service-layer`

**Created**: 2026-07-02

**Status**: Draft

**Input**: User description: "Xây dựng services interface tham khảo nội dung file 04-Projects/api/openapi.yml. Tổ chức packages sao cho tách biệt: services dành cho: account, profiles, authentication + admin services + game caro services. Sử dụng axios để call api. Sử dụng HOC/HOF để đảm bảo services return cùng một format. Hãy khai báo type cho input/output của services"

## Clarifications

### Session 2026-07-02

- Q: Where should the service layer persist the session (access/refresh JWT tokens) so it can
  attach them to outgoing requests? → A: In-memory access token + httpOnly refresh cookie —
  superseded below once planning revealed the backend has no cookie-setting mechanism.
- Q: (Revised during `/speckit-plan`, 2026-07-02) The backend's `/api/auth/refresh` requires the
  refresh token explicitly in the JSON request body and sets no cookies, and the constitution
  forbids depending on server-side session cookies for auth — so where should the refresh token
  actually live? → A: Behind a BFF (Backend-for-Frontend) proxy — a thin server-side layer inside
  the webapp (not the client-side service functions) owns the refresh token in its own first-party
  httpOnly cookie and is the only thing that ever calls the backend's refresh endpoint. Client-side
  service functions only ever see a short-lived access token in memory; the raw refresh token is
  never exposed to browser JavaScript.
- Q: When a service call fails due to a transient network/server issue (timeout, 5xx, connection
  drop) rather than an auth/validation problem, should the service layer automatically retry
  before returning a failure? → A: Yes — auto-retry a limited number of times (e.g., up to 2 extra
  attempts with backoff) for idempotent calls, then return a typed failure if still unsuccessful.
- Q: (Revised following `/speckit-analyze` on `2026-07-02`) "Idempotent calls" was never given a
  concrete boundary, so FR-024 read as if it covered every method, including mutations like
  submitting a Caro move — risking duplicate side effects if a mutation were blindly retried after
  an ambiguous network failure. What is the actual boundary? → A: Automatic retry applies only to
  safe `GET` requests. `POST`/`PUT`/`PATCH`/`DELETE` calls are never automatically retried by this
  policy, since several of them are not guaranteed safe to repeat (e.g., submitting a move,
  creating a match) — matching the resolution already adopted in research.md §6.
- Q: (Revised 2026-07-02, decided directly with the user after implementation) The hand-rolled
  Next.js BFF session-cookie layer (custom Route Handlers + a custom first-party httpOnly cookie,
  built as the `auth-service` package's `bff.ts`/`client.ts`) was working and constitution-compliant
  — should it stay, or be replaced? → A: Replaced with delegation to **NextAuth (Auth.js)**.
  Rationale from the conversation: a hand-rolled cookie/session layer duplicates what NextAuth
  already provides (encrypted session cookie, refresh-rotation callback pattern, CSRF handling),
  and NextAuth doesn't require abandoning the backend's own Google-OAuth-and-JWT-issuance flow — it
  wraps it via a `Credentials`-style provider rather than replacing it. Since NextAuth only runs
  inside a Next.js app and no `apps/*` exists yet in this workspace, the `auth-service` package
  (FR-007, FR-023 as originally written) was removed rather than reimplemented — session/token
  wiring is deferred to whichever future feature scaffolds `apps/*`. See constitution v2.0.0,
  Principle VI.

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.

  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

The primary user of this feature is the **webapp engineering team**: every frontend developer who
builds a screen or component that needs data from, or sends actions to, the backend API. Today
that data access does not exist as a reusable layer, so each user story below represents one
domain of the backend surface being made consumable through a consistent, typed service layer.

### User Story 1 - Authenticate and maintain a session (Priority: P1)

> **SUPERSEDED 2026-07-02**: This story's originally-built `auth-service` package (a hand-rolled
> BFF: `client.ts` + `bff.ts` + a custom httpOnly cookie) was removed in favor of delegating
> session/token lifecycle to NextAuth (Auth.js) — see constitution v2.0.0, Principle VI, and the
> Clarifications entry above. NextAuth only runs inside a Next.js app, so this story is no longer
> satisfied by a `packages/*` package in this workspace; it will be re-scoped when a future feature
> scaffolds `apps/*` and configures NextAuth. The story is kept below for historical context on
> *what* needs solving, not *how*.

As a webapp developer, I need a ready-made set of authentication service functions (start Google
login, handle the OAuth callback, refresh an expired session) so that every screen in the app can
rely on a single, correct way of establishing and renewing a user's identity, instead of each
feature team re-implementing login/refresh logic on their own.

**Why this priority**: No other domain is usable without an authenticated session. This is the
foundation every other service depends on.

**Independent Test**: Can be fully tested by calling the authentication service functions against
the backend's `/api/auth/*` endpoints and confirming a session (access/refresh token pair) is
returned, refreshed, and typed correctly — without needing any other domain's services to exist.

**Acceptance Scenarios**:

1. **Given** an unauthenticated visitor, **When** the developer invokes the "start login" service
   function, **Then** the function returns the redirect information needed to send the user to the
   identity provider.
2. **Given** a returning session with a valid refresh token, **When** the developer invokes the
   "refresh session" service function, **Then** a new access token is returned in the same
   consistent response shape as every other service call.
3. **Given** an expired or invalid refresh token, **When** the developer invokes the "refresh
   session" service function, **Then** the function returns a typed failure result the caller can
   branch on (e.g., to redirect to login) rather than throwing an unhandled exception.

---

### User Story 2 - Manage the current account (Priority: P2)

As a webapp developer, I need a service for reading and acting on the signed-in user's own account
record so that account-related screens (profile header, account settings) can be built against a
typed contract instead of hand-written HTTP calls.

**Why this priority**: Account data is needed on nearly every authenticated page (e.g., header,
navigation), making it the next most foundational domain after authentication.

**Independent Test**: Can be fully tested by calling the account service's "get current account"
function with a valid session and confirming the typed account object (id, email, username,
avatar) is returned in the standard response shape.

**Acceptance Scenarios**:

1. **Given** an authenticated session, **When** the developer invokes the "get current account"
   service function, **Then** a typed account object is returned.
2. **Given** an authenticated session, **When** the developer invokes a service function to list
   the platform's available games, **Then** a typed list of games is returned for use in
   navigation/game-selection UI.

---

### User Story 3 - Manage social & profile-adjacent features (Priority: P3)

As a webapp developer, I need typed service functions for the account's social and safety
features — friends, notifications, reporting other users, and viewing trust score — so that these
cross-cutting profile screens can be built without duplicating request/response handling per
feature.

**Why this priority**: These features are used across many screens (friend list, notification
bell, report dialogs) but are not required to bootstrap the app the way auth/account are, so they
follow after the foundational domains.

**Independent Test**: Can be fully tested by exercising the friend-request, notification, report,
and trust-score service functions against their respective endpoints and confirming each returns
correctly typed data in the standard response shape, independent of the admin or game-caro
domains.

**Acceptance Scenarios**:

1. **Given** an authenticated user, **When** the developer invokes the "send friend request"
   service function with a target user, **Then** a typed friend-request record is returned.
2. **Given** an authenticated user, **When** the developer invokes the "list notifications"
   service function, **Then** a typed, paginated list of notifications is returned.
3. **Given** an authenticated user, **When** the developer invokes the "submit report" service
   function with a report type and target, **Then** a typed report record is returned.
4. **Given** an authenticated user, **When** the developer invokes the "get my trust score"
   service function, **Then** a typed trust-score value is returned.

---

### User Story 4 - Perform platform administration (Priority: P4)

As a webapp developer building the admin console, I need typed service functions for
platform-level administrative actions — assigning game admins and moderating user reports — kept
in their own package, so that admin-only functionality is clearly separated from regular
end-user services and cannot be accidentally imported into public-facing screens.

**Why this priority**: Admin tooling is used by a small, privileged subset of users and is not
required for the core end-user experience to function, so it is built after the domains every
user touches.

**Independent Test**: Can be fully tested by calling the admin service's game-admin-assignment and
report-moderation functions with an admin session and confirming correctly typed results,
independent of any other domain package.

**Acceptance Scenarios**:

1. **Given** an authenticated admin session, **When** the developer invokes the "assign game
   admin" service function, **Then** a typed confirmation of the new admin assignment is returned.
2. **Given** an authenticated admin session, **When** the developer invokes the "confirm report"
   service function, **Then** a typed, updated report record is returned.
3. **Given** a non-admin session, **When** any admin-package service function is invoked, **Then**
   the function returns a typed authorization-failure result rather than partially-shaped data.

---

### User Story 5 - Play and manage Caro games (Priority: P5)

As a webapp developer building the Caro game experience, I need a self-contained package of typed
service functions covering game configuration, matchmaking, gameplay actions, in-match chat,
leaderboards, player profiles, tournaments, and Caro-specific administration, so that the entire
Caro feature area can be developed against one consistent, isolated service package.

**Why this priority**: Caro is a single game vertical built on top of the foundational and social
domains; it represents the largest but most self-contained slice of the backend surface, so it is
last in build order without blocking the other domains.

**Independent Test**: Can be fully tested by exercising representative Caro service functions
(create/join a match, submit a move, fetch the leaderboard, register for a tournament) and
confirming each returns correctly typed data in the standard response shape, independent of the
account/profiles/admin packages.

**Acceptance Scenarios**:

1. **Given** an authenticated user, **When** the developer invokes the "list available game
   configs" service function, **Then** a typed list of Caro game configurations is returned.
2. **Given** an authenticated user, **When** the developer invokes the "create match" and then
   "join match" service functions, **Then** typed match records reflecting each state change are
   returned.
3. **Given** two players in an active match, **When** the developer invokes the "submit move"
   service function, **Then** a typed, updated match/board state is returned.
4. **Given** an authenticated user, **When** the developer invokes the "get leaderboard" service
   function, **Then** a typed, ranked list of players is returned.
5. **Given** an authenticated user with tournament-creator privileges, **When** the developer
   invokes the "create tournament" service function, **Then** a typed tournament record is
   returned.
6. **Given** an authenticated Caro admin, **When** the developer invokes a Caro-admin service
   function (e.g., deactivate a game config), **Then** a typed confirmation reflecting the change
   is returned.

---

### Edge Cases

- What happens when a service call is made without a valid session (no/expired access token)? The
  service MUST return a typed "unauthorized" result rather than letting the raw HTTP error
  propagate unformatted.
- What happens when an access token has expired but a valid refresh token still exists? The
  session SHOULD be transparently renewed before the failing call is retried, so callers do not
  each have to implement their own retry logic.
- What happens when the backend returns a validation error (e.g., malformed input to "submit
  report")? The service MUST return the validation details in the same typed failure shape as any
  other error, not as a thrown exception with a different structure.
- What happens when the backend is unreachable (network failure, timeout, 5xx) on a safe `GET`
  request? The service MUST automatically retry the call a limited number of times (with backoff)
  before giving up, then return a typed failure result distinguishable from an authorization or
  validation failure, so UI can show a "something went wrong, retry" state only once automatic
  retries are exhausted.
- What happens when the same transient failure (network failure, timeout, 5xx) occurs on a
  mutating call (`POST`/`PUT`/`PATCH`/`DELETE`) — e.g., submitting a Caro move, creating a match,
  submitting a report? The service MUST NOT automatically retry it, since the backend does not
  guarantee these operations are safe to repeat; it MUST return the typed failure result
  immediately so the caller (not the service layer) decides whether to prompt the user to retry.
- What happens when an end-user session calls an admin-only or Caro-admin-only function? The
  service MUST surface a typed authorization-failure result consistently with every other domain's
  error handling, not a domain-specific one-off shape.
- What happens when a list endpoint (friends, notifications, match lobby, tournaments) is called?
  The response MUST expose pagination information in a consistent, typed shape across every list
  endpoint in every package.

## Requirements *(mandatory)*

### Functional Requirements

**Cross-cutting (all packages)**

- **FR-001**: Every service function, regardless of domain or package, MUST return its result in
  one consistent, typed shape (success payload vs. failure/error), so calling code never needs to
  know which backend endpoint produced the result to know how to handle it.
- **FR-002**: Every service function MUST declare an explicit input type and an explicit output
  type; no service function may accept or return an untyped (`any`-equivalent) value.
- **FR-003**: Service functions MUST be organized into separate, independently consumable
  packages by domain: authentication, account, profiles (social/safety features), admin
  (platform-level administration), and game-caro (all Caro game functionality including
  Caro-specific administration). A component MUST be able to depend on one domain package without
  being forced to depend on another.
- **FR-004**: The service layer MUST cover every operation exposed by the backend API contract
  (`04-Projects/api/openapi.yml`) that is reachable by an end-user or admin webapp screen.
- **FR-005**: Failure results MUST distinguish, at minimum, between: authentication required,
  authorization denied, invalid input, resource not found, and unexpected/server error — so
  calling UI code can react differently to each.
- **FR-006**: The service layer MUST NOT require component or page code to construct request
  payloads or parse raw responses; those responsibilities live entirely inside the service
  function.
- **FR-023** *(SUPERSEDED 2026-07-02 — see constitution v2.0.0 Principle VI)*: ~~The session's
  access token MUST be held only in memory at runtime on the client and MUST NOT be written to
  `localStorage`, `sessionStorage`, or any other persistent client-side storage. The refresh token
  MUST never be exposed to or readable by client-side JavaScript: it MUST be held only behind a
  server-side proxy layer within the webapp, in a first-party httpOnly cookie that the proxy layer
  alone reads to call the backend's refresh endpoint on the client's behalf.~~ Session/token
  lifecycle is now delegated to NextAuth (Auth.js); the refresh token still MUST NEVER be readable
  by client-side JavaScript, and the access token, if ever exposed to client code via a NextAuth
  `session` callback, MUST be treated with the same care as a plain client-memory token. See
  constitution v2.0.0 Principle VI for the current rule.
- **FR-024**: When a **safe (`GET`) request** fails due to a transient condition (network error,
  timeout, or 5xx response) rather than an authentication, authorization, or validation failure,
  the service layer MUST automatically retry the call a limited number of times with backoff
  before returning a typed failure result. Mutating requests (`POST`/`PUT`/`PATCH`/`DELETE`) MUST
  NOT be automatically retried by this policy under any failure condition, since the backend does
  not guarantee they are safe to repeat — a transient failure on a mutating call MUST be returned
  to the caller immediately as a typed failure, with no service-layer-initiated retry.

**Authentication package** *(SUPERSEDED 2026-07-02 — package removed, see constitution v2.0.0
Principle VI)*

- **FR-007**: ~~The authentication service MUST provide functions to initiate third-party login,
  complete the login callback, and refresh an existing session, each typed per the corresponding
  backend contract.~~ Session/token lifecycle (login initiation, OAuth callback handling, refresh)
  is now delegated to NextAuth (Auth.js), configured inside the future `apps/*` Next.js app rather
  than a standalone `packages/auth-service`. No FR-007 package exists in this workspace as of this
  amendment.

**Account package**

- **FR-008**: The account service MUST provide a function to retrieve the signed-in user's own
  account record, typed per the backend contract.
- **FR-009**: The account service MUST provide a function to list the platform's available games.

**Profiles package**

- **FR-010**: The profiles service MUST provide functions to send, list, accept/decline, and
  remove friend requests/relationships.
- **FR-011**: The profiles service MUST provide functions to list notifications and mark a
  notification as read.
- **FR-012**: The profiles service MUST provide functions to list available report types and
  submit a report against another user or entity.
- **FR-013**: The profiles service MUST provide a function to retrieve the signed-in user's own
  trust score.

**Admin package**

- **FR-014**: The admin service MUST provide functions to assign and remove per-game admin roles
  for an account.
- **FR-015**: The admin service MUST provide functions to list, confirm, and manage reports and
  report types at the platform level.

**Game-caro package**

- **FR-016**: The game-caro service MUST provide functions covering game configuration lookup
  (including Caro-specific admin management of game configs).
- **FR-017**: The game-caro service MUST provide functions covering the full match lifecycle:
  browsing the lobby, creating, joining, leaving, inviting to, and viewing a match.
- **FR-018**: The game-caro service MUST provide functions covering active gameplay: starting a
  match, submitting a move, surrendering, and requesting/responding to a draw.
- **FR-019**: The game-caro service MUST provide a function to request quick-pair matchmaking.
- **FR-020**: The game-caro service MUST provide functions covering in-match chat, including
  sending messages and muting participants.
- **FR-021**: The game-caro service MUST provide functions to retrieve the leaderboard and player
  profiles (including match history), for both the signed-in player and other players.
- **FR-022**: The game-caro service MUST provide functions covering tournaments: requesting
  tournament-creator status, creating/listing/viewing tournaments, registering, viewing
  participants, and tournament chat, plus the corresponding tournament-creator-request admin
  functions.

### Key Entities

- **Session**: Represents an authenticated user's access/refresh token pair and its validity
  state; required by every domain package's calls, but as of 2026-07-02 no longer produced by a
  `packages/auth-service` in this workspace — session lifecycle is delegated to NextAuth (Auth.js)
  inside the future `apps/*` Next.js app. The refresh token MUST remain unreadable by client-side
  JavaScript; the access token's exposure to client code is a NextAuth `session`-callback
  configuration choice, not an architectural given. See constitution v2.0.0 Principle VI.
- **Account**: The signed-in user's core identity record (id, email, username, avatar).
- **Game**: A platform-level catalog entry describing a playable game (e.g., Caro).
- **Friend Relationship / Friend Request**: A connection or pending connection between two
  accounts.
- **Notification**: A message delivered to an account about platform activity, with a read/unread
  state.
- **Report / Report Type**: A user-submitted flag against another account or entity, categorized
  by a report type, with a moderation status.
- **Trust Score**: A computed reputation value associated with an account.
- **Admin Assignment**: A record granting an account administrative privileges over a specific
  game.
- **Caro Game Config**: A configurable ruleset/variant for the Caro game, manageable by Caro
  admins.
- **Caro Match**: A game session between players, including board state, participants, and
  lifecycle status (lobby, active, finished).
- **Caro Move**: A single play made by a participant within a match.
- **Caro Chat Message**: A message sent within the context of a match or tournament.
- **Caro Player Profile**: A player's Caro-specific statistics and match history.
- **Caro Tournament / Tournament Registration / Tournament-Creator Request**: A competitive event,
  a player's registration to it, and a request for elevated tournament-creation privileges.
- **Standard Response Envelope**: The uniform shape every service function returns, distinguishing
  a successful payload from a typed failure with a discriminated reason.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the operations defined in the backend API contract that a webapp screen
  needs are available as a typed service function, with none requiring a developer to write a raw
  HTTP call.
- **SC-002**: A developer can identify and call the correct service function for a new screen
  without inspecting the raw backend contract, because the function's declared input/output types
  fully describe the request and response.
- **SC-003**: 100% of service function results, across all five packages, are handled by calling
  code through one common success/failure pattern — measured by zero call sites needing
  domain-specific or endpoint-specific error-shape handling.
- **SC-004**: A developer can add a new operation to one domain package (e.g., a new Caro
  endpoint) without modifying any other domain package's code.
- **SC-005**: Mismatched request or response data (e.g., passing the wrong shape into a service
  function) is caught before the code runs, not discovered at runtime in the browser.

## Assumptions

- **Scope is REST-only for this feature.** The backend contract referenced
  (`04-Projects/api/openapi.yml`) documents REST/HTTP operations only. Real-time transports
  (WebSocket/SSE) required by the project constitution for notifications, live match state, and
  chat are treated as a separate, follow-on feature and are out of scope here.
- **Session refresh is transparent to callers.** When a call fails solely due to an expired access
  token and a valid refresh token is available, the service layer renews the session and retries
  once before surfacing a failure, so individual screens do not each implement retry logic. The
  renewal mechanism itself (previously "via the server-side proxy layer, see FR-023") is now
  NextAuth's refresh-rotation callback — see constitution v2.0.0 Principle VI.
- **SUPERSEDED 2026-07-02**: ~~The authentication package has a server-side component. Unlike the
  other four packages, which are purely client-callable, the authentication package includes a
  small server-side proxy layer within the webapp that is the sole holder of the refresh token and
  the only caller of the backend's refresh endpoint. This was confirmed necessary during planning
  because the backend contract transmits the refresh token as a plain JSON field with no
  cookie-setting mechanism, and the constitution forbids the webapp from depending on server-side
  session cookies as the primary auth mechanism — the proxy's cookie is a secure transport detail
  for the JWT, not a session-cookie auth scheme; the JWT itself remains the sole authentication
  artifact.~~ Replaced by: session/token handling is delegated to NextAuth (Auth.js), configured
  inside the future `apps/*` Next.js app — no bespoke server-side proxy package exists in this
  workspace. NextAuth wraps, rather than replaces, the backend's own Google-OAuth-and-JWT-issuance
  flow (via a `Credentials`-style provider), since the backend performs the actual OAuth exchange
  and issues its own JWTs.
- **Caro-specific admin operations live in the game-caro package, not the admin package.** The
  admin package is reserved for platform-wide administration (cross-game admin assignment, report
  moderation); Caro game-config administration and tournament-creator-request administration are
  grouped with the rest of the Caro domain since they only make sense in that context.
- **"Profiles" refers to the account's social/safety surface** (friends, notifications, reporting,
  trust score) rather than the Caro-specific player profile, which is covered under the game-caro
  package's player-profile functions.
- **The uniform response shape mirrors the backend's existing response envelope**
  (status/data/message plus a distinguishable error case), since the backend already standardizes
  on this pattern — the service layer preserves it rather than inventing a new one.
- **Consumers of this service layer are other parts of the same webapp codebase** (route segments,
  components, hooks) rather than external third parties, so no public versioning/compatibility
  guarantees are assumed for the service functions themselves.
