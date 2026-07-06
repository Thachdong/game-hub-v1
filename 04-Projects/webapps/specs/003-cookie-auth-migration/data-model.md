# Phase 1 Data Model: Cookie-Based Token Auth Migration

No database or persistent storage is introduced by this feature (constitution Principle VI — JWTs
remain the sole auth artifact, no server-side session store). The entities below are all
transient, request-scoped shapes.

## Auth Cookie Pair

The two httpOnly cookies set by the login route (`google/callback`) and read only by server-side
code.

| Cookie | Contents | Flags | Lifetime |
|---|---|---|---|
| `access_token` | Raw JWT access token, as returned by the backend | `httpOnly`, `Secure` (production only), `SameSite=Lax`, `Path=/` | Derived from the JWT's own `exp` claim (via `decodeJwtExpiryMs`) |
| `refresh_token` | Raw refresh token, as returned by the backend | `httpOnly`, `Secure` (production only), `SameSite=Lax`, `Path=/` | 30 days (assumption — see research.md §2; backend does not advertise a TTL) |

Neither cookie is ever read by, or exposed to, client-side script (research.md §2, §5).

## SessionStatus (client-visible)

The only auth-related shape ever sent to the browser as readable data. Carries no token.

```ts
interface SessionStatus {
  isSignedIn: boolean;
  account?: {
    id: string;
    email: string;
    username: string;
    avatarUrl: string;
  };
}
```

- Produced by `getSessionStatus()` (server-only helper, research.md §3).
- Consumed by: `app/layout.tsx` (initial server-rendered value), the first-party `SessionProvider`
  React Context (client-side state), `GET /api/auth/session` (JSON response for client
  revalidation), and `(protected)/layout.tsx` (route-protection check).
- Replaces NextAuth's `Session` type (`lib/next-auth.d.ts`, deleted — research.md §6). The prior
  `error?: "RefreshFailed"` flag is no longer needed as a separate field: `getSessionStatus()`
  already resolves refresh failure down to a plain `isSignedIn: false` before this shape is ever
  constructed, so callers only ever branch on `isSignedIn`.

## Backend LoginResult (internal, server-side only)

Unchanged from `002-login-layout-nextauth`'s `LoginResponseDto` — still what the backend's
`/api/auth/google/callback` and `/api/auth/refresh` endpoints return. Never leaves the server; the
login route destructures it directly into the Auth Cookie Pair, and `refreshSession()` destructures
the refresh response into the rotated `access_token` cookie.

```ts
interface LoginResult {
  accessToken: string;
  refreshToken: string;
  account: { id: string; email: string; username: string; avatarUrl: string };
}

interface RefreshResult {
  accessToken: string;
}
```

## State transitions

```
anonymous
  → (Google consent + backend callback succeeds) → signed-in (cookies set)
signed-in (access_token valid)
  → (access_token expires, refresh_token valid) → signed-in (access_token rotated, transparent)
signed-in (any token invalid/expired beyond refresh)
  → treated as anonymous (FR-005)
signed-in
  → (visitor signs out) → anonymous (both cookies cleared)
```
