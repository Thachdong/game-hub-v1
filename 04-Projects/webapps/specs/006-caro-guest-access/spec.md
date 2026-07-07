# Feature Specification: Caro Guest Access (Lobby, Match View, Moves)

**Feature Branch**: `006-caro-guest-access`

**Created**: 2026-07-07

**Status**: Draft

**Input**: User description: "3 api này đã được update cho bỏ guard /api/caro/matches/lobby /api/caro/matches/:id /api/caro/matches/:id/moves hãy update lại các service tương ứng"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse the open match lobby without signing in (Priority: P1)

A visitor who has not signed in opens the Caro section and wants to see which matches are
currently open before deciding whether to create an account and join one.

**Why this priority**: The lobby list is the entry point that sells the game to a new visitor.
Requiring sign-in before a visitor can see there's anything to play is the single biggest drop-off
point; this is the highest-value story to unblock first.

**Independent Test**: Can be fully tested by requesting the lobby list with no active session and
confirming the list of open matches is returned instead of a sign-in error.

**Acceptance Scenarios**:

1. **Given** a visitor with no active session, **When** they request the open match lobby,
   **Then** they receive the current list of open matches, the same as a signed-in user would see.
2. **Given** a signed-in user, **When** they request the open match lobby, **Then** behavior is
   unchanged from today.

---

### User Story 2 - View a specific match's state without signing in (Priority: P2)

A visitor who has been shared a link to a specific match (e.g., to spectate or decide whether to
join) wants to see that match's current state without first creating an account.

**Why this priority**: This is the natural next step after discovering a match in the lobby (User
Story 1) and is needed to support spectating or previewing a match before joining.

**Independent Test**: Can be fully tested by requesting a known match's state with no active
session and confirming the match state is returned instead of a sign-in error.

**Acceptance Scenarios**:

1. **Given** a visitor with no active session and a valid match ID, **When** they request that
   match's state, **Then** they receive the current match state, the same as a signed-in user
   would see.
2. **Given** a visitor with no active session and a match ID that does not exist, **When** they
   request that match's state, **Then** they receive the same "not found" outcome a signed-in user
   would receive.

---

### User Story 3 - Submit a move without signing in (Priority: P3)

A participant in a match acts on the board (places a move) without a full signed-in session.

**Why this priority**: Lowest priority of the three because move submission is a state-changing
action with the highest sensitivity; it depends on Stories 1 and 2 already working, and it's the
narrowest slice (a single action) compared to the two read/browse stories above.

**Independent Test**: Can be fully tested by submitting a move for a known match with no active
session and confirming the request is processed (accepted or rejected on game-rule grounds, e.g.
"not your turn") rather than rejected purely for lack of sign-in.

**Acceptance Scenarios**:

1. **Given** a visitor with no active session, **When** they submit a valid move for an in-progress
   match, **Then** the request is evaluated on its game-rule merits (whose turn it is, whether the
   cell is free, etc.) instead of being rejected solely because there is no active session.
2. **Given** a signed-in user, **When** they submit a move, **Then** behavior is unchanged from
   today.

---

### Edge Cases

- What happens when a visitor with no active session requests the lobby, a match, or submits a
  move while every other Caro action (create match, join, invite, start, surrender, draw request,
  leave/cancel) is attempted without a session? Those other actions must continue to require
  sign-in exactly as they do today — this feature narrowly covers only the three interactions
  above.
- What happens when a signed-in user's session happens to be expired at the moment they hit one of
  these three interactions? They must still see the same result a never-signed-in visitor would
  see (the request must not be blocked purely for a missing/expired session), rather than being
  forced through a sign-in error.
- What happens when the same visitor is signed in? The three interactions must return whatever
  the backend computes for their signed-in identity — nothing about the signed-in experience
  changes.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow requests for the open match lobby list to succeed for
  visitors with no active session.
- **FR-002**: The system MUST allow requests for a single match's state to succeed for visitors
  with no active session.
- **FR-003**: The system MUST allow move-submission requests to be evaluated for visitors with no
  active session, instead of being rejected solely for lacking a session.
- **FR-004**: The system MUST continue to require an active session for every other Caro
  interaction not listed in FR-001–FR-003 (e.g., creating a match, joining, inviting, starting,
  surrendering, requesting/responding to a draw, and leaving/cancelling).
- **FR-005**: When a visitor does have an active session, the system MUST pass that identity
  through to the three interactions above unchanged, so a signed-in caller's experience (e.g.
  personalized fields, move attribution) is identical to today's behavior.
- **FR-006**: The system MUST NOT change the shape or meaning of the data returned by these three
  interactions for signed-in callers — only the previously-mandatory sign-in gate is lifted for
  visitors without a session.

### Key Entities

- **Match Lobby Entry**: A summary of one open match as shown in the lobby list (no change to its
  shape in this feature — only who may request the list changes).
- **Match State**: The full current state of one Caro match (board, players, status) as returned
  when viewing a specific match.
- **Move**: A single placed mark submitted against an in-progress match, attributed to whichever
  identity (signed-in or none) made the request.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A visitor with no active session can retrieve the open match lobby list, view a
  specific match's state, and have a move-submission request evaluated, in 100% of attempts,
  without receiving a sign-in-required error.
- **SC-002**: Every other Caro interaction (create, join, invite, start, surrender, draw request,
  leave/cancel) still requires an active session in 100% of attempts by a visitor with no session.
- **SC-003**: Signed-in users see no change in behavior, response content, or response time for
  any of the three interactions above.

## Assumptions

- "Guard removed" on the three backend endpoints means the backend now accepts and correctly
  processes these three requests whether or not a session/identity is presented — this feature
  is about removing the corresponding sign-in gate that currently sits in front of them on the
  webapp side, so it stops short-circuiting these three requests before they ever reach the
  backend.
- When a caller does have an active session, it continues to be passed through as it is today;
  the gate is only being made optional, not removed for everyone.
- All other Caro interactions, and every non-Caro interaction (account, profile, admin), are
  unaffected and keep requiring an active session exactly as they do today.
- No user-facing UI screens are introduced by this feature; it concerns the underlying request
  handling only.
