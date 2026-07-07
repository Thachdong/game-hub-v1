---

description: "Task list for Caro Match Gameboard Page"
---

# Tasks: Caro Match Gameboard Page

**Input**: Design documents from `/specs/008-caro-gameboard-page/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/realtime-bridge-addendum.md](contracts/realtime-bridge-addendum.md), [contracts/proxy-auth-policy-addendum.md](contracts/proxy-auth-policy-addendum.md), [quickstart.md](quickstart.md)

**Tests**: Included — every new file in plan.md's Project Structure has a co-located `*.test.ts(x)`,
matching this codebase's established convention (every existing component/page/lib file in
`apps/web` has one), so test tasks are part of the plan, not optional filler.

**Organization**: Tasks are grouped by user story (from spec.md, in priority order — US1 and US4
are both P1, US2/US3 are P2, US5 is P3). Setup covers the four `04-Projects/api` backend fixes made
during planning and its follow-up analysis (already applied). Foundational builds the gameboard
shell, the board itself, and the realtime/proxy plumbing every story's state depends on.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US5)
- File paths are exact, relative to the repo root

---

## Phase 1: Setup

**Purpose**: The four backend corrections found during planning and its `/speckit-analyze`
follow-up (plan.md Summary, research.md §4–§6) that this feature's spec depends on — already
applied against `04-Projects/api`

- [X] T001 Change `START_WINDOW_SECONDS` from `30` to `15` in `04-Projects/api/src/caro-game/application/use-cases/join-match.use-case.ts` (research.md §4)
- [X] T002 Split `MatchController`'s guard in `04-Projects/api/src/caro-game/interface/http/match.controller.ts`: remove the class-level `JwtAuthGuard`; add `@UseGuards(OptionalJwtGuard)` to `lobby()`, `getState()`, `getMoves()`; add explicit `@UseGuards(JwtAuthGuard)` to `create()`, `join()`, `cancel()`, `leave()`, `invite()`, `respondToInvitation()` (research.md §5)
- [X] T003 Split `ChatController`'s guard in `04-Projects/api/src/caro-game/interface/http/chat.controller.ts`: remove the class-level `JwtAuthGuard`; add `@UseGuards(OptionalJwtGuard)` to `history()`; add explicit `@UseGuards(JwtAuthGuard)` to `send()` and `mute()` (research.md §5)
- [X] T004 In `04-Projects/api/src/realtime/realtime.gateway.ts`, add `viewerId: client.userId` to both the `match:viewer_joined` and `match:viewer_left` emit payloads (alongside the existing `viewerUsername`), so the webapp can resolve a viewer-list entry to the UUID `muteMatchViewer` requires (research.md §6)

**Checkpoint**: Backend now matches spec.md's requirements (15s window, guest-readable
lobby/match-state/move-list/chat-history, and a mute-capable viewer identity). Verified via
`tsc --noEmit` in `04-Projects/api` during planning; no automated test task needed here since none
of the three touched files has a pre-existing `*.spec.ts` (see research.md §5–§6).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the board, the page shell, and the realtime/proxy plumbing every user story
below renders inside of or depends on

**⚠️ CRITICAL**: No user story task can begin until this phase is complete

- [X] T005 [P] In `apps/web/lib/proxy.ts`, add one `OPTIONAL_AUTH_ROUTES` entry for `GET caro/matches/{id}/chat` (contracts/proxy-auth-policy-addendum.md)
- [X] T006 [P] Add a test in `apps/web/lib/proxy.test.ts` for the new allowlisted chat-history path (no cookie → forwarded, not synthesized-401), plus a regression case confirming `POST caro/matches/{id}/chat` and `.../chat/mute` still require one (contracts/proxy-auth-policy-addendum.md)
- [X] T007 Extend `apps/web/app/api/caro/realtime/route.ts` to read an optional `matchId` query param, emit `join_room` with `{ room: \`match:${matchId}\`, matchViewerUsername }` (username from the signed-in session, omitted for guests) on connect, emit `leave_room` on `cancel()`, and add every event in data-model.md's "Realtime event contract" table (`match:player_joined`, `match:started`, `match:move_placed`, `match:turn_changed`, `match:draw_requested`, `match:draw_declined`, `match:ended`, `match:cancelled`, `match:chat`, `match:viewer_joined`, `match:viewer_left`) to the forwarded-events list alongside the existing `lobby:updated`/`quick_pair:matched` (contracts/realtime-bridge-addendum.md). Also threaded `matchId` through `apps/web/lib/useCaroRealtime.ts`'s shared `EventSource` URL (contracts/realtime-bridge-addendum.md "Client usage"), which plan.md's file list had marked UNCHANGED but the addendum's technical detail requires.
- [X] T008 [P] Extend `apps/web/app/api/caro/realtime/route.test.ts`: assert `?matchId=` triggers a `join_room` emit on the mocked socket, and that each new event name (including `match:viewer_joined`/`match:viewer_left` with their `viewerId` field per T004) produces a correctly framed SSE message (contracts/realtime-bridge-addendum.md). Also extended `useCaroRealtime.test.ts` for the matchId-aware URL.
- [X] T009 [P] Create `GameBoard` organism in `apps/web/components/organisms/GameBoard.tsx` — renders a grid sized to `MatchState.boardSize` (rows × columns), places every move up to `replayIndex ?? moves.length`, accepts an optional `onCellClick(row, col)` prop (wired in US4) and an optional `replayIndex` prop (wired in US5) (data-model.md "MoveReplayView")
- [X] T010 [P] Add a test for `GameBoard` in `apps/web/components/organisms/GameBoard.test.tsx` covering grid dimensions for each `BoardSize`, moves rendering correctly, and `replayIndex` truncating the rendered moves
- [X] T011 Create `GameboardTemplate` in `apps/web/components/templates/GameboardTemplate.tsx` — board (via a left slot) on the left, a right-side slot for the per-state panel, per spec.md's two-column layout (FR-001) (depends on T009)
- [X] T012 [P] Add a test for `GameboardTemplate` in `apps/web/components/templates/GameboardTemplate.test.tsx` confirming both slots render
- [X] T013 Create `GameboardSidePanel` organism skeleton in `apps/web/components/organisms/GameboardSidePanel.tsx` — computes `GameboardViewState` from `MatchState.status` (data-model.md) and dispatches to one of four state branches (initially stubbed; filled in by US1) (depends on T011)
- [X] T014 [P] Add a test for `GameboardSidePanel` in `apps/web/components/organisms/GameboardSidePanel.test.tsx` covering the state-to-branch dispatch for all four `MatchState.status` values
- [X] T015 Rewrite `apps/web/app/(public)/game-caro/[matchId]/page.tsx`: call `getMatch({ id: matchId })`, subscribe to the realtime bridge with this page's `matchId` (T007), render `GameboardTemplate` with `GameBoard` on the left and `GameboardSidePanel` on the right, and render a not-found state when `getMatch` 404s (depends on T007, T013)
- [X] T016 [P] Add `apps/web/app/(public)/game-caro/[matchId]/page.test.tsx` covering a successful fetch rendering both the board and side-panel containers, and the not-found case

**Checkpoint**: Foundation ready — the gameboard page renders a real board and a state-dispatching
(but not yet content-complete) side panel for any match, wired to the extended realtime bridge.
Each user story below fills in real per-state content.

---

## Phase 3: User Story 1 - Spectate a match without signing in (Priority: P1) 🎯 MVP

**Goal**: Any visitor — guest or signed-in — sees the full read-only gameboard (board, both
cards or the waiting placeholder, viewer list, chat history, and every state-specific control) for
a match in any of its four states, with every gated control visible but inert/redirecting. This
phase also wires the viewer list and chat to their live realtime data sources and the mute/kick
control to `muteMatchViewer`, since both are read/observe-scoped capabilities that belong to full
spectating rather than to any later, narrower story.

**Independent Test**: Open a match's gameboard URL with no active session, for a match in each of
the four states, and confirm the board, both player cards (or the waiting placeholder), viewer
list, and chat history all render, while Start, Request Draw, Surrender, placing a move, Report,
and kicking a viewer all redirect to `/login` instead of acting (quickstart.md item 1). Separately,
signed in as a match participant, confirm the viewer list and chat both update live and the
mute/kick control actually mutes a spectator (quickstart.md item 8).

- [ ] T017 [P] [US1] Create `PlayerCard` molecule in `apps/web/components/molecules/PlayerCard.tsx` — username (fallback `Player {id.slice(0,6)}` per data-model.md), Elo/win-rate badges (hidden when `0`), current-turn indicator, creator indicator (data-model.md "OwnPlayerCardView / OpponentPlayerCardView")
- [ ] T018 [P] [US1] Add a test for `PlayerCard` in `apps/web/components/molecules/PlayerCard.test.tsx` covering the username/Elo fallback cases and the turn/creator indicators
- [ ] T019 [P] [US1] Create `WaitingForOpponentCard` molecule in `apps/web/components/molecules/WaitingForOpponentCard.tsx` — static placeholder shown in place of the opponent's `PlayerCard`
- [ ] T020 [P] [US1] Add a test for `WaitingForOpponentCard` in `apps/web/components/molecules/WaitingForOpponentCard.test.tsx`
- [ ] T021 [P] [US1] Create `ViewerListItem` molecule in `apps/web/components/molecules/ViewerListItem.tsx` — spectator username row, taking `{ id, username }` (data-model.md's `ViewerEntry`) plus a `canBeMuted` prop that renders a mute/kick control only when true (FR-016); guests/spectators see no control
- [ ] T022 [P] [US1] Add a test for `ViewerListItem` in `apps/web/components/molecules/ViewerListItem.test.tsx` covering the control-present and control-absent cases
- [ ] T023 [US1] Create `ViewerList` organism in `apps/web/components/organisms/ViewerList.tsx` — renders a `ViewerListItem` per entry, omitted/empty when there are none (FR-011) (depends on T021)
- [ ] T024 [P] [US1] Add a test for `ViewerList` in `apps/web/components/organisms/ViewerList.test.tsx` covering populated and empty cases
- [ ] T025 [US1] Wire `ViewerList`'s live data source: subscribe to `match:viewer_joined`/`match:viewer_left` via the realtime hook (T007/T015) and maintain the client-side `ViewerEntry[]` (add on join, remove on leave, keyed by `id`), computing each entry's `canBeMuted` as `true` only when the current viewer is one of the match's two participants (data-model.md "ViewerListView / ViewerEntry") (depends on T015, T023)
- [ ] T026 [P] [US1] Add a test covering mocked `match:viewer_joined`/`match:viewer_left` events adding/removing entries from the rendered `ViewerList`, and `canBeMuted` differing for a participant vs. a guest/spectator viewer
- [ ] T027 [US1] Wire `ViewerListItem`'s mute/kick control to call `muteMatchViewer({ id: matchId, viewerId: entry.id })` when clicked (FR-016) (depends on T021, T025)
- [ ] T028 [P] [US1] Add a test covering: a match participant's click calls `muteMatchViewer` with the clicked entry's `id`; the control is absent (per `canBeMuted`) for guests and non-participant spectators, so no call is possible (quickstart.md item 8)
- [ ] T029 [P] [US1] Create `ChatMessageItem` molecule in `apps/web/components/molecules/ChatMessageItem.tsx` — one chat bubble, styled differently when `isOwnMessage` (data-model.md "ChatMessageView")
- [ ] T030 [P] [US1] Add a test for `ChatMessageItem` in `apps/web/components/molecules/ChatMessageItem.test.tsx`
- [ ] T031 [US1] Create `ChatBox` organism in `apps/web/components/organisms/ChatBox.tsx` — fetches history via `listMatchChat({ matchId })` (now guest-accessible per research.md §5), renders a `ChatMessageItem` per message, and wraps the send input in `RequireSignIn` so a guest's send attempt redirects instead of calling `sendMatchChat` (FR-010, FR-015) (depends on T029)
- [ ] T032 [P] [US1] Add a test for `ChatBox` in `apps/web/components/organisms/ChatBox.test.tsx` covering guest read access to history plus a redirect on send, and a signed-in send calling `sendMatchChat`
- [ ] T033 [US1] Wire `ChatBox` to subscribe to `match:chat` via the realtime hook (T007/T015) and append each incoming message to the rendered history live (FR-017) (depends on T015, T031)
- [ ] T034 [P] [US1] Add a test covering a mocked `match:chat` event appending a new `ChatMessageItem` to the rendered history without a refetch
- [ ] T035 [P] [US1] Create `StartCountdown` molecule in `apps/web/components/molecules/StartCountdown.tsx` — renders the countdown purely from `MatchState.deadlineAt` (constitution Principle VI) and a Start control wrapped so a guest's click redirects to login and a non-creator's click has no effect; the `onStart` callback itself is a no-op stub prop here, wired to the real `startMatch` call in US3 (T048) (FR-004, FR-005, FR-013, FR-014)
- [ ] T036 [P] [US1] Add a test for `StartCountdown` in `apps/web/components/molecules/StartCountdown.test.tsx` covering guest-redirect, non-creator-no-op, and that a creator's click invokes the `onStart` prop (not yet asserting which service function that prop calls — that's US3's test), and that the displayed time derives from `deadlineAt` not render time
- [ ] T037 [P] [US1] Create `InGameActions` molecule in `apps/web/components/molecules/InGameActions.tsx` — Request Draw / Surrender controls (or the accept/decline variant when `pendingDrawRequestFromId` targets the other participant), each wrapped so a guest redirects and a non-participant has no effect; the `onRequestDraw`/`onSurrender`/`onRespondToDraw` callbacks are no-op stub props here, wired to their real service calls in US4 (T052) (FR-007, FR-013, FR-014)
- [ ] T038 [P] [US1] Add a test for `InGameActions` in `apps/web/components/molecules/InGameActions.test.tsx` covering guest-redirect, non-participant-no-op, and that a participant's click invokes the corresponding callback prop, for both the request and accept/decline variants
- [ ] T039 [P] [US1] Create `MoveReplayControls` organism in `apps/web/components/organisms/MoveReplayControls.tsx` — "Review Moves" control plus prev/next stepping UI, available to every viewer including guests (FR-008, FR-009)
- [ ] T040 [P] [US1] Add a test for `MoveReplayControls` in `apps/web/components/organisms/MoveReplayControls.test.tsx` covering guest access (no redirect) and the prev/next controls' enabled/disabled bounds
- [ ] T041 [P] [US1] Create `ReportPlayerForm` molecule in `apps/web/components/molecules/ReportPlayerForm.tsx` — report-type select (via `listReportTypes()`) + reason textarea, wrapped in `RequireSignIn` so a guest's click redirects; on submit, calls `submitReport({ reportedUserId, reportTypeId, context })` (research.md §7, FR-015)
- [ ] T042 [P] [US1] Add a test for `ReportPlayerForm` in `apps/web/components/molecules/ReportPlayerForm.test.tsx` covering guest-redirect and a signed-in submit calling `submitReport`
- [ ] T043 [US1] Wire `GameboardSidePanel`'s four branches to real content per spec.md's per-state lists: state 1 → own `PlayerCard` + `WaitingForOpponentCard` + `ViewerList` + `ChatBox`; state 2 → both `PlayerCard`s + `ViewerList` + `StartCountdown` + `ChatBox`; state 3 → both `PlayerCard`s + `ViewerList` + `InGameActions` + `ChatBox`; state 4 → both `PlayerCard`s + `ViewerList` + `MoveReplayControls` + `ChatBox` (depends on T013, T017, T019, T023, T031, T035, T037, T039)
- [ ] T044 [US1] Remove `apps/web/components/molecules/MatchActionButtons.tsx` (superseded by T035/T037/T041) and its now-unused import
- [ ] T045 [P] [US1] Extend `apps/web/app/(public)/game-caro/[matchId]/page.test.tsx` (or `GameboardSidePanel.test.tsx`) with a mocked signed-out `useAuthSession()` covering all 5 US1 acceptance scenarios across the four states, confirming Start/Request Draw/Surrender/a board cell click/Report/viewer-kick each redirect to `/login?callbackUrl=...` (quickstart.md item 1)

**Checkpoint**: The gameboard is fully spectatable end-to-end, in every state, by a guest, and the
viewer list/chat/mute machinery works for signed-in participants — this alone is a demoable MVP
increment per spec.md's User Story 1.

---

## Phase 4: User Story 2 - Wait for an opponent in a match you created (Priority: P2)

**Goal**: A signed-in player waiting alone in their own match sees the opponent's card and the
Start countdown appear live the moment a second player joins, without a reload.

**Independent Test**: Signed in, viewing a match with no opponent yet; a mocked `match:player_joined`
event swaps `WaitingForOpponentCard` for a real `PlayerCard` and mounts `StartCountdown`, without a
page reload (quickstart.md item 2).

- [ ] T046 [US2] In `GameboardSidePanel` (or the page, whichever owns match state), subscribe to `match:player_joined` and merge its payload (`playerXId`, `playerOId`, `deadlineAt`) into local match state, driving the 1→2 transition (depends on T013, T043)
- [ ] T047 [P] [US2] Add a test covering a mocked `match:player_joined` event transitioning the rendered side panel from state 1 to state 2 without a full remount (quickstart.md item 2)

**Checkpoint**: Waiting → matched transition works live; US1's spectating is unaffected.

---

## Phase 5: User Story 3 - Start a match before the countdown runs out (Priority: P2)

**Goal**: The match's creator starts it within the 15-second window, or the match ends
automatically if they don't; the non-creator participant can never start it themselves.

**Independent Test**: Two signed-in players in a not-yet-started match; the creator's Start click
begins the match for both; the non-creator's click has no effect; letting the countdown expire ends
the match for both with no winner (quickstart.md item 3).

- [ ] T048 [US3] Wire `StartCountdown`'s `onStart` prop (stubbed in T035) to call `startMatch({ id: matchId })` for the creator; subscribe to `match:started` (drives the 2→3 transition, sets `currentTurnPlayerId`/`deadlineAt`) and `match:cancelled` (drives the 2→4 transition with no winner) (depends on T035, T046)
- [ ] T049 [P] [US3] Add a test covering: creator click calls `startMatch`; non-creator click makes no call; a mocked `match:started` event transitions to state 3; a mocked `match:cancelled` event (no prior `match:started`) transitions to state 4 (quickstart.md item 3)

**Checkpoint**: Start/auto-cancel works live; US1/US2 are unaffected.

---

## Phase 6: User Story 4 - Play an active match (Priority: P1)

**Goal**: The two participants place moves and can request a draw or surrender; both see the game
end accordingly.

**Independent Test**: In an in-progress match, the current-turn participant's board click places a
move (appears live for the opponent and viewers); "Request Draw"/"Surrender" end the match
accordingly (quickstart.md item 4).

- [ ] T050 [US4] Wire `GameBoard`'s `onCellClick` (via the page/side panel) to call `submitMove({ id: matchId, row, col })` only when the clicking viewer `isSelf` on the participant whose id matches `currentTurnPlayerId`; subscribe to `match:move_placed` (append to `moves`) and `match:turn_changed` (update `currentTurnPlayerId`/`deadlineAt`) (depends on T009, T015)
- [ ] T051 [P] [US4] Add a test covering: current-turn participant click calls `submitMove`; non-turn or non-participant click makes no call; a mocked `match:move_placed` event appends the move to the rendered board (quickstart.md item 4)
- [ ] T052 [US4] Wire `InGameActions`' `onRequestDraw`/`onSurrender`/`onRespondToDraw` props (stubbed in T037) to `requestDraw({ id: matchId })`, `surrenderMatch({ id: matchId })`, and `respondToDrawRequest({ id: matchId, action })` respectively; subscribe to `match:draw_requested`, `match:draw_declined`, and `match:ended` (drives the 3→4 transition with `result`/`winnerPlayerId`) (depends on T037, T048)
- [ ] T053 [P] [US4] Add a test covering: Request Draw/Surrender/accept/decline each call their service function; a mocked `match:draw_requested` renders the accept/decline variant for the other participant; a mocked `match:ended` transitions to state 4 (quickstart.md item 4)

**Checkpoint**: Active play (moves, draw, surrender) works live; US1–US3 are unaffected.

---

## Phase 7: User Story 5 - Review a finished match's moves (Priority: P3)

**Goal**: Any viewer of an ended match steps through the full recorded move sequence in order.

**Independent Test**: On a finished match's gameboard, clicking "Review Moves" and then
prev/next steps the board through every recorded move in the correct order (quickstart.md item 5).

- [ ] T054 [US5] Wire `MoveReplayControls`' prev/next stepping to drive `GameBoard`'s `replayIndex` prop (client-side only, no service call, derived from the already-fetched `moves`) when the match is in state 4 (depends on T009, T039)
- [ ] T055 [P] [US5] Add a test covering: clicking Review Moves then stepping prev/next moves `replayIndex` through the full range and `GameBoard` reflects the board at each step (quickstart.md item 5)

**Checkpoint**: All five user stories are independently functional.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final validation across all stories

- [ ] T056 [P] Run `turbo run lint --filter=@game-hub/web` and fix any findings across this feature's new/modified files
- [ ] T057 [P] Run `turbo run test --filter=@game-hub/web` and confirm the full suite is green
- [ ] T058 Execute quickstart.md's manual/live validation steps 2–8 against a running `apps/web` + `04-Projects/api` pair
- [ ] T059 Verify implementation matches the permissions decisions already resolved in spec.md/`checklists/permissions.md` (2026-07-07 review): `StartCountdown` renders the non-creator's Start control visibly disabled, not hidden (FR-004/CHK003/CHK007/CHK020); `ViewerListItem`'s mute/kick control maps to the single `muteMatchViewer` action, matching FR-016/CHK021's "kick and mute are the same action" conclusion

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — already applied
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Stories (Phase 3–7)**: All depend on Foundational completion
  - US1 (P1) has no dependency on any other story
  - US2 (P2) builds on US1's rendered states (needs T043) but doesn't require US3/US4/US5
  - US3 (P2) builds on US2's live-transition wiring (T046) but doesn't require US4/US5
  - US4 (P1) builds on Foundational's `GameBoard` and US1's `InGameActions` but doesn't require US2/US3/US5 to be functional (an in-progress match can be seeded directly for testing)
  - US5 (P3) builds on US1's `MoveReplayControls`/`GameBoard` but doesn't require US2/US3/US4
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### Within Each User Story

- Molecules/organisms before wiring tasks that consume them
- Wiring tasks before their corresponding test task
- Story complete before moving to the next priority

### Parallel Opportunities

- T005/T006 (proxy) can run in parallel with T007/T008 (realtime route) and T009/T010 (GameBoard) — different files
- Within US1, the pure leaf-component creation tasks (T017, T019, T021, T029, T035, T037, T039, T041) and their test tasks can all run in parallel — each is a distinct file with no dependency on another until their owning organism (T023, T031) or the final wiring task (T043)
- The three live-data wiring tasks (T025/T027 for the viewer list and mute control, T033 for chat) each depend on their respective organism (T023, T031) plus the page/realtime subscription (T015), so schedule them after those rather than treating them as parallel with the leaf-component creation pass
- Every `[P]`-marked test task can run in parallel with its sibling implementation task's neighbors, though not before the implementation it tests

---

## Parallel Example: User Story 1

```bash
# Launch every US1 leaf component together (all distinct files, no interdependency):
Task: "Create PlayerCard molecule in apps/web/components/molecules/PlayerCard.tsx"
Task: "Create WaitingForOpponentCard molecule in apps/web/components/molecules/WaitingForOpponentCard.tsx"
Task: "Create ViewerListItem molecule in apps/web/components/molecules/ViewerListItem.tsx"
Task: "Create ChatMessageItem molecule in apps/web/components/molecules/ChatMessageItem.tsx"
Task: "Create StartCountdown molecule in apps/web/components/molecules/StartCountdown.tsx"
Task: "Create InGameActions molecule in apps/web/components/molecules/InGameActions.tsx"
Task: "Create MoveReplayControls organism in apps/web/components/organisms/MoveReplayControls.tsx"
Task: "Create ReportPlayerForm molecule in apps/web/components/molecules/ReportPlayerForm.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (already done)
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently (quickstart.md items 1 and 8)
5. Deploy/demo if ready — a guest can already spectate any match in any state, and the viewer
   list/chat/mute machinery already works live for signed-in participants

### Incremental Delivery

1. Complete Setup + Foundational → board and shell ready
2. Add US1 → Test independently → Deploy/Demo (MVP — full spectating, live viewer list/chat, mute)
3. Add US2 → Test independently → Deploy/Demo (live matchmaking transition)
4. Add US3 → Test independently → Deploy/Demo (start/auto-cancel)
5. Add US4 → Test independently → Deploy/Demo (actual gameplay — moves, draw, surrender)
6. Add US5 → Test independently → Deploy/Demo (move replay)
7. Each story adds value without breaking previous stories

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- US1 and US4 are both P1 in spec.md — US1 (spectating) is sequenced first here because every
  other story's components are first built as part of US1's read-only rendering pass
- `StartCountdown` (T035) and `InGameActions` (T037) are built in US1 with their gating logic fully
  in place, but their action callback props are deliberately left as no-op stubs until US3 (T048)
  and US4 (T052) wire the real service calls — this keeps each story's scope independent and
  avoids an implementer wiring gameplay logic ahead of the story that owns it
- Verify tests fail before implementing, where a test task precedes its implementation
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
