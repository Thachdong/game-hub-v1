# Contract: `GET /api/auth/google/callback` (webapp Route Handler)

This is the route Google is (re)configured to redirect to after the user completes consent — see
research.md §1 for why this exists and why it requires an external `callbackUrl` config change on
the backend plus a matching Google Cloud Console redirect URI update.

> **Terminology note**: "`callbackUrl`" appears below in two distinct senses — the backend's OAuth
> redirect URI (a deployment config value, research.md §1) is a different thing from the
> `oauth_callback_url` cookie described in step 2 below (FR-007's return-to-original-page target,
> research.md §2). Read carefully; the names are unfortunately similar.

## Request (from Google, via the browser's top-level navigation)

```
GET /api/auth/google/callback?code=<string>&state=<string>
```

- `code`, `state`: exactly what Google's OAuth redirect provides — this route does not generate or
  validate them itself; it passes them through unmodified.

## Behavior contract

1. Forward the exact same query string to the backend's real endpoint:
   `GET ${BACKEND_URL}/api/auth/google/callback?code=<code>&state=<state>` (server-to-server, no
   browser involvement).
2. On a `200` response from the backend (`LoginResponseDto`:
   `{ accessToken, refreshToken, account }`):
   - Call NextAuth's server-side `signIn('credentials', { accessToken, refreshToken, account })`
     to establish the session (see contracts/session.ts's `AuthorizeInput`).
   - Read the `oauth_callback_url` cookie (set by the login page before this flow started — see
     research.md §2) to determine the return destination; default to `/` if the cookie is absent
     or empty.
   - Redirect the browser (`303 See Other`) to that destination, satisfying spec.md's FR-007
     (return to originally-requested page).
   - Clear the `oauth_callback_url` cookie (`Max-Age=0`) on the same response — it is single-use.
3. On a non-`200` response from the backend (e.g., `503` per `GoogleOAuthUnavailableError`):
   - Do **not** attempt `signIn`.
   - Redirect the browser to `/login?error=oauth_failed` (or an equivalent query flag), which the
     login page reads to render the "system error" branch of FR-011 — distinct from a user
     cancelling at Google's own consent screen (which Google itself would redirect back to this
     same webapp route with an `error` query param instead of `code`, per standard OAuth2 behavior;
     that case maps to FR-011's "declined/cancelled" branch instead).
4. This route MUST NOT itself ever return the raw `LoginResponseDto` JSON to the browser — its only
   valid responses are redirects (to the app on success, to `/login?error=...` on failure).

## Non-goals

- This route does not implement token refresh — that is `lib/auth.ts`'s `jwt` callback's
  responsibility (FR-003, research.md §6), invoked automatically on every subsequent
  `auth()`/`useSession()` resolution, not from this route.
- This route does not set the NextAuth session cookie directly — `signIn()` handles that
  internally. It does clear the single-use `oauth_callback_url` cookie (step 2), which is unrelated
  to the session cookie and was set earlier by the login page, not by NextAuth.
