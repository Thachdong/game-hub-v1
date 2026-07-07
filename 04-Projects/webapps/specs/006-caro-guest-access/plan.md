# Implementation Plan: Caro Guest Access (Lobby, Match View, Moves)

**Branch**: `006-caro-guest-access` | **Date**: 2026-07-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-caro-guest-access/spec.md`

## Summary

The backend has removed its auth guard on three endpoints — `GET /api/caro/matches/lobby`,
`GET /api/caro/matches/:id`, and `POST /api/caro/matches/:id/moves` — so they now accept requests
with or without an identity. The webapp, however, still hard-blocks *every* proxied request with a
synthesized `401 "Not signed in"` in `apps/web/lib/proxy.ts`'s `forwardToBackend` whenever the
`access_token` cookie is missing, before the request ever reaches the backend
(`005-auth-proxy-refactor`'s catch-all proxy route). That webapp-side gate is what actually blocks
guests today — `packages/caro-service`'s typed client functions (`listLobbyMatches`, `getMatch`,
`submitMove`) don't gate on auth themselves; they just call whatever base URL they're configured
with.

The fix is narrowly scoped to `forwardToBackend`: add a small allowlist of
`(method, path-shape)` pairs that are permitted to proceed **without** an access-token cookie,
covering exactly the three now-public endpoints. Every other path/method combination keeps today's
behavior unchanged (missing cookie → synthesized 401, never reaching the backend). When a caller
*does* have a valid or refreshable access token, it continues to be attached as today, for every
path — the allowlist only removes the mandatory-cookie gate, it never suppresses a token that's
present. No change is needed in `packages/caro-service` itself, since it never implemented the
gate; the one-line JSDoc-style comments there documenting the request shape stay accurate as-is.
No new UI, no new Route Handler, no backend change.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), Node.js 20 LTS — unchanged from
`005-auth-proxy-refactor`.

**Primary Dependencies**: Next.js (App Router) `apps/web`; the existing generic proxy
(`apps/web/lib/proxy.ts`, `apps/web/app/api/proxy/[...path]/route.ts`) and session helper
(`apps/web/lib/session.ts`) built in `005-auth-proxy-refactor`. `packages/caro-service`'s existing
typed functions (`matches.ts`, `gameplay.ts`) are consumed as-is, unchanged. No new runtime
dependency.

**Storage**: N/A — no persistence change; this only changes an in-request authorization check.

**Testing**: Vitest, extending the existing `apps/web/lib/proxy.test.ts` suite with cases for the
three allowlisted method/path combinations (with and without a cookie) and a regression case
proving a neighboring authed path (e.g. `matches/:id/join`, `matches/:id` via `DELETE`) still
401s with no cookie.

**Target Platform**: Browser (Client Components calling `packages/caro-service`, still
token-blind) + Node.js server runtime (the existing catch-all proxy Route Handler) — unchanged.

**Project Type**: web — existing `apps/web` app. Touches one existing file
(`apps/web/lib/proxy.ts`); no new package, no new app.

**Performance Goals**: No new targets. The allowlist check is a cheap in-memory match against the
already-parsed path segments and method the proxy handler receives; no added I/O.

**Constraints**: Constitution Principles I–VI apply in full, carried over unchanged from
`005-auth-proxy-refactor`'s own Constitution Check (this feature reuses that feature's proxy
mechanism rather than introducing a new one). Principle VI's text ("the proxy route reads the
access token out of the httpOnly cookie server-side, attaches it as the `Authorization` header on
its own outbound call to the backend") is not violated: when a token exists it is still attached
exactly that way; this feature only changes what happens when no token exists, for three specific
paths. The access token itself is still never exposed to client-side code.

**Scale/Scope**: One function (`forwardToBackend` in `apps/web/lib/proxy.ts`) gains an allowlist
check; one new small pure helper (e.g. `isOptionalAuthRoute(method, pathSegments)`) local to that
same file. `apps/web/lib/proxy.test.ts` gains new cases. No change to
`apps/web/app/api/proxy/[...path]/route.ts` (it already forwards method + path segments verbatim),
no change to `packages/caro-service`, no change to `apps/web/lib/session.ts`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Turborepo Monorepo Structure | **PASS** | No new package/app; one existing file in `apps/web` is edited. |
| II. Next.js App Router with Route Groups | **PASS** | No Route Handler changes; the existing catch-all proxy route is untouched — only the helper it calls (`forwardToBackend`) gains an allowlist branch. |
| III. Atomic Design Component Architecture | **N/A** | No UI component is added or changed. |
| IV. Webapp/API Boundary via Service Interfaces | **PASS** | `packages/caro-service`'s typed functions are unchanged and remain the only way app code calls these three endpoints; this feature changes only the webapp-side authorization gate those calls pass through, not how they're called. |
| V. Progressive Common Code Extraction (Rule of Two) | **PASS** | The new allowlist helper stays local to `apps/web/lib/proxy.ts`; `apps/web` remains the only app, so no promotion to `packages/*` is warranted. |
| VI. Client-Side Auth & Realtime Contract | **PASS (carve-out reaffirmed, unchanged from `005`)** | The access token is still read from the httpOnly cookie and attached server-side only, never exposed to client script. This feature narrows *when the proxy refuses to forward at all* for three specific, now-backend-public paths; it does not change how the token is read, attached, or refreshed. |
| VII. Text-Only Feature & Layout Specifications | **N/A** | No page/screen layout is introduced. |

No Complexity Tracking entry is recorded: no principle is violated or bent beyond what `005`'s own
Constitution Check already established for the shared proxy mechanism.

**Post-Phase 1 re-check**: Re-evaluated against data-model.md, contracts/, and quickstart.md — all
rows above still hold; the design doesn't introduce anything beyond the one allowlist check
described above.

## Project Structure

### Documentation (this feature)

```text
specs/006-caro-guest-access/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
apps/web/
├── lib/
│   ├── proxy.ts          # MODIFIED: forwardToBackend gains an allowlist check +
│   │                     #   isOptionalAuthRoute(method, pathSegments) helper
│   └── proxy.test.ts     # MODIFIED: new cases for the 3 allowlisted routes +
│                         #   a regression case for a neighboring authed route
└── app/api/proxy/[...path]/route.ts   # UNCHANGED — already forwards method + path verbatim

packages/caro-service/
└── src/
    ├── matches.ts        # UNCHANGED — listLobbyMatches, getMatch already call the right paths
    └── gameplay.ts        # UNCHANGED — submitMove already calls the right path
```

**Structure Decision**: Single existing web app (`apps/web`), no new package. The change is
concentrated entirely in the shared proxy helper (`apps/web/lib/proxy.ts`) built by
`005-auth-proxy-refactor`, since that's the one place the webapp-side auth gate lives for every
domain-service package's proxied calls. `packages/caro-service` needs no code change — only its
existing three functions are exercised by the new test cases and the quickstart guide.

## Complexity Tracking

*No entries — no Constitution Check violations.*
