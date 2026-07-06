# Implementation Plan: Login Page, Webapp Layout, and NextAuth Session Setup

**Branch**: `002-login-layout-nextauth` | **Date**: 2026-07-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-login-layout-nextauth/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Scaffold the first Next.js App Router application in this workspace (`apps/web`), delivering: a
Google sign-in flow wired through NextAuth (Auth.js), a shared layout with sign-in-state-aware
navigation, route-group-based protection for pages that require sign-in, and route placeholders
for the remaining five pages from `raw-webapp-spec.md`. Planning surfaced a hard integration
constraint not visible from the OpenAPI contract alone: the backend's Google OAuth callback
(`AuthController.googleCallback`) is a Passport strategy route that always completes on the
backend's own origin and returns raw JSON — it cannot itself redirect to the webapp. Resolved
(decided directly with the user) by reconfiguring the backend's OAuth `callbackUrl` to point at a
webapp-owned Route Handler (`/api/auth/google/callback`), which forwards the Google-issued `code`
server-to-server to the backend's real callback endpoint, then completes NextAuth sign-in with the
result — no backend code change required, only a deployment config change (backend `callbackUrl`
env var + the corresponding Google Cloud Console redirect URI) coordinated outside this feature.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), Node.js 20 LTS — consistent with the existing
`packages/*` in this workspace.

**Primary Dependencies**: Next.js (App Router, latest stable), NextAuth (Auth.js) v5 (App Router
native `auth()` helper), the existing workspace packages `@game-hub/account-service`,
`@game-hub/profiles-service`, `@game-hub/admin-service`, `@game-hub/caro-service` (consumed via
`workspace:*`), Tailwind CSS (styling — see research.md for rationale), `lucide-react` (mandated
icon library per constitution Coding Conventions).

**Storage**: N/A — no database. Session state lives entirely in NextAuth's own encrypted
(`httpOnly`) session cookie; no server-side session store (per constitution Principle VI).

**Testing**: Vitest + React Testing Library, consistent with the existing packages' tooling
(constitution has no ratified testing principle yet — `TODO(TESTING_PRINCIPLE)` — this is a
pragmatic default, not a mandate).

**Target Platform**: Browser (Client Components) + Node.js server runtime (Next.js Server
Components, Route Handlers, and NextAuth's own request handling).

**Project Type**: web — the first application under `apps/*` in this Turborepo workspace (per
constitution Principle I/II); consumes the existing `packages/*` domain services.

**Performance Goals**: No aggressive targets beyond spec.md's SC-001 (sign-in flow completes in
≤2 redirects). Standard web-app expectations otherwise (no server-rendering budget specified).

**Constraints**: Constitution Principles I–VI apply in full (Turborepo app structure, App Router +
Route Groups, Atomic Design components, service-interface boundary for all backend calls, Rule of
Two for any new shared code, NextAuth-delegated session per v2.0.0 Principle VI). Access token IS
exposed via NextAuth's `session` callback to client-side code (per spec.md Clarifications,
2026-07-03) — Client Components attach the `Authorization: Bearer` header themselves, matching the
existing domain packages' already-built client-calling pattern; `refreshToken` is never exposed to
client-side code. Depends on an **external configuration change** (backend `callbackUrl` +
Google Cloud Console redirect URI) that is coordinated outside this feature's own deliverable —
see research.md §1.

**Scale/Scope**: 6 routes total per `raw-webapp-spec.md` (login, account, game-caro, game-caro
detail, tournament, admin). 1 route (login) plus the shared layout and route-protection mechanism
are fully implemented; the other 5 are route-structure placeholders (per spec.md Assumptions).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Turborepo Monorepo Structure | **PASS** | First app under `apps/*` (`apps/web`); consumes `packages/*` domain services via `workspace:*`; no app-to-app imports possible yet (only one app exists). |
| II. Next.js App Router with Route Groups | **PASS** | This feature *is* the App Router scaffold. Two route groups: `(public)` (login, game-caro, game-caro detail) and `(protected)` (account, tournament, admin), each with its own layout — see Project Structure below. |
| III. Atomic Design Component Architecture | **PASS** | Layout chrome (nav, sign-in/sign-out affordance) and login page UI are organized atoms → molecules → organisms → templates under `apps/web/components/`. |
| IV. Webapp/API Boundary via Service Interfaces | **PASS** | The layout's account-identity display reads `Session.account` (embedded at sign-in, per data-model.md — not a separate `fetch`); pages that need the fuller account record call `@game-hub/account-service`'s `getCurrentAccount()`, never `fetch` directly. The one exception — the `/api/auth/google/callback` Route Handler forwarding to the backend — is NextAuth/session-establishment plumbing, not a domain data call, and is the constitutionally-designated place for this per Principle VI. |
| V. Progressive Common Code Extraction (Rule of Two) | **PASS** | This is the first app in the workspace; no component/hook is being placed under `packages/*` in anticipation of a second app. All new UI code lives locally under `apps/web/`. |
| VI. Client-Side Auth & Realtime Contract | **PASS** | Session/token lifecycle delegated to NextAuth via a `Credentials`-style provider wrapping the backend's own Google-OAuth-and-JWT-issuance flow (not an independent Google provider) — matches the mandate exactly. `accessToken` is exposed via the `session` callback per this feature's own Clarification (2026-07-03), which the constitution explicitly allows as a per-screen judgment call. `refreshToken` is never client-exposed, including through the FR-003 refresh-rotation logic (research.md §6), which stays entirely inside the server-only `jwt` callback. No countdown/deadline UI is rendered by this feature. No polling is introduced. |

No violations requiring a Complexity Tracking entry.

**Post-Phase 1 re-check**: Re-evaluated against the finished data-model.md, contracts/, and
quickstart.md — all six rows above still hold; the only correction made during design was Principle
IV's note (account display reads the session, not a fresh service call), captured in the row text
above rather than left stale.

## Project Structure

### Documentation (this feature)

```text
specs/002-login-layout-nextauth/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── session.ts
│   └── auth-callback-route.md
├── checklists/
│   ├── requirements.md
│   └── ux.md
└── tasks.md              # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
apps/
└── web/                              # first apps/* package in this workspace
    ├── package.json
    ├── next.config.ts
    ├── tsconfig.json
    ├── middleware.ts                  # pathname-forwarding plumbing ONLY, no auth decision —
    │                                 # see research.md §4's "Implementation discovery" note
    ├── app/
    │   ├── layout.tsx                # root layout: <html>/<body>, NextAuth SessionProvider
    │   ├── loading.tsx                # FR-012 fallback for the root segment
    │   ├── api/
    │   │   └── auth/
    │   │       ├── [...nextauth]/
    │   │       │   └── route.ts      # NextAuth handler (GET/POST)
    │   │       └── google/
    │   │           └── callback/
    │   │               └── route.ts  # webapp-owned OAuth callback: forwards code to backend,
    │   │                             # then completes NextAuth sign-in — see research.md §1
    │   ├── (public)/
    │   │   ├── layout.tsx            # public route-group layout (shared chrome, no auth gate)
    │   │   ├── login/
    │   │   │   └── page.tsx          # FR-001, FR-011
    │   │   └── game-caro/
    │   │       ├── page.tsx          # placeholder; FR-008/FR-009 view-vs-act gating hook point
    │   │       └── [matchId]/
    │   │           └── page.tsx      # placeholder detail view
    │   └── (protected)/
    │       ├── layout.tsx            # authenticated route-group layout: auth() check + redirect
    │       │                         # (FR-006, FR-007), shared chrome
    │       ├── account/
    │       │   └── page.tsx          # placeholder
    │       ├── tournament/
    │       │   └── page.tsx          # placeholder
    │       └── admin/
    │           └── page.tsx          # placeholder — plain sign-in gate only, no role check
    │                                 # (spec.md Clarifications, 2026-07-03)
    ├── components/
    │   ├── atoms/
    │   ├── molecules/
    │   ├── organisms/
    │   │   └── AppNav.tsx            # FR-005 shared nav + sign-in-state chrome, FR-012 skeleton
    │   └── templates/
    ├── lib/
    │   ├── auth.ts                   # NextAuth config: Credentials provider, jwt/session callbacks
    │   └── auth.test.ts
    └── e2e or unit tests colocated per component (Vitest + React Testing Library)
```

**Structure Decision**: Web application structure — this feature adds `apps/web` (the first
`apps/*` package) consuming the existing `packages/*` domain services. Two Route Groups
(`(public)`, `(protected)`) per constitution Principle II keep the sign-in-required layout
separate from the public layout without affecting URL paths. `middleware.ts` does **not** make the
route-protection decision — that stays in `(protected)/layout.tsx`'s Server Component check, per
research.md §4; the middleware exists only to forward the current pathname (a Next.js Server
Component limitation discovered during implementation), not to gate access.

## Complexity Tracking

> Fill ONLY if Constitution Check has violations that must be justified — none apply here.
