# Quickstart: Validating the Cookie-Based Auth Migration

## Prerequisites

- Backend (`04-Projects/api`) running and reachable at `BACKEND_URL`, with Google OAuth configured
  exactly as for `002-login-layout-nextauth` (no backend changes required, spec.md Assumptions).
- `apps/web` running: `pnpm turbo run dev --filter=web`.
- Browser dev tools open to the Application/Storage panel (to inspect cookies) and Network panel.

## Scenario 1 — Sign in, tokens never client-readable (US1)

1. Visit `/login`, choose "Sign in with Google", complete consent.
2. Confirm you land back in the webapp signed in (username/avatar in `AppNav`).
3. In dev tools → Application → Cookies: confirm `access_token` and `refresh_token` are present,
   both marked `HttpOnly`.
4. In the browser console, run `document.cookie` — confirm neither `access_token` nor
   `refresh_token` appears in the output.
5. In the Network panel, inspect the `google/callback` redirect response and the
   `/api/auth/session` response body — confirm no token value appears in either.

**Expected**: signed-in state visible in the UI; zero token exposure to script (SC-002).

## Scenario 2 — Existing chrome and gated actions keep working (US2)

1. While signed in, open `/account`, `/tournament`, `/admin` — confirm each still renders (its
   existing placeholder content, per `002-login-layout-nextauth`) with no error.
2. Open `/game-caro`, click "Join" on `JoinMatchButton` — confirm it invokes the action (no sign-in
   prompt, since you're signed in).
3. Sign out via `AppNav`. Click "Join" again — confirm you're redirected to `/login` instead of the
   action firing.

**Expected**: no regression vs. pre-migration behavior (SC-001).

## Scenario 3 — Transparent refresh (US3)

1. Sign in. Locally shorten the access-token cookie's effective lifetime (e.g., temporarily patch
   the backend/test JWT `exp` to a few seconds, or wait out its real TTL in a lower environment).
2. After expiry, trigger any action that calls `getSessionStatus()`/`account-service` (e.g.,
   navigate to a protected page).
3. Confirm the page loads successfully with no extra sign-in prompt, and the `access_token` cookie
   value in dev tools has changed (rotated).

**Expected**: zero visible interruption (SC-003).

## Scenario 4 — Pre-migration session is cleanly treated as signed out (edge case)

1. On a build from before this feature (or by manually setting NextAuth's old session cookie name
   instead of `access_token`), load any page.
2. Confirm the webapp renders as signed-out (not an error, not a broken partially-authenticated
   state) — `AppNav` shows "Sign in".

**Expected**: SC-005.

## Scenario 5 — Sign-out clears session everywhere (edge case)

1. Sign in in two tabs of the same browser.
2. Sign out in tab A.
3. In tab B, attempt a gated action (e.g., "Join").
4. Confirm tab B does not act as signed-in — it prompts sign-in rather than silently proceeding.

**Expected**: SC-004.

## Verifying NextAuth removal (SC-006)

```bash
grep -rn "next-auth" apps/web/package.json apps/web/app apps/web/lib apps/web/components
```

**Expected**: no matches.
