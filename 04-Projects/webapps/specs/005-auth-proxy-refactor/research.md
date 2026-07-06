# Phase 0 Research: Auth Service Interface Audit & Proxy Route Refactor

## 1. Confirming the login flow already complies — no change needed

- **Finding**: The user-supplied rule set describes: browser obtains Google credentials → a
  Next.js route uses them to call the backend's login API → the backend returns access+refresh
  tokens in the response body → Next.js sets both as cookies → responds to the browser. This is
  exactly what `app/api/auth/google/callback/route.ts` already does (built by
  `002-login-layout-nextauth`, migrated off `signIn()` onto direct cookie writes by
  `003-cookie-auth-migration`, contract in `specs/003-cookie-auth-migration/contracts/auth-routes.md`).
- **Decision**: No change to the login route or the OAuth mechanism. The "credentials obtained
  from Google auth" in the rule is the authorization `code` Google's redirect supplies; the route
  already forwards it to the backend's login-completing API and treats the JSON response exactly
  as specified.
- **Alternatives considered**: Rebuilding sign-in around a client-side Google Identity Services
  credential (an ID token minted in the browser, POSTed to a new `/auth/login` route) — rejected.
  This would replace a working, tested flow (`003`'s US1) with a different OAuth integration style
  for no behavioral gain; the existing flow already satisfies every rule the request states.

## 2. Stale, pre-migration documentation found during the audit

- **Finding**: `apps/web/README.md` still describes the `002`-era mechanism verbatim: `useSession()`
  / `auth()` returning a session object with `accessToken` exposed to client code (lines 28-50),
  a `[...nextauth]` route (deleted by `003`), and a "Wiring a new domain-service call from a Client
  Component" section (lines 52-70) whose example imports `useSession` from `next-auth/react` —
  a package `003` removed from `apps/web/package.json` entirely. The root `README.md`'s "Wiring
  session state" example similarly shows `baseURL: process.env.NEXT_PUBLIC_GAME_HUB_API_BASE_URL`
  even while correctly stating the token must be "read server-side inside a proxy Route Handler,
  never exposed to client-side code" — the example's own env var name contradicts the sentence
  right above it. `apps/web/.env.local.example` documents
  `NEXT_PUBLIC_GAME_HUB_API_BASE_URL` as "used client-side by the domain service packages... Must
  be reachable from the browser" — a direct, explicit statement of the exact anti-pattern the
  current constitution (v3.1.0 Principle VI) forbids.
- **Why this matters**: `003`'s own scope note said "`packages/*` is untouched throughout" and
  focused only on `apps/web`'s auth plumbing — it never touched these three documentation files,
  so they kept describing the retired design. A contributor following `apps/web/README.md` today
  would write NextAuth-shaped code that no longer compiles (the import doesn't resolve) or, worse,
  would follow the root `README.md`'s example literally and wire a domain package with a
  client-bundle-inlined base URL, believing that's still the sanctioned pattern.
- **Decision**: Rewrite all three documents as part of this feature (FR-008, User Story 4) — see
  §3 and the Project Structure section of plan.md. This is treated as in-scope corrective work, not
  a separate feature, since it's a direct instance of "no lingering interface/documentation should
  invite a client-held token."

## 3. Env var scope correction: `NEXT_PUBLIC_GAME_HUB_API_BASE_URL` narrowed, not removed

- **Finding**: All four domain-service packages' `http-client.ts` define an identical
  `defaultBaseUrl()` that falls back to `process.env.NEXT_PUBLIC_GAME_HUB_API_BASE_URL` if no
  explicit `baseURL` override is passed to `configure*Service`. The `NEXT_PUBLIC_` prefix is a
  Next.js-specific convention whose only purpose is inlining a value into the client JS bundle —
  but per `003` and this feature's own design (research.md §4), every real call site that
  configures these packages server-side runs inside `lib/session.ts` or the proxy route, and every
  client-side call site (§5) now points `baseURL` at the same-origin `/api/proxy` instead. So the
  packages' *default* fallback should never need to be browser-reachable.
- **A second, genuinely client-side use of the same variable exists**: `LoginCard.tsx` (the "Sign
  in with Google" button) reads `process.env.NEXT_PUBLIC_GAME_HUB_API_BASE_URL` to build a
  top-level `window.location.href` redirect straight to the backend's `/api/auth/google` endpoint
  — a full-page browser navigation, not a `fetch`/axios call, so it carries no token and is not
  the anti-pattern Principle VI guards against. This use is unrelated to the domain-service
  packages' `defaultBaseUrl()` and must keep the `NEXT_PUBLIC_` prefix, since the browser
  genuinely needs to read this value to navigate.
- **Decision**: Change `defaultBaseUrl()` in all four domain-service packages to read
  `process.env.BACKEND_URL` instead (the existing server-only variable `apps/web` already uses in
  `app/api/auth/google/callback/route.ts` and `lib/session.ts`'s `refreshSession()`) — but *keep*
  `NEXT_PUBLIC_GAME_HUB_API_BASE_URL` in `apps/web/.env.local.example`, re-documented as
  `LoginCard`'s redirect target specifically, not as a domain-package default.
- **Rationale**: This is a narrowing of an over-broad default (which happened to be readable from
  either place, inviting exactly the "point a package at it from the client" mistake this feature
  guards against), not a wholesale removal — `LoginCard`'s redirect is a legitimate, different use
  case that must keep working. Two vars remain, but now each has exactly one, correctly-scoped
  purpose instead of one var serving two purposes (one of which was actually unwanted).
- **Alternatives considered**: Removing `NEXT_PUBLIC_GAME_HUB_API_BASE_URL` entirely (the
  original plan for this section, before this correction) — rejected once `LoginCard.tsx`'s real
  usage was found; doing so would have broken the "Sign in with Google" button.

## 4. Shape of the proxy mechanism (revised during `/speckit-clarify`): a single catch-all route

- **Decision**: A new catch-all Route Handler, `apps/web/app/api/proxy/[...path]/route.ts`,
  exports `GET`/`POST`/`PUT`/`PATCH`/`DELETE`, each delegating to one function,
  `forwardToBackend(request, pathSegments)`, in a new `apps/web/lib/proxy.ts`:
  1. Reads the `access_token` cookie (`ACCESS_COOKIE_NAME`, already exported by
     `lib/session.ts` — no change to that file).
  2. If absent, returns `NextResponse.json({ message: "Not signed in" }, { status: 401 })`
     immediately — satisfies FR-004's edge case ("no access-token cookie at all") without calling
     the backend.
  3. Otherwise builds the target URL (`${process.env.BACKEND_URL}/${pathSegments.join("/")}` plus
     the incoming request's query string) and forwards the request's method, body, and a minimal
     header set (`Content-Type`, plus `Authorization: Bearer <access_token>`) to it.
  4. If the backend responds `401`, calls the existing `refreshSession()` (`lib/session.ts`,
     unchanged) and, on success, retries the forward once with the rotated token; on failure,
     returns `401` (the same body/shape the backend itself returns for an auth failure, so a
     client's own `ServiceResult` mapping — see §6 — treats it identically either way).
  5. Otherwise, relays the backend's response status, body, and `Content-Type` verbatim.
- **Why this reuses, not reinvents, the refresh logic**: `refreshSession()` already exists,
  including its cross-invocation, refresh-token-keyed single-flight dedup (`lib/session.ts`'s
  `inFlightRefreshes` map, `003`'s FR-008). `forwardToBackend` calls the exact same function; no
  second refresh implementation is introduced. This satisfies FR-003 and the concurrent-refresh
  edge case for free, identically to how `003`'s SSR path already benefits from it.
- **Alternatives considered (superseding research.md's original §4–§6 from before
  `/speckit-clarify`)**: The original design called a domain-service package's typed function
  (e.g. `getCurrentAccount()`) from inside a per-resource Route Handler
  (`GET /api/proxy/account/me/route.ts`), via a generic `ensureServiceConfigured()` helper added to
  `lib/session.ts` and extended to all four packages. That design kept every proxy-route call
  strictly inside the service-interface layer (Principle IV) at the cost of requiring a new,
  hand-written Route Handler (and, eventually, a new `ensure*ServiceConfigured` wiring) for every
  single backend endpoint a future feature might need — which is exactly the per-integration-point
  duplication spec.md's User Story 4 (`003`'s FR-011 lineage) exists to avoid. The user explicitly
  requested the generic catch-all shape instead; §8 below reconciles this with Principle II/IV.

## 5. Client-side usage: point the existing packages at the proxy, don't bypass them

- **Decision**: A Client Component that needs an authenticated backend resource keeps calling the
  relevant domain-service package's existing typed function (Principle IV is unaffected) — it just
  configures that package once with:
  ```ts
  configureAccountService({ baseURL: "/api/proxy", getAccessToken: () => null });
  ```
  `baseURL: "/api/proxy"` is a same-origin relative path — no env var needed client-side at all
  (nothing analogous to the retired `NEXT_PUBLIC_GAME_HUB_API_BASE_URL` is reintroduced).
  `getAccessToken: () => null` is intentional: `service-core`'s `createHttpClient` interceptor
  already skips attaching an `Authorization` header when the getter returns `null` (unchanged
  behavior, `packages/service-core/src/http-client.ts`), so the browser's own request to the proxy
  carries no token — exactly right, since the proxy is what attaches the real one server-side.
  `onUnauthenticated` can be omitted (defaults to a no-op) — by the time the browser ever sees a
  `401` from `/api/proxy/**`, the proxy has already attempted a server-side refresh and failed, so
  there is nothing left for the client to retry (§4 step 4).
- **Why no server-side "ensure configured" helper is needed for this mechanism**: unlike the
  SSR path (`003`'s `ensureAccountServiceConfigured`, which must resolve a fresh
  per-request cookie value server-side), the proxy route itself is what reads the cookie —
  the browser-side package configuration above is static (set once, e.g. in a small client
  bootstrap module) and never touches the cookie or token at all.
- **Confirming this works identically for all four packages**: all four packages' `http-client.ts`
  are structurally identical (§3's finding) — `configure*Service({ baseURL, getAccessToken })` is
  the same shape for `profiles-service`, `admin-service`, and `caro-service` as for
  `account-service`. Wiring any of them to the proxy is the same one-line configuration call,
  confirmed by code inspection rather than requiring new production code per package (this closes
  spec.md's User Story 3 — "every domain-service package is safe to wire into the same
  mechanism" — without adding anything to `apps/web/lib/session.ts`).

## 6. Response shape: pass the backend's own envelope through unchanged

- **Decision**: The proxy relays the backend's response body byte-for-byte (data-model.md). A
  Client Component's own `withServiceResult`/`mapAxiosErrorToFailure` (unchanged,
  `packages/service-core`) parses it exactly as it would a direct backend response, because the
  envelope shape (`{statusCode, message, data}` on success, `{message, fieldErrors}` on error) is
  unchanged — only the origin the request physically travels to differs. The two synthetic
  responses the proxy itself produces (no cookie; refresh failed) are shaped as `{ message: "Not
  signed in" }` at `401` specifically so they parse the same way through that same client-side
  mapping (status code drives the `ServiceResult.reason`, not the body shape).
- **Rationale**: No new client-visible response contract to document or keep in sync with the
  backend's own — the existing `ServiceResult<T>` pattern every domain package already returns
  keeps working unmodified for proxied calls, exactly as it does for direct SSR calls today.

## 7. Reference verification: exercising the catch-all with the account resource

- **Decision**: quickstart.md and the route's own unit test exercise the catch-all with
  `GET /api/proxy/accounts/me` (forwarding to the backend's existing `/api/accounts/me`) — the one
  resource with a real, already-integrated consumer (the account page's SSR call). No new backend
  capability is invented; this only proves the same resource is also reachable, correctly
  token-guarded, through the browser.
- **Why not a concrete route per package**: since the catch-all is package-agnostic by
  construction (§4), there is no route to add "per package" any more — `/api/proxy/[...path]`
  already forwards to any backend path, including future `profiles`/`admin`/`caro` endpoints,
  without any further Route Handler code. §5 covers proving the client-side wiring works
  identically for all four packages.

## 8. Reconciling the catch-all's raw `fetch` with Principle II/IV

- **Tension**: Principle II says route handlers "MUST only compose UI and call into the
  service-interface layer... MUST NOT contain... direct HTTP calls." Principle IV says
  "Components and route segment files MUST NOT call `fetch`/an HTTP client directly." Taken in
  isolation, both would forbid `lib/proxy.ts`'s `forwardToBackend` from calling `fetch` against the
  backend.
- **Resolution**: Principle VI — the more specific principle governing exactly this mechanism —
  already describes this same behavior as the required shape: "The proxy route reads the access
  token out of the httpOnly cookie server-side, attaches it as the `Authorization` header on **its
  own outbound call to the backend**, and returns the backend's response to the client." That
  clause only makes sense as a description of a raw forwarding call; there would be no other way
  to write a resource-agnostic proxy that doesn't require a typed wrapper function to already exist
  for every backend path it might ever need to forward. Principle VI is therefore treated as
  `lex specialis` for this one Route Handler: it is the constitution's own explicit exception to
  Principle II/IV's general rule, not an unjustified deviation from it.
- **Scope of the exception — kept as narrow as possible**: this reasoning applies to exactly one
  file, `apps/web/lib/proxy.ts` (and its thin route wrapper). It does **not** extend to any other
  Route Handler, any page, or any Client Component — every one of those still calls the backend
  exclusively through a domain-service package's typed function (§5), never `fetch` directly.
  Principle IV's protection (typed contracts, no ad-hoc request/response shaping in app code) is
  fully intact everywhere except this one, constitutionally-named piece of infrastructure.
- **Why this isn't a Complexity Tracking entry**: Complexity Tracking exists to justify
  *unforced* deviations from a MUST rule when a simpler, compliant alternative was rejected for a
  good reason. Here there is no deviation to justify — Principle VI's text is the specific rule
  that applies, and it directly authorizes this shape. (The originally-considered per-resource
  design, research.md's superseded §4–§6, *was* the fully Principle-II/IV-compliant alternative;
  it was rejected not because it was non-compliant but because the user explicitly preferred the
  generic shape, accepting this narrow, textually-supported exception in exchange for not needing
  a new Route Handler per backend endpoint.)

## 9. Testing approach

- **Decision**: Continue with Vitest, consistent with `session.test.ts`'s existing mocking
  approach (mock `next/headers`, mock global `fetch`). `lib/proxy.test.ts` covers
  `forwardToBackend`'s branches (no cookie → 401 without a backend call; success → status/body
  relayed verbatim; expired-token 401 → transparent refresh + retry succeeds; refresh also fails →
  401; concurrent calls at expiry → single refresh, per `003`'s existing dedup). No ratified
  project-level testing principle exists yet (`TODO(TESTING_PRINCIPLE)`), so this is a pragmatic
  continuation, not a new mandate.
