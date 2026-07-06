# Quickstart: Validating the Proxy Route Refactor

## Prerequisites

- Backend (`04-Projects/api`) running and reachable at `BACKEND_URL`.
- `apps/web` running: `pnpm turbo run dev --filter=web`, signed in once already (via `/login`) so
  a browser session with valid `access_token`/`refresh_token` cookies exists.
- Browser dev tools open to the Network and Application/Storage panels.

## Scenario 1 — Signed-in call through the proxy route never exposes the token (US1)

`/api/proxy/[...path]` is a catch-all — `GET /api/proxy/accounts/me` forwards to the backend's
`GET /api/accounts/me` (research.md §4, §7).

1. While signed in, in the browser console run:
   ```js
   fetch("/api/proxy/accounts/me").then((r) => r.json()).then(console.log);
   ```
2. Confirm the response body is the account identity (`id`, `email`, `username`, `avatarUrl`) with
   no `accessToken`/`refreshToken` field anywhere.
3. In the Network panel, inspect the request: confirm it carries no `Authorization` header (the
   browser never held or sent the token) and the response body contains no token value.
4. In the browser console, run `document.cookie` — confirm neither `access_token` nor
   `refresh_token` appears (unchanged from `003`'s guarantee, still true after adding this route).

**Expected**: signed-in identity data returned; zero token exposure to script (SC-001).

## Scenario 2 — Signed-out call is rejected cleanly (US1 edge case)

1. Sign out via `AppNav`.
2. Repeat the `fetch("/api/proxy/accounts/me")` call from Scenario 1.
3. Confirm the response is `401` with body `{ "message": "Not signed in" }` — not a thrown
   exception, not a silent empty success.

**Expected**: distinguishable "not signed in" response (FR-004).

## Scenario 3 — Transparent refresh through the proxy route (US2)

1. Sign in. Let the access token expire (or locally shorten its `exp`, as in
   `specs/003-cookie-auth-migration/quickstart.md` Scenario 3).
2. Call `fetch("/api/proxy/accounts/me")` again.
3. Confirm it still returns `200` with the account data (no `401` surfaced to the browser), and
   the `access_token` cookie's value has rotated in dev tools.

**Expected**: zero visible interruption through the proxy path (SC-002).

## Scenario 4 — Concurrent proxied calls at expiry only refresh once (US2 edge case)

1. With the access token expired but the refresh token valid, run in the console:
   ```js
   Promise.all([
     fetch("/api/proxy/accounts/me"),
     fetch("/api/proxy/accounts/me"),
     fetch("/api/proxy/accounts/me"),
   ]).then((rs) => Promise.all(rs.map((r) => r.json()))).then(console.log);
   ```
2. All three should resolve successfully.
3. Cross-check against the backend's own request log (or a temporary log line in
   `refreshSession()`) that only one `POST /api/auth/refresh` call was made.

**Expected**: single-flight refresh dedup holds through the proxy path too (edge case in spec.md).

## Scenario 5 — Existing server-rendered account page is unaffected (FR-007 regression check)

1. Navigate to `/account` directly (full page load).
2. Confirm the account identity and game-profile grid still render exactly as before this feature
   (this page's Server Component still calls `getCurrentAccount()`/`listGames()` directly — it was
   not re-routed through `/api/proxy/**`).

**Expected**: zero regression to the account page (SC-005).

## Verifying the env var scope correction (research.md §3)

```bash
grep -n "NEXT_PUBLIC_GAME_HUB_API_BASE_URL" packages/*/src/http-client.ts
```

**Expected**: no matches — all four domain-service packages now default to `BACKEND_URL`.
`NEXT_PUBLIC_GAME_HUB_API_BASE_URL` itself still exists (`LoginCard.tsx`'s OAuth-initiation
redirect, `apps/web/.env.local.example`) — that is expected, not a regression (research.md §3).

## Verifying stale documentation was corrected (research.md §2)

```bash
grep -rln "useSession\|next-auth" apps/web/README.md README.md
```

**Expected**: no matches.
