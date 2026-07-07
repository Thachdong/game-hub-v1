# Phase 0 Research: Caro Game Dashboard

This feature builds entirely on an already-substantial backend and service layer
(`packages/caro-service`), not a greenfield API. Research here is grounded in the live contract
(`04-Projects/api/openapi.yml` and its NestJS controller source), not assumptions — several
findings below correct assumptions made in earlier drafts of `spec.md`.

## 1. Realtime transport for live Lobby updates (FR-020)

- **Decision**: A server-side SSE bridge. A new Route Handler
  (`apps/web/app/api/caro/realtime/route.ts`) opens a `socket.io-client` connection to the
  backend's existing gateway (`RealtimeGateway`, path `/realtime`), reading the access token out
  of the httpOnly cookie server-side (same helper `apps/web/lib/session.ts` already uses) and
  passing it as `auth.token` on the socket handshake — or omitting it entirely for a guest
  request, which the gateway already accepts as a read-only `observer` connection
  (`handleConnection`'s no-token branch). The Route Handler re-streams matching events to the
  browser as `text/event-stream`; the browser only ever opens a same-origin `EventSource` to this
  route, via a thin client hook (`useLobbyRealtime` or similar) — never a direct `socket.io-client`
  connection to the backend.
- **Rationale**: Constitution Principle VI mandates that live features consume the API's
  WebSocket/SSE transport through the service-interface layer, and separately mandates that the
  access token is **never** read, held, or forwarded by client-side JS. The backend's gateway
  authenticates via `handshake.auth.token` — a shape that requires the caller to possess the raw
  JWT. Connecting directly from the browser would mean browser JS holding the token, which
  Principle VI forbids outright. Proxying server-side (this decision) is the only shape that
  satisfies both rules at once: the token stays server-side, and the browser still gets push
  updates, over SSE instead of raw WebSocket.
- **Alternatives considered**:
  - *Client-side `socket.io-client` directly to the backend* — rejected outright: requires
    exposing the JWT to browser JS (Principle VI violation), and requires a second unauthenticated
    "observer" code path just for guests, doubling client-side complexity for no benefit over the
    proxy approach.
  - *Polling `listLobbyMatches` on an interval* — rejected: Principle VI explicitly bans polling
    as a substitute for realtime transport on matchmaking/game-state features, and the
    clarification session (see spec.md `## Clarifications`) explicitly chose live updates over
    manual refresh.
  - *WebSocket end-to-end via a Next.js custom server* — rejected: Next.js App Router Route
    Handlers on the deployment target here don't keep a persistent WebSocket upgrade open the way
    a custom server would; SSE (a plain streamed HTTP response) works within a standard Route
    Handler with no extra infrastructure.

## 2. Backend dependencies (blocking — out of scope for this webapp-only feature)

Per user decision, this plan covers only `apps/web` + `packages/caro-service`. The following gaps
are real, verified against `04-Projects/api`'s source (not just possibly-stale OpenAPI docs), and
need a corresponding change in that project before the affected requirement is fully deliverable.
Each is designed around defensively in the webapp (see data-model.md's "pending backend" notes)
so the dashboard still renders something reasonable today, and starts working fully the moment
the backend ships the change — no further webapp change needed.

| # | Gap | Evidence | Affects | Requested backend change |
|---|---|---|---|---|
| 1 | `LeaderboardEntryDto` has no `username`/`avatarUrl` — only `playerId`, `elo`, win/loss stats. No account-lookup-by-id endpoint exists anywhere to resolve one. | `openapi.yml` `LeaderboardEntryDto` schema; grep of `account-service`/`profiles-service` finds no by-id lookup. | FR-002, FR-003 (leaderboard avatar + username) | Add `username`/`avatarUrl` directly to `LeaderboardEntryDto`, mirroring how `LobbyMatchDto` already embeds `creatorUsername` rather than a raw ID. |
| 2 | `GET /api/caro/leaderboard` requires a JWT (`@UseGuards(JwtAuthGuard)` class-level on `LeaderboardController`) — guests get 401. | `leaderboard.controller.ts` line 11. | FR-001, FR-002 (leaderboard viewable by guests) | Remove/relax the guard, following the same pattern already applied to lobby/match/moves in `006-caro-guest-access`. |
| 3 | `LobbyMatchDto` has no `elo` field for the creator. | `openapi.yml` `LobbyMatchDto` schema; `LobbyMatch` type in `packages/caro-service`. | FR-006 (Lobby card shows creator Elo) | Add `creatorElo` (and ideally `secondPlayerElo`) to `LobbyMatchDto`. |
| 4 | `GET /api/caro/game-configs` requires a JWT (`@UseGuards(JwtAuthGuard)` on `GameConfigsController`) — guests get 401, so Quick Pair's board-size/time-control cards can't be listed for a guest. | `game-configs.controller.ts` lines 11, 16. | FR-014 (Quick Pair cards viewable by every visitor) | Remove/relax the guard on this one read endpoint (list-only; admin CRUD stays guarded). |
| 5 | No `lobby` room/broadcast exists on the realtime gateway; `create-match`/`join-match`/etc. use-cases never push to one. Only per-match (`match:{id}`) and per-user rooms exist. | `realtime.gateway.ts`; grep of all `pushToRoom`/`pushToUser` call sites in `04-Projects/api/src`. | FR-020, SC-006 (live Lobby updates) | Add a `lobby` room; broadcast an event (proposed: `lobby:updated`, payload `{ matchId, action: "created" \| "joined" \| "filled" \| "cancelled" }`) from `create-match`, `join-match`, and `cancel-match` use-cases. |
| 6 | Tournament read-endpoint (`GET /api/caro/tournaments`, `/{id}`, `/{id}/participants`) response bodies are completely undocumented in the OpenAPI contract (`description: ''`, no schema) — pre-existing gap, not introduced by this feature (already noted in `packages/caro-service/src/tournaments.ts`'s comments). In particular it's unconfirmed whether a tournament has a `title`/name field at all — `CreateTournamentDto` (the write side) has only `gameConfigId`, `minElo`, `startAt`, `endAt`, no title. | `openapi.yml` tournament path block; `tournaments.ts` header comment. | FR-011 (Tournament card shows a title) | Document the actual response shape; if no title field exists, either add one or confirm the card should synthesize a label instead (e.g. "`{boardSize} Tournament · min Elo {minElo}`"). |

Rows 2 and 4 are small, mechanical follow-ups to `006-caro-guest-access`'s existing pattern
(removing a guard on a read endpoint) and are the cheapest to request. Rows 1, 3, 5, and 6 need
an actual schema/behavior addition.

## 3. Elo scope, game type, and guest-gating pattern

These three were resolved via `/speckit-clarify` and a plan-time correction; recorded here for
traceability, full detail in `spec.md`'s `## Clarifications`:

- **Elo is a single global value** — matches `PlayerProfileResponseDto`/`LeaderboardEntryDto`
  already having one `elo` field, not per-board-size. No change needed to align backend and spec.
- **"Game type" = a `GameConfig`** (`id`, `boardSize`, `moveTimeSeconds`) — this already exists on
  the backend (`GET /api/caro/game-configs`) and is exactly what `createMatch`/`requestQuickPair`
  take as `configId`. Real `boardSize` values are `"18x18" | "25x25" | "40x40"`; real
  `moveTimeSeconds` values are `5 | 10 | 15 | 25 | 35 | 45 | 60` (a per-move timer, not a
  "Rapid/Blitz" preset name) — display these values directly (e.g. "18×18 · 15s/move") rather than
  inventing preset names like the illustrative "Rapid 10min" example in spec.md, which was
  illustrative only.
- **Guest gating**: Join/Create Game/Register/Find Match are shown to every visitor; clicking with
  no active session redirects to `/login`, reusing the existing `RequireSignIn` molecule
  (`apps/web/components/molecules/RequireSignIn.tsx`) already used for match-view actions
  (`JoinMatchButton`, `MatchActionButtons`) — no new gating mechanism is built.

## 4. Proxy allowlist: what's fixable in the webapp alone vs. blocked on the backend

`apps/web/lib/proxy.ts`'s `forwardToBackend` synthesizes its own 401 for any path not in
`OPTIONAL_AUTH_ROUTES`, **regardless of whether the backend itself would allow the request** —
this is a webapp-side gate layered in front of the backend's own guard. That means:

- `GET /api/caro/tournaments`, `GET /api/caro/tournaments/{id}`, and
  `GET /api/caro/tournaments/{id}/participants` are **already public on the backend** (confirmed:
  no `@UseGuards` on those three controller methods) but are currently blocked by the webapp's own
  proxy allowlist. Adding these three to `OPTIONAL_AUTH_ROUTES` is a pure webapp fix, fully
  deliverable in this feature, no backend change needed.
- `GET /api/caro/leaderboard` and `GET /api/caro/game-configs` are guarded **on the backend
  itself** (see §2 rows 2 and 4). Adding them to the webapp's allowlist is necessary but not
  sufficient — the backend will still 401 a guest request until its own guard is relaxed. Add the
  allowlist entries anyway (so the webapp side is ready the moment the backend ships), but the
  guest-facing behavior for these two stays blocked until then.

## 5. Tournament route consolidation

`apps/web/app/(protected)/tournament/page.tsx` is a "Coming soon" placeholder gated behind
sign-in. Since Tournament is now a guest-viewable tab of the `/game-caro` dashboard (FR-011,
FR-012), this plan retires that placeholder route rather than maintaining two divergent
"Tournament" surfaces — one protected-and-empty, one public-and-real. No spec change needed; this
is a structural decision internal to the plan.

## 6. Component reuse (Atomic Design, Principle III)

Existing components this feature reuses as-is: `atoms/Avatar`, `atoms/Button`, `atoms/NavLink`,
`molecules/EmptyState`, `molecules/RequireSignIn`. Nothing here is duplicated. Net-new (nothing
equivalent exists yet): a `Badge` atom (rank highlight / "You" badge), `Tabs` and `Modal`
molecules, and feature-specific cards/panels — full breakdown in Project Structure (`plan.md`).

## 7. Testing approach

Vitest + `@testing-library/react`, matching every existing `apps/web` component/page (co-located
`*.test.ts(x)`, e.g. `(protected)/account/page.test.tsx`). The SSE Route Handler is tested the
same way `proxy.test.ts` tests `forwardToBackend` — by mocking the underlying `socket.io-client`
connection rather than requiring a live backend or a live socket.

## 8. Scale/Scope note

No new `apps/*` or `packages/*` is created. One existing placeholder page is replaced with real
content; one existing protected placeholder route is retired; one existing lib file
(`proxy.ts`) gains three allowlist entries; one new lib file (`realtime.ts`) and one new Route
Handler are added; ~10 new components are added across atoms/molecules/organisms/templates,
composed into one new template used by the dashboard page.
