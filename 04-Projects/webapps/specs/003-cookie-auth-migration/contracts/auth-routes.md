# Contract: Auth Route Handlers

All routes below live under `apps/web/app/api/auth/`. None of them is called directly by
client-side script except `logout` and `session` (both same-origin, cookie-authenticated
`fetch` calls with no token in the request/response body).

## `GET /api/auth/google/callback` (existing, modified)

The webapp's single Principle-VI login entry point (research.md §1).

- **Request**: Google's redirect, query params `code`, `state`, or `error`.
- **Behavior**:
  1. `error` present, no `code` → redirect to `/login?error=<error>` (visitor declined consent).
  2. Otherwise, forwards `code`/`state` to the backend's `/api/auth/google/callback`.
  3. Backend non-2xx → redirect to `/login?error=oauth_failed`.
  4. Backend success → set `access_token`/`refresh_token` cookies (data-model.md), read + clear the
     `oauth_callback_url` cookie for the redirect destination, redirect there.
- **Response**: HTTP redirect only — never a JSON body containing either token.

## `GET /api/auth/session` (new)

Client-side revalidation endpoint. Thin wrapper around `getSessionStatus()` (research.md §3).

- **Request**: none (cookie-authenticated).
- **Response**: `200 SessionStatus` (contracts/session-status.ts) — always `200`, even when
  `isSignedIn: false`; this is a status query, not an authorization gate.

## `POST /api/auth/logout` (new)

- **Request**: none.
- **Behavior**: clears `access_token` and `refresh_token` cookies. No backend call (research.md
  §7 — nothing to invalidate server-side under a stateless-JWT model).
- **Response**: `200 { isSignedIn: false }`.

## `refreshSession()` (internal helper, not an HTTP route)

Invoked as the `onUnauthenticated` callback wired into every `configure*Service` call
(currently only `account-service`, research.md §3–§5) — never called directly by client code.

- **Behavior**: reads `refresh_token` cookie → `POST {BACKEND_URL}/api/auth/refresh` →
  on success, re-sets the `access_token` cookie on the current response and returns the new
  access token string; on failure, returns `null` (caller then reports signed-out, FR-005).
- **Concurrency**: in-flight calls within a single Route Handler invocation are memoized
  (research.md §4) — at most one backend refresh call per invocation.
