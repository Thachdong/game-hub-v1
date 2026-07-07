# Contract Addendum: Proxy Auth Policy — Tournament Read Endpoints

Extends `specs/006-caro-guest-access/contracts/proxy-auth-policy.md`'s `OPTIONAL_AUTH_ROUTES`
matching contract in `apps/web/lib/proxy.ts`'s `forwardToBackend` with three more rows. See that
file for the full matching-rule semantics (method + exact path-segment sequence, `null` = any
single segment).

## New rows

| # | Method | Path segments | Real endpoint | Backend guard today |
|---|---|---|---|---|
| 4 | `GET` | `["caro", "tournaments"]` | `GET /api/caro/tournaments` | None — already public (no `@UseGuards` on `TournamentController_listTournaments`) |
| 5 | `GET` | `["caro", "tournaments", null]` | `GET /api/caro/tournaments/:id` | None — already public |
| 6 | `GET` | `["caro", "tournaments", null, "participants"]` | `GET /api/caro/tournaments/:id/participants` | None — already public |

Unlike `006`'s three rows, no backend guard removal is needed for these three — the backend
already permits anonymous requests. The only thing standing between a guest and this data today
is the webapp's own proxy allowlist, which this addendum closes.

## Explicitly NOT added here (still backend-blocked — research.md §2)

| Method | Path segments | Why not added |
|---|---|---|
| `GET` | `["caro", "leaderboard"]` | Backend itself 401s a guest (`LeaderboardController` is class-level `@UseGuards(JwtAuthGuard)`) — adding this to the webapp allowlist alone would not produce a working guest experience; add only once the backend guard is relaxed, to avoid the allowlist silently doing nothing. |
| `GET` | `["caro", "game-configs"]` | Same reasoning — `GameConfigsController` is guarded on the backend. |

## Explicit non-matches (must remain authed) — new for this addendum

| Method | Path segments | Why it's excluded |
|---|---|---|
| `POST` | `["caro", "tournaments"]` | Create tournament (Tournament Creator only) — different method, same path as row 4; must not be loosened by a method-agnostic match. |
| `POST` | `["caro", "tournaments", id, "registrations"]` | Register for a tournament — requires an identity to register against; extra segment vs. row 5 in any case. |
| `POST`/`GET` | `["caro", "tournaments", id, "chat"]` | Chat is registered-participants-only on the backend (`@UseGuards(JwtAuthGuard)` on both methods) — same segment count as `.../participants` (row 6) but a different final segment, so the exact-match rule already excludes it; called out here to make the adjacency explicit for anyone reviewing the allowlist. |
