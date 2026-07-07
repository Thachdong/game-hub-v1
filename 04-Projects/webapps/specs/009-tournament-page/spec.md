# Feature Specification: Tournament Page

**Feature Branch**: `009-tournament-page`

**Created**: 2026-07-07

**Status**: Draft

**Input**: User description: "init specs cho tournament page: 3. Nội dung page tournament: -
countdown thời gian (kết thúc - bắt đầu) + button pause để tạm dừng bắt cặp - danh sách player xấp
xếp theo điểm giảm dần + có phân trang - player ở page này khi được match với player khác thì sẽ
navigate vào page gameboard => game bắt đầu ngay sau 5s - sau khi kết thúc 1 game + user + button
back về tournament => player được navigate về page tournament => tiếp tục ghép cặp"

## Clarifications

### Session 2026-07-07

- Q: Should the "Pause" control that stops matchmaking pairing operate tournament-wide (an
  organizer/admin control affecting every participant) or per player? → A: Per player — each
  registered participant has their own Pause control that only removes them from consideration for
  their own next pairing; it has no effect on other participants, and the tournament countdown
  keeps running on its original schedule regardless of any player's pause state.
- Q: If a match is still in progress when the tournament's countdown reaches zero, does the match
  get cut short, and does it still count toward tournament standings? → A: The match is allowed to
  play to its natural conclusion; its result does NOT count toward tournament score/standings
  (the tournament already ended before it finished), but the players' global Elo rating still
  updates from the match exactly as it would for any non-tournament match.
- Q: Does a registered participant need to currently have the tournament page open to be eligible
  for the next pairing, or are they eligible any time once registered and unpaused? → A: Presence
  required — a participant is only eligible for pairing while they currently have the tournament
  page open; leaving the page makes them unavailable until they return, and navigation to the
  gameboard happens live on the open page with no separate out-of-page notification needed.
- Q: What point value does a completed tournament match result contribute to a participant's
  score? → A: Win = 2 points normally, but the 4th and every later consecutive win in an unbroken
  win streak is worth 4 points (double). Draw = 1 point normally, but 2 points if the participant
  had a streak of 3 or more consecutive wins immediately before the draw (a "streak-break bonus").
  Loss = 0 points. A loss always resets the consecutive-win streak counter to zero; a draw also
  resets it to zero (after applying the streak-break bonus, if any). Score is computed server-side
  by the existing tournament scoring engine; the tournament page only displays the resulting value.
  *(Superseded 2026-07-07 during `/speckit-plan`: an earlier session had this as "2/1/0 with the
  3rd win doubled and no draw bonus," but that conflicted with the tournament scoring engine that
  already existed in the API codebase. The user decided to keep the existing engine's behavior as
  authoritative rather than change it, so this entry — and FR-014 below — now describe what the
  code actually does.)*
- Q: What does the tournament page show, and does pairing occur, before the tournament's scheduled
  start time? → A: Pre-start view — the page shows a "starts in" countdown counting down to the
  scheduled start time (not the end time), and the standings list with all registered participants
  shown at zero score; no pairing occurs until the start time arrives.
- Q: Does a participant's Pause state persist across page visits, or reset to eligible every time
  they reopen the tournament page? → A: Persists — Pause is a durable per-participant state stored
  server-side; reopening the page shows them still paused until they explicitly click Resume.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Watch tournament progress and standings (Priority: P1)

Anyone who opens a specific tournament's page — a visitor following a shared link, a guest exploring
from the dashboard's Tournament tab, or a registered participant — sees how much time is left in the
tournament and where every participant currently stands.

**Why this priority**: This is the read-only foundation of the page. It must render correctly for
every visitor before matchmaking or navigation behavior can be layered on top, and it's the view
every participant returns to between matches.

**Independent Test**: Can be fully tested by opening a tournament's page with no active session and
confirming the countdown and the paginated, score-sorted standings list render with current data,
while no pairing controls are available to act on.

**Acceptance Scenarios**:

1. **Given** a visitor opens a tournament's page, **When** the page loads, **Then** they see a
   countdown showing the time remaining until the tournament's scheduled end, and a standings list
   of registered players.
2. **Given** the standings list has more participants than fit on one page, **When** the visitor
   views the list, **Then** it is paginated and every participant appears exactly once, ordered by
   score from highest to lowest.
3. **Given** two participants share the same score, **When** they both appear in the standings,
   **Then** the tie is broken by a consistent, deterministic rule so the ordering never changes
   between page loads absent a score change.
4. **Given** a visitor with no active session, **When** they view the page, **Then** they see the
   countdown and standings but no Pause control and are not eligible to be matched.
5. **Given** a visitor opens a tournament page before its scheduled start time, **When** the page
   loads, **Then** the countdown shows time remaining until the start time (not the end time) and
   every registered participant appears in the standings at zero score.

---

### User Story 2 - Get auto-matched and enter the game (Priority: P2)

A signed-in player who registered for the tournament (per spec 007's Tournament tab registration)
is waiting on the tournament page when the system pairs them with another available participant.

**Why this priority**: This is the core tournament loop — without automatic pairing and hand-off
into a match, the tournament page is just a read-only scoreboard. It depends on User Story 1's view
existing but delivers the feature's central value.

**Independent Test**: Can be fully tested by having two registered, unpaused participants present
on the tournament page and confirming that once the system matches them, both are navigated to that
match's gameboard page and the game begins automatically 5 seconds after the gameboard opens,
without either player clicking a manual "Start" action.

**Acceptance Scenarios**:

1. **Given** a registered, unpaused participant is on the tournament page, **When** the system
   pairs them with another available participant, **Then** they are automatically navigated to the
   gameboard page for that match.
2. **Given** a player has just been navigated to a tournament match's gameboard, **When** 5 seconds
   elapse, **Then** the game begins automatically, without requiring either player to click a manual
   start control.
3. **Given** a participant has paused their own matchmaking, **When** the system looks for pairings,
   **Then** that participant is skipped and is not matched until they resume.

---

### User Story 3 - Return to the tournament and keep playing (Priority: P3)

A player finishes a tournament match, clicks "Back" on the gameboard's end-of-game view, and lands
back on the tournament page ready to be paired again.

**Why this priority**: This closes the loop that makes the tournament a repeatable sequence of
matches rather than a single game; it depends on User Story 2 having produced a completed match.

**Independent Test**: Can be fully tested by completing a tournament match, clicking "Back" from the
gameboard's end-of-game state, and confirming the player lands on the tournament page with their
updated standing reflected and their matchmaking eligibility restored (unless they had paused it).

**Acceptance Scenarios**:

1. **Given** a tournament match has ended, **When** the player clicks "Back" on the gameboard,
   **Then** they are navigated to that tournament's page.
2. **Given** a player has just returned from a completed match, **When** the standings list
   refreshes, **Then** their score reflects the result of the match just played.
3. **Given** a player has just returned from a completed match and had not paused matchmaking,
   **When** the system next looks for pairings, **Then** that player is eligible to be matched
   again.

---

### User Story 4 - Pause your own matchmaking (Priority: P4)

A registered participant wants a break — to step away, watch standings, or review strategy —
without being pulled into a new match while they're gone.

**Why this priority**: A refinement of the core matchmaking loop; useful but not required for the
tournament to function, since a player can otherwise always play whatever match they're paired
into.

**Independent Test**: Can be fully tested by a registered participant clicking Pause, confirming
they are not paired into any new match while paused, then clicking Resume and confirming they
become eligible for pairing again.

**Acceptance Scenarios**:

1. **Given** a registered participant on the tournament page, **When** they click "Pause", **Then**
   they stop being considered for new pairings and the control indicates their paused state.
2. **Given** a paused participant, **When** they click the control again to resume, **Then** they
   become eligible for pairing again.
3. **Given** one participant is paused, **When** the system pairs other unpaused participants,
   **Then** the paused participant's pause has no effect on those other pairings.

---

### Edge Cases

- What happens when the tournament's countdown reaches zero while a player is mid-match? The match
  in progress is allowed to finish; no new pairings are made once the countdown ends. The match's
  result does not count toward tournament score/standings (since the tournament had already ended),
  but the players' global Elo rating still updates from that match as normal.
- What happens when the countdown reaches zero while a player is on the tournament page waiting to
  be paired? They remain on the page and see the tournament's final/ended state; no further pairing
  occurs.
- What happens if a player is mid-match when returning to the tournament page and the standings
  refresh? Standings always reflect the most recently completed matches; a match still in progress
  does not yet affect either player's score.
- What happens if a player disconnects or closes the page during the 5-second auto-start window on
  the gameboard? Existing gameboard/match lifecycle handling applies (e.g. forfeiting or awaiting
  reconnection), consistent with how disconnects are already handled elsewhere in the match
  lifecycle.
- What happens when there is an odd number of unpaused participants available for pairing? One
  participant remains unmatched until another becomes available; they stay visibly waiting on the
  tournament page.
- What happens if a guest (no active session) is on the tournament page when pairings occur? Guests
  are never registered participants, so they are never matched; they continue to see the read-only
  countdown and standings.
- What happens when the standings list is empty (no one has registered yet)? The list shows an
  empty state rather than an error.
- What happens when a visitor opens the tournament page before its scheduled start time? They see
  a "starts in" countdown (to the start time) and the standings list with every registered
  participant at zero score; no pairing occurs until the start time arrives.
- What happens when a paused participant closes the tournament page and reopens it later? They are
  still shown as paused (their pause state persisted) and remain ineligible for pairing until they
  explicitly click Resume.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST display, for a given tournament, a countdown viewable by any visitor
  regardless of sign-in status: before the tournament's scheduled start time, the countdown MUST
  show time remaining until that start time; from the start time until the tournament ends, it
  MUST show time remaining until the scheduled end time.
- **FR-001a**: Before a tournament's scheduled start time, the system MUST NOT create any pairings;
  the standings list MUST still be shown, with every registered participant listed at zero score.
- **FR-002**: The system MUST display a standings list of the tournament's registered participants,
  ordered by score from highest to lowest, with a deterministic tie-break when scores are equal.
- **FR-003**: The standings list MUST be paginated so that only a bounded number of participants are
  shown per page, with controls to move between pages.
- **FR-004**: The system MUST provide each registered, signed-in participant a "Pause" control that,
  when activated, removes only that participant from consideration for future pairings until they
  resume; it MUST NOT be shown to visitors without an active session.
- **FR-005**: A paused participant's pause state MUST have no effect on the pairing eligibility of
  any other participant, and MUST NOT stop or alter the tournament countdown.
- **FR-005a**: A participant's Pause state MUST persist across page visits (stored independently of
  whether the tournament page is currently open); a participant who paused, closed the page, and
  later reopens it MUST still be shown as paused until they explicitly resume.
- **FR-006**: The system MUST automatically pair available participants together while the
  tournament countdown has not yet reached zero, where "available" means registered, unpaused, not
  already in an active match, AND currently viewing the tournament page.
- **FR-006a**: A participant who navigates away from or closes the tournament page MUST become
  ineligible for pairing until they return to the page; no pairing or notification is sent to them
  while absent.
- **FR-007**: When two participants are paired, the system MUST automatically navigate both of them
  to the gameboard page for the newly created match, without requiring a manual action to move from
  the tournament page to the gameboard.
- **FR-008**: A tournament match's gameboard MUST begin the game automatically 5 seconds after the
  gameboard page opens for that match, without either player needing to click a manual start
  control.
- **FR-009**: When a tournament match ends, the gameboard MUST offer a "Back" action that navigates
  the player back to that tournament's page.
- **FR-010**: A player who returns to the tournament page after a completed match MUST have their
  standings entry reflect that match's result, and MUST become eligible for future pairings again
  unless they have paused their own matchmaking.
- **FR-011**: Once a tournament's countdown reaches zero, the system MUST stop creating new pairings
  for that tournament while allowing any match already in progress to finish normally.
- **FR-012**: Visitors with no active session MUST be able to view the countdown and standings list
  but MUST NOT be eligible for pairing and MUST NOT see the Pause control.
- **FR-013**: A match that is still in progress when its tournament's countdown reaches zero MUST be
  allowed to finish normally; its result MUST NOT be counted toward tournament score/standings, but
  MUST still update the players' global Elo rating the same as any other completed match.
- **FR-014**: A completed tournament match MUST contribute to each participant's tournament score
  using the existing server-side tournament scoring engine: a win normally contributes 2 points,
  rising to 4 points from the 4th consecutive win onward in an unbroken streak; a draw normally
  contributes 1 point, rising to 2 points if the participant's consecutive-win streak was 3 or more
  immediately beforehand; a loss contributes 0 points. A loss always resets the streak counter to
  zero; a draw resets it to zero after any streak-break bonus is applied.

### Key Entities *(include if feature involves data)*

- **Tournament**: The event this page represents — has a scheduled start time, scheduled end time
  (used to compute the countdown), and a status (e.g. active or ended) that governs whether new
  pairings are still being made.
- **Tournament Standing**: A registered participant's entry in the standings list — references the
  participant, their current tournament score (per FR-014's win/draw/loss and streak-bonus rule),
  their current consecutive-win streak count, and their pause state (paused or eligible).
- **Tournament Match**: A match created by pairing two eligible participants within a tournament;
  reuses the existing match/gameboard concept but begins automatically 5 seconds after the gameboard
  opens rather than waiting on a manual start action, and returns the player to the tournament page
  (rather than elsewhere) via the gameboard's end-of-game "Back" action. Its result only counts
  toward tournament score/standings if the tournament had not already ended by the time the match
  concluded; its effect on players' global Elo rating is unconditional.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Any visitor can see how much time is left in a tournament and the current standings
  within 2 seconds of opening the tournament page.
- **SC-002**: 100% of newly formed pairings result in both matched players being navigated to the
  correct gameboard without manual action.
- **SC-003**: Every tournament match started via matchmaking begins play automatically within 5
  seconds of the gameboard opening, with no player-initiated start step.
- **SC-004**: 100% of players who click "Back" from a completed tournament match land on the correct
  tournament page with their updated standing visible.
- **SC-005**: A player who pauses their own matchmaking is never paired into a new match while
  paused, and regains eligibility within one pairing cycle of resuming.

## Assumptions

- This page is the destination of the existing dashboard Tournament tab's "View"/"Register" actions
  (spec 007-caro-game-dashboard) and is reached per-tournament (e.g. one page per tournament id).
- "Score" in the standings list is a tournament-specific point total computed by the existing
  server-side scoring engine (see FR-014), separate from the global Elo leaderboard shown on the
  dashboard (spec 007).
- Standings updates and new pairings are reflected live for participants on the page via the
  platform's existing realtime transport, consistent with the realtime conventions already
  established for the Lobby (spec 007) and gameboard (spec 008).
- The pairing algorithm itself (e.g. Swiss-system, random, rating-based) is an implementation detail
  and out of scope for this specification; this spec only defines the page's observable behavior
  once a pairing occurs.
- Tournament registration, capacity, and eligibility to appear in the standings at all are handled
  by the existing registration flow (spec 007); this spec assumes the participant is already
  registered before they reach this page.
- Guests (no active session) can view the tournament page but are never registered participants and
  are therefore never paired.
- A player who disconnects mid-match falls back to the existing match/gameboard disconnect handling
  (spec 008); this spec does not redefine that behavior.
