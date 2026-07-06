# Feature Specification: Cookie-Based Token Auth Migration (Replace NextAuth)

**Feature Branch**: `003-cookie-auth-migration`

**Created**: 2026-07-06

**Status**: Draft

**Input**: User description: "check và update specs cơ chế authentication
NextJS sẽ xử lý token như sau:
- client call api login => nextjs login route call api /login đến server => set cookie cho refreshToken/accessToken
- client call api get resource => nextjs proxy route retrieve accessToken from cookie => call api để get data
Note: nếu như tách theo package được thì tách, nếu không tách được thì cứ để xử lý ở app + cleanup common packages (nếu cần)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Sign in without ever exposing tokens to page scripts (Priority: P1)

As a visitor, I want to sign in and have my session established without my browser-side scripts
ever touching my authentication tokens, so that a malicious script injected into the page (XSS)
cannot steal my credentials and hijack my account.

**Why this priority**: This is the foundation of the whole migration — every other story depends
on tokens being held server-side only. Nothing else in this feature matters if this isn't true.

**Independent Test**: Can be fully tested by signing in as a visitor and then inspecting every
network response and client-readable storage location (page scripts, browser storage) to confirm
the access and refresh token values never appear anywhere client-readable — only as httpOnly
cookies the browser sends automatically but scripts cannot read.

**Acceptance Scenarios**:

1. **Given** an anonymous visitor submitting valid credentials, **When** sign-in completes, **Then**
   the webapp is in a signed-in state and neither the access token nor the refresh token appears in
   any response body, script-readable cookie, or browser storage.
2. **Given** a visitor submitting invalid credentials, **When** sign-in fails, **Then** the visitor
   sees a clear error and no partial session/cookie is established.

---

### User Story 2 - Existing signed-in experience keeps working, unchanged (Priority: P1)

As a signed-in visitor, I want to view my account, tournaments, and Caro games, and to join/chat/
report/play, exactly as I could before, so that this internal security change doesn't break or
degrade anything I could already do.

**Why this priority**: This is a mechanism swap, not a new feature — regressing any of the
already-shipped sign-in-required flows would break real functionality visitors depend on.

**Independent Test**: Can be fully tested by establishing a signed-in session and then exercising
every existing sign-in-required flow (account page, tournament page, admin page, Caro join/chat/
report/play) and confirming each renders/gates exactly as it did before this migration. *(Revised
2026-07-06 during `/speckit-plan`/`/speckit-analyze`: these pages are still placeholder route
content with no live backend integration per `002-login-layout-nextauth`'s Assumptions — "behaves
exactly as before" means the placeholder renders and the gated actions still gate, not that a real
backend call now succeeds. See FR-007 and research.md §6.)*

**Acceptance Scenarios**:

1. **Given** a signed-in visitor, **When** they open the account, tournament, or admin page,
   **Then** its placeholder content still renders with no error.
2. **Given** a signed-in visitor on a Caro game, **When** they join, chat, report, or play a move,
   **Then** the (still-placeholder) action still fires exactly as before, with no sign-in prompt.

---

### User Story 3 - Session renews itself without interrupting the visitor (Priority: P2)

As a signed-in visitor, I want my session to keep working across the access token's expiry without
me noticing anything, so a normal browsing session isn't interrupted by a technical detail.

**Why this priority**: Directly carries over an existing guarantee (spec 002, FR-003); losing it
would be a visible regression even though it's lower priority than getting sign-in/resource access
itself working.

**Independent Test**: Can be fully tested by letting an access token expire during an active
session and confirming the visitor's next action succeeds transparently, with no extra sign-in
prompt and no visible interruption.

**Acceptance Scenarios**:

1. **Given** a signed-in visitor whose access token has expired but whose refresh token is still
   valid, **When** they take their next action on a protected page, **Then** the session renews
   transparently and the action completes without interruption.
2. **Given** a signed-in visitor whose refresh token is also no longer valid, **When** they take
   their next action on a protected page, **Then** they are treated as signed out and redirected to
   sign in.

---

### User Story 4 - One reusable auth mechanism, not one per integration point (Priority: P3)

As the team building the product, we want the login/proxy/refresh mechanism implemented once and
reused everywhere it's needed, rather than duplicated per page or per backend integration, so that
fixing a bug or changing behavior later doesn't require hunting down repeated copies of the same
logic.

**Why this priority**: An internal maintainability concern rather than a visitor-facing one, but
explicitly requested — lower priority since nothing else depends on it being done a particular way.

**Independent Test**: Can be fully tested by confirming that every backend resource call the
webapp makes for a signed-in visitor goes through the same shared token-attachment/refresh logic,
rather than each page or feature area reimplementing its own copy.

**Acceptance Scenarios**:

1. **Given** two different pages that both need signed-in backend data, **When** either page's
   data request needs a token attached or refreshed, **Then** both go through the same underlying
   mechanism rather than two independent implementations.

---

### Edge Cases

- What happens when a visitor's access token expires while they're actively using a protected
  page? The session MUST be renewed transparently using the still-valid refresh token, without
  interrupting the user's current action (carried over from spec 002).
- What happens when both the access token and refresh token are no longer valid? The visitor MUST
  be treated as signed out; their next attempt to reach a protected page or action redirects them
  to login.
- What happens when several of a visitor's requests need a token refresh at the same moment (e.g.,
  multiple page panels fetching data right as the access token expires)? This MUST NOT trigger
  multiple independent refresh calls to the backend — only one refresh occurs and all pending
  requests proceed with its result.
- What happens to a visitor who still has a session established under the previous (NextAuth-based)
  mechanism when this migration ships? They MUST be treated as signed out cleanly — prompted to
  sign in again under the new mechanism — rather than the webapp erroring or getting stuck in a
  broken half-authenticated state.
- What happens when sign-in itself fails (invalid credentials, or the backend's login API is
  unavailable)? The visitor MUST see a clear error and no cookie/session is established.
- What happens when a visitor signs out from one browser tab while another tab is open? The other
  tab MUST NOT continue to act as signed in once it attempts its next authenticated action
  (carried over from spec 002).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The webapp MUST provide exactly one server-side login entry point that is the only
  code path allowed to call the backend's login API on the visitor's behalf.
- **FR-002**: Upon successful sign-in, the webapp MUST store the returned access and refresh tokens
  as httpOnly cookies on its own response. Neither token MUST ever be returned in a response body
  or otherwise exposed to client-side script.
- **FR-003**: Every webapp request for backend resource data on behalf of a signed-in visitor MUST
  go through a server-side proxy entry point that reads the access token from the httpOnly cookie
  and attaches it to the outbound backend call; client-side script MUST NOT read, hold, or forward
  the access token itself.
- **FR-004**: When a signed-in visitor's access token has expired but their refresh token is still
  valid, the webapp MUST renew the session transparently (server-side) and complete the visitor's
  current action without a visible interruption.
- **FR-005**: When a signed-in visitor's refresh token is also no longer valid, the webapp MUST
  treat them as signed out on their next interaction with a protected page or action.
- **FR-006**: The webapp MUST provide a way for a signed-in visitor to sign out from any page,
  which invalidates/clears the auth cookies so subsequent requests are treated as signed out.
- **FR-007**: The webapp's sign-in-state chrome (the account identity shown in navigation) MUST be
  served through the server-side proxy mechanism (FR-003) — reading identity via a domain-service
  package configured server-side, never by a client script calling the backend or holding a bearer
  token directly. *(Revised 2026-07-06 during `/speckit-plan`: `account`, `tournament`, `admin`,
  and the Caro pages' interactive actions — join/chat/report/play — are still placeholder route
  content with no live backend integration, per `002-login-layout-nextauth`'s Assumptions; there is
  no existing client-held-bearer-token call site for them to re-point. This feature establishes the
  proxy-route pattern those future integrations MUST follow, rather than migrating call sites that
  don't exist yet — see research.md §6.)*
- **FR-008**: Concurrent resource requests that occur while a refresh is in progress MUST NOT each
  independently trigger their own refresh call to the backend.
- **FR-009**: A visitor carrying a session established under the previous session/token mechanism
  MUST be treated as signed out under the new mechanism, rather than causing an error or a broken
  partially-authenticated state.
- **FR-010**: The webapp MUST NOT use any third-party session-management library for this
  mechanism; the login, proxy, and refresh logic MUST be implemented as first-party code.
- **FR-011**: The token-attachment and refresh logic MUST be implemented once and reused by every
  server-side entry point that needs it, rather than duplicated per page or per backend
  integration.

### Key Entities

- **Session (cookie-backed)**: The signed-in visitor's authenticated state for the current
  browser, now represented purely as a pair of httpOnly cookies rather than a third-party-managed
  session object. Identifies the user and renews itself via the refresh token; ends on sign-out or
  when both tokens become invalid.
- **Auth Cookie Pair**: The access-token and refresh-token httpOnly cookies set by the login entry
  point and read only by server-side code — never by client-side script.
- **Proxied Resource Request**: Any request for backend data made on behalf of a signed-in
  visitor; under this feature, always routed through a server-side proxy entry point rather than
  issued directly by client-side script.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of previously-working sign-in-required visitor journeys (account, tournament,
  admin, and Caro join/chat/report/play) continue to render/gate exactly as before after migration
  — zero client-visible behavior change to their current (placeholder) content or gating.
- **SC-002**: Zero instances, across a full signed-in session, of an access or refresh token value
  appearing in any response body or client-readable storage location.
- **SC-003**: 100% of access-token-expiry-during-active-use cases renew transparently with zero
  extra sign-in prompts or visible interruptions.
- **SC-004**: 100% of visitors who sign out are unable to complete any further sign-in-required
  action without signing in again.
- **SC-005**: 100% of visitors carrying a pre-migration session are cleanly treated as signed out
  on their first visit after this migration ships, with zero errors surfaced to them.
- **SC-006**: Zero remaining references to the previous third-party session-management library
  anywhere in the webapp after this migration ships.

## Assumptions

- **This feature swaps only the session/token transport mechanism.** The login page UI, shared
  layout, and route-protection UX (redirect rules, loading states) already specified in
  `002-login-layout-nextauth` are unchanged and are not re-specified here; this feature focuses on
  how tokens travel and where they're allowed to live.
- **The backend's login and resource APIs are unchanged.** The login API already returns the
  access/refresh token pair as plain JSON, and resource endpoints already accept a bearer token —
  per constitution Principle VI, no backend changes are required for this migration.
- **Exact cookie names, expiry, rotation timing, and Secure/SameSite flag values are technical
  decisions**, deferred to `/speckit-plan`'s Technical Context, consistent with the constitution
  v3.0.0 amendment that introduced this mechanism.
- **Whether the login/proxy/refresh logic is extracted into a new shared package, or kept inside
  the webapp app itself, is a technical decision deferred to `/speckit-plan`.** Per the requester's
  guidance: extract into a shared package where practical; where it isn't practical (e.g., logic
  that is inherently tied to the webapp's own server runtime), implement it directly in the app
  instead. Either way, any existing shared package built around the previous mechanism's
  client-driven calling convention (a package designed for a client script to hold a token and
  attach it directly to backend calls) MUST be reconciled — updated or removed — as part of the
  same plan, not left half-migrated alongside the new mechanism.
- **This is a full cutover, not a dual-running fallback.** The previous third-party
  session-management library and all mechanism-specific code built around it are expected to be
  fully removed once this feature is complete (FR-010, SC-006) — this feature does not keep both
  mechanisms running side by side.
- **Real-time features remain out of scope**, consistent with prior features in this webapp.
- **Testing strategy is not yet ratified** at the project level (constitution
  `TODO(TESTING_PRINCIPLE)`); this feature does not introduce a new testing approach beyond what
  prior features already established.
