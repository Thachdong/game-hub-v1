# Phase 0 Research: Login Page, Webapp Layout, and NextAuth Session Setup

All unknowns from the Technical Context are resolved below. Each entry: Decision, Rationale,
Alternatives considered.

## 1. Google OAuth callback integration (the hard constraint)

- **Decision**: Reconfigure the backend's OAuth `callbackUrl` (env var consumed by
  `GoogleOAuthAdapter`) to point at a webapp-owned Route Handler,
  `${WEBAPP_URL}/api/auth/google/callback`, and register that same URL as the redirect URI in
  Google Cloud Console. This webapp Route Handler receives Google's redirect (`code`, `state`
  query params), forwards the exact same request server-to-server to the backend's real
  `${BACKEND_URL}/api/auth/google/callback`, receives `LoginResponseDto`
  (`{accessToken, refreshToken, account}`), then calls NextAuth's server-side `signIn('credentials',
  ...)` with that data to establish the session, and redirects the browser into the app.
- **Rationale**: Read the backend's actual source
  (`account-social/interface/http/auth.controller.ts`,
  `account-social/infrastructure/google-oauth/google-oauth.adapter.ts`), not just `openapi.yml`.
  `AuthController.googleCallback` is a Passport `AuthGuard('google')` route: Passport's
  `GoogleStrategy` performs the code-for-token exchange with Google *inside this same route*, using
  a `callbackURL` that must exactly match what Google was told during the initiate step
  (`AuthController.googleLogin`). This means the HTTP request carrying Google's `code` must
  physically reach this backend route — there is no way for the browser to hand that `code` to the
  webapp origin instead without either a backend code change or an origin-transparent proxy. A
  Next.js Route Handler at the exact configured callback path is the proxy: from the browser's
  perspective the whole flow completes on the webapp's own origin (same-origin, no raw JSON ever
  visible to the user); from the backend's perspective, it receives a normal HTTP GET with `code`/
  `state` and behaves exactly as it does today — Passport does not care whether the request arrived
  directly from the browser or was forwarded by another server. **No backend code change is
  required** — only a deployment config change (the `callbackUrl` env var) plus the corresponding
  Google Cloud Console redirect URI update, both coordinated outside this feature's own deliverable
  (decided directly with the user, 2026-07-03).
- **Alternatives considered**: (a) Leave the backend's `callbackUrl` pointed at itself and have the
  webapp's login page do a full-page redirect there directly — rejected, since the browser then
  lands on the backend's raw-JSON response with no way for the webapp origin to read it
  (cross-origin, no script on that page to hand data back). (b) A popup-window flow with
  `postMessage` — rejected for the same reason: the backend's JSON response page has no script to
  call `postMessage`, and once the popup navigates to the backend's origin the opener cannot read
  its URL or content (Same-Origin Policy). (c) Change the backend controller to redirect instead of
  returning JSON — rejected as this feature's scope is webapp-only; the config-only fix achieves
  the same result with a much smaller footprint and no backend deploy needed beyond an env var.

## 2. Carrying `callbackUrl` (FR-007's return-to-original-page) through the OAuth round-trip

- **Decision**: Before navigating to the backend's `/api/auth/google`, the login page sets a
  short-lived cookie — `oauth_callback_url`, `Max-Age=300`, `Path=/`, `SameSite=Lax` — on the
  webapp's own origin, holding the path to return to after sign-in (FR-007's target). The
  `/api/auth/google/callback` Route Handler (§1) reads this cookie once Google's redirect lands
  back on the webapp, uses it as the final redirect target, and clears it.
- **Rationale**: §1's fix gets the browser back to the webapp's own origin, but Google only ever
  returns `code` and `state` — and `state` is generated and consumed internally by the backend's
  Passport `GoogleStrategy`, not something the login page can inject a custom value into without a
  further backend change. A cookie set on the webapp's own origin, by contrast, survives the entire
  round-trip through the backend's and Google's domains automatically: the browser re-attaches it
  on any subsequent top-level navigation back to the webapp's origin regardless of which
  cross-origin hops happened in between, because cookie delivery is governed by the cookie's own
  domain, not by the referring page. `SameSite=Lax` is sufficient (not `Strict`) because this is a
  top-level GET navigation arriving via redirect, which `Lax` explicitly allows. The value is not
  sensitive (a same-app relative path), so no `httpOnly`/encryption requirement beyond normal cookie
  hygiene.
- **Alternatives considered**: (a) Pass `callbackUrl` as a query param on the initial navigation to
  the backend's `/api/auth/google` — rejected, since the backend controller accepts no query
  params today (`googleLogin(): void {}`) and wouldn't forward one through Passport's own `state`
  handling without a backend change, which is out of scope (same constraint as §1). (b)
  `sessionStorage` — rejected, since it doesn't survive the top-level navigation the way a cookie
  does; `sessionStorage` set before leaving the webapp's tab is still present when the browser
  returns to the same tab, but relying on that leaves an ordering hazard if the callback route's
  server-side logic ever needs the value before any client script runs — a cookie is readable
  server-side immediately on the first request back, with no such race. (c) Encode `callbackUrl`
  directly as this feature's own `state` parameter to Google, bypassing the backend's own
  state-generation — rejected as a backend code change (Passport would need to accept and echo a
  caller-supplied `state`), out of scope per §1's boundary.

## 3. NextAuth wiring shape (Credentials provider without a form)

- **Decision**: Configure a single NextAuth `Credentials` provider whose `authorize()` function does
  **not** call the backend itself — it only validates the shape of what it's given and returns a
  user object. The actual backend call already happened in the `/api/auth/google/callback` Route
  Handler (§1) *before* it calls `signIn('credentials', { accessToken, refreshToken, account })`
  server-side. The `jwt` callback copies `accessToken`/`refreshToken`/`account` onto NextAuth's own
  encrypted token; the `session` callback copies `accessToken` and `account` onto the client-visible
  session object (per spec.md's Clarifications, 2026-07-03) but never copies `refreshToken`.
- **Rationale**: NextAuth's `Credentials` provider is usually shown wrapping a synchronous
  username/password check inside `authorize()`, but nothing requires that — it's a valid, documented
  pattern to call `signIn('credentials', data)` server-side from a Route Handler that has already
  done the real authentication work, using `authorize()` purely as a pass-through/validation step.
  This avoids double-calling the backend and keeps the OAuth exchange (§1) and the
  NextAuth-session-establishment step cleanly separated.
- **Alternatives considered**: A custom NextAuth OAuth provider (not Credentials) configured with
  the backend's endpoints as if it were a standard OAuth2 provider — rejected: NextAuth's OAuth
  provider abstraction expects to own the authorize/token/userinfo exchange itself, which conflicts
  with the backend already having completed and re-signed its own JWTs by the time the webapp sees
  anything; forcing that abstraction onto an already-completed exchange is more complex than the
  chosen approach for no benefit.

## 4. Route protection mechanism: layout-level check, not middleware-based auth

- **Decision**: Protect the `(protected)` route group with a Server Component check at
  `(protected)/layout.tsx` — call NextAuth's `auth()` helper, and if there is no session (or the
  session has `error: "RefreshFailed"`, FR-004), `redirect('/login?callbackUrl=' +
  encodeURIComponent(currentPath))` (FR-006, FR-007).
- **Rationale**: `auth()` in a Server Component resolves as part of server rendering — no HTML for
  protected content is ever sent to an unauthenticated browser, so there is no flash/loading-state
  concern for this specific check (resolves FR-006's "no error/partial state" and contributes to
  SC-006). The *auth decision itself* (redirect or not) deliberately does not live in
  `middleware.ts` — Edge middleware can only cheaply check for the session cookie's *presence*, not
  fully resolve `auth()`'s server-side JWT/session logic the same way, and using both would be a
  redundant second place the decision could live.
- **Implementation discovery (during `/speckit-implement`)**: getting `currentPath` for the
  `callbackUrl` above turned out to need a small amount of middleware after all — Next.js Server
  Components (including layouts) have no built-in way to read the current request's pathname; only
  Client Components get `usePathname()`. `apps/web/middleware.ts` was added, but it does **not**
  make any auth/redirect decision — its only job is copying `request.nextUrl.pathname` onto a
  `x-pathname` request header, which `(protected)/layout.tsx` reads via `headers()`. This doesn't
  change the decision above: the auth check and redirect logic still live entirely in the layout;
  the middleware is pure request-context plumbing with no knowledge of sessions.
- **Alternatives considered**: `middleware.ts` intercepting all `(protected)` routes and making the
  auth decision itself — rejected per the Rationale above. Having each protected `page.tsx` pass its
  own hardcoded path instead of reading the pathname generically — rejected as duplicative across
  `account`/`tournament`/`admin` and easy to forget when a future page is added to the group.

## 5. The FR-012/SC-006 loading-state requirement mostly resolves for free

- **Decision**: Fetch the session once, server-side, in the root layout (`app/layout.tsx`) via
  `auth()`, and seed NextAuth's client `SessionProvider` with it:
  `<SessionProvider session={session}>`. Client Components (e.g., the `AppNav` organism) that call
  `useSession()` then hydrate with the *correct* status immediately — no `loading` flash on a full
  page load, because the server already resolved and embedded the right state in the initial HTML/
  hydration payload.
- **Rationale**: This is NextAuth's documented pattern specifically to avoid the loading-flash
  problem spec.md's Clarifications (2026-07-03) flagged. A residual, much narrower loading concern
  remains only for in-flight sign-in/sign-out button clicks (a local pending/disabled state on the
  button itself, not a full-page loading state) — this is a normal optimistic-UI concern, not a
  session-resolution one, and is handled per-component rather than via a global loading route.
- **Alternatives considered**: Rendering `AppNav` as a Client Component with no server-seeded
  session and showing a skeleton until `useSession()` resolves client-side — rejected as strictly
  worse (introduces the exact flash FR-012 exists to prevent) when the server-seeding approach
  removes the problem outright for the full-page-load case the edge case describes.

## 6. Transparent access-token renewal (FR-003)

- **Decision**: Implement refresh-token rotation inside NextAuth's `jwt` callback in
  `lib/auth.ts`. On every `jwt` callback invocation, compare the backend access token's own
  expiry (decoded from the JWT, or tracked alongside it as an `accessTokenExpiresAt` field set at
  sign-in) against the current time. If expired, call the backend's `POST /api/auth/refresh` with
  `token.refreshToken`, and on success overwrite `token.accessToken` (and
  `accessTokenExpiresAt`) with the response. On failure (refresh token itself invalid/expired),
  set an `error: "RefreshFailed"` flag on the token; the `session` callback copies this flag onto
  the client-visible session so `AppNav`/any page can detect it and prompt sign-in again — this is
  the mechanism satisfying FR-004 ("treat them as signed out on their next interaction").
- **Rationale**: This is NextAuth's own documented "refresh token rotation" pattern, and is the
  direct NextAuth-native equivalent of what `withServiceResult`'s `onUnauthenticated` hook already
  does for the domain-service-layer packages (`001-domain-service-layer`) — renew transparently,
  once, before surfacing a failure to the caller. FR-003 requires this to happen "without an
  interruption visible to the user," which the `jwt` callback satisfies naturally: it runs as part
  of resolving `auth()`/`useSession()`, before any page code sees the token, so a renewed token is
  already in place by the time a Client Component reads `session.accessToken` to make a domain-service
  call.
- **Alternatives considered**: Relying on each domain service package's own `onUnauthenticated`
  hook (the `withServiceResult` 401-retry-once mechanism already built in `001-domain-service-layer`)
  to trigger renewal reactively, per failed call — rejected as the sole mechanism, since it would
  require wiring every domain package's `onUnauthenticated` to call back into NextAuth (e.g. via a
  `POST /api/auth/session-refresh` Route Handler) *and* still leaves a window where the first call
  after expiry always fails once before renewing; the `jwt` callback approach renews proactively as
  part of normal session resolution, so most calls never see an expired token in the first place.
  Both are compatible and not mutually exclusive — the domain packages' existing 401-retry-once
  behavior remains as a safety net (its `onUnauthenticated` hook is wired to read
  `session.accessToken` fresh, which will already reflect a `jwt`-callback-renewed token) but is not
  the primary renewal mechanism this feature relies on.

## 7. Styling

- **Decision**: Tailwind CSS.
- **Rationale**: Constitution leaves styling-library choice to each app's plan.md Technical Context
  (deferred item, still unratified at the constitution level). Tailwind is the most common pairing
  with Next.js App Router, composes well at the atom/molecule level of constitution Principle III's
  Atomic Design structure (utility classes map naturally to atom-level style decisions), and needs
  no additional runtime dependency (compiles at build time).
- **Alternatives considered**: CSS Modules (viable, more verbose for atom-level composition, no
  strong reason to prefer over Tailwind here); styled-components/Emotion (adds a runtime CSS-in-JS
  dependency with no compensating benefit for this app's needs).

## 8. Testing approach

- **Decision**: Vitest + React Testing Library for component/unit tests (the `AppNav` organism's
  sign-in-state rendering, the login page's error-state handling per FR-011, the
  `(protected)/layout.tsx` redirect logic via a mocked `auth()`). No end-to-end test tooling is
  introduced in this feature.
- **Rationale**: Matches the existing `packages/*` tooling (Vitest already used throughout), keeping
  the workspace's test runner consistent. Constitution has no ratified testing principle yet
  (`TODO(TESTING_PRINCIPLE)`) — this is a pragmatic default, not a mandate.
- **Alternatives considered**: Playwright for a real end-to-end OAuth flow test — valuable but out
  of scope for this feature (would require a live backend + real Google test account in CI, which
  is a separate infrastructure decision); the existing domain packages' quickstart-style manual
  smoke test convention is reused instead (see quickstart.md).
