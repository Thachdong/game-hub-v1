# Implementation Plan: Caro Game Dashboard

**Branch**: `007-caro-game-dashboard` | **Date**: 2026-07-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-caro-game-dashboard/spec.md`

## Summary

Replace the placeholder Caro list page (`apps/web/app/(public)/game-caro/page.tsx`, currently
"Coming soon") with a real dashboard: three tabs (Lobby, Tournament, Quick Pair) and a persistent
top-10 Elo leaderboard on the right, per spec.md. Every read-only surface (tabs, cards,
leaderboard) is guest-viewable; Join/Create Game/Register/Find Match are shown to every visitor
but redirect a signed-out click to `/login`, reusing the existing `RequireSignIn` molecule and the
app's already-ratified guest-gating convention (spec 002's FR-009) — not a hide-for-guests scheme.
The protected `(protected)/tournament/page.tsx` placeholder is retired in favor of the new
Tournament tab, which is guest-viewable.

`packages/caro-service` already exposes every REST call this feature needs
(`listLobbyMatches`, `getLeaderboard`, `listGameConfigs`, `listTournaments`/`getTournament`/
`listTournamentParticipants`/`registerForTournament`, `createMatch`, `joinMatch`,
`requestQuickPair`) — no new package or service function is added. Two things are genuinely new:
(1) ~10 UI components (atoms/molecules/organisms/template) composing the dashboard, and (2) a
server-side SSE bridge (`apps/web/app/api/caro/realtime/route.ts` + `apps/web/lib/realtime.ts`)
that proxies the backend's existing Socket.IO gateway (`/realtime`) to the browser as
`EventSource` events, since Principle VI forbids browser JS from ever holding the JWT the
gateway's own auth handshake would otherwise require.

Research (research.md §2) surfaced six concrete backend-contract gaps — the leaderboard has no
username/avatar, lobby cards have no creator Elo, no `lobby` broadcast room exists yet, two
read endpoints are guarded server-side for guests, and tournament read shapes are undocumented.
Per explicit user decision, this plan stays webapp-only: each gap is designed around defensively
(fallback UI, ready-but-inert SSE subscription) and tracked as an external dependency, not solved
here.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), Node.js 20 LTS, React 19 — unchanged from the
rest of `apps/web`.

**Primary Dependencies**: Next.js (App Router) `apps/web`; Tailwind CSS (existing, CSS custom
properties per constitution); `packages/caro-service` (existing, unchanged); one new dependency,
`socket.io-client`, added to `apps/web` only (server-side use inside the new Route Handler — never
bundled into client-side code), to speak the backend gateway's protocol.

**Storage**: N/A — no persistence introduced; this feature only reads/writes through existing
backend endpoints.

**Testing**: Vitest + `@testing-library/react`, matching every existing `apps/web`
component/page's co-located `*.test.ts(x)` pattern.

**Target Platform**: Browser (Client Components: tabs, cards, modal, `EventSource` consumer) +
Node.js server runtime (Next.js Route Handlers: `proxy.ts` allowlist additions, new
`api/caro/realtime/route.ts`).

**Project Type**: web — existing `apps/web` app. No new app, no new package (Rule of Two — the
new realtime helper stays local to `apps/web` until a second app needs the same bridge).

**Performance Goals**: No new numeric targets beyond spec.md's SC-003 (join in ≤2 clicks). The SSE
connection is a single long-lived stream per open dashboard tab, not polling — no added request
volume proportional to time.

**Constraints**: Constitution Principles I–VII apply in full (see Constitution Check below).
Principle VI is the binding one for the new realtime piece: the JWT is read from the httpOnly
cookie only inside the server-side Route Handler and is never sent to or held by browser JS — the
browser only opens a same-origin `EventSource`, never a direct `socket.io-client` connection to
the backend (research.md §1).

**Scale/Scope**: One existing placeholder page rewritten, one existing protected placeholder route
removed, one existing lib file (`proxy.ts`) gains three allowlist entries, two new lib/route files
(realtime bridge), ~10 new components across atoms/molecules/organisms/templates composed into one
new template. See Project Structure below for the full file list.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Turborepo Monorepo Structure | **PASS** | No new app/package; `apps/web` gains one new dependency (`socket.io-client`) in its own `package.json`. |
| II. Next.js App Router with Route Groups | **PASS** | Dashboard lives in `(public)/game-caro/page.tsx` — the already-correct guest-viewable group. `(protected)/tournament/page.tsx` is removed since Tournament is now a tab of the public dashboard, not a separate protected route. Page/component files only compose UI and call `packages/caro-service` functions or the new SSE Route Handler; no business logic or direct `fetch` in route segment files. |
| III. Atomic Design Component Architecture | **PASS** | Reuses `atoms/Avatar`, `atoms/Button`, `atoms/NavLink`, `molecules/EmptyState`, `molecules/RequireSignIn` before adding anything new. New atoms (`Badge`), molecules (`Tabs`, `Modal`, card components), organisms (panels, `CreateGameModal`), and one template — each layer depends only on layers below it. |
| IV. Webapp/API Boundary via Service Interfaces | **PASS** | Every REST call goes through existing `packages/caro-service` functions, unchanged. The new SSE Route Handler is itself the service-interface boundary for realtime data — Client Components consume it only via `EventSource`, never call the backend's Socket.IO gateway directly. |
| V. Progressive Common Code Extraction (Rule of Two) | **PASS** | `Tabs`, `Modal`, `Badge`, and the realtime helper are added locally to `apps/web` — the only app in the workspace today — not placed under `packages/*` preemptively. |
| VI. Client-Side Auth & Realtime Contract | **PASS** | Live updates are consumed through the API's realtime transport via a service-interface-shaped boundary (the new Route Handler), per the mandate. The access token is read from the httpOnly cookie only inside that server-side handler (same pattern as `forwardToBackend`) and is never exposed to, held by, or forwarded from browser JS — the browser only opens a same-origin `EventSource`. See research.md §1 for why this shape was chosen over a direct client-side socket connection. |
| VII. Text-Only Feature & Layout Specifications | **PASS** | This plan is derived entirely from spec.md's prose (tab list, card fields, "leaderboard on the right" placement); no design file is used as input. |

No Complexity Tracking entry is required — every row above is a PASS, not a justified deviation.
The six backend-contract gaps found during research (research.md §2) are external dependencies on
a different project (`04-Projects/api`), not violations of this webapp's own constitution, and are
tracked there rather than here.

**Post-Phase 1 re-check**: Re-evaluated against data-model.md, contracts/, and quickstart.md — all
rows above still hold. The realtime bridge design (research.md §1, contracts/realtime-bridge.md)
was the one design decision requiring real scrutiny against Principle VI, and it resolves cleanly
in favor of a server-side proxy rather than any client-held-token shape.

## Project Structure

### Documentation (this feature)

```text
specs/007-caro-game-dashboard/
├── plan.md                                   # This file (/speckit-plan command output)
├── research.md                               # Phase 0 output (/speckit-plan command)
├── data-model.md                             # Phase 1 output (/speckit-plan command)
├── quickstart.md                             # Phase 1 output (/speckit-plan command)
├── contracts/                                # Phase 1 output (/speckit-plan command)
│   ├── proxy-auth-policy-addendum.md
│   └── realtime-bridge.md
└── tasks.md                                  # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
apps/web/
├── app/
│   ├── (public)/
│   │   └── game-caro/
│   │       ├── page.tsx                      # MODIFIED: real dashboard (was "Coming soon")
│   │       └── page.test.tsx                 # NEW
│   ├── (protected)/
│   │   └── tournament/                       # REMOVED — superseded by the Tournament tab
│   └── api/
│       └── caro/
│           └── realtime/
│               ├── route.ts                  # NEW: SSE bridge to backend /realtime gateway
│               └── route.test.ts             # NEW
├── components/
│   ├── atoms/
│   │   ├── Badge.tsx                         # NEW: rank highlight / "You" badge
│   │   └── Badge.test.tsx                    # NEW
│   ├── molecules/
│   │   ├── Tabs.tsx                          # NEW
│   │   ├── Modal.tsx                         # NEW
│   │   ├── LeaderboardEntryRow.tsx           # NEW
│   │   ├── LobbyMatchCard.tsx                # NEW
│   │   ├── TournamentCard.tsx                # NEW
│   │   ├── QuickPairCard.tsx                 # NEW
│   │   ├── RequireSignIn.tsx                 # UNCHANGED — reused as-is
│   │   └── *.test.tsx                        # NEW, one per new molecule above
│   ├── organisms/
│   │   ├── LeaderboardPanel.tsx              # NEW
│   │   ├── LobbyPanel.tsx                    # NEW
│   │   ├── TournamentPanel.tsx               # NEW
│   │   ├── QuickPairPanel.tsx                # NEW
│   │   ├── CreateGameModal.tsx               # NEW
│   │   └── *.test.tsx                        # NEW, one per organism above
│   └── templates/
│       ├── GameDashboardTemplate.tsx          # NEW — tabs + panels left/center, Leaderboard right
│       └── GameDashboardTemplate.test.tsx     # NEW
└── lib/
    ├── proxy.ts                              # MODIFIED: +3 OPTIONAL_AUTH_ROUTES entries (tournaments read paths)
    ├── proxy.test.ts                         # MODIFIED
    ├── realtime.ts                           # NEW: server-side socket.io-client → SSE bridge helper
    └── realtime.test.ts                      # NEW

packages/caro-service/                        # UNCHANGED — listLobbyMatches, getLeaderboard,
                                               #   listGameConfigs, listTournaments, getTournament,
                                               #   listTournamentParticipants, registerForTournament,
                                               #   createMatch, joinMatch, requestQuickPair already
                                               #   cover every REST call this feature needs.
```

**Structure Decision**: Single existing web app (`apps/web`), no new package. The dashboard
replaces the existing placeholder in the already-correct `(public)` route group; the
`(protected)/tournament` placeholder is removed rather than left to drift as a second, divergent
"Tournament" surface. New UI is organized strictly by Atomic Design layer (Principle III), and the
one genuinely new architectural piece — the realtime bridge — is isolated to two files
(`lib/realtime.ts` + the Route Handler) that own 100% of the Principle VI-sensitive token handling,
keeping every other new file (all UI components) free of any auth/token concern.

## Complexity Tracking

*No entries — no Constitution Check violations.*
