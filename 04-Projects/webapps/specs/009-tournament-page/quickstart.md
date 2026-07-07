# Quickstart: Tournament Page

Validation scenarios for spec.md's user stories and success criteria. Assumes the standard local
dev setup already used by specs 007/008 (`apps/web` dev server + `04-Projects/api` running against
Postgres with migrations applied, including this feature's new `is_paused` column).

## Prerequisites

1. `04-Projects/api`: run the new migration (`175XXXXXXXXXX-CaroTournamentPause.ts`) alongside the
   existing ones.
2. At least 5 test accounts with Elo ≥ a test tournament's `minElo` (`StartTournamentUseCase`
   cancels tournaments with fewer than 5 registrants — research.md §9).
3. A tournament created with `startAt` a few minutes in the future and `endAt` a few minutes after
   that, via the existing `POST /api/caro/tournaments` (Tournament Creator role).

## Scenario 1 — Pre-start view (US1, FR-001/FR-001a)

1. Register 5 test accounts for the tournament (`POST .../registrations`).
2. Open `/game-caro/tournament/{tournamentId}` before `startAt`, with no session.
3. **Expect**: a "starts in" countdown counting down to `startAt` (not `endAt`), and a standings
   list showing all 5 participants at 0 points. No Pause control (guest). No navigation occurs.

## Scenario 2 — Presence-based auto-matchmaking → gameboard auto-start (US2, FR-006/FR-007/FR-008)

1. Sign in as two of the registered accounts, each in a separate browser/session, both with the
   tournament page open once `startAt` has passed (or wait for the scheduler's 10s cron to flip the
   tournament to `in_progress` and pair-on-start).
2. **Expect**: both browsers navigate to the same match's gameboard automatically (no click), the
   gameboard shows `auto_starting` with a 5s "Game starts in Ns" countdown and no Start button, and
   at 0s the board becomes playable (a move can be submitted) without either player acting.

## Scenario 3 — Pause excludes a player from pairing (US4, FR-004/FR-005/FR-005a)

1. With 4+ present, unpaused, idle registered participants, have one click "Pause."
2. Trigger a pairing pass (e.g. have a match among the others complete, or simply wait for another
   participant to open the page — research.md §3).
3. **Expect**: the paused participant is never selected into a new pairing while paused.
4. Close and reopen that participant's tournament page tab.
5. **Expect**: they are still shown as paused (FR-005a) — no auto-resume on reopen.
6. Click "Resume."
7. **Expect**: they become eligible and are paired on the next pass.

## Scenario 4 — Return to tournament and re-enter the pool (US3, FR-009/FR-010)

1. Complete a tournament match (play to a win/draw, or surrender).
2. On the gameboard's ended state, click "Back to Tournament."
3. **Expect**: navigation to `/game-caro/tournament/{tournamentId}`, the player's standings row
   reflects the match's point award (per FR-014's actual formula, research.md §1), and — if they
   were not paused — they are eligible for pairing again.

## Scenario 5 — Tournament ends mid-match (FR-011/FR-013)

1. Let a tournament's `endAt` pass while a match created just before it is still in progress.
2. **Expect**: the match is allowed to finish normally (not cut short); the tournament page shows the
   ended/final state and creates no further pairings; once the match ends, the winner/loser's global
   Elo updates as usual, but neither participant's tournament score changes (`whitePointsAwarded`/
   `blackPointsAwarded` stay `null` on that `TournamentMatch` row).

## Scenario 6 — Standings pagination and tie-break (US1, FR-002/FR-003)

1. Register 25+ participants (or seed directly) with a mix of equal and distinct scores.
2. Open the tournament page's standings list.
3. **Expect**: 20 rows on page 1 (default `pageSize`), a working page-2 control showing the
   remaining rows continuing from `rank: 21`; among equal scores, the participant who registered
   earlier consistently ranks higher across reloads.

## Success criteria mapping

| Spec success criterion | Validated by |
|---|---|
| SC-001 (countdown + standings visible ≤2s) | Scenario 1, 6 |
| SC-002 (100% of pairings navigate correctly) | Scenario 2 |
| SC-003 (auto-start within 5s, no manual step) | Scenario 2 |
| SC-004 (Back lands on correct tournament + standing) | Scenario 4 |
| SC-005 (paused player never paired; resumes within one cycle) | Scenario 3 |
