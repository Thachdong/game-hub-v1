# Feature Specification: Game Admin Config (Caro)

**Feature Branch**: `004-game-admin-config`

**Created**: 2026-06-30

**Status**: Draft

**Input**: User description: "viết specs sử dụng data trong file 02-BRD(Bussiness Requirement Document)/caro-game/game-admin-config.md"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Game Admin Creates a Configuration (Priority: P1)

A Game Admin (Caro) needs to define a new valid game configuration by selecting a board size and a
move time limit. Once saved, the configuration becomes available for players to pick when creating
a new game.

**Why this priority**: This is the foundational capability of the feature. Without at least one
configuration, players cannot create any game. All other stories depend on configurations existing.

**Independent Test**: Can be fully tested by logging in as a Game Admin, submitting a configuration
with a valid board size and move time, then confirming the configuration appears in the player-facing
list — delivers the core business value of controlled game parameters.

**Acceptance Scenarios**:

1. **Given** a logged-in Game Admin, **When** they submit a new configuration with board size 25x25
   and move time 15 seconds, **Then** the system creates the configuration and it appears immediately
   in the list of available configurations for players.
2. **Given** a logged-in Game Admin, **When** they submit a configuration with board size 20x20
   (not in the valid list), **Then** the system rejects the request and returns a clear error
   indicating the value is invalid.
3. **Given** a logged-in Game Admin, **When** they submit a configuration with move time 20 seconds
   (not in the valid list), **Then** the system rejects the request and returns a clear error
   indicating the value is invalid.
4. **Given** an active configuration with board size 25x25 and move time 15 seconds already exists,
   **When** a Game Admin submits a new configuration with the same board size 25x25 and move time
   15 seconds, **Then** the system rejects the request with a conflict error indicating that
   combination already exists as an active configuration.

---

### User Story 2 - Game Admin Edits or Deletes a Configuration (Priority: P2)

A Game Admin (Caro) needs to be able to update or remove a previously created game configuration
to keep the offering relevant (e.g., retire unpopular configurations, correct mistakes).

**Why this priority**: Once configurations exist, Game Admins need lifecycle control. This is
secondary to creation but essential for ongoing management.

**Independent Test**: Can be fully tested by first creating a configuration (US1), then updating
or deleting it, and confirming the change is reflected in the player-facing configuration list.

**Acceptance Scenarios**:

1. **Given** an existing configuration with board size 18x18 and move time 5 seconds, **When** a
   Game Admin updates the move time to 10 seconds with a valid value, **Then** the configuration
   reflects the new move time and the updated version is visible in the player list.
2. **Given** an existing configuration that is not currently in use by any active game, **When** a
   Game Admin deactivates (soft-deletes) it, **Then** the configuration no longer appears in the
   player-facing list but remains accessible to Game Admins in the management view.
3. **Given** an existing configuration currently in use by an ongoing game, **When** a Game Admin
   deactivates it, **Then** the ongoing game continues with its original parameters unchanged, and
   the configuration is no longer shown to players starting new games.
4. **Given** an existing configuration with move time 15 seconds currently in use by an ongoing
   game, **When** a Game Admin updates the move time to 25 seconds, **Then** the ongoing game
   continues with move time 15 seconds (its original parameter), and only new games created with
   this configuration will use 25 seconds.
5. **Given** a deactivated configuration with board size 18x18 and move time 5 seconds, and no
   other active configuration with those same parameters exists, **When** a Game Admin reactivates
   it, **Then** the configuration becomes active and reappears immediately in the player-facing
   list.
6. **Given** a deactivated configuration with board size 25x25 and move time 15 seconds, and an
   active configuration with those same parameters already exists, **When** a Game Admin attempts
   to reactivate the deactivated one, **Then** the system rejects the request with a conflict
   error indicating a duplicate active configuration already exists.

---

### User Story 3 - Player Browses Available Configurations (Priority: P3)

A Player needs to see the list of all currently available game configurations before choosing one
when creating a new game. This is a read-only view driven by what Game Admins have defined.

**Why this priority**: This is a consumer-side requirement. It depends on US1 and US2 having
established at least one configuration; it delivers the player-facing value of the feature.

**Independent Test**: Can be fully tested independently once at least one configuration exists —
verify that a player (non-admin) can retrieve the full list of active configurations with correct
board size and move time values.

**Acceptance Scenarios**:

1. **Given** two configurations exist (25x25 / 15s and 40x40 / 60s), **When** a Player requests
   the list of available configurations, **Then** both configurations are returned with their
   correct attributes.
2. **Given** a Game Admin has deactivated a configuration, **When** a Player requests the
   configuration list, **Then** the deactivated configuration is no longer included in the
   player-facing response (though it remains visible to Game Admins in the management view).

---

### Edge Cases

- What happens when a Game Admin tries to create a configuration that is identical to an existing
  active one (same board size and same move time)? — The system rejects the request with a
  conflict error indicating the combination already exists (FR-009).
- What happens when a Player tries to create a game but no configurations have been defined yet?
  — The system returns an empty list; the Player cannot proceed with game creation until a Game
  Admin adds at least one configuration (handled by the game creation feature, BRD-CARO-GAME-002).
- What happens when a non-admin user attempts to create, edit, or delete a configuration?
  — The system rejects the request with an authorization error; no changes are made.
- What happens when a Game Admin tries to reactivate a deactivated configuration but an identical
  active configuration already exists? — The system rejects with a conflict error (FR-011 + FR-009).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow a Game Admin (Caro) to create a new game configuration specifying
  exactly one board size from {18x18, 25x25, 40x40} and one move time limit from
  {5, 10, 15, 25, 35, 45, 60} seconds.
- **FR-002**: System MUST allow a Game Admin (Caro) to update an existing game configuration,
  changing board size and/or move time to other valid values. Updates apply only to future games;
  any game already in progress retains the parameters it was created with.
- **FR-003**: System MUST allow a Game Admin (Caro) to deactivate (soft-delete) an existing game
  configuration by marking it inactive; the underlying record is preserved in the system.
- **FR-004**: System MUST provide a queryable list of all active (non-deactivated) game
  configurations for players to use when creating a new game.
- **FR-008**: System MUST allow a Game Admin (Caro) to retrieve all configurations including
  inactive/deactivated ones via a management view, so past configurations remain visible for
  audit and potential reactivation purposes.
- **FR-005**: System MUST reject any create or update request where the board size or move time
  value falls outside the respective valid enumeration; the response MUST include a descriptive
  validation error.
- **FR-009**: System MUST reject a create request where the (boardSize, moveTime) combination
  already exists as an active configuration, returning a conflict error that clearly indicates
  the duplicate combination.
- **FR-006**: System MUST preserve the parameters of any game already in progress when the
  configuration that game was created with is subsequently deleted.
- **FR-007**: System MUST enforce that only users holding the Game Admin (Caro) role can create,
  update, or delete configurations; all other users receive an authorization error.
- **FR-010**: System MUST record the identity of the Game Admin who performed each create,
  update, or deactivation action on a configuration, together with the timestamp of that action.
- **FR-011**: System MUST allow a Game Admin (Caro) to reactivate a previously deactivated
  configuration, making it immediately visible to players again. The duplicate check (FR-009)
  MUST apply: reactivation is rejected if an identical active configuration already exists.

### Key Entities *(include if feature involves data)*

- **GameConfig**: Represents a single valid game configuration. Key attributes: board size (one of
  18x18, 25x25, 40x40), move time limit in seconds (one of 5, 10, 15, 25, 35, 45, 60), active
  flag (true = visible to players; false = deactivated/soft-deleted), created-by (identity of the
  Game Admin who created it), created-at timestamp, updated-at timestamp, deactivated-by (identity
  of the Game Admin who deactivated it, if applicable), deactivated-at timestamp (if applicable).
  Records are never physically removed. Read by game creation flow (BRD-CARO-GAME-002) at the
  time a game is created.
- **Game Admin (Caro) Role**: An identity claim on a user account indicating the holder has been
  granted the Caro Game Admin privilege. Provisioned externally by Platform Admin per
  BRD-ACCOUNT-SOCIAL-001. This feature reads the role claim; it does not manage role assignment.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A Game Admin can successfully create a valid configuration in a single interaction
  without needing additional guidance or retries on a well-formed request.
- **SC-002**: Invalid configuration attempts (board size or move time not in valid lists) are
  rejected 100% of the time with a clear, descriptive error message before any data is stored.
- **SC-003**: Players receive the complete, up-to-date list of active configurations in every
  query, with no deactivated entries appearing in the player-facing list.
- **SC-004**: No active game is disrupted when a configuration it was created with is deactivated
  or updated — zero incidents of parameter loss or game termination attributable to either
  operation.
- **SC-005**: Unauthorized configuration management attempts (create, update, delete by non-admin
  users) are blocked 100% of the time.

## Assumptions

- The Game Admin (Caro) role is granted and revoked by Platform Admin through the account
  management feature (BRD-ACCOUNT-SOCIAL-001 FR-8, FR-9). This feature only checks whether
  a user has the role at request time; it does not define or implement role provisioning.
- Deactivating (soft-deleting) a configuration that is currently referenced by an active game does
  not terminate or alter that game. The game retains the board size and move time it was created
  with. GameConfig records are never physically removed from the system.
- There is no limit on the number of configurations a Game Admin may create.
- Configurations have no user-visible name or description field; they are identified solely by
  their (boardSize, moveTime) pair when displayed to players.
- Duplicate configurations (same boardSize + same moveTime as an existing active configuration)
  are not permitted; the system rejects creation with a conflict error (see FR-009).
- The configuration list returned to players includes all non-deleted configurations regardless
  of order; default ordering (e.g., by creation time) is acceptable.
- The feature is API-first and serves both web and mobile clients from a single implementation.

## Clarifications

### Session 2026-06-30

- Q: When a Game Admin deletes a configuration, should it be a soft delete (mark inactive, preserve record) or a hard delete (permanently remove from DB)? → A: Soft delete — mark `active = false`; record preserved. Players see only active configs. Game Admins can filter to see inactive/deleted configs via a separate management view.
- Q: If a Game Admin updates a configuration currently in use by an active game, what happens to that ongoing game? → A: Active games retain the original parameters they were created with; the update only affects future games.
- Q: When a Game Admin creates a configuration with a (boardSize, moveTime) pair that already exists as an active configuration, what should the system return? → A: Reject the request with a conflict error indicating the combination already exists as an active configuration.
- Q: Should the system record who created, last updated, or deactivated each configuration (user identity + timestamp)? → A: Yes — track `createdBy` + `createdAt`, `updatedAt`, `deactivatedBy` + `deactivatedAt` on each configuration.
- Q: Should Game Admins be able to reactivate a previously deactivated configuration? → A: Yes — reactivation is allowed and makes the configuration immediately visible to players again; the duplicate check still applies (cannot reactivate if an identical active config already exists).
