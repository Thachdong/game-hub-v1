# Implementation Plan: Domain Service Layer for Backend Integration

**Branch**: `001-domain-service-layer` | **Date**: 2026-07-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-domain-service-layer/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See
`.specify/templates/plan-template.md` for the execution workflow.

## Summary

Build a typed TypeScript service layer that mediates all webapp ↔ backend-API communication,
organized into five independently consumable Turborepo packages (authentication, account,
profiles, admin, game-caro) plus a shared `service-core` package. Every exported function wraps
an axios call through a higher-order function (`withServiceResult`) that normalizes the result
into one discriminated-union shape (`ServiceResult<T>`), with explicit input/output types sourced
from `04-Projects/api/openapi.yml`. Planning surfaced one correction to the spec: the refresh
token cannot be held in a backend-set httpOnly cookie (the backend transmits it as plain JSON and
sets no cookies) and the constitution forbids server-side session cookies as the auth mechanism —
resolved by giving only the authentication package a small server-side proxy (BFF) layer that owns
a first-party httpOnly cookie, keeping the refresh token out of client-side JavaScript entirely
while leaving the backend contract untouched.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), Node.js 20 LTS

**Primary Dependencies**: axios (HTTP client, per feature request), Turborepo + pnpm workspaces
(monorepo tooling per constitution Principle I and `workspace:*` protocol), Vitest (unit tests,
see research.md §8)

**Storage**: N/A — this feature holds no persistent data of its own. Session state: access token
in an in-memory client-side store; refresh token in a first-party httpOnly cookie owned by the
authentication package's server-side proxy layer (research.md §5)

**Testing**: Vitest, with mocked HTTP responses (no live backend dependency for the automated
suite); a manual smoke-test procedure against a running backend is documented in quickstart.md

**Target Platform**: Browser (client-side service functions) + Node.js server runtime (the
authentication package's BFF proxy functions, meant to run inside a future Next.js app's Route
Handlers)

**Project Type**: web — frontend service-layer packages (`packages/*`) consumed by a webapp

**Performance Goals**: No specific throughput target (this is a thin client-side/BFF layer, not a
service under independent load); per-request timeout capped at 10s (research.md §9) so a hung
request always resolves to a `ServiceResult` rather than blocking indefinitely

**Constraints**: Refresh token MUST NOT be readable by client-side JavaScript (FR-023); automatic
retry MUST be limited to safe (`GET`) requests on transient failure only (FR-024, research.md §6);
every exported function MUST return `ServiceResult<T>`, never throw for an expected failure
(FR-001)

**Scale/Scope**: ~50 backend operations across 5 domain packages (see spec.md FR-007–FR-022);
consumed only by first-party webapp code in this repository, no external/public API consumers

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Turborepo Monorepo Structure | **PASS** | Six new packages under `packages/*`, each with its own `package.json` and a single public entry point (`src/index.ts`); no app-to-app imports (no `apps/*` exist yet); cross-package use of `service-core` goes through the pnpm `workspace:*` protocol. |
| II. Next.js App Router with Route Groups | **N/A for this feature** | This feature creates `packages/*` only, not an `apps/*` webapp. The authentication package's BFF proxy logic is exported as framework-agnostic functions (`bff.ts`); wiring it into a Next.js Route Handler happens when an `apps/*` webapp is scaffolded (a separate, future feature) — see research.md §5 scope note. |
| III. Atomic Design Component Architecture | **N/A for this feature** | No UI components are introduced. |
| IV. Webapp/API Boundary via Service Interfaces | **PASS** | This feature *is* the service-interface layer: all request construction and response parsing live inside the six packages; nothing here calls `fetch`/axios from a component. |
| V. Progressive Common Code Extraction (Rule of Two) | **PASS, justified** | `service-core` is created immediately rather than after a second consumer appears — but it already has five simultaneous consumers within this same change (the five domain packages), which is exactly the condition Principle V requires, not an anticipated future need. See Complexity Tracking (no exception needed; documented for traceability). |
| VI. Client-Side Auth & Realtime Contract | **PASS** | The JWT access token remains the sole authentication artifact — the BFF's httpOnly cookie is a transport detail for the refresh token, not a server-side session scheme (no session state is stored, only the token itself). No countdown/deadline UI is rendered by this feature (it only returns `deadlineAt` as data). This feature is REST-only by design (spec.md Assumptions) and does not introduce polling as a realtime substitute — realtime features remain out of scope, to be built against WS/SSE in a follow-on feature. |

No violations requiring a Complexity Tracking entry — see the table below for the one item worth
recording for traceability even though it isn't a violation.

## Project Structure

### Documentation (this feature)

```text
specs/001-domain-service-layer/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── service-core.ts
│   ├── auth-service.ts
│   ├── account-service.ts
│   ├── profiles-service.ts
│   ├── admin-service.ts
│   └── caro-service.ts
├── checklists/
│   ├── requirements.md
│   └── api.md
└── tasks.md              # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
packages/
├── service-core/
│   ├── package.json
│   └── src/
│       ├── index.ts
│       ├── types.ts              # ServiceResult, ServiceFailure, CursorPage, Cursor
│       ├── http-client.ts        # createHttpClient (axios factory + interceptors)
│       ├── with-service-result.ts # the HOF
│       └── retry.ts              # transient-failure retry/backoff policy
│
├── auth-service/
│   ├── package.json
│   └── src/
│       ├── index.ts
│       ├── client.ts             # browser-safe: getGoogleLoginUrl, getAccessToken,
│       │                         # setAccessToken, refreshSession, logout
│       ├── bff.ts                # server-only: exchangeGoogleCallback, rotateAccessToken,
│       │                         # clearSession — for a future app's Route Handlers
│       └── types.ts
│
├── account-service/
│   ├── package.json
│   └── src/{index.ts, types.ts}
│
├── profiles-service/
│   ├── package.json
│   └── src/
│       ├── index.ts
│       ├── friends.ts
│       ├── notifications.ts
│       ├── reports.ts
│       └── trust-score.ts
│
├── admin-service/
│   ├── package.json
│   └── src/
│       ├── index.ts
│       ├── game-admins.ts
│       └── reports.ts
│
└── caro-service/
    ├── package.json
    └── src/
        ├── index.ts
        ├── game-configs.ts       # incl. Caro-specific admin config management
        ├── matches.ts
        ├── gameplay.ts
        ├── quick-pair.ts
        ├── chat.ts
        ├── leaderboard.ts
        ├── players.ts
        └── tournaments.ts        # incl. tournament-creator-request admin
```

Root-level Turborepo scaffolding (`package.json`, `pnpm-workspace.yaml`, `turbo.json`,
`tsconfig.base.json`) does not exist yet in this workspace and must be created as part of this
feature's implementation, since these six packages are the first packages in the monorepo.

**Structure Decision**: Web application structure (`packages/*` variant) — this feature adds only
`packages/*` (the service layer), no `apps/*`. Each of the six packages is independently buildable
and typed; the five domain packages depend on `service-core` via `workspace:*` and expose exactly
one public entry point per constitution Principle I. This matches the "web application" project
type in the sense that the eventual consumer is a Next.js webapp, but no `frontend/`/`backend/`
split applies here since the "backend" already exists as a separate NestJS project outside this
workspace (`04-Projects/api`).

## Complexity Tracking

> Fill ONLY if Constitution Check has violations that must be justified — none apply here. Row
> below is recorded for traceability only, not because it is a deviation.

| Item | Why it looks like added complexity | Why it's not a violation |
|---|---|---|
| `service-core` shared package created on day one | Principle V normally waits for a second consumer before extracting shared code | Five consumers (the domain packages) exist simultaneously within this same change — the Rule of Two's condition is already met, not anticipated |
| `auth-service`'s server-side `bff.ts` split | Adds a server-side concern inside what was requested as a client-side axios-based service layer | Required by FR-023 + constitution Principle VI (no server-side session cookie as the auth mechanism) once research showed the backend sets no cookies itself; scoped to the one package that actually needs it, not applied to the other four |
