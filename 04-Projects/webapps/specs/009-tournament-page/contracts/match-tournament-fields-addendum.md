# Contract Addendum: Match — Tournament Fields

Addendum to spec 008's gameboard contracts. Two additions to the existing `GET
/api/caro/matches/{id}` response (`MatchStateDto`) and `packages/caro-service`'s `MatchState` type —
every other field is unchanged.

## `tournamentId: string | null` (NEW field)

Sourced from the `Match` domain entity's existing `tournamentId` column (already populated by
`createTournamentMatch`; already `null` for every non-tournament match). Purely additive — no
existing consumer of `MatchState` is affected; `GameboardSidePanel` is the only new reader
(research.md §8, data-model.md's `GameboardViewState` mapping).

## `status` gains `'auto_starting'` (NEW value, tournament matches only)

```text
Before (spec 008, still true for non-tournament matches):
  looking_for_opponent → waiting_for_start → in_progress → completed | cancelled

Tournament matches (this feature):
  auto_starting → in_progress → completed | cancelled
```

A tournament match is created directly in `auto_starting` (never passes through
`looking_for_opponent`/`waiting_for_start` — both players are already assigned at creation time by
the matchmaking pairing, per the existing `TournamentMatchmakingService`). `deadlineAt` holds the 5s
auto-start deadline while `auto_starting`, then the normal per-move deadline once flipped to
`in_progress` (research.md §4). `GameboardSidePanel.deriveViewState('auto_starting')` returns `2`,
the same numeric state `'waiting_for_start'` already maps to — the two statuses share a view-state
slot but render different components based on `tournamentId` (data-model.md).

## Example: tournament match state response

```jsonc
{
  "id": "match-uuid",
  "boardSize": "18x18",
  "moveTimeSeconds": 30,
  "status": "auto_starting",
  "tournamentId": "tournament-uuid",
  "deadlineAt": "2026-07-07T10:00:05.000Z",
  "playerX": { "id": "...", "username": "...", "elo": 1200, "winRate": 0.5 },
  "playerO": { "id": "...", "username": "...", "elo": 1180, "winRate": 0.4 },
  "currentTurnPlayerId": "playerX-id",
  "moves": [],
  "viewers": [],
  "pendingDrawRequestFromId": null,
  "result": null,
  "winnerPlayerId": null,
  "startedAt": "2026-07-07T10:00:00.000Z",
  "endedAt": null,
  "createdAt": "2026-07-07T10:00:00.000Z"
}
```
