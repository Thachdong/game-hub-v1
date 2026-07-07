# Phase 1 Data Model: Caro Game Dashboard

Webapp-side view models for the dashboard, built from `packages/caro-service`'s existing exported
types (unchanged by this feature) plus the fields still pending a backend change (see
`research.md` §2). Each "pending backend" field is marked with the row number of its dependency
in that table.

## GameConfig ("Game Type")

Already exported as `GameConfig` from `packages/caro-service` — used as-is, no new type needed.

| Field | Type | Notes |
|---|---|---|
| id | string | Passed as `configId` to `createMatch` / `requestQuickPair`. |
| boardSize | `"18x18" \| "25x25" \| "40x40"` | Rendered directly, e.g. "18×18". |
| moveTimeSeconds | `5\|10\|15\|25\|35\|45\|60` | Per-move timer; rendered as e.g. "15s/move". |

Display label: `${boardSize} · ${moveTimeSeconds}s/move` — used identically on Lobby cards,
Tournament cards, and Quick Pair cards (spec.md's "Game Type" entity, FR-019).

## LeaderboardEntryView

Built from `LeaderboardEntry` (`rank`, `playerId`, `elo`, `matchesPlayed`, `wins`, `losses`,
`draws`, `winRate` — all already present).

| Field | Type | Source |
|---|---|---|
| rank | number | `LeaderboardEntry.rank` |
| playerId | string | `LeaderboardEntry.playerId` |
| elo | number | `LeaderboardEntry.elo` |
| username | string \| null | **Pending backend (research.md §2 row 1)**. `null` today — UI falls back to `Player {playerId.slice(0, 6)}`. |
| avatarUrl | string \| null | **Pending backend (research.md §2 row 1)**. `null` today — UI falls back to a generic placeholder avatar (existing `Avatar` atom already accepts any `src`). |
| isSelf | boolean | Computed client-side: `playerId === currentAccount.id` (via `useAuthSession()`); always `false` for a guest viewer. |
| highlight | `"1st" \| "2nd" \| "3rd" \| null` | Computed from `rank` (1/2/3), not backend data. |

Fetched via `getLeaderboard()` (unchanged). **Pending backend (research.md §2 row 2)**: this call
currently 401s for a guest; until the guard is relaxed, the webapp's Lobby/Tournament/Quick Pair
tabs still render for guests, but the Leaderboard panel renders its guest-safe empty/loading
fallback rather than data for a signed-out visitor.

## LobbyMatchCardView

Built from `LobbyMatch` (`id`, `boardSize`, `moveTimeSeconds`, `status`, `creatorUsername`,
`secondPlayerUsername`, `createdAt` — all already present; note `creatorUsername` is already a
display username, not an email, so no client-side email-parsing step is needed here).

| Field | Type | Source |
|---|---|---|
| id | string | `LobbyMatch.id` |
| creatorUsername | string | `LobbyMatch.creatorUsername` |
| creatorElo | number \| null | **Pending backend (research.md §2 row 3)**. `null` today — UI omits the Elo badge rather than showing a wrong/zero value. |
| gameType | string | Formatted from `LobbyMatch.boardSize` + `LobbyMatch.moveTimeSeconds` per the shared label above. |
| status | string | `LobbyMatch.status` |

Fetched via `listLobbyMatches()` (unchanged, already guest-accessible per `006`). Updated live via
the SSE bridge (research.md §1) once the backend adds the `lobby:updated` broadcast
(research.md §2 row 5); until then, the list reflects whatever was current at page load /
last client-triggered refetch (e.g. right after the viewer's own Create/Join action, per SC-004,
which doesn't depend on the backend broadcast).

## TournamentCardView

Backend response shape for tournament reads is unconfirmed (research.md §2 row 6) — this view
model is the target shape; the actual fetch/mapping in `packages/caro-service`'s `tournaments.ts`
(currently `unknown`/`unknown[]`) needs re-verifying against a live backend response before this
is finalized, per that file's own existing comment.

| Field | Type | Source |
|---|---|---|
| id | string | Tournament response (verify) |
| title | string | **Pending backend (research.md §2 row 6)** — if absent, synthesized client-side as `` `${gameType} Tournament · min Elo ${minElo}` `` |
| gameType | string | Derived from the tournament's `gameConfigId` → `GameConfig` lookup (via `listGameConfigs()`), same shared label as above |
| startAt | string (ISO datetime) | Tournament response (verify) |
| registeredCount | number | Tournament response (verify) — surfaced today via `listTournamentParticipants({tournamentId}).length` if not present directly on the list/detail response |
| status | `"waiting" \| "in_progress" \| "ended" \| "cancelled"` | Tournament response (verify) |

Fetched via `listTournaments()` / `getTournament({tournamentId})` (both already public on the
backend; blocked only by the webapp's own proxy allowlist today — research.md §4).

## QuickPairOptionView

One card per active `GameConfig` (from `listGameConfigs()`), reusing the same shared "Game Type"
label. **Pending backend (research.md §2 row 4)**: `listGameConfigs()` currently 401s for a guest;
until relaxed, the Quick Pair tab renders its guest-safe empty/loading fallback for a signed-out
visitor rather than the real list.

| Field | Type | Source |
|---|---|---|
| configId | string | `GameConfig.id` |
| gameType | string | Shared label (board size + move time) |

Matching action calls `requestQuickPair({ configId })`. If the response's `status` is `"matched"`,
`matchId` is already present and the player is routed straight to the match view. If `"waiting"`,
the UI waits for a `quick_pair:matched` event over the same SSE bridge (research.md §1), which
already fires today per-user from the backend's `quick-pair.use-case.ts` (`pushToUser(...,
'quick_pair:matched', ...)`) — no backend change needed for this one, only the webapp-side SSE
bridge itself.

## CreateGameSubmission

Modal input, mapped directly to `createMatch`'s existing input shape — no new backend field
needed.

| Field | Type | Notes |
|---|---|---|
| configId | string | Selected from the same `GameConfig` list as Quick Pair (`listGameConfigs()`) |
| visibility | `"public" \| "private"` | Passed straight through to `createMatch({ configId, visibility })` |

On success, the new match (from `createMatch`'s response) is optimistically prepended to the
Lobby list client-side (satisfies SC-004's "no page reload" without depending on the pending
`lobby:updated` broadcast).

## Realtime event contract (webapp ↔ SSE bridge)

Events the SSE Route Handler (`apps/web/app/api/caro/realtime/route.ts`) forwards to the browser,
each as one SSE message (`event: <name>`, `data: <JSON>`):

| Event | Payload | Backend origin | Status |
|---|---|---|---|
| `lobby:updated` | `{ matchId: string; action: "created"\|"joined"\|"filled"\|"cancelled" }` | Proposed — not yet emitted by the backend (research.md §2 row 5) | **Pending backend** |
| `quick_pair:matched` | `{ matchId: string }` (per `QuickPairResult`-adjacent shape) | Already emitted today via `pushToUser` in `quick-pair.use-case.ts` | **Available now** |

The bridge subscribes to both regardless of current backend support; `lobby:updated` simply never
fires until the backend ships it, at which point the Lobby panel starts updating live with no
further webapp change.
