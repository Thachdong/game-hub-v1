# Implementation Plan: Auth Service Interface Audit & Proxy Route Refactor

**Branch**: `feature/webapps/dongt/account-page` | **Date**: 2026-07-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-auth-proxy-refactor/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Close the one part of constitution v3.1.0 Principle VI that `003-cookie-auth-migration`
deliberately deferred: a generic, reusable **proxy route** mechanism for browser-initiated calls
to authenticated backend resources. `003` built the login/session/logout plumbing but explicitly
left "a future proxy route for tournament/admin/Caro actions" as unfinished work. The audit for
this feature also found `apps/web/README.md`, the root `README.md`'s "Wiring session state"
example, and `apps/web/.env.local.example` still documenting the **pre-003, NextAuth-era pattern**
— a `NEXT_PUBLIC_GAME_HUB_API_BASE_URL` env var explicitly documented as "must be reachable from
the browser," and a `useSession()`-based Client Component example — none of which exists in code
anymore, but which still describes the exact client-held-token anti-pattern the current
constitution forbids.

**Revised during `/speckit-clarify`**: the proxy mechanism is a single **generic, catch-all** Route
Handler (`app/api/proxy/[...path]/route.ts`) that reads the `access_token` cookie, attaches it as
`Authorization: Bearer` on its own outbound `fetch` to the backend, transparently refreshes and
retries once on a 401, and relays the backend's response verbatim — rather than one hand-written
Route Handler per backend resource. Client Components keep calling the four domain-service
packages' existing typed functions (Principle IV) exactly as they do today; the only change for
client-side usage is pointing a package's `configure*Service({ baseURL: "/api/proxy",
getAccessToken: () => null })` at this same-origin proxy prefix instead of the real backend origin
— no per-resource server-side wiring is needed, and no per-package server-side "ensure configured"
helper is required for this mechanism (research.md §4–§6, §8 reconciles this with Principle II/IV).

This plan (1) builds the catch-all proxy route plus a small `lib/proxy.ts` forwarding helper that
reuses `003`'s existing `refreshSession()` unchanged, (2) removes the client-callable
`NEXT_PUBLIC_GAME_HUB_API_BASE_URL` default from all four packages' `http-client.ts` in favor of
the existing server-only `BACKEND_URL` (still needed regardless of route shape — the SSR account
page path relies on the same default today), and (3) rewrites the stale documentation to describe
the actual, current mechanism, including the client-side "point at `/api/proxy`" wiring pattern.
No backend change, no new UI. `apps/web/lib/session.ts` (the SSR `getSessionStatus`/
`ensureAccountServiceConfigured`/`refreshSession` mechanism from `003`) is untouched — the proxy
route reuses `refreshSession()` from it but adds nothing to it.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), Node.js 20 LTS — unchanged from
`003-cookie-auth-migration`.

**Primary Dependencies**: Next.js (App Router), the existing workspace packages
`@game-hub/account-service`, `@game-hub/profiles-service`, `@game-hub/admin-service`,
`@game-hub/caro-service`, `@game-hub/service-core` (all consumed via `workspace:*`; no version or
dependency changes). No new runtime dependency is introduced.

**Storage**: N/A — unchanged from `003`. No database, no server-side session store; the two
httpOnly cookies remain the sole session artifact.

**Testing**: Vitest + React Testing Library, unchanged (no ratified project-level testing
principle yet — `TODO(TESTING_PRINCIPLE)`).

**Target Platform**: Browser (Client Components, still token-blind) + Node.js server runtime
(Route Handlers) — unchanged. This feature specifically proves out the catch-all-Route-Handler-as-
proxy path for the first time with a real, live call site.

**Project Type**: web — existing `apps/web` app; existing `packages/*` domain-service packages
(one-line default-value edit each, no structural change).

**Performance Goals**: No new targets beyond spec.md's SC-002 (transparent renewal through the
proxy path, zero visible interruption) — this reuses `003`'s already-proven refresh/dedup
mechanism unchanged.

**Constraints**: Constitution Principles I–VI apply in full. Principle VI is the direct driver,
and its own text is what authorizes the shape chosen here: "The proxy route reads the access token
out of the httpOnly cookie server-side, attaches it as the `Authorization` header on **its own
outbound call to the backend**, and returns the backend's response to the client." That is a raw,
generic forwarding call by design — see research.md §8 for why this one Route Handler doing a raw
`fetch` does not violate Principle II/IV's general "route handlers/components must call the
service-interface layer, never `fetch` directly" rule: Principle VI is the more specific rule
governing exactly this mechanism, and Principle IV remains fully enforced for all other code
(every page and every other Route Handler, plus every Client Component, which still calls the
domain-service packages' typed functions — now just pointed at the proxy prefix — never `fetch`
directly). Principle V (Rule of Two) keeps all new code inside `apps/web`.

**Scale/Scope**: Touches all four domain-service packages' `http-client.ts` (one-line default
change each), a new `apps/web/lib/proxy.ts` (forwarding helper, reuses `lib/session.ts`'s existing
`refreshSession()`/`ACCESS_COOKIE_NAME` unchanged), one new catch-all Route Handler
(`app/api/proxy/[...path]/route.ts`), and three documentation files (`README.md`,
`apps/web/README.md`, `apps/web/.env.local.example`). `apps/web/lib/session.ts` itself is not
modified. No page content or route-group structure changes.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Turborepo Monorepo Structure | **PASS** | No new package; the four existing domain packages get a one-line default-value edit each. `apps/web` continues consuming them via `workspace:*`. |
| II. Next.js App Router with Route Groups | **PASS (specific carve-out, research.md §8)** | The catch-all Route Handler lives under the existing `app/api/` tree (not a page route group). Its body does perform a raw `fetch` to the backend — the one exception in this codebase to "route handlers must only call the service-interface layer" — because Principle VI's own text specifically describes and requires exactly this behavior for the proxy route. No other Route Handler or page in `apps/web` does this. |
| III. Atomic Design Component Architecture | **N/A** | No UI component is added or changed by this feature. |
| IV. Webapp/API Boundary via Service Interfaces | **PASS (specific carve-out, research.md §8)** | Every Client Component still calls the domain-service packages' typed functions exclusively (never `fetch` directly) — this feature changes *where* those packages point (`baseURL: "/api/proxy"` instead of the real backend), not *how* app code calls them. The one raw `fetch` in the whole feature lives inside the generic proxy infrastructure itself (`lib/proxy.ts`), which Principle VI specifically authorizes — it is not business logic and not app/page code. |
| V. Progressive Common Code Extraction (Rule of Two) | **PASS** | `lib/proxy.ts` stays local to `apps/web`; `apps/web` remains the only app, so no promotion to `packages/*` is warranted (unchanged from `003`'s research.md §6 reasoning). |
| VI. Client-Side Auth & Realtime Contract | **PASS** | This feature directly implements the previously-deferred "proxy route" clause using the exact shape Principle VI's own text describes: the access token is read from the httpOnly cookie server-side, attached as `Authorization: Bearer` on the proxy's own outbound call, and never returned to or read by client-side script (research.md §4). Refresh-on-expiry reuses `003`'s existing single-flight `refreshSession()` unchanged (research.md §4). No countdown/deadline UI or polling is introduced. |
| VII. Text-Only Feature & Layout Specifications | **N/A** | No page/screen layout is introduced. |

No Complexity Tracking entry is recorded: the II/IV rows above are resolved by Principle VI being
the more specific, controlling rule for this one piece of auth-proxy infrastructure (research.md
§8), not by an unjustified deviation from the general rule.

**Post-Phase 1 re-check**: Re-evaluated against data-model.md, contracts/, and quickstart.md — all
rows above still hold. One design point worth flagging: the account page's Server Component
continues to call `getCurrentAccount()` directly via `003`'s `ensureAccountServiceConfigured()`
(FR-007) — it is not re-routed through `/api/proxy/**`. The catch-all route exists for
browser-initiated calls only; SSR data-fetching is unaffected and unchanged.

## Project Structure

### Documentation (this feature)

```text
specs/005-auth-proxy-refactor/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── proxy-routes.md
├── checklists/
│   └── requirements.md
└── tasks.md              # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
apps/
└── web/
    ├── README.md                             # MODIFIED: remove NextAuth/useSession()-era
    │                                          #   content (research.md §2); document the actual
    │                                          #   cookie + catch-all proxy-route mechanism,
    │                                          #   including the client-side "point a package at
    │                                          #   /api/proxy" wiring pattern (research.md §5)
    ├── .env.local.example                     # MODIFIED: drop NEXT_PUBLIC_GAME_HUB_API_BASE_URL,
    │                                          #   BACKEND_URL becomes the single backend-origin var
    ├── app/
    │   └── api/
    │       └── proxy/
    │           └── [...path]/
    │               └── route.ts               # NEW: GET/POST/PUT/PATCH/DELETE — catch-all proxy
    │                                          #   (research.md §4), thin wrapper over lib/proxy.ts
    └── lib/
        └── proxy.ts                           # NEW: forwardToBackend() — reads access_token
                                                #   cookie, attaches Bearer, forwards to
                                                #   BACKEND_URL, retries once via the existing
                                                #   refreshSession() on a 401, relays the response
                                                #   (research.md §4). lib/session.ts is unchanged.

packages/
├── account-service/src/http-client.ts        # MODIFIED: defaultBaseUrl() reads BACKEND_URL
├── profiles-service/src/http-client.ts       # MODIFIED: same one-line change
├── admin-service/src/http-client.ts          # MODIFIED: same one-line change
└── caro-service/src/http-client.ts           # MODIFIED: same one-line change

README.md                                      # MODIFIED: "Wiring session state" example updated to
                                                #   show both the server-side (SSR) and client-side
                                                #   (proxy-pointed) wiring patterns (research.md §2)
```

**Structure Decision**: Single existing app (`apps/web`) plus a one-line edit in each of the four
existing `packages/*` domain packages; no new app or package. This mirrors `003`'s precedent of
keeping all mechanism code local to `apps/web` (Principle V, Rule of Two) while the four
domain-service packages themselves only get the minimal default-value correction the audit
surfaced. `apps/web/lib/session.ts` — the SSR mechanism from `003` — is not touched; the new
catch-all proxy is additive, browser-call-only infrastructure that happens to reuse one function
(`refreshSession()`) from it.

## Complexity Tracking

*No violations — table omitted.*
