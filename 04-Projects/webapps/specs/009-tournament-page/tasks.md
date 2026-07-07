---

description: "Task list for the Tournament Page feature"
---

# Tasks: Tournament Page

**Input**: Design documents from `/specs/009-tournament-page/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Not explicitly requested in spec.md. Following the ambient repo convention (confirmed in
plan.md's Technical Context — every `apps/web` component from specs 007/008 ships a co-located
`*.test.tsx`), each new/modified web component task includes creating or updating its co-located
test file as part of the same task. `04-Projects/api` has no existing test suite at all
(plan.md/research.md) — no backend test files are added here either, consistent with current
practice.

**Organization**: Tasks are grouped by user story (spec.md's US1–US4, in priority order) to enable
independent implementation and testing of each.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: Which user story this task belongs to (US1–US4); omitted for Setup/Foundational/Polish
- File paths are exact and relative to the repo root

---

## Phase 1: Setup

- [X] T001 Verify local dev prerequisites are in place per quickstart.md's Prerequisites section
  (`04-Projects/api` running against Postgres with existing migrations applied, ≥5 test accounts
  with Elo ≥ a test tournament's `minElo`, one test tournament created via
  `POST /api/caro/tournaments`) — see `specs/009-tournament-page/quickstart.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared data/plumbing every user story below depends on.

**⚠️ CRITICAL**: No user story work should begin until this phase is complete.

- [X] T002 [P] Add the `is_paused` migration: `04-Projects/api/src/database/migrations/175XXXXXXXXXX-CaroTournamentPause.ts`
  (`ALTER TABLE caro_game.tournament_registrations ADD COLUMN is_paused boolean NOT NULL DEFAULT false`)
- [X] T003 [P] Add `isPaused` to the domain and ORM entities:
  `04-Projects/api/src/caro-game/domain/entities/tournament-registration.ts` and
  `04-Projects/api/src/caro-game/infrastructure/persistence/typeorm-entities/tournament-registration.orm-entity.ts`
- [X] T004 [P] Expose `tournamentId` on the Match response:
  `04-Projects/api/src/caro-game/interface/dto/match.dto.ts` (`MatchStateDto` +`tournamentId`) and
  `04-Projects/api/src/caro-game/interface/http/match.controller.ts` (map the existing
  `Match.tournamentId` domain field through to the response)
- [X] T005 [P] Add tournament types to `packages/caro-service/src/types.ts`: `MatchState.tournamentId`,
  `TournamentDetails`, `TournamentStanding`, `StandingsPage` (per data-model.md)
- [X] T006 [P] Add tournament-room presence tracking to
  `04-Projects/api/src/realtime/realtime.gateway.ts`: a `tournamentPresence: Map<string, Set<string>>`
  keyed by room, populated/cleared on `join_room`/`leave_room`/`handleDisconnect` for rooms starting
  with `tournament:` (tracked by authenticated `client.userId`, not username), an emitted
  `caro.tournament.presence-joined` event via the existing `EventEmitter2` on join, and a
  `getPresentPlayerIds(room): string[]` accessor (research.md §2)
- [X] T007 [P] Extend the realtime bridge Route Handler for tournaments:
  `apps/web/app/api/caro/realtime/route.ts` (+`?tournamentId=` query param joining
  `tournament:{tournamentId}`, +`TOURNAMENT_EVENTS` group
  (`tournament:status-changed`/`tournament:match-created`/`tournament:participant-updated`), move
  `match:started` out of the `matchId`-gated set into an always-forwarded one) and
  `apps/web/app/api/caro/realtime/route.test.ts`
- [X] T008 [P] Extend the realtime client hook: `apps/web/lib/useCaroRealtime.ts`
  (`acquireSharedSource(matchId?, tournamentId?)`; `useCaroRealtimeEvent` gains an optional
  `tournamentId` parameter alongside the existing `matchId` one)

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - Watch tournament progress and standings (Priority: P1) 🎯 MVP

**Goal**: A guest-viewable tournament page showing a live countdown (to start, then to end) and a
paginated, score-descending standings list.

**Independent Test**: Open a tournament's page with no active session and confirm the countdown and
standings render correctly (including the pre-start "starts in" state) with no pairing/Pause
controls available to act on (spec.md US1).

- [ ] T009 [US1] Add pagination to the repository port:
  `04-Projects/api/src/caro-game/domain/ports/tournament-registration.repository.port.ts`
  (`findAllByTournament(tournamentId, { page, pageSize }): Promise<{ items, total }>`)
- [ ] T010 [US1] Implement the paginated query in
  `04-Projects/api/src/caro-game/infrastructure/persistence/tournament-registration.typeorm-repository.ts`
  (keep existing `tournament_points DESC, registered_at ASC` ordering; add `COUNT(*)`) (depends on T009)
- [ ] T011 [US1] Thread pagination through
  `04-Projects/api/src/caro-game/application/queries/get-tournament-participant-list.use-case.ts`
  (depends on T010)
- [ ] T012 [US1] Add a `page`/`pageSize` query DTO and wire the participants endpoint:
  `04-Projects/api/src/caro-game/interface/dto/tournament.dto.ts` and
  `04-Projects/api/src/caro-game/interface/http/tournament.controller.ts`
  (`GET /api/caro/tournaments/{tournamentId}/participants` returns
  `{ items, page, pageSize, total }` per contracts/tournament-endpoints-addendum.md) (depends on T011)
- [ ] T013 [P] [US1] Type and paginate the client calls in `packages/caro-service/src/tournaments.ts`
  (`getTournament` returns `TournamentDetails`; `listTournamentParticipants` accepts
  `{ page, pageSize }` and returns `StandingsPage`) and `packages/caro-service/src/tournaments.test.ts`
  (depends on T005, T012)
- [ ] T014 [P] [US1] Create the `TournamentCountdown` molecule (+test):
  `apps/web/components/molecules/TournamentCountdown.tsx`,
  `apps/web/components/molecules/TournamentCountdown.test.tsx` — renders "starts in Ns" before
  `startAt`, "ends in Ns" after it, always driven by the server `startAt`/`endAt` timestamps (never a
  client-computed duration)
- [ ] T015 [P] [US1] Create the `TournamentStandingRow` molecule (+test):
  `apps/web/components/molecules/TournamentStandingRow.tsx`,
  `apps/web/components/molecules/TournamentStandingRow.test.tsx` — rank, username, score, streak,
  pause badge
- [ ] T016 [P] [US1] Create the `Pagination` molecule (+test):
  `apps/web/components/molecules/Pagination.tsx`, `apps/web/components/molecules/Pagination.test.tsx`
  — page-number control (prev/next + current/total page)
- [ ] T017 [US1] Create the `TournamentStandingsList` organism (+test) composing
  `TournamentStandingRow` rows and `Pagination`:
  `apps/web/components/organisms/TournamentStandingsList.tsx`,
  `apps/web/components/organisms/TournamentStandingsList.test.tsx` (depends on T015, T016)
- [ ] T018 [US1] Create the `TournamentTemplate` (+test):
  `apps/web/components/templates/TournamentTemplate.tsx`,
  `apps/web/components/templates/TournamentTemplate.test.tsx` — countdown header, standings list
  below (depends on T014, T017)
- [ ] T019 [US1] Create the `TournamentContainer` organism (+test):
  `apps/web/components/organisms/TournamentContainer.tsx`,
  `apps/web/components/organisms/TournamentContainer.test.tsx` — fetches tournament details +
  standings page via `packages/caro-service`, subscribes to `tournament:status-changed` and
  `tournament:participant-updated` via `useCaroRealtimeEvent(..., tournamentId)` to keep the
  countdown/status and standings live (merging each `participant-updated` delta into standings state
  and re-sorting), renders `TournamentTemplate` (depends on T013, T018, T007, T008)
- [ ] T020 [US1] Wire the route:
  `apps/web/app/(public)/game-caro/tournament/[tournamentId]/page.tsx` (+`page.test.tsx`) — replace
  the "Full detail view coming soon" placeholder with `TournamentContainer` (depends on T019)

**Checkpoint**: User Story 1 fully functional and testable independently.

---

## Phase 4: User Story 2 - Get auto-matched and enter the game (Priority: P2)

**Goal**: A present, unpaused registered participant is automatically paired, navigated to the new
match's gameboard, and the game auto-starts 5 seconds after the gameboard opens.

**Independent Test**: Two registered, unpaused, present participants get paired by the system and
both land on the correct gameboard, which begins play automatically 5 seconds later with no manual
Start click (spec.md US2).

- [ ] T021 [US2] Extend the claim query's signature in
  `04-Projects/api/src/caro-game/domain/ports/tournament-registration.repository.port.ts`
  (`claimTwoIdlePlayers(tournamentId, presentPlayerIds: string[])`) (builds on T009's file)
- [ ] T022 [US2] Implement the presence+pause-filtered `SKIP LOCKED` query in
  `04-Projects/api/src/caro-game/infrastructure/persistence/tournament-registration.typeorm-repository.ts`
  (`AND is_paused = false AND player_id = ANY($presentPlayerIds)`) (depends on T021; builds on T010's
  file)
- [ ] T023 [US2] Update the matchmaking service signature in
  `04-Projects/api/src/caro-game/infrastructure/matchmaking/tournament-matchmaking.service.ts`
  (`pairNextTwo(tournamentId, presentPlayerIds)`) (depends on T022)
- [ ] T024 [US2] Update `04-Projects/api/src/caro-game/application/commands/pair-idle-players.use-case.ts`
  to read present player IDs from the gateway (T006) before calling `pairNextTwo` (depends on T023, T006)
- [ ] T025 [US2] Emit the presence-join event from
  `04-Projects/api/src/realtime/realtime.gateway.ts`'s `handleJoinRoom` for `tournament:` rooms
  (builds on T006's file)
- [ ] T026 [P] [US2] Create the presence-join handler:
  `04-Projects/api/src/caro-game/infrastructure/events/tournament-presence-joined.handler.ts`
  (`@OnEvent('caro.tournament.presence-joined')` → `PairIdlePlayersUseCase.execute`) (depends on T024, T025)
- [ ] T027 [US2] Switch tournament-match creation to the 5s auto-start phase in
  `04-Projects/api/src/caro-game/infrastructure/persistence/match.typeorm-repository.ts`
  (`createTournamentMatch` sets `status: 'auto_starting'`, `deadlineAt: now + 5s`, instead of
  `'in_progress'` immediately)
- [ ] T028 [P] [US2] Create the auto-start transition service:
  `04-Projects/api/src/caro-game/infrastructure/scheduling/tournament-match-auto-start.service.ts`
  — schedules an in-process `setTimeout` at match-creation time; on fire, re-loads the match, and if
  still `auto_starting`, flips it to `in_progress`, sets a fresh per-move `deadlineAt`, saves, and
  pushes `match:started` to `match:{matchId}` (depends on T027)
- [ ] T029 [US2] Add the restart-safety sweep to
  `04-Projects/api/src/caro-game/infrastructure/scheduling/tournament-scheduler.service.ts` (a third
  cron pass transitioning any `auto_starting` match whose `deadlineAt` has already passed) (depends
  on T028)
- [ ] T030 [P] [US2] Create the `TournamentAutoStartCountdown` molecule (+test):
  `apps/web/components/molecules/TournamentAutoStartCountdown.tsx`,
  `apps/web/components/molecules/TournamentAutoStartCountdown.test.tsx` — read-only "Game starts in
  Ns", no Start button, driven by `deadlineAt`
- [ ] T031 [US2] Branch the gameboard's pre-start state on `tournamentId`:
  `apps/web/components/organisms/GameboardSidePanel.tsx`,
  `apps/web/components/organisms/GameboardSidePanel.test.tsx` — view-state 2 renders
  `TournamentAutoStartCountdown` instead of `StartCountdown` when `match.tournamentId` is set
  (depends on T030, T004)
- [ ] T032 [US2] Navigate on pairing:
  `apps/web/components/organisms/TournamentContainer.tsx` — subscribe to `match:started` via
  `useCaroRealtimeEvent(..., tournamentId)` and navigate to `/game-caro/{matchId}` on receipt (depends
  on T019, T007, T008)

**Checkpoint**: User Stories 1 AND 2 both independently functional.

---

## Phase 5: User Story 3 - Return to the tournament and keep playing (Priority: P3)

**Goal**: After a tournament match ends, "Back" returns the player to the tournament page with their
updated standing and restored matchmaking eligibility.

**Independent Test**: Complete a tournament match, click "Back" from the gameboard's ended state, and
confirm the player lands on the tournament page with their standing updated and (if not paused)
eligible for pairing again (spec.md US3).

- [ ] T033 [US3] Enforce the tournament-end scoring cutoff in
  `04-Projects/api/src/caro-game/application/commands/record-tournament-match-result.use-case.ts`
  (skip the `atomicScoreUpdate`/streak update when the tournament has already `ended`/`cancelled`;
  the match is still marked `completedAt` and Elo still updates elsewhere, unconditionally)
- [ ] T034 [P] [US3] Create the `BackToTournamentButton` molecule (+test):
  `apps/web/components/molecules/BackToTournamentButton.tsx`,
  `apps/web/components/molecules/BackToTournamentButton.test.tsx` — links to
  `/game-caro/tournament/{tournamentId}`
- [ ] T035 [US3] Render the Back action on the ended gameboard:
  `apps/web/components/organisms/GameboardSidePanel.tsx`,
  `apps/web/components/organisms/GameboardSidePanel.test.tsx` — view-state 4 renders
  `BackToTournamentButton` alongside the existing `MoveReplayControls` when `match.tournamentId` is
  set (builds on T031's file; depends on T034)

**Checkpoint**: User Stories 1, 2, AND 3 independently functional — US1's live `participant-updated`
subscription (T019) already reflects the returning player's updated score with no further container
change needed.

---

## Phase 6: User Story 4 - Pause your own matchmaking (Priority: P4)

**Goal**: A registered participant can pause/resume their own pairing eligibility, and the pause
persists across page visits.

**Independent Test**: Click Pause, confirm no new pairing occurs while paused (including after
closing and reopening the tournament page), then Resume and confirm eligibility returns (spec.md US4).

- [ ] T036 [US4] Add `setPaused` to the repository port:
  `04-Projects/api/src/caro-game/domain/ports/tournament-registration.repository.port.ts` (builds on
  T021's file)
- [ ] T037 [US4] Implement `setPaused` in
  `04-Projects/api/src/caro-game/infrastructure/persistence/tournament-registration.typeorm-repository.ts`
  (builds on T022's file; depends on T036)
- [ ] T038 [P] [US4] Create the pause use-case:
  `04-Projects/api/src/caro-game/application/commands/set-tournament-pause.use-case.ts` (depends on T037)
- [ ] T039 [US4] Add the pause DTO to
  `04-Projects/api/src/caro-game/interface/dto/tournament-registration.dto.ts`
  (`SetTournamentPauseDto`, +`isPaused` on the registration response shape)
- [ ] T040 [US4] Wire the pause endpoint in
  `04-Projects/api/src/caro-game/interface/http/tournament.controller.ts`
  (`PATCH /api/caro/tournaments/{tournamentId}/registrations/pause` per
  contracts/tournament-endpoints-addendum.md) (builds on T012's file; depends on T038, T039)
- [ ] T041 [P] [US4] Add the client call:
  `packages/caro-service/src/tournaments.ts`, `packages/caro-service/src/tournaments.test.ts`
  (`setTournamentPause`) (builds on T013's file; depends on T040)
- [ ] T042 [P] [US4] Create the `TournamentPauseControl` molecule (+test):
  `apps/web/components/molecules/TournamentPauseControl.tsx`,
  `apps/web/components/molecules/TournamentPauseControl.test.tsx` — Pause/Resume toggle, wraps
  `RequireSignIn`
- [ ] T043 [US4] Wire the pause control into the page:
  `apps/web/components/organisms/TournamentContainer.tsx`,
  `apps/web/components/organisms/TournamentContainer.test.tsx` — renders `TournamentPauseControl` for
  the signed-in participant's own row, calls `setTournamentPause`, reflects the toggled state (builds
  on T019/T032's file; depends on T041, T042)

**Checkpoint**: All four user stories independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T044 [P] Run quickstart.md's 6 validation scenarios end-to-end against a local `04-Projects/api`
  + `apps/web`: `specs/009-tournament-page/quickstart.md`
- [ ] T045 [P] Confirm no regressions in the existing suites (`turbo run test --filter=web`), covering
  specs 007/008's dashboard and gameboard tests alongside this feature's new/modified ones
- [ ] T046 Verify every component touched in T014–T043 uses only the constitution's fixed
  `--color-*` tokens and the classic/vintage visual language (no ad-hoc hex colors)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories.
- **User Stories (Phase 3–6)**: All depend on Foundational completion. US1 has no dependency on
  US2–US4. US2 depends on US1 only for the shared `TournamentContainer` file it extends (T019); it
  does not depend on US1's standings/pagination logic. US3 extends the same `GameboardSidePanel` file
  US2 touches (T031) and assumes US1's live-standings subscription already exists. US4 extends the
  same `TournamentContainer`/repository-port/controller files US1–US3 touch, but is functionally
  independent (pause works whether or not a match is currently in progress).
- **Polish (Phase 7)**: Depends on all four user stories being complete.

### Within Each User Story

- Repository port → repository implementation → use-case → controller/DTO, in that order, wherever
  a backend chain appears (US1, US2, US4).
- Leaf molecules before the organisms/templates that compose them (US1: T014–T016 before T017–T018).
- Story complete before moving to the next priority, if working sequentially.

### Parallel Opportunities

- All Foundational tasks (T002–T008) touch different files and can run in parallel.
- Within US1: T013 (caro-service), T014, T015, T016 (independent molecules) can run in parallel; T017
  onward is sequential.
- Within US2: T026, T028, T030 can run in parallel with each other (different files).
- Within US4: T038, T041, T042 can run in parallel with each other (different files).
- Polish tasks T044/T045 can run in parallel.

---

## Parallel Example: User Story 1

```bash
# After Foundational (Phase 2) completes, launch these together:
Task: "Type and paginate packages/caro-service/src/tournaments.ts (T013)"
Task: "Create TournamentCountdown molecule in apps/web/components/molecules/TournamentCountdown.tsx (T014)"
Task: "Create TournamentStandingRow molecule in apps/web/components/molecules/TournamentStandingRow.tsx (T015)"
Task: "Create Pagination molecule in apps/web/components/molecules/Pagination.tsx (T016)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (blocks everything else)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: quickstart.md Scenarios 1 and 6 against a live tournament
5. Deploy/demo if ready — a read-only tournament page is a legitimate standalone increment

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. Add US1 → validate (quickstart Scenario 1, 6) → demo the read-only page
3. Add US2 → validate (quickstart Scenario 2) → demo live auto-matchmaking
4. Add US3 → validate (quickstart Scenario 4, 5) → demo the full match-and-return loop
5. Add US4 → validate (quickstart Scenario 3) → demo pause/resume
6. Polish (Phase 7)

---

## Notes

- [P] tasks touch different files with no dependency on an incomplete task.
- Several backend files (the repository port, the TypeORM repository, `tournament.controller.ts`,
  `GameboardSidePanel.tsx`, `TournamentContainer.tsx`) are edited incrementally across multiple user
  stories, matching the precedent spec 008 already set for `GameboardSidePanel.tsx`. Each such task
  notes which earlier task's edit it builds on.
- No `[P]` marker is used across edits to the same file, even across different user story phases.
- Commit after each task or logical group; stop at any checkpoint to validate a story independently.
