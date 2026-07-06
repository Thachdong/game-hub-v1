# Implementation Plan: Games List & Account Profile Pages

**Branch**: `feature/webapps/dongt/account-page` | **Date**: 2026-07-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-games-list-account-page/spec.md`

## Summary

Build two pages in `apps/web`: a public Games List page (currently mapped to the site's still-empty
root route, `/`) that renders one Game Card — banner + name — per game in the catalog and links
each to that game's own existing entry page; and the previously-placeholder Account page
(`app/(protected)/account/page.tsx`) that renders the signed-in account's username/email/avatar
plus a "Profiles" section showing either an empty-state message or one Game Card per game the
account has played, each linking to that game's profile destination. Both pages are pure UI
composition over the **already-built** `@game-hub/account-service` package's `getCurrentAccount()`
and `listGames()` (the latter's `Game.hasProfile` flag is exactly the signal the Account page
filters on) — no backend or shared-package change is required. The one open design question Phase
0 resolves is how a card's navigation target (game entry route vs. per-game profile route) is
derived from a `Game` record, since routes don't follow a 1:1 slug mapping today (see research.md).

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), Node.js 20 LTS — unchanged from
`003-cookie-auth-migration`.

**Primary Dependencies**: Next.js (App Router), `@game-hub/account-service` (already exposes
`Account`, `Game { id, name, slug, hasProfile? }`, `getCurrentAccount()`, `listGames()` —
consumed via `workspace:*`, no changes needed to this package), Tailwind CSS, `lucide-react`.
No new dependency is added.

**Storage**: N/A — both pages read through the existing service-interface layer; no new
persistence.

**Testing**: Vitest + React Testing Library, unchanged from `003-cookie-auth-migration` (no
ratified project-level testing principle yet — `TODO(TESTING_PRINCIPLE)`).

**Target Platform**: Browser (Server Components for data fetch + a Client Component only where
`next/link` navigation and per-card interaction require it) + Node.js server runtime — unchanged.

**Project Type**: web — single existing app (`apps/web`); no new app or package (Principle V).

**Performance Goals**: No new targets beyond spec.md's SC-001/SC-002 (single-click navigation from
either list to its destination).

**Constraints**: Constitution Principles I–VII apply in full. Principle II (route segment files
compose UI and call the service layer only) governs both new/changed `page.tsx` files. Principle
III (Atomic Design) governs the new `GameCard`/`GameGrid`/`EmptyState` components and their
layering. Principle IV means both pages call `@game-hub/account-service` directly (already
wired for cookie-sourced auth per `003`'s `lib/session.ts` pattern) — no inline `fetch`. Principle
VI means the Games List page's data fetch must not require a signed-in visitor (`listGames()`
called with a possibly-absent access token) and the Account page continues to rely on the existing
`(protected)` layout's redirect-if-signed-out gate. Principle VII means this plan's data-model.md
and the spec's own Layout subsections are the binding source for component shape — no design file.

**Scale/Scope**: Touches `apps/web/app/(public)/page.tsx` (new — currently 404s),
`apps/web/app/(protected)/account/page.tsx` (replaces placeholder), `apps/web/lib/session.ts`
(export the existing private account-service-configuration helper so both new pages can reuse it
instead of duplicating it), a new `apps/web/lib/game-routes.ts` helper (research.md §1), and new
local components under `apps/web/components/{atoms,molecules,organisms}/`. No `packages/*` changes
beyond the additive `Game.bannerUrl` field (research.md §4).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Turborepo Monorepo Structure | **PASS** | No new package; `apps/web` continues consuming `@game-hub/account-service` via `workspace:*`. |
| II. Next.js App Router with Route Groups | **PASS** | Games List page lives in the existing `(public)` group (its root `page.tsx`, filling today's empty `/`); Account page stays in `(protected)`. Both `page.tsx` files only compose UI and call `@game-hub/account-service` — no inline HTTP calls or business logic. |
| III. Atomic Design Component Architecture | **PASS** | New `GameCard` (molecule, composes a banner `<img>` + name text, mirroring the existing `Avatar` atom's plain-`<img>` pattern — research.md §3), `GameGrid` (organism, wraps a responsive grid of `GameCard`s, reused by both pages per spec's Assumptions), and `EmptyState` (molecule, reused for both "no games" and "no profile yet" text). No higher-layer-into-lower-layer imports. |
| IV. Webapp/API Boundary via Service Interfaces | **PASS** | Both pages call `getCurrentAccount()`/`listGames()` from `@game-hub/account-service`; no new HTTP contract needed since the package already returns everything both pages require (data-model.md). |
| V. Progressive Common Code Extraction (Rule of Two) | **PASS** | `GameCard`/`GameGrid`/`EmptyState` are new local `apps/web` components reused across two pages *within the same app* — this is ordinary componentization, not premature package extraction; only one app exists, so no promotion question arises. |
| VI. Client-Side Auth & Realtime Contract | **PASS** | Games List page fetches with whatever access token is present (or none) — no forced sign-in. Account page continues to rely on `(protected)/layout.tsx`'s existing server-side redirect gate (unchanged from `003`). No new token exposure to client-side code; no polling or realtime concern in this feature. |
| VII. Text-Only Feature & Layout Specifications | **PASS** | spec.md's per-story "Layout" subsections are the binding textual layout description; this plan and data-model.md derive component structure from that text only — no design file exists or is referenced. |

No violations requiring a Complexity Tracking entry.

**Post-Phase 1 re-check**: Re-evaluated against data-model.md, research.md, and quickstart.md — all
seven rows above still hold. Two design decisions worth flagging explicitly: (1) research.md §4
adds one new field (`bannerUrl`) to `@game-hub/account-service`'s existing `Game` type — this is
an additive change to an already-shared contract per Principle IV, not a new package or a
component reaching around the service layer; (2) research.md §1's `/game-${slug}` route
convention is a webapp-local decision (a small `lib/game-routes.ts` helper), not a backend
contract, so it carries no Principle I/IV risk and can be revisited without any cross-package
coordination if a future game's real route breaks the pattern.

## Project Structure

### Documentation (this feature)

```text
specs/004-games-list-account-page/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md         # Phase 1 output (/speckit-plan command)
└── tasks.md              # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

No `contracts/` directory: this feature adds no new Route Handler / backend-facing HTTP contract
— it is pure UI composition over `@game-hub/account-service`'s existing, unchanged contract.

### Source Code (repository root)

```text
apps/web/
├── app/
│   ├── (public)/
│   │   ├── page.tsx                    # NEW — Games List page (root route "/")
│   │   ├── layout.tsx                  # unchanged
│   │   ├── game-caro/                  # unchanged — one of this feature's link destinations
│   │   └── login/                      # unchanged
│   └── (protected)/
│       └── account/
│           └── page.tsx                # MODIFIED — replaces "Coming soon." placeholder
├── components/
│   ├── atoms/                          # unchanged (Avatar, Button, ErrorMessage, NavLink)
│   ├── molecules/
│   │   ├── GameCard.tsx                # NEW — banner + name, clickable, links to its destination
│   │   └── EmptyState.tsx              # NEW — reused by both pages' empty-state text
│   └── organisms/
│       ├── GameGrid.tsx                # NEW — responsive grid of GameCard, reused by both pages
│       └── AppNav.tsx                  # unchanged
├── lib/
│   ├── game-routes.ts                  # NEW — getGameLinkTarget(game): derives entryPath/
│   │                                    #   profilePath from Game.slug (research.md §1)
│   └── session.ts                      # MODIFIED — export the account-service cookie-config
│                                        #   helper so both new pages can reuse it (no duplication)
└── (tests colocated as *.test.tsx next to each new/changed file, per existing convention)
```

**Structure Decision**: Single existing app (`apps/web`), Next.js App Router with the two existing
route groups. No new app, package, or route group. This mirrors `002-login-layout-nextauth` and
`003-cookie-auth-migration`'s structure exactly — only new page/component files inside the same
tree.

## Complexity Tracking

*No entries — Constitution Check has no violations.*
