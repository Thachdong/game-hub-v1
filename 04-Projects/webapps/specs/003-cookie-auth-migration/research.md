# Phase 0 Research: Cookie-Based Token Auth Migration

## 1. What "the login route" is, concretely, in this app

- **Decision**: There is no separate, generic `POST /api/auth/login` route. The webapp's single
  Principle-VI login entry point *is* the existing `app/api/auth/google/callback/route.ts` — the
  same Route Handler `002-login-layout-nextauth` built to receive Google's redirect and forward
  `code`/`state` to the backend's `AuthController.googleCallback`, which returns
  `{data: {accessToken, refreshToken, account}}`. This feature changes what that route does with
  the result (set first-party cookies directly) but not which route it is or how it's reached.
- **Rationale**: This app only ever offers "Sign in with Google" (spec 002, US1) — there is no
  credentials form and no other backend login endpoint in play. The user's description of
  "nextjs login route calls api /login" describes the general Principle VI shape; the concrete
  backend call this app's login route makes is the Google-callback exchange, not a literal
  `/login` path.
- **Alternatives considered**: Adding a second, generic `/api/auth/login` route with no caller —
  rejected as dead code; nothing in this app or its spec initiates a non-Google login.

## 2. Replacing `signIn("credentials", …)` with direct cookie writes

- **Decision**: `google/callback/route.ts` stops calling NextAuth's `signIn()`. After the backend
  call succeeds, it writes `access_token` and `refresh_token` as `httpOnly`, `Secure` (in
  production), `SameSite=Lax`, `Path=/` cookies directly on its own `NextResponse`, then redirects
  to the `oauth_callback_url` destination exactly as before (FR-007 of spec 002, unchanged).
- **Rationale**: `SameSite=Lax` still allows the cookie to be set and read on the top-level GET
  redirect Google performs to land the visitor back on this route, and on ordinary subsequent
  top-level navigation — the same reason `Lax` is the standard choice for auth cookies that must
  survive a redirect-based flow. `Strict` would risk the cookie not being sent on some
  cross-site-redirect edge cases; `None` is unnecessary since this is a first-party, same-site
  cookie.
- **Access-token cookie lifetime**: derived from the JWT's own `exp` claim (reusing the existing
  `decodeJwtExpiryMs` utility from `lib/token-refresh.ts`, generalized/renamed since it's no longer
  NextAuth-specific) so the cookie never outlives the token it holds.
- **Refresh-token cookie lifetime**: the backend's `/api/auth/google/callback` and
  `/api/auth/refresh` responses do not carry a refresh-token TTL; defaulting to **30 days**, a
  conventional refresh-token lifetime. Flagged as an assumption in spec.md — adjust if the backend
  documents a different value.

## 3. Where client-visible sign-in state and account identity come from now

- **Problem**: Principle VI forbids client-side code from ever holding the access token, but
  `AppNav` and `RequireSignIn` (`002-login-layout-nextauth`) are Client Components that need to
  reactively know "is this visitor signed in" and "what's their username/avatar" — previously
  supplied by NextAuth's `useSession()`.
- **Decision**: Introduce one server-only helper, `getSessionStatus()` (new,
  `apps/web/lib/session.ts`), that:
  1. Reads the `access_token` cookie server-side.
  2. If absent, returns `{ isSignedIn: false }`.
  3. If present, configures `@game-hub/account-service` with a `getAccessToken` closure that
     returns the already-resolved cookie value (see §5 below for why this is safe to do
     synchronously) and an `onUnauthenticated` that performs the refresh flow (§4), then calls the
     package's existing `getCurrentAccount()`.
  4. Returns `{ isSignedIn: true, account }` on success, or `{ isSignedIn: false }` if
     `getCurrentAccount()` still fails after a refresh attempt.

  Two callers reuse this same helper (FR-011 — implemented once):
  - `app/layout.tsx` (Server Component) calls it directly and passes the result as the initial
    value into a first-party `SessionProvider` (React Context), replacing NextAuth's
    `SessionProvider` — this preserves spec 002's "no loading flash" guarantee (FR-012) the same
    way `await auth()` did.
  - A new `GET /api/auth/session` Route Handler calls it and returns the same shape as JSON — this
    is what the client-side `SessionProvider` calls to revalidate after an event it can't otherwise
    observe (see below).
- **Client-side revalidation triggers**: sign-out (see §4), and any client-triggered mutation that
  comes back `401` from its own proxy route (a future concern — no such mutation exists yet, see
  §6). Time-based polling is NOT used (constitution forbids polling as a substitute for real
  server-driven updates; this also isn't a realtime feature — it's a plain re-fetch-on-known-event
  pattern, not scheduled polling).
- **Rationale**: Keeps the "account" display data itself off any cookie — it's always fetched
  through the same `account-service` package every other feature already uses, so there's no
  second, parallel representation of the account to keep in sync.
- **Alternatives considered**: A second, non-httpOnly "display identity" cookie set at login —
  rejected; it would duplicate `account-service`'s existing `getCurrentAccount()` responsibility
  and could go stale (e.g., after a username change) without an explicit invalidation story.

## 4. Transparent refresh (FR-004) and the concurrency edge case (FR-008)

- **Decision**: A single server-only function, `refreshSession()` (`apps/web/lib/session.ts`),
  reads the `refresh_token` cookie, calls the backend's `POST /api/auth/refresh`, and on success
  re-sets the `access_token` cookie (and, if the backend ever starts rotating it, the
  `refresh_token` cookie) on the *current* outgoing response before returning the new access token
  string to its caller. This is the `onUnauthenticated` implementation wired into every
  `configure*Service` call site (currently only `account-service`, per §3).
- **Concurrency guard**: `refreshSession()` memoizes its in-flight `Promise` at module scope for
  the lifetime of a single request-handling invocation, so if `getCurrentAccount()`'s HTTP client
  triggers it once per retried call within the same Route Handler invocation, only one backend
  refresh call is made. Cross-invocation (separate concurrent requests, or multiple server
  instances) deduplication is explicitly **not** attempted.
- **Why cross-invocation dedup isn't needed for correctness**: inspecting the existing
  `token-refresh.ts`, the backend's refresh response only returns a new `accessToken` — the
  `refreshToken` itself is not rotated/invalidated on use. Two concurrent requests each calling
  refresh with the same still-valid `refresh_token` both succeed independently; the only
  consequence is a redundant backend call, not a correctness bug (no risk of one request
  invalidating the token out from under the other). FR-008 is therefore satisfied at the
  single-invocation level (real duplicate calls within one request are eliminated); the edge case
  in spec.md is written narrowly enough that this holds.
- **Alternatives considered**: A distributed lock (e.g., via a shared cache) for cross-instance
  dedup — rejected as unwarranted complexity for a non-issue given the backend's refresh semantics
  described above; would be revisited only if the backend starts rotating refresh tokens.

## 5. Reconciling `service-core`'s synchronous `getAccessToken` with Next.js's async `cookies()`

- **Problem at first glance**: `HttpClientConfig.getAccessToken` (`@game-hub/service-core`) is
  `() => string | null` — synchronous — but Next.js 15's `cookies()` must be `await`-ed inside a
  Route Handler/Server Component.
- **Decision**: No change needed to `service-core` or any domain package. The calling code
  `await`s `cookies()` **once**, up front, before calling `configure*Service`, and captures the
  already-resolved string in a plain closure:

  ```ts
  const store = await cookies();
  const token = store.get(ACCESS_COOKIE)?.value ?? null;
  configureAccountService({ getAccessToken: () => token, onUnauthenticated: refreshSession, … });
  ```

  This resolves cleanly because each server-side call site (the `getSessionStatus()` helper, and
  any future proxy route) already runs inside its own short-lived request handling, where the
  token is read once at the top and doesn't change mid-request except via `onUnauthenticated`'s own
  refresh — which is exactly what that async callback exists for.
- **Conclusion — closes spec.md's "cleanup common packages" assumption**: `packages/service-core`
  and all four domain packages (`account-service`, `profiles-service`, `admin-service`,
  `caro-service`) are **already compliant** with the v3.0.0 cookie-based mechanism, per the root
  `README.md`'s already-updated "Wiring session state" section (written when
  `001-domain-service-layer` closed out). **No shared-package changes are made by this feature.**

## 6. Package extraction vs. app-local implementation (resolves spec.md's deferred packaging note)

- **Decision**: All new code (the modified `google/callback` route, `session`, `logout` Route
  Handlers, `getSessionStatus()`/`refreshSession()` helpers, and the first-party `SessionProvider`
  replacing NextAuth's) is implemented **locally inside `apps/web`** — no new shared package is
  created.
- **Rationale**: Constitution Principle V (Rule of Two) is explicit: new code MUST first be created
  locally within the app that needs it, and is only promoted to `packages/*` once a **second** app
  needs the same functionality. `apps/web` is still the only app in this Turborepo workspace (per
  `002-login-layout-nextauth`'s own Assumptions), so extraction would violate Principle V, not
  satisfy it. This directly resolves the "tách theo package được thì tách" note from this
  feature's request: it can't be done compliantly yet, because there is no second consumer.
- **What "cleanup" turned out to mean**: not removing/changing package code (see §5 — nothing
  needed changing), but removing the *app-level* NextAuth wiring that is no longer needed:
  `apps/web/lib/auth.ts`, `apps/web/lib/next-auth.d.ts`, `apps/web/lib/token-refresh.ts` (logic
  folded into `lib/session.ts`, §3–§4), the `app/api/auth/[...nextauth]/route.ts` handler, the
  `next-auth` dependency in `apps/web/package.json`, and the NextAuth-specific call sites in
  `components/templates/Providers.tsx`, `components/organisms/AppNav.tsx`,
  `components/molecules/RequireSignIn.tsx`, and `app/(protected)/layout.tsx`.

## 7. Sign-out

- **Decision**: A new `POST /api/auth/logout` Route Handler clears both cookies (sets them
  expired/empty) and returns `{ isSignedIn: false }`. No backend call is made — the backend issues
  stateless JWTs with no server-side session store to invalidate (constitution Principle VI), so
  clearing the webapp's own cookies is sufficient to end the session from the webapp's perspective.
  `AppNav`'s sign-out button calls this route, then redirects to `/login` (replacing
  `signOut({ redirectTo: "/login" })`).
- **Alternatives considered**: Calling a backend logout/revocation endpoint — no such endpoint is
  referenced anywhere in the existing contracts or prior research; out of scope unless the backend
  adds one.

## 8. Route protection (`(protected)/layout.tsx`)

- **Decision**: Replace `await auth()` with `await getSessionStatus()` (§3); redirect to
  `/login?callbackUrl=…` when `!isSignedIn`, unchanged from spec 002's FR-006/FR-007 behavior.

## 9. Testing approach

- **Decision**: Continue with Vitest + React Testing Library, consistent with
  `002-login-layout-nextauth` and every `packages/*` package — no ratified project-level testing
  principle exists yet (`TODO(TESTING_PRINCIPLE)`), so this is a pragmatic continuation, not a new
  mandate.
