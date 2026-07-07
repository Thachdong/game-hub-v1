# Phase 1 Data Model: Caro Match Gameboard Page

Webapp-side view models built from `packages/caro-service`'s existing exported types (`MatchState`,
`CaroPlayerInMatch`, `CaroMove`, `ChatMessage` — all unchanged by this feature) plus one derived
field per view model computed client-side. See research.md for the two backend gaps referenced
below.

## GameboardViewState

The top-level state driving which of the four right-column layouts renders. Derived entirely from
`MatchState.status` — no new backend field.

| `MatchState.status` | Gameboard state (spec.md) |
|---|---|
| `looking_for_opponent` | 1 — no opponent yet |
| `waiting_for_start` | 2 — opponent present, not started |
| `in_progress` | 3 — game started |
| `completed` \| `cancelled` | 4 — game ended |

## OwnPlayerCardView / OpponentPlayerCardView

Built from `MatchState.playerX` / `MatchState.playerO` (type `CaroPlayerInMatch`: `id`, `username`,
`elo`, `winRate`).

| Field | Type | Source |
|---|---|---|
| id | string | `playerX.id` / `playerO.id` |
| username | string | `playerX.username` — **falls back to `Player {id.slice(0,6)}`** when the value equals the raw `id` (research.md §3 row 1: backend hasn't resolved a real username yet) |
| elo | number \| null | `playerX.elo` — **omitted (badge hidden) when `0`**, since `0` currently can't be distinguished from "not populated" (research.md §3 row 1) |
| isSelf | boolean | Computed client-side: `id === useAuthSession().account?.id`; always `false` for a guest |
| isCurrentTurn | boolean | `id === MatchState.currentTurnPlayerId` |
| isCreator | boolean | `id === MatchState.creatorId` — drives whether *this* card's owner sees an enabled Start control in state 2 |

`OwnPlayerCardView` is whichever of `playerX`/`playerO` has `isSelf === true`; the other is
`OpponentPlayerCardView`. For a guest or a signed-in spectator, neither card is "own" — both render
as read-only `OpponentPlayerCardView`-shaped cards (no self-highlighting).

## WaitingForOpponentPlaceholder

No fields — a static placeholder rendered in place of `OpponentPlayerCardView` when
`MatchState.playerO` (or whichever slot is empty) is `null`.

## ViewerListView / ViewerEntry

Not sourced from `GET /caro/matches/:id` (research.md §3 row 2 — that endpoint always returns
`viewers: []`). Built and maintained entirely client-side from realtime events after this viewer's
own `join_room` call:

| Field | Type | Source |
|---|---|---|
| id | string | `match:viewer_joined` / `match:viewer_left` payload's `viewerId` — needed to call `muteMatchViewer({ matchId, viewerId })`, which requires a UUID (research.md §6) |
| username | string | `match:viewer_joined` / `match:viewer_left` payload's `viewerUsername` |
| canBeMuted | boolean | Computed client-side: `true` when the current viewer `isSelf`-participant (own or opponent card's `isSelf`/`isCreator`-independent — either match participant), `false` for guests and spectators |

Initial state on page load: empty list, populated only as `match:viewer_joined` events arrive after
this tab's own connection — see research.md §3 row 2 for the known limitation this implies for a
viewer who joins after others are already present.

## PreStartCountdownView

| Field | Type | Source |
|---|---|---|
| deadlineAt | ISO datetime | `MatchState.deadlineAt` (server-authoritative; constitution Principle VI — never computed from the client clock) |
| canStart | boolean | Computed client-side: `true` only when the viewer `isSelf` on the card where `isCreator === true` |

## InGameActionsView

No new fields — presence of "Request Draw"/"Surrender" is simply `status === 'in_progress'` plus
`isSelf` on one of the two participant cards. `MatchState.pendingDrawRequestFromId` (already
present) drives whether the viewer instead sees "respond to draw request" (accept/decline) in
place of "Request Draw," when it's set to the *other* participant's id.

## MoveReplayView

| Field | Type | Source |
|---|---|---|
| moves | `CaroMove[]` | `MatchState.moves`, unchanged, already ordered by `sequenceNumber` |
| replayIndex | number | Client-side UI state only, `0..moves.length` |

## ChatMessageView

Built from `ChatMessage` (`id`, `matchId`, `senderId`, `content`, `sentAt` — all already present).

| Field | Type | Source |
|---|---|---|
| id / matchId / content / sentAt | as-is | `ChatMessage` |
| senderUsername | string | Resolved via the matching participant card (`playerX`/`playerO`) if `senderId` matches one of them, else falls back to the viewer-list entry's username, else a shortened id |
| isOwnMessage | boolean | `senderId === useAuthSession().account?.id` |

Fetched via `listMatchChat({ matchId })` (unchanged) — now guest-accessible per research.md §5.
Live-appended via the `match:chat` realtime event (research.md §1).

## Realtime event contract (this feature's additions)

All under room `match:{matchId}`, forwarded verbatim by the extended SSE bridge
(contracts/realtime-bridge-addendum.md):

| Event | Payload | Drives |
|---|---|---|
| `match:player_joined` | `{ matchId, joinerId, playerXId, playerOId, deadlineAt }` | Transition 1→2, populate Opponent card, start countdown |
| `match:started` | `{ matchId, currentTurnPlayerId, deadlineAt }` | Transition 2→3 |
| `match:move_placed` | `CaroMove` shape | Append to `moves`, redraw board |
| `match:turn_changed` | `{ matchId, currentTurnPlayerId, deadlineAt }` | Update turn indicator + per-move deadline |
| `match:draw_requested` | `{ matchId, fromPlayerId }` | Show accept/decline to the other participant |
| `match:draw_declined` | `{ matchId }` | Clear pending draw request |
| `match:ended` | `{ matchId, result, winnerPlayerId, reason }` | Transition →4 |
| `match:cancelled` | `{ matchId, reason }` | Transition →4 (no winner) |
| `match:chat` | `ChatMessage` shape | Append to chat history |
| `match:viewer_joined` / `match:viewer_left` | `{ matchId, viewerId, viewerUsername }` | Add/remove `ViewerEntry` |
