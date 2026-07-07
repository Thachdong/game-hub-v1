# Feature Specification: Caro Game Dashboard

**Feature Branch**: `007-caro-game-dashboard`

**Created**: 2026-07-07

**Status**: Draft

**Input**: User description: "Tạo spec cho game caro dashboard với nội dung như sau: Tab với 3 items: Lobby, Tournament, Quick pair; leaderboard top 10 Elo bên phải; card thông tin cho từng tab (Lobby: username/elo/game type/join+view + nút tạo game; Tournament: title/loại game/thời gian/số đăng ký + view/register; Quick pair: số bàn cờ/time + tìm & match); modal tạo game; guest chỉ xem, các nút join/create game/register tournament bị ẩn."

## Clarifications

### Session 2026-07-07

- Q: Is a player's Elo rating a single global number, or tracked separately per game type (board
  size + time control)? → A: Single global Elo — one rating per player used consistently across
  the leaderboard, Lobby cards, and Quick Pair matching.
- Q: What defines the "game type" shown on Lobby/Tournament cards and used for Quick Pair
  matching? → A: Board size + time control only (e.g. "15x15 Rapid 10min") — no additional Caro
  rule variants are modeled.
- Q: When another player creates or joins a match, should the Lobby list update live for everyone
  viewing it, or is a manual refresh acceptable for v1? → A: Live update via the platform's
  realtime transport (WebSocket/SSE), consistent with the constitution's realtime mandate for
  matchmaking/game-state features.
- Q: Should Join/Create Game/Register/Find Match be hidden entirely for guests, or shown with a
  redirect-to-login on click (matching the app's existing `RequireSignIn` pattern and spec
  002-login-layout-nextauth's FR-009)? → A: Match the existing app convention — show these actions
  to guests too; clicking one redirects to `/login` instead of hiding the control.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse the game dashboard without an account (Priority: P1)

A visitor who has not signed in opens the Caro game dashboard to see what's going on before
deciding whether to create an account: who's currently playing, what tournaments are coming up,
what quick-pair options exist, and who the top players are.

**Why this priority**: This is the entry point for every visitor, signed in or not, and it must
stand on its own as a complete, useful experience — it's what convinces a visitor there's
something worth signing up for. Every other story builds on this view existing and rendering
correctly first.

**Independent Test**: Can be fully tested by loading the dashboard with no active session and
confirming all three tabs (Lobby, Tournament, Quick Pair) and the leaderboard render their
read-only content, and that Join/Create Game/Register/Find Match controls are visible but redirect
to login instead of performing their action.

**Acceptance Scenarios**:

1. **Given** a visitor with no active session, **When** they open the game dashboard, **Then**
   they see the Lobby, Tournament, and Quick Pair tabs and the leaderboard panel, all populated
   with current data.
2. **Given** a visitor with no active session viewing the Lobby tab, **When** they look at a match
   card, **Then** they see the creator's username, Elo, and game type, a "View" action, and a
   "Join" action that redirects them to the login page when clicked.
3. **Given** a visitor with no active session viewing the Tournament tab, **When** they look at a
   tournament card, **Then** they see the title, game type, start time, and registered-participant
   count, a "View" action, and a "Register" action that redirects them to the login page when
   clicked.
4. **Given** a visitor with no active session viewing the Quick Pair tab, **When** they look at a
   game-type card, **Then** they see its board size and time control, and a matching action that
   redirects them to the login page when clicked.
5. **Given** a visitor with no active session, **When** they look at the leaderboard, **Then**
   they see up to 10 entries ranked by Elo (avatar, username, Elo), with ranks 1–3 highlighted and
   no "You" badge shown anywhere.

---

### User Story 2 - Join an open match from the Lobby (Priority: P2)

A signed-in player browses the Lobby tab and joins an open match created by another player.

**Why this priority**: Joining an existing match is the fastest path to actually playing and is
the core loop the Lobby exists to support, so it ranks just behind the baseline browsing
experience.

**Independent Test**: Can be fully tested by signing in, opening the Lobby tab, and clicking
"Join" on an open match card, confirming the player is taken into that match.

**Acceptance Scenarios**:

1. **Given** a signed-in player viewing the Lobby tab, **When** they click "Join" on an open match
   card, **Then** they are added to that match and taken to its match view.
2. **Given** a signed-in player viewing the Lobby tab, **When** they click "View" on a match card,
   **Then** they see that match's read-only detail view without joining it.

---

### User Story 3 - Create a new game from the Lobby (Priority: P2)

A signed-in player who doesn't see a suitable open match creates their own via the Create Game
modal, and it appears in the Lobby for others to join.

**Why this priority**: Creating a game is the supply side of the same Lobby loop as joining
(Story 2) — without it, the Lobby has nothing new for other players to join — so it shares the
same priority.

**Independent Test**: Can be fully tested by signing in, opening the Create Game modal from the
Lobby tab, submitting valid game settings, and confirming a new card for that match appears in the
Lobby list.

**Acceptance Scenarios**:

1. **Given** a signed-in player viewing the Lobby tab, **When** they click "Create Game" and
   submit the modal with valid settings, **Then** a new match card reflecting those settings
   appears in the Lobby list.
2. **Given** a visitor with no active session, **When** they click "Create Game" on the Lobby tab,
   **Then** they are redirected to the login page instead of the modal opening.

---

### User Story 4 - Register for an upcoming tournament (Priority: P3)

A signed-in player browses the Tournament tab and registers for an upcoming tournament.

**Why this priority**: Tournaments are a secondary engagement mode layered on top of the core
Lobby loop, valuable but not required for the dashboard's baseline usefulness.

**Independent Test**: Can be fully tested by signing in, opening the Tournament tab, and clicking
"Register" on an upcoming tournament card, confirming the player's registration is recorded and
the participant count updates.

**Acceptance Scenarios**:

1. **Given** a signed-in player viewing the Tournament tab, **When** they click "Register" on a
   tournament card, **Then** they are registered for that tournament and the card's registered
   count reflects it.
2. **Given** a signed-in player viewing the Tournament tab, **When** they click "View" on a
   tournament card, **Then** they see that tournament's read-only detail view without registering.

---

### User Story 5 - Get matched instantly via Quick Pair (Priority: P3)

A signed-in player picks a board size and time control from the Quick Pair tab and is matched into
a game against another player looking for the same setup.

**Why this priority**: Quick Pair is a convenience alternative to browsing the Lobby manually,
valuable for players who just want to play now, but not required for the dashboard's baseline
usefulness.

**Independent Test**: Can be fully tested by signing in, opening the Quick Pair tab, and clicking
the matching action on a game-type card, confirming a match search starts and a game begins once
an opponent is found.

**Acceptance Scenarios**:

1. **Given** a signed-in player viewing the Quick Pair tab, **When** they click the matching
   action on a game-type card, **Then** the system searches for an opponent with the same board
   size and time control and starts a match once one is found.

---

### Edge Cases

- What happens when a signed-in player's session expires between loading the dashboard and the
  moment they click Join, Create Game, Register, or Find Match? The click MUST redirect them to
  the login page instead of silently failing or erroring — the same outcome a guest clicking that
  control gets, since the check happens at click time, not at page-render time.
- What happens when there are fewer than 10 ranked players? The leaderboard shows however many
  exist, with no placeholder entries.
- What happens when the signed-in viewer is not among the top 10 players? No "You" badge is shown
  anywhere on the leaderboard.
- What happens when a guest clicks "View" on a Lobby match or Tournament card? They see the same
  read-only detail view a signed-in user would see — "View" is not gated by sign-in status.
- What happens when the Lobby, Tournament, or Quick Pair tab has no cards to show (e.g. no open
  matches, no upcoming tournaments)? The tab shows an empty state rather than an error.
- What happens when a signed-in player tries to register for a tournament they're already
  registered for, or join a match that just filled up / started? The action is rejected with a
  clear reason rather than silently succeeding or crashing.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST display a game dashboard with three tabs — Lobby, Tournament, and
  Quick Pair — plus a persistent leaderboard panel, viewable by any visitor regardless of
  sign-in status.
- **FR-002**: The leaderboard MUST show up to the top 10 players ranked by Elo rating, each with
  an avatar, a display username, and their Elo rating.
- **FR-003**: The system MUST derive each displayed username (on leaderboard entries, Lobby
  cards, and Tournament cards) from the portion of the associated account's email address that
  precedes the "@" character.
- **FR-004**: The leaderboard MUST visually highlight the entries ranked #1, #2, and #3 distinctly
  from the rest.
- **FR-005**: The leaderboard MUST show a "You" badge on the current signed-in viewer's own entry
  when that viewer appears within the top 10; guests and signed-in viewers outside the top 10 see
  no such badge.
- **FR-006**: The Lobby tab MUST list open matches as cards, each showing the creator's username,
  their Elo rating, and the game type (a board-size + time-control combination, e.g. "15x15 Rapid
  10min").
- **FR-007**: Each Lobby match card MUST offer a "View" action, available to every visitor, that
  opens that match's read-only detail view.
- **FR-008**: Each Lobby match card MUST offer a "Join" action, visible to every visitor; for a
  visitor with no active session, clicking it MUST redirect to the login page instead of joining
  the match.
- **FR-009**: The Lobby tab MUST offer a "Create Game" action, visible to every visitor, that
  opens the Create Game modal; for a visitor with no active session, clicking it MUST redirect to
  the login page instead of opening the modal.
- **FR-010**: The Create Game modal MUST let a signed-in user specify, at minimum, a board size,
  a time control, and match visibility, and MUST add the resulting match to the Lobby list on
  submission.
- **FR-011**: The Tournament tab MUST list tournaments as cards, each showing the tournament
  title, game type (a board-size + time-control combination), scheduled start time, and current
  registered-participant count.
- **FR-012**: Each Tournament card MUST offer a "View" action, available to every visitor, that
  opens that tournament's read-only detail view.
- **FR-013**: Each Tournament card MUST offer a "Register" action, visible to every visitor; for a
  visitor with no active session, clicking it MUST redirect to the login page instead of
  registering.
- **FR-014**: The Quick Pair tab MUST list available game types as cards, each showing that
  type's board size and time control.
- **FR-015**: Each Quick Pair card MUST offer a matching action, visible to every visitor; for a
  visitor with no active session, clicking it MUST redirect to the login page instead of starting
  a match search.
- **FR-016**: Guests (no active session) MUST retain full access to all read-only content on the
  dashboard — tabs, cards, "View" actions, and the leaderboard — and MUST see the same Join,
  Create Game, Register, and Find Match controls a signed-in user sees; only the click behavior
  differs (redirect to login instead of performing the action).
- **FR-017**: This same redirect-to-login behavior on Join, Create Game, Register, and Find Match
  applies uniformly whether the visitor was never signed in or was signed in at page load but has
  no active session by the time they click — the check MUST happen at click time, not at
  page-render time.
- **FR-018**: Each player's Elo rating MUST be a single global value, used consistently on the
  leaderboard, Lobby cards, and Quick Pair matching — Elo MUST NOT be tracked separately per board
  size or time control.
- **FR-019**: The system MUST offer the same fixed set of game types (board-size + time-control
  combinations) across the Lobby's game-type field, the Tournament's game-type field, and the
  Quick Pair tab's cards.
- **FR-020**: The Lobby list — including new matches, matches being joined, and matches filling
  up — MUST update live for every viewer via the platform's realtime transport (WebSocket/SSE),
  without requiring a manual refresh or page reload.

### Key Entities

- **Leaderboard Entry**: A ranked player summary shown in the top-10 panel — avatar, display
  username, global Elo rating, rank, whether it belongs to the current viewer.
- **Lobby Match Card**: An open match as shown in the Lobby — creator's username, creator's global
  Elo, game type (board size + time control), and available actions (View, and Join — Join
  redirects a visitor with no active session to login instead of joining). Updates live for all
  viewers as matches are created, joined, or filled.
- **Tournament Card**: An upcoming or in-progress tournament — title, game type (board size + time
  control), start time, registered-participant count, and available actions (View, and Register —
  Register redirects a visitor with no active session to login instead of registering).
- **Game Type**: A board-size + time-control combination (e.g. "15x15 Rapid 10min"); the same
  fixed set of game types is used on Lobby cards, Tournament cards, and Quick Pair cards.
- **Quick Pair Option**: A supported game type (board size + time control) offered for instant
  matching; its matching action redirects a visitor with no active session to login instead of
  starting a search.
- **Create Game Submission**: The set of choices a signed-in user makes in the Create Game modal
  (board size, time control, visibility) that produces a new Lobby Match Card.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time visitor can view all three tabs and the leaderboard without creating an
  account, with no sign-in prompt blocking any read-only content.
- **SC-002**: 100% of Join, Create Game, Register, or Find Match clicks by a visitor with no
  active session redirect to the login page instead of performing the action.
- **SC-003**: A signed-in player can go from opening the Lobby tab to joining an open match in 2
  clicks or fewer.
- **SC-004**: A signed-in player can create a new game and see it appear in the Lobby list within
  the same session, with no page reload required.
- **SC-005**: The leaderboard's top-10 ordering and Elo values always match the current standings
  at the time of page load, with ranks 1–3 visually distinguishable at a glance.
- **SC-006**: A match created or joined by one player appears (or updates) in every other viewer's
  Lobby list within a few seconds, with no manual refresh or page reload required.

## Assumptions

- Guests see the same Join, Create Game, Register, and Find Match controls a signed-in user sees;
  clicking one with no active session redirects to the login page instead of performing the
  action. This matches the app's existing guest-gating convention (spec 002-login-layout-nextauth
  FR-009, implemented today via the `RequireSignIn` component used for match-view actions), rather
  than hiding the controls outright.
- "View" actions on Lobby and Tournament cards are available to everyone, consistent with the
  existing guest access already granted to the match lobby list and match detail view.
- The Create Game modal's minimum required fields are board size, time control, and visibility;
  additional configuration (handicap, private invite codes, custom rule variants) is out of scope
  unless specified later.
- Quick Pair matching pairs a player with another player seeking the same board size and time
  control; queue/timeout/cancellation behavior is a planning-level concern, not specified here
  beyond "search and match on click."
- Tournament registration in this spec covers only the register action and participant count
  displayed on the card; capacity limits, waitlists, and withdrawal are out of scope unless
  specified later.
- Leaderboard tie-breaking when two players share the same Elo is a cosmetic display detail (e.g.,
  most recent rating change first) and does not affect functional scope.
