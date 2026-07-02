# Feature Specification: Caro Tournament

**Feature Branch**: `006-caro-tournament`

**Created**: 2026-07-01

**Status**: Draft

**Input**: User description: "Tournament feature for Caro game — Swiss Arena-style continuous tournament with Tournament Creator role management, elo-gated registration, Arena scoring, realtime participant list, and shared chat room (based on BRD-CARO-GAME-003)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Tournament Creator Role Request & Approval (Priority: P1)

A player who wants to organise tournaments submits a request to receive the Tournament Creator role. A Game Admin reviews pending requests and either approves or rejects each one. Once approved, the player gains the ability to create tournaments. An admin can also revoke the role from any Tournament Creator at any time. Revoking the role does not affect tournaments that the creator has already set up — those tournaments continue their full lifecycle uninterrupted.

**Why this priority**: Role access control is the gateway to all tournament creation. Without it, no tournament can exist. It also establishes the trust boundary between players and admins.

**Independent Test**: Can be fully tested by submitting a role request as a player, approving it as an admin, verifying the player can now create a tournament, then revoking the role and verifying that an active tournament created by that player still runs normally.

**Acceptance Scenarios**:

1. **Given** a player has no Tournament Creator role, **When** the player submits a role request, **Then** the request appears in the Game Admin's pending-requests list.
2. **Given** a pending Tournament Creator request exists, **When** the Game Admin approves it, **Then** the player gains the Tournament Creator role and can create tournaments.
3. **Given** a pending Tournament Creator request exists, **When** the Game Admin rejects it, **Then** the player's role remains unchanged and they cannot create tournaments.
4. **Given** a Tournament Creator has created tournament T (which is currently running), **When** the Game Admin revokes that player's Tournament Creator role, **Then** tournament T continues running (registration, matchmaking, scoring, and ending) without any interruption.

---

### User Story 2 - Tournament Creation (Priority: P1)

A Tournament Creator sets up a new tournament by specifying its start time, end time, the game configuration to apply to all matches within the tournament, and a minimum elo threshold that players must meet to register.

**Why this priority**: Creating a tournament is the foundation of the feature. Every other story depends on a tournament existing.

**Independent Test**: Can be fully tested by creating a tournament as a Tournament Creator with specific parameters and verifying the tournament appears publicly with the correct details.

**Acceptance Scenarios**:

1. **Given** a user holds an active Tournament Creator role, **When** the user creates a tournament specifying start time, end time, game config, and minimum elo threshold, **Then** the tournament is saved and immediately visible to all players and guests.
2. **Given** a user does NOT hold the Tournament Creator role, **When** the user attempts to access the tournament creation feature, **Then** the feature is inaccessible (not displayed or access denied).

---

### User Story 3 - Tournament Discovery & Elo-Gated Registration (Priority: P2)

Players browse published tournaments. All tournaments are publicly visible regardless of a viewer's elo. A player whose current elo meets the tournament's minimum threshold can register to participate. A player who does not meet the threshold can still view the tournament details and live state, but registration is blocked. The elo check happens only at registration time; it is never re-evaluated during the tournament.

**Why this priority**: This is the primary player entry point into the tournament flow. Without discovery and registration the matchmaking and scoring stories have no participants.

**Independent Test**: Can be fully tested by viewing a tournament as a player who does not meet the elo threshold (verifying view access and registration denial), then viewing as a player who does meet the threshold and successfully registering.

**Acceptance Scenarios**:

1. **Given** tournament T requires elo >= 1700, **When** a player with elo 1600 opens tournament T, **Then** the player can see all tournament details but registration is denied.
2. **Given** tournament T requires elo >= 1700, **When** a player with elo 1800 attempts to register, **Then** the player is successfully registered and appears in the participant list.
3. **Given** player C registered at elo 1750 for tournament T (elo >= 1700 required), **When** player C's elo drops to 1650 during the tournament, **Then** player C remains in the tournament and continues to be paired normally (elo is not re-checked).
4. **Given** a guest (not logged in) visits the tournament list, **When** the guest opens any tournament, **Then** the guest can view the tournament's public details.
5. **Given** tournament T is already "in progress" and a player with sufficient elo has not yet registered, **When** the player registers, **Then** they are added to the participant list and immediately placed in the idle queue for matchmaking.

---

### User Story 4 - Automatic Start, Minimum Player Check & Auto-Cancellation (Priority: P1)

When the scheduled start time arrives, the system checks whether at least 5 players have registered. If yes, the tournament begins and matchmaking starts immediately. If fewer than 5 players have registered, the tournament is automatically cancelled and all registered players are notified.

**Why this priority**: This is the core lifecycle trigger — nothing else can happen (matchmaking, scoring) until a tournament is validated and started. Auto-cancellation protects players from investing time in a tournament that cannot run.

**Independent Test**: Can be tested in two independent runs: (a) a tournament with 5+ registrants whose start time has passed — verify status changes to "in progress" and matchmaking begins; (b) a tournament with fewer than 5 registrants at start time — verify status changes to "cancelled" and each registered player receives a cancellation notification.

**Acceptance Scenarios**:

1. **Given** tournament T's start time has arrived and 8 players have registered, **When** the start time triggers, **Then** the tournament status changes to "in progress" and idle players are immediately paired.
2. **Given** tournament T's start time has arrived and only 4 players have registered, **When** the start time triggers, **Then** the tournament status changes to "cancelled" and all 4 registered players receive a cancellation notification.

---

### User Story 5 - Continuous Swiss Arena Matchmaking (Priority: P1)

Throughout the duration of a running tournament, the system automatically pairs idle players (players who just registered or who just finished their previous match) with another idle player who has a similar tournament score. Pairing is immediate — there are no fixed rounds. When a tournament ends (end time is reached), no new pairs are created; in-progress matches play out to conclusion.

**Why this priority**: Matchmaking is the core engine of the tournament. Without it, registered players cannot play.

**Independent Test**: Can be fully tested independently after US4 starts the tournament: verify that idle players are paired immediately with opponents of similar tournament score, and that no new pairs are made after the end time.

**Acceptance Scenarios**:

1. **Given** a tournament is "in progress" with 8 idle players all at 0 tournament points, **When** matchmaking runs, **Then** 4 pairs are formed (random, since all points are equal) and matches begin.
2. **Given** a player finishes their match and is now idle, **When** another idle player with a similar tournament score exists, **Then** the system pairs them immediately without waiting for any round boundary.
3. **Given** a tournament's end time arrives, **When** the end time triggers, **Then** no new pairings are created; any matches already in progress continue until naturally concluded.

---

### User Story 6 - Arena Scoring & Elo Calculation (Priority: P1)

Every match played within a tournament contributes tournament points according to the Arena scoring formula. Additionally, every tournament match also recalculates elo for both players, exactly as a regular match would. The two scoring systems are completely independent.

**Scoring rules**:
- Win = 2 tournament points
- Draw = 1 tournament point
- Loss = 0 tournament points
- Winning streak of 3 or more consecutive wins: each subsequent win in the streak = 4 points
- Draw immediately following a winning streak of 3+ wins = 2 points; the next draw (outside the streak) returns to 1 point

**Why this priority**: Scoring is what makes the tournament meaningful and drives the competition. It must be correct for the leaderboard and matchmaking to function properly.

**Independent Test**: Can be fully tested with a controlled sequence of match results for one player, verifying point totals match the formula, and separately verifying elo changes are identical to a regular match.

**Acceptance Scenarios**:

1. **Given** a player wins their first 3 matches (earning 2+2+2 = 6 points in standard scoring), **When** the player's scores are recorded, **Then** the player has 2 points after match 1, 4 after match 2, 6 after match 3.
2. **Given** a player has already won 3 consecutive matches (streak = 3), **When** they win a 4th consecutive match, **Then** that match awards 4 tournament points (streak bonus).
3. **Given** a player has a winning streak of exactly 3, **When** the player draws the next match, **Then** that draw awards 2 tournament points (first draw after streak).
4. **Given** a player already drew once after a 3-win streak, **When** the player draws the next match, **Then** that draw awards 1 tournament point (streak is broken).
5. **Given** two players complete a tournament match, **When** the match result is recorded, **Then** both players' elo scores are recalculated identically to a regular (non-tournament) match.

---

### User Story 7 - Realtime Participant List & Tournament Chat (Priority: P2)

While a tournament is in progress (or in the registration phase), any viewer can see the live list of registered participants along with their current tournament scores. The list updates in realtime. Additionally, all registered participants have access to a shared tournament chat room where they can message each other.

**Why this priority**: Realtime visibility and chat drive community engagement — the key secondary goal stated in the business objective. These features do not block the core tournament lifecycle.

**Independent Test**: Can be fully tested independently by registering two players, then verifying the participant list is visible and updates immediately when a player joins or their score changes; and verifying that both registered players can send and receive messages in the tournament chat.

**Acceptance Scenarios**:

1. **Given** a viewer is watching a tournament, **When** a new player registers or a player's tournament score changes, **Then** the participant list on the viewer's screen updates without a page refresh.
2. **Given** a player is registered in tournament T, **When** the player sends a message in the tournament chat, **Then** all other registered participants see the message in the shared chat room.
3. **Given** a non-registered viewer is watching tournament T, **When** they attempt to send a chat message, **Then** they cannot (chat is for registered participants only).

---

### Edge Cases

- What happens to a player who is idle (not yet paired) when the tournament end time arrives? The player retains their current tournament score; no match is generated and no points are deducted.
- What happens when a player is idle but no other idle player is available to pair with? The player waits in the idle queue indefinitely — there is no timeout. They are paired the moment another idle player becomes available, or they remain idle until the tournament ends.
- What happens if two players finish their matches at exactly the same moment and both become idle simultaneously? The matchmaking system handles this concurrently using a safe claim-once mechanism to prevent a player from being paired twice.
- What happens if a Tournament Creator is revoked while their tournament is in the "waiting to start" (pre-start) phase? The tournament continues through its normal lifecycle (start validation, potential auto-cancel, or start).
- What happens if a player tries to register for the same tournament twice? The system rejects the duplicate registration.
- What happens to tournament matches if a player disconnects mid-game? The match follows the same disconnection rules as a regular game (defined in the game mechanics feature).

## Requirements *(mandatory)*

### Functional Requirements

**Role Management**:
- **FR-001**: The system MUST allow any player to submit a request to be granted the Tournament Creator role.
- **FR-002**: The system MUST allow a Game Admin to view all pending Tournament Creator role requests.
- **FR-003**: The system MUST allow a Game Admin to approve or reject each pending role request individually.
- **FR-003a**: When a Game Admin approves or rejects a Tournament Creator role request, the system MUST send a notification to the requesting player with the outcome. The player has no in-app view of request history or pending status; the notification is the sole feedback channel.
- **FR-004**: The system MUST allow a Game Admin to revoke the Tournament Creator role from any current Tournament Creator at any time.
- **FR-005**: Revoking the Tournament Creator role from a player MUST NOT cancel, pause, or otherwise affect any tournament that player has already created; those tournaments MUST continue to run their full lifecycle.
- **FR-006**: Only users with an active (non-revoked) Tournament Creator role MUST be able to create new tournaments; all other users MUST NOT see or access the tournament creation feature.

**Tournament Creation**:
- **FR-007**: The system MUST allow an active Tournament Creator to create a new tournament by specifying: a start datetime, an end datetime (after start), a game configuration (from the existing game config options), and a minimum elo threshold for registration.
- **FR-007a**: Upon creation, a tournament MUST immediately transition to "waiting" status and become publicly visible to all players and guests. There is no draft or unpublished state.
- **FR-008**: The minimum elo threshold MUST be a lower bound only (e.g., "elo >= 1700"); upper-bound elo restrictions are not supported.

**Tournament Visibility & Registration**:
- **FR-009**: The system MUST display all tournaments publicly to any authenticated player or guest, regardless of whether the viewer's elo meets the tournament's threshold.
- **FR-010**: The system MUST allow a player to register for a tournament while its status is "waiting" or "in progress", provided the player's current elo meets or exceeds the tournament's minimum elo threshold at the time of registration. Registration is NOT permitted once the tournament status is "ended" or "cancelled".
- **FR-010a**: A player who registers while the tournament is already "in progress" (late registration) MUST immediately be placed in the idle queue and eligible for matchmaking pairing.
- **FR-011**: If a player's elo does not meet the minimum threshold, the system MUST deny registration but MUST still allow the player to view all tournament information and live state.
- **FR-012**: The system MUST evaluate the elo constraint only once, at registration time. Elo MUST NOT be re-evaluated for any player already registered, for the duration of the tournament.

**Tournament Lifecycle**:
- **FR-013**: At the scheduled start time, if the number of registered players is >= 5, the system MUST transition the tournament to "in progress" status and begin matchmaking.
- **FR-014**: At the scheduled start time, if the number of registered players is < 5, the system MUST automatically cancel the tournament and send a cancellation notification to every registered player.
- **FR-015**: At the scheduled end time, the system MUST stop creating new pairings and transition the tournament to "ended" status. Matches already in progress at that time MUST continue to their natural conclusion.

**Matchmaking**:
- **FR-016**: Throughout the duration of an "in progress" tournament, the system MUST continuously pair idle players (those who just registered or just finished a match) with another idle player who has the nearest tournament score.
- **FR-016a**: If no second idle player is available when a player becomes idle, the player MUST remain in the idle queue indefinitely (no timeout) until another idle player becomes available or the tournament ends.
- **FR-017**: Pairing MUST occur immediately when two idle players are available; the system MUST NOT wait for any fixed round boundary.
- **FR-018**: When multiple players become idle simultaneously, the matchmaking system MUST handle concurrent pairing safely, ensuring each player is placed in at most one match at a time.

**Scoring**:
- **FR-019**: The system MUST calculate tournament points for every match played within a tournament according to the following rules:
  - Win: 2 points (base)
  - Draw: 1 point (base)
  - Loss: 0 points
  - Winning streak of 3+ consecutive wins: each subsequent win in that streak earns 4 points instead of 2
  - A draw immediately following a winning streak of 3+ wins earns 2 points; all subsequent draws (once outside the streak) return to 1 point
- **FR-020**: Tournament points MUST be completely independent of elo. Every match played within a tournament MUST ALSO trigger a standard elo recalculation for both players, identical to a regular (non-tournament) match.
- **FR-021**: Tournament point scores MUST reset to 0 for each player at the start of every new tournament; scores are not carried over between tournaments.

**Realtime Participant List**:
- **FR-022**: The system MUST display a live participant list showing each registered player and their current tournament score, visible to all viewers of the tournament.
- **FR-023**: The participant list MUST update in realtime whenever a player registers or a tournament score changes.

**Tournament Chat**:
- **FR-024**: The system MUST provide a shared chat room for each tournament, accessible only to registered participants of that tournament.

### Key Entities

- **Tournament**: Represents a single organised competition event. Has a start time, end time, game configuration, minimum elo threshold, status (waiting/in-progress/ended/cancelled), and an ordered participant list.
- **TournamentCreatorRequest**: A player's request to be granted the Tournament Creator role. Has a status (pending/approved/rejected) and is reviewed by a Game Admin.
- **TournamentRegistration**: Represents a player's participation in a specific tournament, capturing elo at registration time, current tournament score, and current winning streak.
- **TournamentMatch**: A single game played between two registered players within a tournament. Linked to the tournament, both players, and the match result. Used to calculate both tournament points and elo changes.
- **TournamentChatMessage**: A message sent by a registered participant in a tournament's shared chat room.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A Game Admin can review and act on a Tournament Creator role request within 60 seconds of the request being submitted.
- **SC-002**: A Tournament Creator can create a new tournament in under 2 minutes from start to confirmation.
- **SC-003**: A tournament with 5 or more registered players starts automatically within 10 seconds of the scheduled start time.
- **SC-004**: A tournament with fewer than 5 registered players is cancelled automatically within 10 seconds of the scheduled start time, and all registered players receive the cancellation notification within 30 seconds.
- **SC-005**: An idle player is paired with an opponent within 5 seconds of becoming available, provided another idle player exists with a similar tournament score.
- **SC-006**: Tournament scores are updated and reflected in the participant list within 3 seconds of a match result being recorded.
- **SC-007**: The realtime participant list remains consistent for all concurrent viewers — no viewer sees a stale score for more than 3 seconds after a score change.
- **SC-008**: 100% of match results within a tournament produce a correct tournament score update AND a correct elo update for both players, with zero discrepancies between the two scoring systems.
- **SC-009**: The system correctly handles at least 20 players finishing matches simultaneously without any player being assigned to two matches at once (zero duplicate pairings).

## Assumptions

- Each match played within a tournament follows the standard Caro game rules and match mechanics defined in the existing game mechanics feature (timer per move, win/loss/draw outcomes).
- A player's tournament score starts at 0 for every new tournament; scores are never carried over from previous tournaments.
- There is no limit on the number of times a player may re-submit a Tournament Creator role request after being rejected.
- There is no limit on the number of tournaments a Tournament Creator may have in "waiting" or "in-progress" status simultaneously.
- The minimum elo threshold set by a Tournament Creator is the sole eligibility criterion for registration; no other player attributes (rank, history, etc.) are evaluated.
- Tournament notifications (cancellation, start) are delivered via the platform's existing notification system.
- The tournament chat room is separate from the individual game chat room. The tournament chat persists for the duration of the tournament (including the waiting-to-start phase); its retention policy after the tournament ends is governed by the platform's existing notification/data retention policy.
- Players can register for a tournament any time between tournament creation and the tournament's start time (and also after the tournament has started, if they become idle immediately after joining).
- Game Admin role identification reuses the existing account/role management system.

## Clarifications

### Session 2026-07-01

- Q: Does "draft" represent a real, distinct state where the tournament is NOT yet publicly visible? → A: No draft state — tournament is immediately "waiting" (public, open for registration) the moment it is created.
- Q: Can players register for a tournament that is already "in progress"? → A: Yes — registration is open throughout "waiting" and "in progress" statuses; late registrants are immediately placed in the idle queue for matchmaking.
- Q: Can a Tournament Creator have multiple tournaments active or upcoming simultaneously? → A: No limit — a creator may have any number of upcoming or in-progress tournaments at the same time.
- Q: What happens when an idle player has no available pairing partner? → A: Player waits indefinitely in the idle queue — no timeout — until another idle player becomes available or the tournament ends.
- Q: How does a player learn the outcome of their Tournament Creator role request? → A: Notification only — player receives a notification on approval/rejection; no in-app request-status view is provided.
