# Implementation Plan: Cookie-Based Token Auth Migration (Replace NextAuth)

**Branch**: `feature/webapps/dongt/account-and-authorization` | **Date**: 2026-07-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-cookie-auth-migration/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Replace `apps/web`'s NextAuth (Auth.js)-based session/token handling — built by
`002-login-layout-nextauth` under constitution v2.0.0 — with the hand-rolled Next.js Route Handler
+ first-party httpOnly cookie mechanism mandated by constitution v3.0.0 Principle VI: the existing
Google-OAuth callback route becomes the sole login entry point and now sets the backend's returned
access/refresh tokens as httpOnly cookies directly (no `signIn()`); a new server-only
`getSessionStatus()`/`refreshSession()` pair replaces `auth()`/NextAuth's `jwt`/`session`
callbacks, reading the access token from its cookie and never exposing it to client-side code; a
first-party `SessionProvider` React Context replaces NextAuth's client `SessionProvider`; and a
new `logout` route replaces `signOut()`. Planning surfaced that `apps/web` has no live
domain-service integration yet (account/tournament/admin/Caro pages are still placeholders per
002's Assumptions) and that `packages/service-core` and the four domain packages are **already**
built for exactly this cookie-sourced calling convention (root `README.md`'s "Wiring session
state" section) — so this feature changes zero shared-package code and, per constitution Principle
V (Rule of Two — only one app exists), does not extract anything into a new package either. All
new code lives in `apps/web`.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), Node.js 20 LTS — unchanged from
`002-login-layout-nextauth`.

**Primary Dependencies**: Next.js (App Router), the existing workspace packages
`@game-hub/account-service`, `@game-hub/profiles-service`, `@game-hub/admin-service`,
`@game-hub/caro-service` (consumed via `workspace:*`, unchanged public contracts — research.md §5),
Tailwind CSS, `lucide-react`. **`next-auth` is removed** from `apps/web/package.json` — no
replacement auth library is added; the mechanism is first-party code (constitution v3.0.0
Principle VI).

**Storage**: N/A — no database, no server-side session store. Session state lives entirely in two
first-party httpOnly cookies (`access_token`, `refresh_token` — data-model.md); the backend's own
JWTs remain the sole auth artifact.

**Testing**: Vitest + React Testing Library, unchanged from `002-login-layout-nextauth` (no
ratified project-level testing principle yet — `TODO(TESTING_PRINCIPLE)`).

**Target Platform**: Browser (Client Components, now token-blind) + Node.js server runtime (Server
Components, Route Handlers) — unchanged.

**Project Type**: web — single existing app (`apps/web`) under `apps/*`; no new app or package.

**Performance Goals**: No new targets beyond spec.md's SC-003 (transparent renewal, zero visible
interruption).

**Constraints**: Constitution Principles I–VI apply in full. Principle VI (as amended to v3.0.0)
is the direct driver of this feature: NextAuth (Auth.js) MUST NOT be used; login/proxy/refresh
MUST be hand-rolled Route Handlers + httpOnly cookies; access token MUST NEVER be exposed to
client-side script (a stricter constraint than 002's own Principle VI v2.0.0, which had explicitly
allowed exposing `accessToken` via NextAuth's `session` callback — that allowance is retired by
this feature, not carried forward). Principle V (Rule of Two) blocks package extraction while
`apps/web` remains the only app.

**Scale/Scope**: Touches only `apps/web`'s existing auth plumbing
(`app/api/auth/**`, `lib/auth.ts`/`lib/next-auth.d.ts`/`lib/token-refresh.ts` →
consolidated into `lib/session.ts`, `components/templates/Providers.tsx`,
`components/organisms/AppNav.tsx`, `components/molecules/RequireSignIn.tsx`,
`app/(protected)/layout.tsx`, `app/layout.tsx`) plus two new Route Handlers (`session`, `logout`).
No page content, route structure, or `packages/*` code changes.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Turborepo Monorepo Structure | **PASS** | No new package; `apps/web` continues consuming `packages/*` via `workspace:*`. No app-to-app imports (still only one app). |
| II. Next.js App Router with Route Groups | **PASS** | No route-group or URL changes; `(public)`/`(protected)` groups and their layouts are unchanged in shape, only in what they check (research.md §8). |
| III. Atomic Design Component Architecture | **PASS** | `AppNav`/`RequireSignIn` keep their existing atomic placement; only their data source (`useSession()` → a first-party `useAuthSession()` hook) changes. |
| IV. Webapp/API Boundary via Service Interfaces | **PASS** | Identity display now goes through `@game-hub/account-service`'s `getCurrentAccount()` (a real service call) instead of session-embedded data — strengthens this boundary vs. 002, which read `session.account` directly (002 plan's Principle IV note). |
| V. Progressive Common Code Extraction (Rule of Two) | **PASS** | All new code stays local to `apps/web`; no promotion to `packages/*`, since only one app exists (research.md §6). This is the resolution to spec.md's deferred packaging assumption. |
| VI. Client-Side Auth & Realtime Contract | **PASS** | NextAuth is fully removed (FR-010/SC-006). Login route sets cookies directly (research.md §2). All resource access for a signed-in visitor goes through server-side code reading the cookie (research.md §3–§5) — access token is never returned to, or read by, client-side script, closing the one deliberate exception 002 had taken under v2.0.0. Refresh is server-side only (research.md §4). No countdown/deadline UI or polling introduced. |

No violations requiring a Complexity Tracking entry.

**Post-Phase 1 re-check**: Re-evaluated against data-model.md, contracts/, and quickstart.md — all
six rows above still hold. The one design point worth flagging explicitly: `SessionStatus`
(data-model.md) intentionally drops 002's `session.error: "RefreshFailed"` flag as a
client-visible field — `getSessionStatus()` now resolves refresh failure down to plain
`isSignedIn: false` before the client ever sees a shape, which is a strict subset of what 002
exposed (less client-visible state, not more), so this is a simplification, not a new gate concern.

## Project Structure

### Documentation (this feature)

```text
specs/003-cookie-auth-migration/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md         # Phase 1 output (/speckit-plan command)
├── contracts/            # Phase 1 output (/speckit-plan command)
│   ├── session-status.ts
│   └── auth-routes.md
├── checklists/
│   └── requirements.md
└── tasks.md              # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
apps/
└── web/
    ├── package.json                        # MODIFIED: remove `next-auth` dependency
    ├── app/
    │   ├── layout.tsx                       # MODIFIED: getSessionStatus() instead of auth()
    │   ├── api/
    │   │   └── auth/
    │   │       ├── google/callback/route.ts # MODIFIED: set cookies directly, no signIn()
    │   │       ├── session/route.ts         # NEW: GET — client revalidation endpoint
    │   │       └── logout/route.ts          # NEW: POST — clears both cookies
    │   ├── (public)/…                       # unchanged route structure
    │   └── (protected)/
    │       └── layout.tsx                   # MODIFIED: getSessionStatus() instead of auth()
    ├── components/
    │   ├── templates/Providers.tsx          # MODIFIED: first-party SessionProvider
    │   ├── organisms/AppNav.tsx              # MODIFIED: useAuthSession() instead of useSession()
    │   └── molecules/RequireSignIn.tsx       # MODIFIED: useAuthSession() instead of useSession()
    └── lib/
        ├── session.ts                        # NEW: getSessionStatus(), refreshSession(),
        │                                      #      decodeJwtExpiryMs() (moved from token-refresh.ts)
        ├── auth.ts                            # DELETED (NextAuth config)
        ├── next-auth.d.ts                     # DELETED (NextAuth type augmentation)
        └── token-refresh.ts                   # DELETED (logic folded into lib/session.ts)

packages/                                      # UNCHANGED — already compliant (research.md §5)
├── service-core/
├── account-service/
├── profiles-service/
├── admin-service/
└── caro-service/
```

**Structure Decision**: Single existing app (`apps/web`); this feature is a like-for-like
replacement of its auth plumbing, not a restructuring. No new `apps/*` or `packages/*` entries.
`packages/*` is listed above only to make explicit that it is untouched — see research.md §5–§6
for why.

## Complexity Tracking

*No violations — table omitted.*
