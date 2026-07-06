# Feature Specification: Auth Service Interface Audit & Proxy Route Refactor

**Feature Branch**: `005-auth-proxy-refactor`

**Created**: 2026-07-06

**Status**: Draft

**Input**: User description: "Hãy kiểm tra lại service interface và refactor nếu cần thiết,
authentication sẽ tuân theo rule sau đây: API login sẽ trả về accessToken + refreshToken trong
response body - user login bằng cách call route /auth/login => tại đây NextJS sẽ sử dụng
credentials lấy được từ google auth => call api login (Nestjs) => api (nextJS) sẽ trả về
accessToken + refreshToken trong response body => nextjs sẽ set accessToken và refreshToken vào
cookie => response về cho browser - browser call api đến server (nestjs) bằng cách gọi vào 'proxy
route' của nextjs => tại proxy route sẽ lấy accessToken từ cookie (nếu có) và set vào request
header (dạng Bearer token) và forward request đến server (nestjs) - nếu api là 'private' và token
hết hạn => nextjs tự call thêm api để refresh token"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - One proxy mechanism ready for every future signed-in browser action (Priority: P1)

As the team building the product, we want a single, reusable way for any browser-initiated action
to reach the backend authenticated, so that the next feature needing a sign-in-required
interactive action (joining a game, submitting a report, an admin action, editing account data)
does not invent its own token-handling — and no call site is ever tempted to hold or forward the
access token from client-side code.

**Why this priority**: This is the actual security boundary (token never touches the browser) the
project's auth contract requires, and every future signed-in interactive feature depends on it
already existing and working correctly before that feature is built.

**Independent Test**: Can be fully tested by triggering a signed-in-only backend call from a
Client Component through the proxy mechanism and confirming (a) the request succeeds while signed
in, (b) inspecting every network response and script-readable location shows no access or refresh
token value anywhere, and (c) the same call fails cleanly (not silently) when attempted while
signed out.

**Acceptance Scenarios**:

1. **Given** a signed-in visitor, **When** a Client Component triggers a request for a private
   backend resource, **Then** the request reaches the backend with a valid bearer token attached,
   and the token itself never appears in any response body, script-readable cookie, or browser
   storage.
2. **Given** a signed-out visitor, **When** the same kind of request is attempted, **Then** it
   fails in a way the calling code can distinguish from other errors, rather than silently
   succeeding or throwing an unhandled exception.

---

### User Story 2 - Signed-in actions survive an access-token expiry without breaking (Priority: P1)

As a signed-in visitor performing an action that goes through the proxy mechanism, I want an
expired access token to be renewed automatically behind the scenes, so my action still completes
instead of failing or silently doing nothing.

**Why this priority**: Without this, adding the first real client-triggered call would regress the
transparent-renewal guarantee already relied on for server-rendered pages — a visible, confusing
failure for visitors mid-session.

**Independent Test**: Can be fully tested by letting the access token expire while the refresh
token is still valid, triggering a proxied action, and confirming it completes with no visible
interruption; and by triggering several proxied actions at once at expiry and confirming only one
refresh call occurs.

**Acceptance Scenarios**:

1. **Given** a signed-in visitor whose access token has expired but whose refresh token is still
   valid, **When** they trigger a proxied action, **Then** the session renews transparently and the
   action completes without an extra sign-in prompt.
2. **Given** several proxied actions triggered at the same moment the access token expires,
   **When** they all hit the backend, **Then** only one refresh call is made and every pending
   action proceeds using its result.
3. **Given** a signed-in visitor whose refresh token is also no longer valid, **When** they trigger
   a proxied action, **Then** they are treated as signed out rather than seeing a raw backend error.

---

### User Story 3 - Every domain-service package is safe to wire into the same mechanism (Priority: P2)

As the team maintaining `profiles-service`, `admin-service`, and `caro-service`, we want each
package's configuration interface to work the same way `account-service`'s already does (proven in
production by the account page), so that adding the proxy route for a new resource is a matter of
wiring, not redesigning the package.

**Why this priority**: Three of the four domain-service packages have never been exercised through
a real, live, authenticated call site. Confirming and, if needed, refactoring their interfaces now
— while nothing depends on them yet — is far cheaper than discovering an inconsistency once a
real feature is mid-build on top of one of them.

**Independent Test**: Can be fully tested by configuring each of `profiles-service`,
`admin-service`, and `caro-service` the same way `account-service` is configured today (a token
getter plus an unauthenticated/refresh callback) and confirming each attaches the bearer token and
participates in the same single-flight refresh, with no package-specific special-casing required.

**Acceptance Scenarios**:

1. **Given** any of the four domain-service packages, **When** it is configured with a token getter
   and a refresh callback, **Then** its outbound calls attach the bearer token and retry exactly
   once after a transparent refresh on an expired-token failure — identically across all four
   packages.
2. **Given** a gap or inconsistency is found in one package's interface during this audit, **When**
   it is refactored to match, **Then** its public interface shape (function names, configuration
   call) does not need to change for existing callers beyond what the audit requires.

---

### User Story 4 - No lingering interface invites a client-held token (Priority: P3)

As the team, we want to remove or correct any existing service-package export, default
configuration, or documented usage example that would let a Client Component call a domain package
directly with a client-held token, so a future contributor copying an existing pattern doesn't
accidentally reintroduce a client-exposed-token call site.

**Why this priority**: Nothing in the codebase currently does this, so it's not an active
regression — but it's an easy mistake to reintroduce by copy-paste later, and cheap to close off
now while auditing the same interfaces for Story 3.

**Independent Test**: Can be fully tested by reviewing each domain-service package's public
exports and documentation for any client-side usage example or default that implies direct browser
use with a bearer token, and confirming none remain (or that any that must remain are explicitly
marked server-only).

**Acceptance Scenarios**:

1. **Given** a domain-service package's public documentation or exports, **When** reviewed, **Then**
   nothing in it suggests or enables a Client Component calling the backend directly with a token
   it holds itself.

---

### Edge Cases

- What happens when several browser-initiated requests need a token refresh at the same instant?
  This MUST NOT trigger multiple independent refresh calls to the backend — only one refresh
  occurs and all pending requests proceed with its result (carried over from spec
  003-cookie-auth-migration's FR-008).
- What happens when a proxied request's backend call fails for a reason other than an expired
  token (e.g., a validation error or a backend outage)? The proxy mechanism MUST relay that failure
  as-is, without attempting a refresh/retry that wouldn't fix it.
- What happens when a visitor's refresh token is also no longer valid while a proxied action is in
  flight? The visitor MUST be treated as signed out, consistently with how a server-rendered page
  already handles this case.
- What happens if a proxied request is attempted for a visitor with no access-token cookie at all
  (never signed in)? The proxy mechanism MUST reject it as unauthenticated without attempting to
  call the backend at all.
- What happens to a backend resource that does not require authentication at all (a public
  endpoint)? It is out of scope for this feature's proxy mechanism — public reads are unaffected.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The webapp MUST provide a single, reusable server-side proxy mechanism that every
  browser-initiated request for an authenticated ("private") backend resource goes through;
  client-side code MUST NOT call such a backend resource directly, nor read, hold, or forward the
  access token itself.
- **FR-002**: The proxy mechanism MUST read the access token from the existing httpOnly
  access-token cookie and attach it as the `Authorization: Bearer` header on its own outbound call
  to the backend.
- **FR-003**: When the backend rejects a proxied request because the access token has expired, the
  proxy mechanism MUST transparently renew the session using the existing shared, single-flight
  refresh mechanism and retry the visitor's request once, without surfacing an error to the visitor
  unless the refresh token is also no longer valid.
- **FR-004**: When both the access and refresh tokens are invalid (or no access-token cookie
  exists at all), the proxy mechanism MUST respond in a way the calling client code can
  distinguish as "not signed in," rather than relaying a raw/ambiguous backend error.
- **FR-005**: The proxy mechanism MUST be implemented once and reused by every current and future
  browser-initiated call, not duplicated per page, feature, or domain-service package.
- **FR-006**: Each of the four domain-service packages (`account-service`, `profiles-service`,
  `admin-service`, `caro-service`) MUST expose the same configuration contract already established
  by `account-service` (a token getter plus an unauthenticated/refresh callback), so any of them
  can be wired into the proxy mechanism without package-specific changes. Any package found not to
  match MUST be refactored to match.
- **FR-007**: Existing server-rendered pages that already call a domain-service package directly
  (e.g., the account page's identity and game list) MUST continue to work unchanged; this feature
  does not require server-rendered data-fetching to be re-routed through the new proxy mechanism.
- **FR-008**: No domain-service package MUST retain or introduce an exported helper, default
  configuration, or documented usage example that would let a Client Component call the backend
  directly with a client-held bearer token.
- **FR-009**: The webapp's existing login entry point MUST remain the only code path that calls
  the backend's login-completing API, and MUST continue to take the access and refresh tokens out
  of the backend's response body and set them only as httpOnly cookies on its own response —
  never exposed to client-side script.
- **FR-010**: This feature MUST NOT require any change to the backend's API contracts (the login
  response shape, or which resource endpoints require a Bearer token); the backend already returns
  both tokens in the login response body and already expects a Bearer header on private calls.

### Key Entities

- **Proxy Route**: The webapp-owned, server-side entry point that stands between a Client
  Component and the backend for any authenticated resource call — attaches the bearer token,
  participates in the shared refresh mechanism, and relays the backend's response back to the
  browser without ever exposing the token to it.
- **Domain Service Configuration Contract**: The token-getter-plus-refresh-callback shape already
  implemented by `account-service`'s `configureAccountService`, which every domain-service package
  must expose identically so the proxy mechanism (or any future server-side caller) can wire into
  any of them the same way.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of browser-initiated authenticated backend calls exercised through this
  feature's work go through the single proxy mechanism — zero client-side code paths hold or
  forward the access token.
- **SC-002**: 100% of access-token-expiry cases encountered through the proxy mechanism renew
  transparently with zero extra sign-in prompts or visible interruptions.
- **SC-003**: All four domain-service packages can be wired into the proxy mechanism using
  identical configuration steps, with zero package-specific exceptions remaining after the audit.
- **SC-004**: Zero remaining exported helpers or documented examples across the four
  domain-service packages that describe or enable direct client-side calling with a bearer token.
- **SC-005**: Zero regressions to the currently-working, server-rendered account page (identity and
  game list still render exactly as before).

## Assumptions

- **The existing Google sign-in flow (redirect to Google, return with an authorization code,
  webapp exchanges it via the backend's login-completing API) already satisfies the described
  login rule** — it is the webapp's single login entry point, it is the one caller of the backend's
  login API, and it already receives the access/refresh tokens in the response body and sets them
  as httpOnly cookies before responding to the browser. This feature does not change how the
  visitor initiates sign-in; it does not introduce a client-side Google credential exchange to
  replace the existing redirect flow.
- **Server-rendered data-fetching (Server Components calling a domain-service package directly, as
  the account page does today) is out of scope for being re-routed through the new proxy
  mechanism.** The token-exposure risk the proxy mechanism guards against is specific to
  browser/Client Component code; server-side rendering never exposes the token to the browser
  regardless of whether it goes through an extra internal hop. This feature's proxy mechanism is
  for browser-initiated (client-triggered) calls only.
- **No concrete client-triggered interactive feature (joining/chatting/reporting/playing a Caro
  match, tournament actions, admin actions) is being built as part of this feature.** Those remain
  out of scope, consistent with prior features' Assumptions; this feature only ensures the
  mechanism they will need already exists, is correct, and is proven against all four
  domain-service packages ahead of time.
- **The exact route path/name and whether the proxy mechanism is one catch-all route or one route
  per resource area** are technical decisions deferred to `/speckit-plan`.
- **`service-core`'s shared HTTP client and its existing single-retry-after-refresh interceptor
  behavior are reused as-is.** No change to that package is anticipated unless the interface audit
  finds a concrete gap when wiring it into a proxy-route context.
