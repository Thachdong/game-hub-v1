# Feature Specification: Login Page, Webapp Layout, and NextAuth Session Setup

**Feature Branch**: `002-login-layout-nextauth`

**Created**: 2026-07-03

**Status**: Draft

**Input**: User description: "hãy tham khảo nội dung trong page: raw-webapp-spec.md và handle page
login + layout của webapp + setup nextauth" (reference `raw-webapp-spec.md`'s page list and backend
auth behavior; handle the login page, the webapp's overall layout, and NextAuth setup)

## Clarifications

### Session 2026-07-03

- Q: Should NextAuth's `session` callback expose `accessToken` to client-side code, or should all
  domain API calls be proxied server-side instead? → A: Expose `accessToken` via the `session`
  callback — Client Components attach the Bearer header themselves and call the backend directly,
  matching the existing domain service packages' (`account-service`, `profiles-service`,
  `admin-service`, `caro-service`) already-built client-side calling pattern. No Route
  Handler/Server Action proxy layer is built for this purpose.
- Q: Should the `/admin` route in this feature check for Platform Admin role (beyond just being
  signed in), or is that deferred to a future feature? → A: Deferred. `/admin` in this feature is
  gated the same way as every other sign-in-required page (FR-006) — a plain "is signed in" check.
  Platform Admin role-checking will be added alongside the actual admin page content in a future
  feature, since this feature's `/admin` route is a placeholder with no business logic yet to
  protect.
- Q: What should the layout/route-protection show while NextAuth is still resolving session status
  (the brief `loading` state, especially right after a full page reload)? → A: Show a loading state
  (skeleton/spinner) until session status resolves, rather than allowing a flash of incorrect
  content (e.g., briefly showing "Sign in" before switching to account info, or briefly rendering
  protected content before redirecting).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Sign in with Google (Priority: P1)

As a visitor, I want to sign in with my Google account so that I can access the parts of the
webapp that require an identity (my account, tournaments, admin tools).

**Why this priority**: No protected page is usable without a working sign-in flow. This is the
foundation every other page in the app depends on.

**Independent Test**: Can be fully tested by visiting the login page as an anonymous visitor,
completing the Google consent flow, and confirming the visitor lands back in the webapp in a
signed-in state (their identity is reflected in the layout) — without any other page's real
content needing to exist yet.

**Acceptance Scenarios**:

1. **Given** an anonymous visitor on the login page, **When** they choose "Sign in with Google" and
   complete Google's consent screen, **Then** they are returned to the webapp signed in, with their
   account identity visible in the layout.
2. **Given** a visitor who cancels or is denied at Google's consent screen, **When** they return to
   the webapp, **Then** the login page shows a clear, actionable error state rather than a blank or
   broken page.
3. **Given** a visitor who is already signed in, **When** they navigate to the login page directly,
   **Then** they are redirected away from it (e.g., to the account page) rather than being shown
   the login form again.

---

### User Story 2 - Consistent webapp layout (Priority: P1)

As any visitor (signed in or not), I want every page to share the same overall layout
(navigation, sign-in/sign-out affordance) so the webapp feels like one coherent product instead of
a set of disconnected pages.

**Why this priority**: The layout is the shell every other page (present and future) renders
inside; it must exist before any page-specific work can be demoed end-to-end.

**Independent Test**: Can be fully tested by navigating between any two routes and confirming the
navigation chrome persists unchanged, correctly reflecting the current sign-in state (a "Sign in"
affordance when anonymous, an account/sign-out affordance when signed in).

**Acceptance Scenarios**:

1. **Given** an anonymous visitor, **When** they view any public page, **Then** the shared layout
   shows a "Sign in" affordance and no account-specific information.
2. **Given** a signed-in user, **When** they view any page, **Then** the shared layout shows their
   account identity and a way to sign out.
3. **Given** a signed-in user, **When** they choose to sign out from the layout, **Then** their
   session ends and they are returned to a signed-out state on a public page.

---

### User Story 3 - Protected pages require sign-in (Priority: P2)

As a product owner, I want pages that need an identity (account, tournament, admin) to be
unreachable by anonymous visitors, so that no protected screen ever renders in a broken or
partially-authenticated state.

**Why this priority**: Directly follows from Story 1; without route protection, a working login
flow doesn't actually protect anything.

**Independent Test**: Can be fully tested by attempting to navigate directly to a protected route's
URL as an anonymous visitor and confirming a redirect to the login page occurs before any protected
content is rendered.

**Acceptance Scenarios**:

1. **Given** an anonymous visitor, **When** they navigate directly to a page that requires sign-in,
   **Then** they are redirected to the login page instead of seeing the page's content or an error.
2. **Given** an anonymous visitor who was redirected to log in from a protected page, **When** they
   complete sign-in successfully, **Then** they land back on the page they originally tried to
   reach.

---

### User Story 4 - Public pages stay public, gate only the interactive parts (Priority: P3)

As a visitor, I want to browse pages that don't require an identity (the Caro game list, a
specific game's detail view) without being forced to log in, and only be prompted to sign in when I
try to do something that actually requires an identity (joining a game, chatting, reporting,
playing).

**Why this priority**: Distinguishes "view" from "act" for the Caro pages per `raw-webapp-spec.md`;
lower priority than Stories 1-3 since it only affects two of the six pages and depends on them
already working.

**Independent Test**: Can be fully tested by viewing the Caro list/detail pages as an anonymous
visitor (content renders, no redirect), then attempting an interactive action (join/chat/report/
play) and confirming a sign-in prompt appears instead of the action silently failing.

**Acceptance Scenarios**:

1. **Given** an anonymous visitor, **When** they open the Caro game list or a specific game's
   detail page, **Then** the page's viewable content renders without requiring sign-in.
2. **Given** an anonymous visitor viewing a game's detail page, **When** they attempt to join,
   chat, report, or play, **Then** they are prompted to sign in rather than the action failing
   silently or throwing an unhandled error.

---

### Edge Cases

- What happens when a signed-in user's access token expires while they're actively using a
  protected page? The session MUST be renewed transparently (using the still-valid refresh token)
  without interrupting the user's current action, consistent with the existing
  domain-service-layer's transparent-refresh behavior.
- What happens when both the access token and refresh token are no longer valid (e.g., long period
  of inactivity)? The user MUST be treated as signed out; their next attempt to reach a protected
  page redirects them to login rather than showing a broken authenticated state.
- What happens if the backend's Google OAuth exchange itself fails (backend unavailable, Google
  service disruption)? The login page MUST show an error state distinguishable from "user declined
  consent," so the visitor understands retrying may or may not help.
- What happens when a user signs out from one browser tab while another tab of the same webapp is
  open? The other tab MUST NOT continue to act as if the user is still signed in once it attempts
  its next authenticated action.
- What happens when an already-signed-in user's Google account is used to complete the login flow
  again (e.g., they open the login URL manually)? They MUST land in the same signed-in state as
  before, not create a duplicate or conflicting session.
- What happens in the brief moment right after a page load, before the webapp has determined
  whether the visitor is signed in or not (e.g., right after a full page reload)? The layout and
  any route-protection check MUST show a loading state instead of guessing — no flash of "signed
  out" content that then switches to signed-in content (or vice versa), and no flash of a
  protected page's content before a redirect-to-login occurs.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The webapp MUST provide a login page that lets an anonymous visitor initiate sign-in
  with their Google account.
- **FR-002**: Upon successful sign-in, the webapp MUST establish a session that persists across a
  full page reload, without requiring the visitor to sign in again, for as long as their underlying
  credentials remain valid.
- **FR-003**: When a visitor's short-lived credential expires but their session is still otherwise
  valid, the webapp MUST renew it transparently and continue the user's current action without an
  interruption visible to the user.
- **FR-004**: When a visitor's session is no longer renewable, the webapp MUST treat them as signed
  out on their next interaction with a protected page or action.
- **FR-005**: The webapp MUST provide a single, consistent layout (navigation and sign-in/sign-out
  affordance) applied to every page, reflecting the visitor's current sign-in state.
- **FR-006**: The webapp MUST prevent an anonymous visitor from viewing a page that requires
  sign-in (account, tournament, admin per `raw-webapp-spec.md`), redirecting them to the login page
  instead. This is a plain "is signed in" check for all three pages, including `admin` — this
  feature does not add Platform Admin role-checking (see Clarifications, 2026-07-03); that arrives
  with the future feature that builds the admin page's actual content.
- **FR-007**: After completing sign-in from a redirect triggered by a protected page, the webapp
  MUST return the visitor to the page they originally attempted to reach.
- **FR-008**: The webapp MUST allow a signed-in visitor to view pages that do not require sign-in
  (the Caro game list, a Caro game's detail view per `raw-webapp-spec.md`) without any sign-in
  prompt appearing.
- **FR-009**: The webapp MUST allow an anonymous visitor to view the same not-sign-in-required
  pages, and MUST prompt for sign-in only when the visitor attempts an action on those pages that
  requires an identity (joining a game, chatting, submitting a report, playing a move).
- **FR-010**: The webapp MUST provide a visible way for a signed-in visitor to sign out from any
  page, ending their session.
- **FR-011**: The login page MUST distinguish, in what it shows the visitor, between "visitor
  declined/cancelled sign-in" and "sign-in failed due to a system error," so the visitor has a
  reasonable idea of whether retrying is likely to help.
- **FR-012**: While the webapp has not yet determined whether the visitor is signed in (e.g., in
  the moment right after a page load), the layout and any route-protection check MUST show a
  loading state rather than guessing — no page may briefly render signed-in content, signed-out
  content, or protected content that then has to visibly change once the real sign-in state is
  known.

### Key Entities

- **Session**: The signed-in visitor's authenticated state for the current browser, including
  enough information to identify the user and to renew itself transparently when the short-lived
  credential expires. Produced by sign-in, ended by sign-out or by both underlying credentials
  becoming invalid.
- **Account (display identity)**: The subset of the signed-in user's account record (from the
  existing account domain service) shown in the shared layout — enough to confirm "who am I signed
  in as," not the full account record.
- **Route Protection Boundary**: The classification of every page in `raw-webapp-spec.md` into
  "requires sign-in" (account, tournament, admin) vs. "does not require sign-in to view" (login,
  Caro list, Caro detail), and — for the latter group — which specific actions within that page
  still require sign-in.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An anonymous visitor can go from landing on the login page to a fully signed-in state
  in 3 redirects or fewer (login page → Google consent → webapp's OAuth callback → signed-in
  destination) — the minimum achievable for any OAuth code-flow that establishes the session
  server-side before the final destination is known (revised 2026-07-03 per `/speckit-analyze`
  finding I1, after `/speckit-plan` surfaced the backend's callback-proxy constraint — see
  research.md §1).
- **SC-002**: 100% of direct navigation attempts to a sign-in-required page while signed out result
  in a redirect to login — zero instances of a protected page rendering an error or partial state
  to an anonymous visitor.
- **SC-003**: A signed-in visitor who reloads the page, or returns after closing and reopening the
  browser tab within their session's valid lifetime, remains signed in with no re-authentication
  required.
- **SC-004**: Every page in the webapp — public or protected — renders inside the same shared
  layout shell; zero pages are reachable without the shared navigation/sign-in-state chrome.
- **SC-005**: An anonymous visitor can view the Caro list and a Caro game's detail page without
  ever encountering a sign-in prompt, unless and until they attempt an action that requires one.
- **SC-006**: Zero instances of a page briefly showing incorrect sign-in-state content (wrong
  layout affordance, or protected content that then redirects) during the moment sign-in status is
  still being determined after a page load.

## Assumptions

- **NextAuth (Auth.js) is the mandated session/token mechanism**, per constitution v2.0.0
  Principle VI — this is a ratified governance decision, not an open implementation choice for this
  feature. NextAuth is configured with a `Credentials`-style provider that wraps the backend's own
  Google-OAuth-and-JWT-issuance flow; NextAuth is not used as an independent Google OAuth provider,
  since the backend already performs that exchange and issues its own JWTs.
- **NextAuth's `session` callback exposes `accessToken` to client-side code** (see Clarifications,
  2026-07-03). Client Components attach the Bearer header themselves and call the backend directly
  — this matches the existing domain service packages' already-built client-side calling pattern
  (`configureAccountService`, etc., per each package's README) and avoids rebuilding them around a
  server-side proxy. `refreshToken` is never exposed to client-side code regardless.
- **This feature scaffolds `apps/*` for the first time in this workspace.** No Next.js app exists
  yet (per the `001-domain-service-layer` feature, which intentionally created only `packages/*`).
- **Route structure for all six pages is created, but only login + layout + sign-in/sign-out are
  fully implemented.** Per constitution Principle II (Route Groups), this feature creates the
  authenticated-layout and public-layout route groups and a route folder per page listed in
  `raw-webapp-spec.md` (account, game-caro, game-caro-detail, tournament, admin), so the layout and
  route-protection behavior can be demonstrated end-to-end. The actual business content of account,
  game-caro, game-caro-detail, tournament, and admin pages is out of scope for this feature and
  will be delivered by separate, future features; their route folders may render placeholder
  content until then.
- **The known backend gap on Caro's "public" endpoints is out of scope here.** A prior conversation
  identified that `/api/caro/game-configs` and `/api/caro/matches/lobby` currently require a Bearer
  token despite the Caro list page being spec'd as viewable without sign-in; the user has indicated
  this will be addressed on the backend separately. This feature's Caro list/detail placeholder
  pages assume that gap will be closed before real Caro content is built; they do not attempt a
  workaround.
- **The existing domain service packages (`account-service`, `profiles-service`, `admin-service`,
  `caro-service`) are reused, not rebuilt.** This feature wires NextAuth's session into each
  package's `configure*Service` function (per their existing README-documented pattern) rather than
  changing those packages' public contracts.
- **Real-time features remain out of scope**, consistent with `001-domain-service-layer` — the
  layout and pages built here use the REST-based domain services only.
