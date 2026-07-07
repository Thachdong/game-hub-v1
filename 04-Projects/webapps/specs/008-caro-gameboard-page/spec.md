# Feature Specification: Caro Match Gameboard Page

**Feature Branch**: `008-caro-gameboard-page`

**Created**: 2026-07-07

**Status**: Draft

**Input**: User description: "Implement specs cho feature sau: Nội dung page gameboard: bên trái
hiển thị bàn cờ với số ô tương ứng với setting; bên phải chứa danh sách các components ứng với các
trạng thái: (1) chưa có đối thủ — player card bản thân, player card 'đang chờ đối thủ', danh sách
player views (nếu có), chat box; (2) có đối thủ (game chưa bắt đầu) — player card bản thân, player
card đối thủ, danh sách player views, button bắt đầu + countdown 15s (hết 15s chưa bắt đầu thì kết
thúc game), chat box; (3) đã bắt đầu game — player card bản thân, player card đối thủ, danh sách
player views, cta xin hoà/đầu hàng, chat box; (4) game đã kết thúc — player card bản thân, player
card đối thủ, danh sách player views, button xem lại các nước đã chơi, chat box. Note: guest
(chưa đăng nhập) chỉ có thể xem ván game đang diễn ra, không thể nhắn tin, report, xin hoà, move,
kick user khác."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Spectate a match without signing in (Priority: P1)

A visitor who has not signed in opens a specific match's gameboard page (e.g. via a shared link or
from the Lobby's "View" action) to watch the board, see who's playing, and follow the chat, in
whatever state that match currently happens to be in.

**Why this priority**: Spectating is the app's guest-facing entry point for a specific match and
must render correctly in every match state on its own before any player-only interaction is
layered on top — it's the foundation every other story in this feature builds on.

**Independent Test**: Can be fully tested by opening a match's gameboard URL with no active
session, for a match in each of the four states, and confirming the board, both player cards (or
the waiting placeholder), the viewer list, and the chat history all render, while Start, Request
Draw, Surrender, placing a move, Report, and kicking a viewer all redirect to the login page
instead of acting.

**Acceptance Scenarios**:

1. **Given** a visitor with no active session opens the gameboard for a match with only a creator
   present, **When** the page loads, **Then** they see the board sized to that match's configured
   board size, the creator's player card, a "waiting for opponent" placeholder in place of a
   second player card, the viewer list (if any other spectators are present), and the chat box
   with its existing message history.
2. **Given** a visitor with no active session viewing a match where both players are present but
   the game hasn't started, **When** they look at the right-hand column, **Then** they see both
   player cards, the viewer list, the Start control and its countdown, and the chat box, but
   clicking Start redirects them to the login page instead of starting the match (the same as it
   would for any non-creator).
3. **Given** a visitor with no active session viewing a match in progress, **When** they look at
   the board, **Then** it reflects every move played so far and updates live as new moves are
   made, and the "Request Draw"/"Surrender" CTAs are visible but redirect to login on click.
4. **Given** a visitor with no active session viewing a match that has ended, **When** they click
   "Review Moves", **Then** they can step through the recorded move sequence on the board without
   needing to sign in.
5. **Given** a visitor with no active session viewing any match, **When** they type into the chat
   box and try to send, or click Report on a player, or try to kick/mute an entry in the viewer
   list, **Then** each of those attempts redirects them to the login page instead of succeeding.

---

### User Story 2 - Wait for an opponent in a match you created (Priority: P2)

A signed-in player who created or joined a match, and is currently its only participant, opens the
gameboard and waits for a second player to arrive.

**Why this priority**: This is the state a player lands in immediately after creating a game
(spec 007's Create Game flow) or before anyone else joins, so it must work before the rest of the
match lifecycle can be exercised end to end.

**Independent Test**: Can be fully tested by a signed-in player opening the gameboard for a match
they created with no second player yet, and confirming their own card, a waiting placeholder, and
the chat box render, then confirming the waiting placeholder is replaced by the opponent's player
card the moment a second player joins, without a page reload.

**Acceptance Scenarios**:

1. **Given** a signed-in player viewing their own match with no opponent yet, **When** the page
   renders, **Then** they see their own player card, a "waiting for opponent" placeholder, the
   viewer list (if any spectators are watching), and the chat box.
2. **Given** a signed-in player waiting for an opponent, **When** another player joins the match,
   **Then** the waiting placeholder is replaced by the opponent's player card and the countdown
   appears for both players, with the Start control enabled only for whichever of them created the
   match, without the page being reloaded.

---

### User Story 3 - Start a match before the countdown runs out (Priority: P2)

Once a second player has joined, the match's creator starts it within a 15-second window, or the
match ends automatically if they don't.

**Why this priority**: This is the gate between "matched" and "playing" — without it, a match with
two players can never progress to actual gameplay, so it's the next most critical slice after the
waiting state.

**Independent Test**: Can be fully tested by having two signed-in players join the same match and
confirming that only the creator's Start control is enabled and clicking it begins the match for
both, and separately, by letting the 15-second countdown expire with the creator not clicking
Start and confirming the match ends for both.

**Acceptance Scenarios**:

1. **Given** two signed-in players present in a not-yet-started match, **When** the match's
   creator clicks Start before the countdown reaches zero, **Then** the match transitions to
   in-progress for both players and the CTA area switches to Request Draw/Surrender.
2. **Given** two signed-in players present in a not-yet-started match, **When** the non-creator
   participant views the Start control, **Then** it is rendered visibly disabled and clicking it
   has no effect — only the creator can start the match.
3. **Given** two signed-in players present in a not-yet-started match, **When** the 15-second
   countdown reaches zero with the creator not having clicked Start, **Then** the match ends
   automatically with no winner, and both players see the ended state without further action.
4. **Given** a signed-in player viewing this state, **When** they read the countdown, **Then** its
   remaining time is computed from a server-provided deadline rather than the moment the page
   happened to load in their own browser.

---

### User Story 4 - Play an active match (Priority: P1)

The two players in an in-progress match place moves on the board and, if they choose to, request
a draw or surrender instead of continuing.

**Why this priority**: This is the core gameplay loop the entire feature exists to support, so it
ranks alongside spectating as top priority.

**Independent Test**: Can be fully tested by two signed-in players placing alternating moves on the
board and confirming each move appears for both in real time, and separately, by one player
clicking "Request Draw" or "Surrender" and confirming the match ends accordingly for both.

**Acceptance Scenarios**:

1. **Given** an in-progress match, **When** it's a signed-in participant's turn, **Then** they can
   place a move on the board and it appears for the opponent and any viewers without a page
   reload.
2. **Given** an in-progress match, **When** a signed-in participant clicks "Request Draw", **Then**
   their opponent is presented with the request and the match ends in a draw only if the opponent
   accepts.
3. **Given** an in-progress match, **When** a signed-in participant clicks "Surrender", **Then**
   the match ends immediately with their opponent as the winner.

---

### User Story 5 - Review a finished match's moves (Priority: P3)

Any viewer of a match that has ended — either player, a spectator, or a guest — steps through the
full sequence of moves that were played, in order, on the board.

**Why this priority**: Reviewing past moves is a valuable but secondary feature that only becomes
relevant once a match has already concluded, and it doesn't block any other story from being
demoed independently.

**Independent Test**: Can be fully tested by opening a finished match's gameboard, clicking "Review
Moves", and confirming the board can be stepped forward and backward through every recorded move
in the correct order.

**Acceptance Scenarios**:

1. **Given** a finished match's gameboard, **When** any viewer clicks "Review Moves", **Then** the
   board enters a step-through mode showing each recorded move in sequence, while the player
   cards, viewer list, and chat box remain visible.

---

### Edge Cases

- What happens when the opponent leaves or disconnects while the match is still waiting to start
  (state 2, before the countdown expires)? The match reverts to the "waiting for opponent" state
  (state 1) rather than ending, since no game has begun yet.
- What happens when the non-creator participant clicks Start? Nothing happens — Start only takes
  effect for the match's creator; the non-creator sees the same countdown with the Start control
  rendered visibly disabled, rather than an error, a hidden control, or a usable one.
- What happens when a signed-in spectator (not one of the two match participants) tries to click
  Start, Request Draw, Surrender, or place a move? The action is rejected the same way a guest's
  would be, since those actions are reserved for the two match participants (and Start further
  reserved for the creator specifically) — sign-in alone is not sufficient.
- What happens when a signed-in spectator tries to send a chat message or click Report? It
  succeeds — chat and Report are gated by sign-in status, not by participant status.
- What happens when a match ends because a player surrendered, disconnected, or ran out of time on
  a move, rather than by checkmate or accepted draw? The gameboard still shows the ended state
  (both cards, viewer list, Review Moves, chat) regardless of which ending reason applies.
- What happens when a viewer who has been muted/kicked by a participant tries to send another chat
  message? Their message is rejected the same way a guest's would be, while they continue to see
  the board, player cards, viewer list, and existing chat history — "kick" and "mute" refer to the
  same single moderation action (blocking future chat sends), not a removal from viewing.
- What happens when there are no spectators at all? The viewer list area is omitted or shown empty
  rather than as an error.
- What happens when a signed-in spectator's seat "opens up" (e.g., a participant disconnects)? Out
  of scope for this feature — a spectator never becomes a match participant during the same
  session; only the original two participants can occupy those seats.
- What happens when one participant surrenders at nearly the same moment the other sends a draw
  request (or any two match-ending/mutating actions race each other)? The server enforces a single
  authoritative state transition; whichever action the server processes first ends (or advances)
  the match, and any conflicting action that arrives after MUST be rejected as a no-op because the
  match is no longer in the state that action requires.
- What happens when a participant's session expires or their sign-in becomes invalid mid-match?
  Their next attempt at any gated action (Start, Request Draw, Surrender, placing a move, Report,
  chat, viewer kick/mute) MUST be treated the same as a guest's — redirected to the login page —
  rather than silently failing or being treated as still-authorized.

### Actor Definitions

Every viewer of the gameboard page falls into exactly one of these categories:

- **Guest**: No active session. Full read access; every gated action redirects to login.
- **Signed-in spectator**: An authenticated user who is not one of the match's two participants.
  Same read access as a guest; chat and Report are available (sign-in is sufficient); Start,
  Request Draw, Surrender, move placement, and viewer kick/mute are not — attempting any of them is
  rejected the same way a guest's attempt would be.
- **Match participant**: One of the two players seated in the match (the creator or the player who
  joined). Can chat, Report, place moves (when it's their turn and the match is in progress),
  request a draw, surrender, and kick/mute viewer-list entries. Cannot start the match unless they
  are also the creator.
- **Match creator**: The participant who created the match. The only actor who can click Start to
  effect the transition out of the pre-start countdown.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The gameboard page MUST render a two-column layout: the board on the left, sized to
  the match's configured board size (rows × columns), and a state-dependent set of components on
  the right.
- **FR-002**: The board MUST reflect the match's actual recorded moves at all times — empty before
  any moves exist, showing every placed move as the match progresses, and showing the final board
  once the match has ended.
- **FR-003**: When no second player has joined, the right column MUST show: the viewer's own
  player card, a "waiting for opponent" placeholder in place of a second player card, the viewer
  list (when non-empty), and the chat box.
- **FR-004**: When a second player has joined but the match hasn't started, the right column MUST
  show: both player cards, the viewer list (when non-empty), a Start control with a 15-second
  countdown, and the chat box. The Start control MUST only take effect for the match's creator; for
  the other participant it MUST be rendered visibly disabled (present but non-interactive) rather
  than hidden or silently inert, so the difference between "not my turn to start" and "broken
  control" is visually clear.
- **FR-005**: The 15-second countdown MUST be computed from a server-provided deadline timestamp;
  the viewer's local clock MUST NEVER be treated as the source of truth for its remaining time.
- **FR-006**: If the creator does not click Start before the countdown reaches zero, the match MUST
  end automatically with no winner, and both players MUST see the ended state without further
  action from either of them.
- **FR-007**: Once the match is in progress, the right column MUST show: both player cards, the
  viewer list (when non-empty), "Request Draw" and "Surrender" CTAs, and the chat box. Once a draw
  request is sent, the accept/decline prompt it produces MUST be actionable only by the other match
  participant; no spectator, guest, or the requester themselves may accept or decline it.
- **FR-008**: Once the match has ended (by completion, draw, surrender, or automatic cancellation),
  the right column MUST show: both player cards, the viewer list (when non-empty), a "Review
  Moves" control, and the chat box.
- **FR-009**: The "Review Moves" control MUST let any viewer step through the match's full recorded
  move sequence, in order, on the board.
- **FR-010**: The chat box MUST be present in all four states and MUST show the full existing
  message history to every viewer, including guests.
- **FR-011**: The viewer list, whenever it has at least one entry, MUST be shown in all four
  states; it MUST be omitted or shown empty (not an error) when there are no spectators.
- **FR-012**: Guests (no active session) MUST be able to view the gameboard — the board, both
  player cards or the waiting placeholder, the viewer list, and the chat history — for a match in
  any of the four states, matching the app's existing guest read-access convention (spec
  006-caro-guest-access). Signed-in spectators (non-participants) MUST have this same full
  read-access across all four states — sign-in never restricts what can be viewed, only which
  actions can be performed.
- **FR-013**: Guests MUST see the same Start, Request Draw, Surrender, move-placement, chat-send,
  Report, and viewer-kick/mute controls a signed-in participant would see, and only in the match
  state(s) where that control exists at all (e.g., Start only appears during the pre-start
  countdown; Request Draw/Surrender/move-placement only while in progress); clicking or submitting
  any of them MUST redirect the guest to the login page instead of performing the action, with the
  redirect including a callback back to this match's gameboard so the guest returns to it after
  signing in, matching the app's existing redirect-to-login convention (spec
  002-login-layout-nextauth FR-009; spec 007-caro-game-dashboard FR-008/FR-009/FR-013/FR-015).
- **FR-014**: Requesting a draw, surrendering, and placing a move MUST be restricted to the match's
  two participants; a signed-in visitor who is not one of the two participants MUST be redirected
  the same way a guest would be when attempting any of these. Starting the match MUST be further
  restricted to the match's creator specifically — the other participant, though signed in and a
  match participant, MUST NOT be able to start it.
- **FR-015**: Sending a chat message and using Report MUST be available to any signed-in viewer
  (a participant or a spectator), not just the two match participants; only sign-in status gates
  these two actions. Report's target is the match's other player shown on the gameboard (a
  participant reports their opponent; a spectator reports either player), not other spectators or
  viewers.
- **FR-016**: "Kicking" and "muting" a viewer-list entry both refer to the same single moderation
  action — blocking that viewer's ability to send chat messages, while they continue to view the
  match — available only to the match's two participants. This control MUST be visible to every
  viewer per FR-013, but MUST NOT produce any effect for guests and non-participant spectators.
- **FR-017**: Every state transition (opponent joining, match starting, moves being placed, the
  match ending), every new chat message, and every viewer list change MUST be reflected for all
  current viewers live, via the platform's realtime transport, without requiring a manual refresh
  or page reload.

### Key Entities

- **Gameboard**: The match's board area — a grid sized to the match's configured board size,
  showing all moves placed so far, or (in review mode) any single step of the recorded move
  history.
- **Own Player Card**: A summary of the current viewer's own player identity when they are one of
  the two match participants — username, Elo, and current-turn/status indicator.
- **Opponent Player Card**: The same summary for the other match participant, shown once a second
  player has joined.
- **Waiting-for-Opponent Placeholder**: Shown in place of the Opponent Player Card before a second
  player has joined.
- **Viewer List / Viewer Entry**: The set of spectators currently watching the match; each entry
  may be muted/kicked by a match participant — one single moderation action (blocks future chat
  sends; viewing is unaffected), regardless of which of the two words is used to refer to it.
- **Pre-Start Countdown**: The 15-second window, anchored to a server-provided deadline, during
  which the match's creator may click Start before the match is automatically cancelled.
- **In-Game Actions**: The Request Draw and Surrender controls available to the two participants
  once the match is in progress.
- **Move Replay**: The step-through view of the match's full recorded move sequence, available
  once the match has ended.
- **Chat Message**: A single message in the match's chat history, visible to every viewer;
  sendable only by signed-in viewers.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A guest opening a match's gameboard link sees the board, player cards (or waiting
  placeholder), viewer list, and chat history for that match's current state immediately, with no
  sign-in prompt blocking any of that read-only content.
- **SC-002**: 100% of guest or non-participant attempts to perform each of the following redirect
  to the login page instead of performing the action, measured independently per action: (a) Start,
  (b) Request Draw, (c) Surrender, (d) placing a move, (e) Report, (f) kicking or muting a viewer.
- **SC-003**: When a second player joins a waiting match, both players see the opponent's card and
  the Start countdown appear within a few seconds, with no manual refresh.
- **SC-004**: If the creator does not click Start within the 15-second window, the match ends
  automatically for both players within 1 second of the countdown reaching zero.
- **SC-005**: A signed-in participant can request a draw or surrender in a single click at any
  point while the match is in progress.
- **SC-006**: Moves placed by either participant appear for the opponent and all viewers within a
  few seconds, with no manual refresh.
- **SC-007**: After a match ends, any viewer can step through 100% of the match's recorded moves,
  in the exact order they were played.
- **SC-008**: 0% of Start clicks by anyone other than the match's creator (the other participant,
  a spectator, or a guest) ever transition the match out of the pre-start countdown; the control
  renders as visibly disabled/inert for all of them, every time.

## Assumptions

- Guests can view the gameboard for a match in any of its four states (waiting, pre-start,
  in-progress, ended) — not only while a match is "in progress" — consistent with the read access
  already granted to match viewing by spec 006-caro-guest-access, which lifted the sign-in
  requirement for retrieving a single match's state regardless of status.
- Every action control this feature restricts (Start, Request Draw, Surrender, move placement,
  Report, viewer kick/mute) remains visible to guests; only the click behavior differs (redirect
  to login), matching the app's existing `RequireSignIn` convention already applied to the
  placeholder Chat/Report/Play buttons in `MatchActionButtons` and formalized in spec
  007-caro-game-dashboard.
- Only the match's creator may click Start once an opponent has joined (matching the backend's
  creator-only authorization for this action); the joining player sees the same countdown but no
  usable Start control of their own, rather than a separate per-player "ready" confirmation step.
- When the pre-start countdown elapses with no Start click from the creator, the match ends without
  a winner (a cancellation outcome), and both players are shown the ended state.
- "Report" targets the opponent and is available to any signed-in viewer (participant or
  spectator); it is not restricted to the two match participants the way Start/Draw/Surrender/Move
  are.
- Viewer kick/mute is available only to the two match participants, consistent with the existing
  `muteMatchViewer` capability already exposed by the service layer.
- Reviewing past moves replays the recorded move sequence step-by-step on the same board area used
  during live play, rather than opening a separate page or view.
- The board's row/column count is fully determined by the match's configured board size; no
  additional sizing control exists on this page.
- Chat message history remains visible to every viewer, including guests, in all four states; only
  sending a new message requires sign-in.
- A signed-in spectator never becomes a match participant during the same session (e.g., by filling
  a seat vacated by a disconnected player); reseating/rejoining as a participant is out of scope for
  this feature.
