# Feature Specification: Caro Match & Leaderboard

**Feature Branch**: `005-caro-match-leaderboard`

**Created**: 2026-06-30

**Status**: Draft

**Input**: BRD sources: BRD-CARO-GAME-002 (Match) and BRD-CARO-GAME-004 (Leaderboard & Profile)

## Clarifications

### Session 2026-06-30

- Q: Can the second player exit a private match after accepting the invitation but before the creator presses Start? → A: Yes — the second player can leave; the match returns to "Looking for Opponent" and the creator can invite someone else.
- Q: Can a player be in multiple active match states simultaneously (e.g., queuing for Quick Pair while already in a match)? → A: No — a player may only hold one active participation state at a time (active match, pending join, or Quick Pair queue).
- Q: Is there a limit on how many draw requests a player can send in one match? → A: One pending draw request at a time — the sender must wait for the opponent to accept or decline before they may send another draw request.
- Q: When a viewer is muted, do their previously sent chat messages remain visible? → A: Yes — mute is prospective only; past messages remain visible to all; only future messages from the muted viewer are blocked.
- Q: Should the match history list on a player profile be paginated or show all matches at once? → A: Paginated — most recent matches displayed first, with the ability to load more on demand.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create and Join a Caro Match (Priority: P1)

A player wants to start a new game of Caro by selecting a board size and move time limit from the
available configurations. They can create a public game that any other player may join from the
lobby, or create a private game and invite a specific friend. They can also join an existing public
game directly from the lobby.

**Why this priority**: This is the entry point to all gameplay. Without the ability to create and
join a match, nothing else in this feature can be exercised. All other gameplay stories depend on
two players being in a match together.

**Independent Test**: Can be fully tested by having two players — one creates a public match, the
other joins via the lobby — then confirming both players reach the "waiting for Start" screen with
the correct configuration displayed.

**Acceptance Scenarios**:

1. **Given** a logged-in player, **When** they create a new public match by selecting a valid
   configuration, **Then** the match appears in the lobby under "Looking for Opponent" and the
   creator is shown a waiting screen.

2. **Given** a public match in "Looking for Opponent" status in the lobby, **When** another
   logged-in player clicks Join, **Then** that player becomes the second participant and the match
   transitions to "Waiting for Start."

3. **Given** a logged-in player who just created a private match, **When** they invite a specific
   friend by sending an in-app invitation, **Then** the friend receives a notification with Accept
   and Decline actions, and the match does not appear in the public lobby.

4. **Given** an invitation notification, **When** the invited friend clicks Accept, **Then** that
   friend joins as the second participant and both players are navigated to the match screen.

5. **Given** an invitation notification, **When** the invited friend clicks Decline, **Then** the
   creator receives a notification that the invitation was declined, and the match remains in
   "Looking for Opponent" so the creator can invite someone else.

6. **Given** a player who created a match still waiting for an opponent, **When** they cancel the
   match, **Then** the match is removed from the lobby and no result is recorded for either player.

---

### User Story 2 - Play a Caro Match to Completion (Priority: P1)

Once two players are in a match and the creator starts it, the gameplay proceeds move by move with
a per-move countdown. The match ends when one player gets five pieces in a row, the board fills
with no winner, a player runs out of move time, a player surrenders, or both players agree to a draw.

**Why this priority**: The core gameplay loop is the primary value of the feature. Every other
gameplay scenario (chat, spectating, ELO) depends on matches actually being played to completion.

**Independent Test**: Can be fully tested by starting a match and playing through to a win condition
(five in a row), verifying that the winner is correctly identified and the result is persisted to
both players' match histories and ELO ratings.

**Acceptance Scenarios**:

1. **Given** a match with two players, **When** the creator clicks Start within 15 seconds of both
   players being present, **Then** the system randomly assigns X (first move) and O to each player
   and the first player's move countdown begins.

2. **Given** a match with two players, **When** 15 seconds pass after both players are present
   without the creator clicking Start, **Then** the match is cancelled with no result recorded for
   either player.

3. **Given** an active match, **When** a player places a piece that creates five consecutive pieces
   in any direction (horizontal, vertical, or diagonal), **Then** the match ends immediately with
   that player as the winner.

4. **Given** an active match, **When** the board is completely filled with no player having five
   consecutive pieces, **Then** the match ends as a draw.

5. **Given** an active match, **When** the current player does not make a move before their move
   timer expires (including due to disconnection), **Then** that player loses the match immediately.

6. **Given** an active match, **When** a player sends a draw request and the opponent accepts,
   **Then** the match ends as a draw.

7. **Given** an active match, **When** a player sends a draw request and the opponent declines,
   **Then** the match continues and the move timer is unaffected.

8. **Given** an active match, **When** a player surrenders, **Then** the match ends with that
   player as the loser.

9. **Given** any completed match, **When** the result is recorded, **Then** both players' ELO
   ratings are recalculated and their match count and profile statistics are updated.

---

### User Story 3 - Quick Pair Automatic Matchmaking (Priority: P2)

A player who wants to play immediately without browsing the lobby can request automatic matchmaking
by choosing their preferred configuration. The system pairs them with another player waiting for the
same configuration.

**Why this priority**: Quick Pair reduces friction for finding an opponent and is the fastest path
to gameplay, but players can still find matches via the lobby in its absence.

**Independent Test**: Can be fully tested by having two players independently request Quick Pair
with identical configurations and verifying they are matched into a new public match and navigated
to the waiting-for-Start screen.

**Acceptance Scenarios**:

1. **Given** two players each requesting Quick Pair with the same board size and move time,
   **When** both requests are active simultaneously, **Then** the system creates a new public match
   pairing them and navigates both to the match waiting screen.

2. **Given** a player waiting in Quick Pair queue, **When** they cancel their request before being
   matched, **Then** they are removed from the queue and will not be paired with anyone.

3. **Given** a player waiting in Quick Pair, **When** no opponent with the same configuration is
   available, **Then** the player remains in queue until a match is found or they cancel.

---

### User Story 4 - In-Match Chat and Spectating (Priority: P2)

Logged-in viewers can watch any ongoing public match and participate in the match chat. Players
can mute specific viewers who are disruptive. Guests (unauthenticated users) can view the lobby
and match board but cannot chat or participate.

**Why this priority**: Chat and spectating add social value around the core game but are not
required for a match to be played and completed.

**Independent Test**: Can be tested independently by having a viewer join an ongoing public match,
sending a chat message, and verifying it is visible to both players and other viewers; then having
a player mute that viewer and verifying the viewer can no longer send messages in that match.

**Acceptance Scenarios**:

1. **Given** a logged-in player who is not a participant in a public match, **When** they view the
   match, **Then** they see the board state in real time and can send chat messages.

2. **Given** a participant in an active match, **When** they mute a specific viewer, **Then** that
   viewer cannot send new chat messages in this match but can still watch the game.

3. **Given** an unauthenticated guest, **When** they open the lobby or a public match page,
   **Then** they can see the match board and lobby list but no chat input or Join button is shown.

4. **Given** an active match, **When** a player wants to report an opponent or viewer, **Then**
   they can submit a report using the platform's standard report mechanism.

---

### User Story 5 - View the Leaderboard (Priority: P2)

Any user (player or guest) can view the top 10 players ranked by ELO rating. The leaderboard
reflects the current standings and updates whenever a player's ELO changes after a match.

**Why this priority**: The leaderboard provides competitive motivation but requires at least some
matches to have been played first; it has no dependency on new functionality beyond match results.

**Independent Test**: Can be tested independently by verifying the leaderboard shows exactly 10
players ordered by ELO descending, and that after a match result changes a player's ELO into the
top 10, the leaderboard reflects the new ranking.

**Acceptance Scenarios**:

1. **Given** at least 10 players have ELO ratings, **When** any user opens the leaderboard,
   **Then** they see exactly the 10 players with the highest ELO ratings, ordered from highest
   to lowest.

2. **Given** a match just ended and a player's new ELO surpasses the 10th-place ELO on the
   leaderboard, **When** the result is recorded, **Then** the leaderboard updates to show the
   new top 10.

---

### User Story 6 - View Player Profiles and Match History (Priority: P2)

Any logged-in player can view their own Caro profile or another player's profile. The profile shows
win/loss/draw statistics, total matches played, and a list of past matches with the ability to
review the move history of each match.

**Why this priority**: Profiles provide personal progress tracking and social transparency but are
read-only aggregations of data generated by completed matches.

**Independent Test**: Can be tested independently after at least one match has been completed by
navigating to the player's profile and verifying win/loss/draw counts, total matches, and the match
appearing in the history list; then replaying the match's move history.

**Acceptance Scenarios**:

1. **Given** a logged-in player, **When** they open their own Caro profile, **Then** they see their
   current ELO, total matches played, win/loss/draw counts and ratio, and a list of their past
   matches.

2. **Given** a logged-in player, **When** they view another player's Caro profile, **Then** they
   see that player's ELO, statistics, and match history.

3. **Given** a completed match appears in a player's profile, **When** the player opens that match
   entry, **Then** they can replay the full sequence of moves made during that match.

4. **Given** a player who has never played Caro, **When** they complete their first match,
   **Then** their profile is created with a starting ELO of 1200, the match is added to their
   history, and their statistics reflect the result.

5. **Given** a cancelled match (creator did not press Start in time), **When** the profiles of
   both involved players are viewed, **Then** that match does not appear in either player's match
   history and no ELO change is recorded.

---

### Edge Cases

- What happens when a player navigates to an invitation notification for a match that has already
  been cancelled, filled, or ended? The system shows a "match no longer available" screen; no
  action is taken.
- What happens when both players disconnect simultaneously during a match? The move timer continues
  on the server; whichever player's turn it is when the timer expires loses the match.
- What happens when exactly 10 players are tied for 10th place on the leaderboard? The leaderboard
  shows any 10 of them (tie-breaking is by most recent ELO update, as a reasonable default).
- What happens if a private match viewer attempts to access the match directly via URL? The system
  denies access; private matches are not visible to any user outside the two participants.
- What happens when a draw request arrives while the opponent is thinking? The move timer continues
  uninterrupted; the opponent can accept or decline without affecting their remaining move time.
- What happens when a player in an active match or Quick Pair queue tries to create or join another
  match? The system rejects the attempt and informs the player they must finish or exit their
  current state first.

## Requirements *(mandatory)*

### Functional Requirements

**Match Creation & Joining**

- **FR-001**: The system MUST allow a logged-in player to create a new Caro match by selecting a
  valid game configuration (board size and move time) and setting the match visibility to public
  or private.
- **FR-002**: The system MUST allow the match creator to invite a specific friend (from their
  friend list) to a match via an in-app notification containing Accept and Decline actions; this
  is the only way to add a second player to a private match.
- **FR-003**: The system MUST add an invited player as the second participant when they accept,
  and notify the creator when they decline — in both cases without changing the match status
  (the match remains "Looking for Opponent" after a decline).
- **FR-004**: The system MUST display public matches in "Looking for Opponent" or "In Progress"
  status in the lobby for all logged-in players and guests; a logged-in player may join a
  "Looking for Opponent" match directly from the lobby.
- **FR-005**: The system MUST completely hide private matches from the lobby and deny access to
  any user other than the two participants, regardless of role.
- **FR-006**: The system MUST allow the match creator to cancel their match while it is still
  "Looking for Opponent."
- **FR-006b**: The system MUST allow the second player to leave a match at any time after joining
  but before the creator presses Start; doing so returns the match to "Looking for Opponent" status
  so the creator can invite or accept another player.
- **FR-007**: When a player navigates to a match via a stale invitation (match cancelled, full,
  or ended), the system MUST show a "match no longer available" screen and take no further action.

**Quick Pair Matchmaking**

- **FR-008**: The system MUST allow a logged-in player to request Quick Pair by specifying a
  desired configuration (board size + move time); the system automatically pairs them with another
  player awaiting Quick Pair with the identical configuration, creating a new public match.
- **FR-008b**: The system MUST enforce a single active participation state per player: a player
  who is already in an active match, in the "Waiting for Start" phase, or in the Quick Pair queue
  MUST NOT be allowed to create, join, or queue for another match until their current state ends.
- **FR-009**: The system MUST allow a player to cancel a Quick Pair request at any time before
  being matched.

**Gameplay**

- **FR-010**: When both participants are present, the system MUST give the match creator exactly
  15 seconds to press Start; if Start is not pressed, the match is cancelled with no result for
  either player.
- **FR-011**: When Start is pressed, the system MUST randomly assign the X piece (first mover)
  and O piece to the two players and begin the first player's move countdown.
- **FR-012**: The move timer MUST reset to the configured duration after each valid move, applying
  to the opposing player's turn.
- **FR-013**: The system MUST declare a player the winner when they place a piece forming five
  consecutive pieces horizontally, vertically, or diagonally (no blocked-ends rule applied).
- **FR-014**: The system MUST declare a draw when the board is full and no player has five
  consecutive pieces.
- **FR-015**: The system MUST declare a loss for the player whose move timer expires, regardless
  of the reason (including disconnection); no skip or extra-turn mechanism exists.
- **FR-016**: The system MUST allow a player to send a draw request to their opponent; the
  opponent may accept (ending the match as a draw) or decline (match continues uninterrupted).
  A player may only have one pending draw request at a time — the system MUST prevent sending a
  new draw request until the opponent has responded to the current one.
- **FR-017**: The system MUST allow a player to surrender at any point during an active match,
  ending the match with that player as the loser.
- **FR-018**: During an active match, the system MUST display for each player: their own and
  their opponent's username, ELO, and win ratio, plus the remaining time on the current move.

**Chat, Spectating & Moderation**

- **FR-019**: The system MUST allow logged-in players and viewers to send chat messages in any
  public match they are viewing.
- **FR-020**: The system MUST allow a match participant to mute a specific viewer; a muted viewer
  cannot send new chat messages in that match but can still watch. Mute is prospective only —
  messages sent before the mute action remain visible to all participants and viewers.
- **FR-021**: The system MUST allow a match participant to report an opponent or viewer using the
  platform's standard report flow.
- **FR-022**: The system MUST allow guests to view the lobby and ongoing public matches (board
  state only); guests MUST NOT have access to chat input or join/participate actions.

**ELO Rating & Profile**

- **FR-023**: The system MUST create a Caro profile with a starting ELO of 1200 for a player the
  first time they complete a Caro match.
- **FR-024**: After every match that concludes with a definitive result (win, loss, or draw —
  including matches played inside a tournament), the system MUST recalculate both players' ELO
  ratings using the standard ELO formula (see Key Entities for parameters).
- **FR-025**: Cancelled matches (creator did not press Start) MUST NOT affect any player's ELO,
  match count, or profile statistics.
- **FR-026**: The system MUST provide a leaderboard showing exactly the top 10 players by ELO
  rating, updated after every ELO change.
- **FR-027**: The system MUST provide a player profile page showing: current ELO, total matches
  played, win/loss/draw counts and ratios, and a paginated list of completed matches ordered most
  recent first, with the ability to load additional pages on demand.
- **FR-028**: Any logged-in player MUST be able to view another player's Caro profile.
- **FR-029**: The system MUST allow a player to replay the full move history of any match that
  appears in a profile.

**Match History Display**

- **FR-030**: During a match, the system MUST display the list of usernames currently spectating
  (if any spectators are present).

### Key Entities

- **Match**: Represents one Caro game session. Attributes: configuration (board size, move time),
  visibility (public/private), status (looking for opponent / waiting for start / in progress /
  completed / cancelled), participants, move history, result (win/loss/draw/cancelled), timestamps,
  pending draw request (at most one at a time; cleared when opponent responds or match ends).
- **Move**: One placement on the board within a match. Attributes: player, board coordinates,
  sequence number, timestamp.
- **Player Profile (Caro)**: Per-player record of Caro activity. Attributes: current ELO rating,
  total matches played, wins, losses, draws, reference to match list. Initialised on first
  completed match with ELO 1200.
- **ELO Calculation Parameters**: Starting ELO = 1200. K-factor = 40 for players with fewer than
  30 completed matches (provisional stage); K-factor = 20 for players with 30 or more completed
  matches (stable stage). Each player in a match uses their own K-factor independently.
  Expected score formula: `E_A = 1 / (1 + 10^((R_B − R_A) / 400))`. New rating:
  `R_A' = R_A + K × (S_A − E_A)` where S_A = 1 (win), 0.5 (draw), 0 (loss).
- **Leaderboard Entry**: A snapshot view of rank, username, and ELO for a top-10 player.
- **Chat Message**: A message sent within a match. Attributes: sender, content, timestamp, match
  reference. Visibility is scoped to participants and non-muted viewers of that match.
- **Match Invitation**: A notification sent to a specific friend. Attributes: match reference,
  sender, recipient, status (pending / accepted / declined).
- **Quick Pair Request**: A matchmaking request from a player. Attributes: player, desired
  configuration, status (waiting / matched / cancelled).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Players can complete the full flow from "create match" to "game starts" in under
  60 seconds when a second player joins immediately.
- **SC-002**: Quick Pair matches two players with identical configurations within 30 seconds when
  a compatible opponent is already waiting.
- **SC-003**: The lobby list reflects new matches and status changes within 2 seconds for all
  viewers currently on the lobby screen.
- **SC-004**: The in-match move timer is accurate to within 1 second of the server's authoritative
  countdown as displayed on both players' screens simultaneously.
- **SC-005**: The leaderboard reflects updated ELO ratings within 5 seconds of a match result
  being recorded.
- **SC-006**: Player profiles display the correct win/loss/draw ratio and ELO at all times;
  no stale data is shown after a match completes.
- **SC-007**: 100% of completed matches (win/loss/draw) result in ELO updates for both players;
  0% of cancelled matches affect ELO.
- **SC-008**: Private matches are inaccessible to any user outside the two participants in 100%
  of cases; no lobby or URL-based access is possible.

## Assumptions

- The game configuration list (board sizes and move time options) is managed entirely by Game
  Admin (BRD-CARO-GAME-001) and must contain at least one active configuration for match creation
  to be possible.
- "Friend list" used for private match invitations is provided by the social/account domain
  (BRD-ACCOUNT-SOCIAL-002); a player can only invite users who are currently their friends.
- The report submitted via FR-021 is reviewed manually by platform admins; no automatic action
  is taken against reported users.
- Tournament matches participate in the same ELO formula and K-factor rules as regular matches;
  there is no separate ELO system for tournaments (BRD-CARO-GAME-003).
- ELO initial value (1200) and K-factor thresholds (40 for < 30 matches, 20 for ≥ 30 matches)
  are based on standard FIDE/USCF-style Elo conventions and are suitable for MVP; exact values
  are subject to confirmation before implementation (see Open Questions).
- The leaderboard shows a single all-time top-10 ranking by ELO; no time-windowed, seasonal,
  or tournament-specific leaderboards are in scope.
- Only the match creator can cancel a match outright. The second player (whether invited or joined
  via lobby) may leave a match before Start, which returns the match to "Looking for Opponent"
  rather than cancelling it; the creator then remains able to invite or accept another player.
- Match invitations do not expire automatically; they remain valid until accepted, declined, or
  invalidated by the match being cancelled or filled.
- The system does not limit the number of concurrent spectators on a single match.
- Quick Pair only matches players with exactly the same configuration (no fuzzy matching or
  config relaxation).
- The move timer is enforced server-side; client-displayed countdowns are for UX only and are
  never used as the source of truth for time-based decisions.
