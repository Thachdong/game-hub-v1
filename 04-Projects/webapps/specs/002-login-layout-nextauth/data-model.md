# Phase 1 Data Model: Login Page, Webapp Layout, and NextAuth Session Setup

Entities below are the webapp's own view of session/identity state — shaped by NextAuth's type
system, not persisted anywhere beyond NextAuth's own encrypted session cookie (no database, per
plan.md's Storage: N/A).

## Session (NextAuth-managed)

Backed by NextAuth's own `Session`/`JWT` types, extended via TypeScript module augmentation
(`apps/web/lib/auth.ts` or a colocated `next-auth.d.ts`):

| Field | Type | Notes |
|---|---|---|
| accessToken | string | The backend's short-lived JWT. Exposed to client code via the `session` callback (spec.md Clarifications, 2026-07-03). Client Components read this via `useSession()` and attach it as `Authorization: Bearer <accessToken>` when calling the existing domain service packages. |
| account | `{ id, email, username, avatarUrl }` | Mirrors `account-service`'s `Account` type — embedded at sign-in from the backend's `LoginResponseDto.account`. |
| error | `"RefreshFailed"` (optional) | Set by the `jwt` callback when refresh-rotation (research.md §6) fails — the refresh token is no longer valid. **Every consumer of this session (`AppNav`, `(protected)/layout.tsx`, `RequireSignIn`) MUST treat its presence as equivalent to signed-out (FR-004)**, even though `accessToken`/`account` may still be populated with stale values. |
| expires | string (ISO) | Standard NextAuth session field — the *session's* expiry (NextAuth's own cookie lifetime), distinct from the backend JWT's own expiry. |

Held only server-side (inside NextAuth's own encrypted JWT/cookie): `refreshToken` — present on the
internal NextAuth `token` object (populated by the `jwt` callback) but **never copied onto the
client-visible `session` object**. Only server-side code (the `jwt` callback itself, when
implementing refresh-rotation in a future iteration) reads it.

**State transitions**: `anonymous` → (sign-in via `/api/auth/google/callback` Route Handler
completes) → `authenticated` → (`accessToken` expires, `jwt` callback transparently renews it via
`POST /api/auth/refresh` — FR-003, research.md §6) → `authenticated` (renewed) — or, if the
`refreshToken` itself is no longer valid, → `anonymous` (session flagged `error: "RefreshFailed"`,
FR-004).

## Account (display identity)

The subset of the signed-in user's account shown in the shared layout (`AppNav` organism) — sourced
from the `Session.account` field above, not a separate fetch. This is intentionally the *same*
shape NextAuth's session already carries (per data-model above), not the fuller record
`account-service`'s `getCurrentAccount()` would return — pages that need the fuller record (e.g., a
future `account` page's real content) call `getCurrentAccount()` directly; the layout does not.

| Field | Type | Notes |
|---|---|---|
| id | string | |
| email | string | |
| username | string | Displayed in `AppNav`. |
| avatarUrl | string | Displayed in `AppNav`. |

## Route Protection Boundary

Not a runtime data entity — a compile-time/structural classification realized as the two Route
Groups:

| Route Group | Pages (per `raw-webapp-spec.md`) | Gate |
|---|---|---|
| `(public)` | `/login`, `/game-caro`, `/game-caro/[matchId]` | None at the route level. `/game-caro` and `/game-caro/[matchId]` gate individual *actions* (join/chat/report/play) client-side by checking `useSession().status`, not the route itself (FR-008, FR-009). |
| `(protected)` | `/account`, `/tournament`, `/admin` | `(protected)/layout.tsx` calls `auth()`; redirects to `/login?callbackUrl=<original path>` if no session (FR-006, FR-007). `/admin` uses the *same* plain sign-in check — no Platform Admin role check in this feature (spec.md Clarifications, 2026-07-03). |

## Relationships

- Session (1) → Account display identity (1, embedded at sign-in, not a separate fetch)
- Route Protection Boundary classifies every page (1:1) into exactly one Route Group
- `(protected)/layout.tsx`'s redirect (on missing Session) → `/login` page, carrying a
  `callbackUrl` query param consumed by the login page/NextAuth's post-sign-in redirect (FR-007)
