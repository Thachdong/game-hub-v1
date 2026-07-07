# Data Model: Tournament Page

## Tournament

Existing entity (`04-Projects/api/src/caro-game/domain/entities/tournament.ts`), unchanged by this
feature.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | |
| `status` | `'waiting' \| 'in_progress' \| 'ended' \| 'cancelled'` | Drives FR-001/FR-001a's countdown target (start vs. end) and FR-011/FR-013's pairing/scoring cutoff. |
| `startAt` / `endAt` | Date | Scheduled bounds; the countdown shown by FR-001 targets `startAt` before it passes, then `endAt`. |
| `startedAt` / `endedAt` | Date \| null | Set by `StartTournamentUseCase`/`EndTournamentUseCase`. |
| `minElo`, `gameConfigId`, `creatorPlayerId` | — | Unchanged, not used by this feature's UI beyond display. |

**State transitions** (unchanged, enforced by existing scheduler/use-cases):
`waiting → in_progress` (scheduler, or cancelled if `< MIN_PLAYERS=5`) → `in_progress → ended`
(scheduler, on `endAt`).

## TournamentRegistration (MODIFIED: +`isPaused`)

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | |
| `tournamentId`, `playerId` | UUID | |
| `eloAtRegistration` | int | Display-only on this page. |
| `tournamentPoints` | int | The standings list's "score" (FR-002/FR-014). |
| `winStreak` | int | Consecutive-win counter feeding FR-014's doubling/bonus. |
| `status` | `'idle' \| 'in_match'` | Unchanged. |
| **`isPaused`** | **boolean, default `false`** | **NEW.** Set via the pause endpoint (FR-004/FR-005a). Persists independent of presence — a paused participant who closes and reopens the page is still paused (FR-005a). |
| `registeredAt` | Date | Tie-break key (FR-002): standings order is `tournamentPoints DESC, registeredAt ASC`. |

**Eligibility for pairing** (`TournamentMatchmakingService.pairNextTwo`, per research.md §2):
`status = 'idle' AND isPaused = false AND playerId ∈ presentPlayerIds(tournament room)`.

**Migration**: `ALTER TABLE caro_game.tournament_registrations ADD COLUMN is_paused boolean NOT NULL
DEFAULT false;`

## TournamentStanding (view, not a stored entity)

The shape returned by the standings endpoint and rendered by `TournamentStandingsList` — one row per
`TournamentRegistration`, joined with player display info:

| Field | Type | Source |
|---|---|---|
| `rank` | int | 1-indexed position within the full (unpaginated) ordering. |
| `registrationId`, `playerId` | UUID | |
| `username` | string | Player profile lookup (existing pattern elsewhere in this codebase). |
| `tournamentPoints` | int | = score, sorted descending. |
| `winStreak` | int | Displayed alongside score. |
| `isPaused` | boolean | Renders the pause badge (FR-004). |
| `status` | `'idle' \| 'in_match'` | Not shown directly, but `in_match` participants are visually distinguishable from `idle` ones if useful. |

**Pagination envelope**: `{ items: TournamentStanding[], page: number, pageSize: number, total: number }`
(research.md §5).

## TournamentMatch (unchanged)

Links a `Match` to the two `TournamentRegistration`s that produced it, and records points awarded.
No field changes; `whitePointsAwarded`/`blackPointsAwarded` stay `null` for a match completed after
tournament end (FR-013 — scoring skipped, but the match itself is still marked `completedAt`).

## Match (MODIFIED: +`tournamentId` exposed, +`auto_starting` status)

| Field | Type | Notes |
|---|---|---|
| `tournamentId` | string \| null | **Already existed** on the domain entity; **newly exposed** on `MatchStateDto`/`packages/caro-service`'s `MatchState` (research.md §8). `null` for non-tournament matches — every existing FR/behavior from spec 008 is unaffected. |
| `status` | adds `'auto_starting'` | **NEW value**, tournament-match-only. Sequence: `auto_starting` (5s, no moves accepted) → `in_progress` (per-move deadline as normal) → `completed`/`cancelled` — same terminal states spec 008 already handles. |
| `deadlineAt` | Date \| null | While `auto_starting`, holds the 5s auto-start deadline (FR-008); once flipped to `in_progress`, holds the normal per-move deadline exactly as spec 008 describes. Always server-authoritative (constitution Principle VI) — the client never computes it locally. |

**`GameboardViewState` mapping** (`apps/web/components/organisms/GameboardSidePanel.tsx`,
`deriveViewState`): `'auto_starting'` maps to view-state **2** (same numeric state spec 008 already
uses for "opponent present, not yet playable"), but the state-2 branch now renders
`TournamentAutoStartCountdown` (read-only, no Start button) instead of `StartCountdown` whenever
`match.tournamentId` is non-null. Non-tournament matches (`tournamentId === null`) keep spec 008's
existing `waiting_for_start`/`StartCountdown` behavior unchanged.

View-state **4** (`completed`/`cancelled`) additionally renders `BackToTournamentButton` (linking to
`/game-caro/tournament/{tournamentId}`) whenever `match.tournamentId` is non-null (FR-009); spec
008's existing `MoveReplayControls` is unaffected and still renders alongside it.

## Realtime event contract (additions)

| Event | Room / delivery | Payload | Emitted by (existing, unless noted) |
|---|---|---|---|
| `tournament:status-changed` | `tournament:{id}` room | `{ tournamentId, status }` | `StartTournamentUseCase`, `EndTournamentUseCase` |
| `tournament:match-created` | `tournament:{id}` room | `{ tournamentId, matchId }` | `PairIdlePlayersUseCase` |
| `tournament:participant-updated` | `tournament:{id}` room | `{ tournamentId, playerId, tournamentPoints?, winStreak?, action? }` | `RecordTournamentMatchResultUseCase`, `RegisterForTournamentUseCase` |
| `match:started` | per-user (`pushToUser`) | `{ matchId, tournamentId }` | `PairIdlePlayersUseCase` (existing); now also forwarded by the web bridge even with no `matchId` query param (research.md §6) — this is what triggers FR-007's auto-navigation |
| `caro.tournament.presence-joined` | internal `EventEmitter2` only (not pushed to clients) | `{ tournamentId, playerId }` | **NEW** — `RealtimeGateway.handleJoinRoom` (research.md §2/§3) |

No new client-facing event names beyond what already exists — the web bridge simply starts
forwarding three that were already being emitted server-side but never subscribed to (research.md
§6).
