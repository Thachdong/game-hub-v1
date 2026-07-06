# Feature Specification: Caro Guest (Unauthenticated) Access

**Feature Branch**: `007-caro-guest-access`

**Created**: 2026-07-06

**Status**: Draft

**Input**: User description: "Kiểm tra các API đã tạo sao cho trang game caro (lobby, tournament, gameboard) có thể truy cập được bởi user chưa đăng nhập. Không được phép: join game, chat trong game, register vào tournament, tạo game, ghép cặp nhanh — khi làm những điều trên UI sẽ navigate user đến trang login. Được phép: xem danh sách game đang chờ/đang diễn ra, xem game đang diễn ra/đang chờ, xem tournament đang diễn ra."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Guest Browses the Lobby and Tournament Listings (Priority: P1)

A visitor who has not logged in opens the lobby page and the tournament page. They see the full list of matches that are waiting for a second player or currently in progress, and the full list of tournaments, exactly as a logged-in player would.

**Why this priority**: Browsing is the entry point to the whole Caro experience. If a guest cannot even see what's happening, there is nothing to convert them into a logged-in, engaged player.

**Independent Test**: Can be fully tested by requesting the lobby listing and the tournament listing with no session/credentials present and confirming the same data an authenticated player would see is returned, with no login prompt.

**Acceptance Scenarios**:

1. **Given** a visitor has not logged in, **When** they open the lobby, **Then** they see all public matches that are waiting for a player or in progress, including basic details (board size, timer, status, players).
2. **Given** a visitor has not logged in, **When** they open the tournament list, **Then** they see all tournaments regardless of status, exactly as a logged-in player would.

---

### User Story 2 - Guest Watches an In-Progress or Waiting Match (Priority: P1)

A visitor picks a match from the lobby (waiting for a player, or already in progress) and opens it. They can watch the board, see every move as it's made, see whose turn it is and the countdown timer, and see the outcome once the match ends — all without logging in.

**Why this priority**: Watching a live game is the core spectator experience and the single biggest driver of interest for someone who hasn't created an account yet.

**Independent Test**: Can be fully tested by opening a specific public match's detail page and its move history as a guest, and by confirming new moves made by the two players appear on the guest's screen in real time, with no authentication required at any point.

**Acceptance Scenarios**:

1. **Given** a public match is waiting for a second player, **When** a guest opens that match, **Then** the guest sees the match's current state (players so far, config, status) without being asked to log in.
2. **Given** a public match is in progress, **When** a guest opens that match, **Then** the guest sees the current board, move history, whose turn it is, and the timer.
3. **Given** a guest is watching an in-progress match, **When** either player makes a move, **Then** the guest's view updates with the new move without requiring a page login or reload.
4. **Given** a guest is watching a match, **When** the match ends (win, draw, or surrender), **Then** the guest sees the final result.

---

### User Story 3 - Guest Views a Tournament in Progress (Priority: P1)

A visitor opens a tournament — whether it's still open for registration or already running — and can see its schedule, elo requirement, game rules, and the live, ranked participant list, without logging in.

**Why this priority**: Tournaments are a community/competitive showcase; letting guests watch the leaderboard live is what makes them want to create an account and join the next one.

**Independent Test**: Can be fully tested by opening a tournament's detail page and its participant list as a guest and confirming both are returned with no authentication, and that the participant list reflects score changes as they happen.

**Acceptance Scenarios**:

1. **Given** a tournament exists in any status, **When** a guest opens it, **Then** the guest sees its schedule, minimum elo, game configuration, and current status.
2. **Given** a tournament is in progress, **When** a guest views its participant list, **Then** the guest sees every registered participant ranked by tournament score, updating live as scores change.

---

### User Story 4 - Guest Is Redirected to Login When Attempting a Restricted Action (Priority: P1)

A guest, while browsing the lobby, a match, or a tournament, tries to do something that requires being a known player: creating a game, joining a game, entering quick match, registering for a tournament, or sending a chat message. Each of these attempts is refused in a way that clearly means "you must log in first," so the interface can send the guest to the login page.

**Why this priority**: This is the boundary that makes guest browsing safe to expose at all — without a reliable, unambiguous "must log in" signal, the client cannot know when to redirect, and the system risks either blocking guests from legitimate viewing or allowing anonymous mutations.

**Independent Test**: Can be fully tested by attempting each restricted action (create match, join match, quick match, register for tournament, send a match/tournament chat message) with no credentials and confirming every one is refused with a response that is clearly distinguishable as "authentication required" rather than "not found" or "invalid input."

**Acceptance Scenarios**:

1. **Given** a guest is viewing the lobby, **When** they attempt to create a new match, **Then** the attempt is refused with an authentication-required outcome.
2. **Given** a guest is viewing a waiting match, **When** they attempt to join it, **Then** the attempt is refused with an authentication-required outcome.
3. **Given** a guest is browsing, **When** they attempt to enter quick match, **Then** the attempt is refused with an authentication-required outcome.
4. **Given** a guest is viewing a tournament, **When** they attempt to register for it, **Then** the attempt is refused with an authentication-required outcome.
5. **Given** a guest is watching a match or a tournament, **When** they attempt to send a chat message, **Then** the attempt is refused with an authentication-required outcome.
6. **Given** a guest triggers any of the above refusals, **When** the response is received, **Then** it is distinguishable enough from other error types (not-found, validation, conflict) that the client can reliably decide to navigate to the login page.

---

### Edge Cases

- What happens when a visitor holds an expired or otherwise invalid session token and requests public content (lobby, a match, or a tournament)? They MUST still see the content as a guest — an invalid/expired token on a view-only request must not itself produce an authentication error.
- What happens when a guest requests a match that is private (invite-only) rather than public? Guest view access applies only to publicly listed matches; a private match stays visible only to its creator and invited participants regardless of login state — the guest sees the same "not accessible" outcome an unrelated logged-in player would see.
- What happens when a guest requests a match or tournament ID that does not exist? They receive the same not-found outcome an authenticated user would receive — unrelated to the authentication rule.
- What happens when a match a guest is watching transitions between statuses (waiting → in progress → finished)? The guest's viewing access continues uninterrupted through every status change; they are never forced to log in just to keep watching.
- What happens to other player-only actions not explicitly listed by name (e.g., leaving a match before it starts, inviting a friend, submitting a move, surrendering, requesting a draw, requesting the Tournament Creator role)? They remain governed by the existing rule that any action performed on behalf of a specific player identity requires authentication — this feature does not loosen them.

## Requirements *(mandatory)*

### Functional Requirements

**Lobby & tournament discovery**

- **FR-001**: System MUST allow any visitor, authenticated or not, to view the list of public matches that are waiting for a player or currently in progress.
- **FR-002**: System MUST allow any visitor, authenticated or not, to view the list of tournaments, regardless of tournament status.

**Gameboard viewing**

- **FR-003**: System MUST allow any visitor to open a public match — waiting or in progress — and view its current state: board, move history, active player turn, and timer, without authentication.
- **FR-004**: System MUST deliver live updates (new moves, turn changes, timer, status/result changes) for a public match to guest viewers the same way it does to authenticated viewers.
- **FR-005**: Guest view access via the page-level (REST) API MUST NOT extend to private (invite-only) matches; those continue to be restricted to their creator and invited participants only. *(Realtime/WebSocket spectating of a private match by ID is a known, pre-existing gap not closed by this feature — see Assumptions.)*

**Tournament viewing**

- **FR-006**: System MUST allow any visitor to view a tournament's public details (schedule, minimum elo, game configuration, status) without authentication.
- **FR-007**: System MUST allow any visitor to view a tournament's live, ranked participant list without authentication.

**Restricted (player-only) actions**

- **FR-008**: System MUST require an authenticated player identity to create a new match, and MUST refuse the request from a guest.
- **FR-009**: System MUST require an authenticated player identity to join a match, and MUST refuse the request from a guest.
- **FR-010**: System MUST require an authenticated player identity to enter quick match / quick pairing, and MUST refuse the request from a guest.
- **FR-011**: System MUST require an authenticated player identity to register for a tournament, and MUST refuse the request from a guest.
- **FR-012**: System MUST require an authenticated player identity to send a chat message, in a match or in a tournament chat room, and MUST refuse the request from a guest.
- **FR-013**: Every refusal issued under FR-008 through FR-012 MUST be distinguishable as "authentication required," separate from not-found, validation, or conflict outcomes, so the client can reliably redirect the guest to the login page.
- **FR-014**: Any other action that creates, modifies, or ends a match or tournament on behalf of a specific player identity (e.g. leaving a match, inviting a friend, submitting a move, surrendering, requesting a draw) MUST continue to require authentication; this feature does not remove or weaken any existing restriction on those actions.

**Guest identity handling**

- **FR-015**: When a visitor presents an expired or invalid session token on a view-only request (lobby, match, or tournament viewing), the system MUST treat the request as a guest view rather than refusing it with an authentication error.

### Key Entities

- **Match (Game)**: A single Caro game instance, with a visibility (public/private) and status (waiting for a player, in progress, finished, cancelled). Public matches are visible to guests; private matches are not.
- **Tournament**: An organized competition with a schedule, minimum elo, game configuration, status, and a ranked participant list. Visible to guests regardless of status.
- **Guest Viewer**: A visitor with no authenticated player identity, permitted read-only access to public matches and tournaments.
- **Restricted Action**: Any action (create match, join match, quick match, tournament registration, sending a chat message, and other existing player-only actions) that requires an authenticated player identity and must be refused for a guest with a distinguishable authentication-required outcome.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A guest can view the lobby listing, a specific waiting or in-progress match, and a tournament's details and participant list — 100% of the time — without ever being asked to log in or receiving an authentication error.
- **SC-002**: 100% of guest attempts to create a match, join a match, enter quick match, register for a tournament, or send a chat message are refused; zero such attempts succeed without an authenticated player identity.
- **SC-003**: 100% of refusals under SC-002 are returned in a form the client can reliably use to redirect the guest to the login page, distinct from not-found or validation outcomes.
- **SC-004**: A guest watching an in-progress public match sees a new move reflected on their screen within the same time window as an authenticated viewer (within 3 seconds of the move being made).
- **SC-005**: 100% of previously-restricted player-only actions (submitting a move, surrendering, requesting a draw, leaving a match, inviting a friend, requesting the Tournament Creator role) continue to require authentication after this change — zero regressions that expose them to guests.

## Assumptions

- This specification is based on an audit of the currently implemented Caro APIs; some viewing endpoints already match the desired guest-access behavior (tournament listing/details/participant list, quick match, tournament registration and chat) and are covered here to lock in and protect that behavior rather than to change it.
- The audit found that guest browsing of live matches is expected to reuse the platform's existing "optional authentication" pattern (already used elsewhere in the codebase) and the existing realtime channel's guest-observer support (already in place) — both are treated as available building blocks, not as gaps this spec needs to invent.
- Reading existing chat history (without sending a message) for a match or tournament is treated as part of the restricted, participant/authenticated-only experience for this iteration, matching current behavior; it is not included among the explicitly allowed guest viewing capabilities.
- Viewing an individual player's profile page is out of scope for this feature; it continues to require authentication as it does today.
- "Đang chờ" (waiting) and "đang diễn ra" (in progress) are the two match/tournament statuses guests are explicitly permitted to browse and view; matches or tournaments in a finished/cancelled state are not excluded from viewing by this spec, but are also not the primary focus (existing display behavior for those statuses is unchanged).
- Realtime (WebSocket) spectating does not yet enforce per-match visibility on room join; a guest who already knows a private match's ID could still receive its live moves over the socket even though REST viewing of that match is blocked by this feature (FR-005). This gap predates this feature (guests could already join any room) and is explicitly out of scope here — tracked as a follow-up, not a regression introduced by this work. See plan.md Gate V for the reasoning.
