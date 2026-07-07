---

description: "Task list for Caro Game Dashboard"
---

# Tasks: Caro Game Dashboard

**Input**: Design documents from `/specs/007-caro-game-dashboard/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/proxy-auth-policy-addendum.md](contracts/proxy-auth-policy-addendum.md), [contracts/realtime-bridge.md](contracts/realtime-bridge.md), [quickstart.md](quickstart.md)

**Tests**: Included — every new file in plan.md's Project Structure has a co-located `*.test.ts(x)`,
matching this codebase's established convention (every existing component/page/lib file in
`apps/web` has one), so test tasks are part of the plan, not optional filler.

**Organization**: Tasks are grouped by user story (from spec.md, in priority order P1→P3). Setup
and Foundational phases build the shared dashboard shell, the realtime bridge, and the two
webapp-only proxy fixes — all needed before any story's panel can render real content.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US5)
- File paths are exact, relative to the repo root

---

## Phase 1: Setup

**Purpose**: Add the one new dependency this feature needs before any code references it

- [X] T001 Add `socket.io-client` as a dependency of `apps/web` (server-side use only, inside the new Route Handler — research.md §1) in `apps/web/package.json`, then install

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the dashboard shell, the realtime bridge, and the two proxy-side fixes every
user story below renders inside of or depends on

**⚠️ CRITICAL**: No user story task can begin until this phase is complete

- [X] T002 [P] Remove the placeholder route `apps/web/app/(protected)/tournament/page.tsx` (and its directory if now empty) — Tournament becomes a tab of the public dashboard (plan.md Structure Decision, research.md §5)
- [X] T003 [P] In `apps/web/lib/proxy.ts`, add the three new `OPTIONAL_AUTH_ROUTES` entries for `GET caro/tournaments`, `GET caro/tournaments/{id}`, and `GET caro/tournaments/{id}/participants` (contracts/proxy-auth-policy-addendum.md rows 4–6)
- [X] T004 [P] Add tests in `apps/web/lib/proxy.test.ts` for the three new allowlisted paths (no cookie → forwarded, not synthesized-401) plus a regression case for `POST caro/tournaments/{id}/registrations` with no cookie still 401ing (contracts/proxy-auth-policy-addendum.md)
- [X] T005 [P] Create the shared game-type label helper `formatGameType(boardSize, moveTimeSeconds)` (e.g. `"18x18" , 15` → `"18×18 · 15s/move"`) in `apps/web/lib/gameType.ts`, used by Lobby, Tournament, and Quick Pair cards (data-model.md "GameConfig")
- [X] T006 [P] Add tests for `formatGameType` in `apps/web/lib/gameType.test.ts` covering all three `BoardSize` values and a sample of `MoveTimeSeconds` values
- [X] T007 [P] Create the `Tabs` molecule (`Lobby` / `Tournament` / `Quick Pair`, controlled active-tab state) in `apps/web/components/molecules/Tabs.tsx`
- [X] T008 [P] Add a test for `Tabs` in `apps/web/components/molecules/Tabs.test.tsx` covering tab switching and the active-tab indicator
- [X] T009 Create `GameDashboardTemplate` in `apps/web/components/templates/GameDashboardTemplate.tsx` — composes `Tabs` (left/center) with a right-side slot for the leaderboard panel, per spec.md's "leaderboard on the right" layout (depends on T007)
- [X] T010 [P] Add a test for `GameDashboardTemplate` in `apps/web/components/templates/GameDashboardTemplate.test.tsx` confirming the tab content and leaderboard slot both render
- [X] T011 Create the server-side realtime helper in `apps/web/lib/realtime.ts`: opens a `socket.io-client` connection to the backend's `/realtime` gateway, passing the caller's access token (from the httpOnly cookie, read the same way `apps/web/lib/proxy.ts` does) as `auth.token` when present, omitting it for a guest request (contracts/realtime-bridge.md)
- [X] T012 [P] Add tests for `apps/web/lib/realtime.ts` in `apps/web/lib/realtime.test.ts`, mocking `socket.io-client` for both the authenticated and guest (no-token) connection paths
- [X] T013 Create the SSE Route Handler `apps/web/app/api/caro/realtime/route.ts` using T011's helper, subscribing to `lobby:updated` and `quick_pair:matched` and re-streaming each as a `text/event-stream` message (contracts/realtime-bridge.md, data-model.md "Realtime event contract") (depends on T011)
- [X] T014 [P] Add a test for the Route Handler in `apps/web/app/api/caro/realtime/route.test.ts`: mock the underlying socket connection, emit both event types on it, and assert the response stream contains correctly formatted `event: <name>` / `data: <json>` messages (quickstart.md "Realtime bridge")
- [X] T015 Create the client-side hook `useCaroRealtimeEvent(eventName, handler)` in `apps/web/lib/useCaroRealtime.ts`, wrapping the native `EventSource` against `/api/caro/realtime` (contracts/realtime-bridge.md "Client usage") — no `socket.io-client` in the browser bundle
- [X] T016 [P] Add a test for the hook in `apps/web/lib/useCaroRealtime.test.ts` using a mocked `EventSource`
- [X] T017 Replace the placeholder content of `apps/web/app/(public)/game-caro/page.tsx` with `GameDashboardTemplate` wired to (still-empty) Lobby/Tournament/Quick Pair tab slots and a (still-empty) leaderboard slot, removing the old `JoinMatchButton` placeholder usage (depends on T009)

**Checkpoint**: Foundation ready — the dashboard shell renders with three switchable tabs and a
leaderboard slot, the realtime bridge is wired end-to-end (even though `lobby:updated` won't fire
until the backend ships it — research.md §2 row 5), and Tournament read paths are no longer
blocked by the webapp's own proxy. Each user story below fills in real panel content.

---

## Phase 3: User Story 1 - Browse the game dashboard without an account (Priority: P1) 🎯 MVP

**Goal**: Any visitor — guest or signed-in — sees real Lobby, Tournament, and Quick Pair content
plus the leaderboard, with gated actions visible but redirecting a guest to `/login` on click.

**Independent Test**: Load `/game-caro` with no active session; confirm all three tabs render real
cards from the backend and the leaderboard renders its top-10 entries (or its documented guest-safe
fallback per research.md §2 row 2), and that Join/Create Game/Register/Find Match are visible and
redirect to `/login` when clicked.

- [X] T018 [P] [US1] Create the `Badge` atom (rank highlight variants `1st`/`2nd`/`3rd`, and a
  "You" variant) in `apps/web/components/atoms/Badge.tsx`
- [X] T019 [P] [US1] Add a test for `Badge` in `apps/web/components/atoms/Badge.test.tsx`
- [X] T020 [P] [US1] Create `LeaderboardEntryRow` in `apps/web/components/molecules/LeaderboardEntryRow.tsx` — `Avatar` (fallback placeholder per data-model.md), display name (fallback `Player {id.slice(0,6)}` per data-model.md pending row 1), Elo, rank `Badge` for top 3, "You" `Badge` when `isSelf`
- [X] T021 [P] [US1] Add a test for `LeaderboardEntryRow` in `apps/web/components/molecules/LeaderboardEntryRow.test.tsx` covering the fallback-name/avatar case and the top-3/"You" badge cases
- [X] T022 [US1] Create `LeaderboardPanel` organism in `apps/web/components/organisms/LeaderboardPanel.tsx`: calls `getLeaderboard()`, maps to `LeaderboardEntryView[]` (data-model.md), computes `isSelf` via `useAuthSession()`, renders up to 10 `LeaderboardEntryRow`s or a guest-safe empty/loading state when the call 401s (research.md §2 row 2) (depends on T020)
- [X] T023 [P] [US1] Add a test for `LeaderboardPanel` in `apps/web/components/organisms/LeaderboardPanel.test.tsx` covering populated, empty (<10 entries per Edge Cases), and guest-401-fallback cases
- [X] T024 [P] [US1] Create `LobbyMatchCard` in `apps/web/components/molecules/LobbyMatchCard.tsx` — creator username, Elo (or omitted per data-model.md pending row 3), `formatGameType` label, a "View" link (`/game-caro/{id}`, no gating), and a "Join" button wrapped in `RequireSignIn` (placeholder `onAction` for now — wired in US2)
- [X] T025 [P] [US1] Add a test for `LobbyMatchCard` in `apps/web/components/molecules/LobbyMatchCard.test.tsx` covering the Elo-present and Elo-omitted cases, and that "Join" redirects to login when signed out
- [X] T026 [US1] Create `LobbyPanel` organism in `apps/web/components/organisms/LobbyPanel.tsx`: calls `listLobbyMatches()`, renders a `LobbyMatchCard` per match or `EmptyState`, and subscribes to `lobby:updated` via T015's hook to merge live changes into local state (depends on T024)
- [X] T027 [P] [US1] Add a test for `LobbyPanel` in `apps/web/components/organisms/LobbyPanel.test.tsx` covering populated list, empty state, and a mocked `lobby:updated` event updating the rendered list
- [X] T028 [P] [US1] Create `TournamentCard` in `apps/web/components/molecules/TournamentCard.tsx` — title (synthesized fallback per data-model.md pending row 6 if absent), `formatGameType` label, start time, registered-participant count, a "View" link, and a "Register" button wrapped in `RequireSignIn` (placeholder `onAction` for now — wired in US4)
- [X] T029 [P] [US1] Add a test for `TournamentCard` in `apps/web/components/molecules/TournamentCard.test.tsx` covering the title-fallback case and "Register" redirecting to login when signed out
- [X] T030 [US1] Create `TournamentPanel` organism in `apps/web/components/organisms/TournamentPanel.tsx`: calls `listTournaments()` (and `listGameConfigs()` to resolve each tournament's `gameConfigId` to a display label), renders a `TournamentCard` per tournament or `EmptyState` (depends on T028)
- [X] T031 [P] [US1] Add a test for `TournamentPanel` in `apps/web/components/organisms/TournamentPanel.test.tsx` covering populated list and empty state
- [X] T032 [P] [US1] Create `QuickPairCard` in `apps/web/components/molecules/QuickPairCard.tsx` — `formatGameType` label and a "Find Match" button wrapped in `RequireSignIn` (placeholder `onAction` for now — wired in US5)
- [X] T033 [P] [US1] Add a test for `QuickPairCard` in `apps/web/components/molecules/QuickPairCard.test.tsx` covering "Find Match" redirecting to login when signed out
- [X] T034 [US1] Create `QuickPairPanel` organism in `apps/web/components/organisms/QuickPairPanel.tsx`: calls `listGameConfigs()`, renders a `QuickPairCard` per config or the guest-safe empty/loading fallback when the call 401s (research.md §2 row 4) (depends on T032)
- [X] T035 [P] [US1] Add a test for `QuickPairPanel` in `apps/web/components/organisms/QuickPairPanel.test.tsx` covering populated list, empty state, and guest-401-fallback
- [X] T036 [US1] Wire `LeaderboardPanel`, `LobbyPanel`, `TournamentPanel`, and `QuickPairPanel` into `apps/web/app/(public)/game-caro/page.tsx`'s `GameDashboardTemplate` slots (depends on T017, T022, T026, T030, T034)
- [X] T037 [P] [US1] Add/extend `apps/web/app/(public)/game-caro/page.test.tsx`: with a mocked signed-out `useAuthSession()`, confirm all three tabs and the leaderboard render read-only content and that Join/Create Game/Register/Find Match are present but redirect to `/login?callbackUrl=/game-caro` on click (quickstart.md item 1)

**Checkpoint**: The dashboard is fully browsable end-to-end (guest or signed-in) — this alone is a
demoable MVP increment per spec.md's User Story 1.

---

## Phase 4: User Story 2 - Join an open match from the Lobby (Priority: P2)

**Goal**: A signed-in player joins an open Lobby match.

**Independent Test**: Signed in, click "Join" on a Lobby card and confirm `joinMatch` is called and
the player is navigated to that match's view.

- [X] T038 [US2] In `apps/web/components/molecules/LobbyMatchCard.tsx`, wire the "Join" button's `onAction` to call `joinMatch({ id })` and navigate to `/game-caro/{id}` on success (depends on T024)
- [X] T039 [P] [US2] Add a test in `apps/web/components/molecules/LobbyMatchCard.test.tsx`: signed-in click on "Join" calls `joinMatch` and navigates to the match view (quickstart.md item 2 first half)

**Checkpoint**: Joining works end-to-end; browsing (US1) is unaffected.

---

## Phase 5: User Story 3 - Create a new game from the Lobby (Priority: P2)

**Goal**: A signed-in player creates a new open match via a modal, which then appears in the Lobby
without a page reload.

**Independent Test**: Signed in, open the Create Game modal from the Lobby tab, submit valid
settings, and confirm the new match appears at the top of the Lobby list immediately.

- [X] T040 [P] [US3] Create the generic `Modal` molecule (overlay + dialog container, closes on backdrop click / Escape) in `apps/web/components/molecules/Modal.tsx`
- [X] T041 [P] [US3] Add a test for `Modal` in `apps/web/components/molecules/Modal.test.tsx`
- [X] T042 [US3] Create `CreateGameModal` organism in `apps/web/components/organisms/CreateGameModal.tsx`: fetches `listGameConfigs()` for the game-type select, a visibility (`public`/`private`) select, and on submit calls `createMatch({ configId, visibility })` (data-model.md "CreateGameSubmission") (depends on T040)
- [X] T043 [P] [US3] Add a test for `CreateGameModal` in `apps/web/components/organisms/CreateGameModal.test.tsx` covering the game-type/visibility selection and a successful submit calling `createMatch`
- [X] T044 [US3] In `apps/web/components/organisms/LobbyPanel.tsx`, add a "Create Game" button (wrapped in `RequireSignIn`) that opens `CreateGameModal`, and on the modal's successful submit, prepend the returned match to local Lobby state with no reload (depends on T026, T042, spec.md SC-004)
- [X] T045 [P] [US3] Add a test in `apps/web/components/organisms/LobbyPanel.test.tsx`: guest click on "Create Game" redirects to login; signed-in click opens the modal, and a successful submit adds a new card to the list without a reload (quickstart.md item 2 second half + item 4)

**Checkpoint**: Players can both join and create matches; the Lobby loop (US2 + US3) is complete.

---

## Phase 6: User Story 4 - Register for an upcoming tournament (Priority: P3)

**Goal**: A signed-in player registers for a tournament from the Tournament tab.

**Independent Test**: Signed in, click "Register" on a tournament card and confirm
`registerForTournament` is called and the card's registered count updates.

- [X] T046 [US4] In `apps/web/components/molecules/TournamentCard.tsx`, wire the "Register" button's `onAction` to call `registerForTournament({ tournamentId })` and update the displayed registered count on success (depends on T028)
- [X] T047 [P] [US4] Add a test in `apps/web/components/molecules/TournamentCard.test.tsx`: signed-in click on "Register" calls `registerForTournament` and the registered count updates (quickstart.md item 3)

**Checkpoint**: Tournament registration works end-to-end; US1–US3 are unaffected.

---

## Phase 7: User Story 5 - Get matched instantly via Quick Pair (Priority: P3)

**Goal**: A signed-in player is matched into a game via Quick Pair, either immediately or after a
short wait via the realtime bridge.

**Independent Test**: Signed in, click "Find Match" on a Quick Pair card; confirm an immediate
`"matched"` response navigates straight to the match, and a `"waiting"` response followed by a
`quick_pair:matched` event also navigates to the match.

- [X] T048 [US5] In `apps/web/components/molecules/QuickPairCard.tsx`, wire "Find Match"'s `onAction` to call `requestQuickPair({ configId })`; on `status: "matched"` navigate immediately to `/game-caro/{matchId}`; on `status: "waiting"`, subscribe via T015's `useCaroRealtimeEvent("quick_pair:matched", ...)` and navigate once it fires (depends on T032, T015, data-model.md "QuickPairOptionView")
- [X] T049 [P] [US5] Add a test in `apps/web/components/molecules/QuickPairCard.test.tsx` covering both the immediate-match and waiting-then-matched-via-SSE paths (quickstart.md item 6)

**Checkpoint**: All five user stories are independently functional.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Verify the whole feature end-to-end and keep documentation honest

- [ ] T050 [P] Run `turbo run test --filter=@game-hub/web` for the full suite (every task above plus all pre-existing tests) and confirm all pass
- [ ] T051 Update the doc comment atop `OPTIONAL_AUTH_ROUTES` in `apps/web/lib/proxy.ts` to mention the three new tournament-read exceptions and point at `contracts/proxy-auth-policy-addendum.md`
- [ ] T052 Walk through quickstart.md's manual/live validation steps against a running backend, if available; explicitly confirm and note the two documented, expected-today limitations (leaderboard/Quick Pair guest 401s per research.md §2 rows 2/4, and no live Lobby update from another session per row 5) rather than treating them as bugs

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Stories (Phase 3–7)**: All depend on Foundational completion
  - US1 must land first in practice (every other story's UI lives inside US1's panels), but is
    still independently testable/demoable on its own per its Independent Test above
  - US2 and US3 both extend `LobbyPanel`/`LobbyMatchCard` (US1 output) but touch different action
    wiring (Join vs. Create) and can proceed in parallel once US1 is merged
  - US4 and US5 are independent of US2/US3 and of each other — all extend US1's output but touch
    different files
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (P1)**: Depends only on Foundational — no dependency on other stories
- **US2 (P2)**: Depends on Foundational + US1 (extends `LobbyMatchCard`'s existing placeholder `onAction`)
- **US3 (P2)**: Depends on Foundational + US1 (extends `LobbyPanel`); independent of US2 (different files: `CreateGameModal`/`Modal` vs. `LobbyMatchCard`'s Join wiring)
- **US4 (P3)**: Depends on Foundational + US1 (extends `TournamentCard`); independent of US2/US3/US5
- **US5 (P3)**: Depends on Foundational + US1 (extends `QuickPairCard`) + T015's realtime hook; independent of US2/US3/US4

### Within Each User Story

- Molecules/atoms before the organism that composes them
- Organism before it's wired into `page.tsx`
- Read-only rendering (US1) before action-wiring stories (US2–US5) touch the same component

### Parallel Opportunities

- T002–T016 (Foundational) are almost entirely `[P]` — different files, no cross-dependencies
  except the explicit ones noted (T009 needs T007; T013 needs T011; T017 needs T009)
- Within US1: T018–T021 (Badge/LeaderboardEntryRow), T024–T025 (LobbyMatchCard), T028–T029
  (TournamentCard), and T032–T033 (QuickPairCard) are four independent `[P]` tracks that can be
  built in parallel before their four organisms (T022, T026, T030, T034) converge
- Once US1 is merged, US2, US3, US4, and US5 can be staffed and built in parallel — each touches a
  disjoint set of files

---

## Parallel Example: User Story 1

```bash
# Launch the four independent card/atom tracks together:
Task: "Create Badge atom in apps/web/components/atoms/Badge.tsx"
Task: "Create LobbyMatchCard in apps/web/components/molecules/LobbyMatchCard.tsx"
Task: "Create TournamentCard in apps/web/components/molecules/TournamentCard.tsx"
Task: "Create QuickPairCard in apps/web/components/molecules/QuickPairCard.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (dashboard shell, realtime bridge, proxy fixes)
3. Complete Phase 3: User Story 1 — a fully browsable dashboard (guest-safe) is now demoable
4. **STOP and VALIDATE**: run quickstart.md item 1 (or its automated equivalent, T037)
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → shell + realtime bridge + proxy fixes ready
2. Add US1 → browsable dashboard → **MVP**
3. Add US2 + US3 in parallel → Lobby loop complete (join + create)
4. Add US4 → tournament registration
5. Add US5 → quick pair matching
6. Polish (Phase 8) → full regression + honest documentation of the two still-open backend
   dependencies (research.md §2 rows 2, 4, 5)

### Parallel Team Strategy

With multiple developers, after Foundational is done:
- Developer A: US1 (the critical path every other story builds on)
- Once US1 lands: Developer A takes US2, Developer B takes US3, Developer C takes US4, Developer
  D takes US5 — all four touch disjoint files

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Six backend-contract gaps (research.md §2) are **not** tasked here — they're out of scope for
  this webapp-only feature per explicit user decision; T023, T035, and T052 instead verify the
  webapp degrades gracefully around them today
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
