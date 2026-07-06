# Feature Specification: Games List & Account Profile Pages

**Feature Branch**: `feature/webapps/dongt/account-page`

**Created**: 2026-07-06

**Status**: Draft

**Input**: User description: "Viết specs cho page danh sách game + account với nội dung như sau:
1. Nội dung page danh sách game: chưa các card (game banner + tên game) => click vào card => navigate đến game

1.1 Nội dung page account:
- hiển thị thông tin cơ bản của account như username, email, avatar + danh sách profiles
- account mới chưa chơi game nào: hiển thị text chưa có profile
- account đã chơi game thì sẽ hiển thị game dưới dạng card => click vào card => navigate user đến page profile tương ứng"

## Clarifications

### Session 2026-07-06

- Q: Do the destination pages these cards link to (a game's entry page, and a per-game profile
  page) need to be built as part of this feature, or are they out of scope? → A: Out of scope —
  this feature only builds the Games List page and the Account page. A card's destination route
  (game entry, or per-game profile) either already exists (e.g., the existing Caro game pages) or
  will be built by a separate future feature; this feature only wires up the navigation.
  Additional notes from the user: the Games List page is public and currently lists a single
  game (Caro), since Caro is the only game the platform offers today; the Account page's
  "profiles" list shows one card per game the account has played, where each Game Profile holds
  game-specific data captured during play (e.g., a Caro profile holds Caro-related game data);
  the existing Caro game pages are what serve the Caro game itself.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse the Games List (Priority: P1)

A visitor opens the Games List page to see every game offered on the platform and picks one to
open.

**Why this priority**: This is the primary discovery surface for the whole product — without it,
a user has no way to find and enter any game. It stands alone as a complete, demonstrable piece of
value even before the Account page exists.

**Independent Test**: Can be fully tested by opening the Games List page with a seeded catalog of
games and confirming that clicking any game's card opens that specific game.

**Acceptance Scenarios**:

1. **Given** the platform has one or more games configured, **When** a user opens the Games List
   page, **Then** the page displays one card per game, each showing that game's banner image and
   name.
2. **Given** the Games List page is displayed, **When** the user clicks a game's card, **Then**
   the user is navigated to that specific game.
3. **Given** the platform currently has no games configured, **When** a user opens the Games List
   page, **Then** the page displays a message indicating no games are available instead of an
   empty grid.

**Layout** *(per Constitution Principle VII — text-only layout description)*:

- Page title/heading at the top identifying the page as the games catalog.
- Below the title, a responsive grid of Game Cards that shows at least one card per row on narrow
  viewports and more per row as viewport width increases, wrapping to additional rows as needed
  for the number of games. The exact column counts at each width are a visual-design detail, not
  a functional requirement.
- Each Game Card is a single clickable unit displaying, top to bottom: the game's banner image,
  then the game's name.
- When no games exist, the grid area is replaced by a single centered empty-state message in the
  same content area.

---

### User Story 2 - View Account Summary & Game Profiles (Priority: P2)

A signed-in user opens their Account page to see their own basic identity information and, if
they have played any games, jump directly back into the corresponding game's profile.

**Why this priority**: This depends on a user already being signed in and is a secondary,
identity-management surface layered on top of the core game-browsing flow (User Story 1) — the
product is usable without it, but it materially improves the return-user experience.

**Independent Test**: Can be fully tested by signing in as (a) a brand-new account with no game
activity and (b) an account that has played at least one game, then confirming the Account page
renders the correct state for each.

**Acceptance Scenarios**:

1. **Given** a signed-in user opens the Account page, **When** the page loads, **Then** it
   displays the account's username, email, and avatar.
2. **Given** a signed-in user has never played any game, **When** the user opens the Account
   page, **Then** the profiles section displays a message stating no profile exists yet, instead
   of any game cards.
3. **Given** a signed-in user has played one or more games, **When** the user opens the Account
   page, **Then** the profiles section displays one card per played game, each showing that
   game's banner image and name.
4. **Given** the Account page's profiles section is showing game cards, **When** the user clicks
   one of those cards, **Then** the user is navigated to that game's corresponding profile page
   (not the general Games List destination from User Story 1).

**Layout** *(per Constitution Principle VII — text-only layout description)*:

- Account summary area at the top of the page: avatar on one side, with username above email
  stacked beside it.
- Below the summary area, a "Profiles" section with its own heading.
- Inside the Profiles section: either (a) a single empty-state text line when the account has no
  played games, or (b) a responsive grid of Game Cards — one per played game, each showing that
  game's banner image and name — using the same card presentation as the Games List page (User
  Story 1), wrapping to multiple rows as needed.

---

### Edge Cases

- What happens when a game's banner image fails to load? The card MUST still render the game's
  name and remain clickable.
- What happens if a user's account has partial data (e.g., no avatar set)? The Account page MUST
  still render the username/email and show a default placeholder in place of the missing avatar.
- What happens if a played game is later removed from the catalog while a user's account still
  references it? That game's card MUST no longer appear in the Account page's profiles section.
- How does the system distinguish "never played" from "played but no games currently exist in the
  catalog"? Both render the same empty-state message, since from the user's perspective there is
  nothing to show either way.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Games List page MUST display one card per available game, each showing that
  game's banner image and name.
- **FR-002**: Clicking a game's card on the Games List page MUST navigate the user to that
  specific game's own existing entry page (e.g., the existing Caro game pages); building or
  changing any game's own entry page is out of scope for this feature.
- **FR-003**: The Games List page MUST display an explicit empty-state message when no games are
  available, instead of an empty grid.
- **FR-004**: The Account page MUST display the signed-in account's username, email, and avatar.
- **FR-005**: The Account page MUST display a "no profile yet" message when the account has not
  played any game.
- **FR-006**: The Account page MUST display one card per game the account has played, each
  showing that game's banner image and name, when at least one such game exists.
- **FR-007**: Clicking a played-game's card on the Account page MUST navigate the user to that
  game's corresponding profile page; building that profile page's own content is out of scope for
  this feature where such a page does not already exist — this feature only wires up the link to
  it.
- **FR-008**: The system MUST determine whether an account has "played" a given game (and thus
  has a profile for it) using that account's existing per-game profile status, without requiring
  the user to take any extra action to establish this state.
- **FR-009**: The Account page MUST only be reachable by a signed-in user; it MUST show that
  user's own account information.
- **FR-010**: The Games List page MUST be publicly accessible without requiring the user to be
  signed in.

### Key Entities

- **Game**: A game offered on the platform. Key attributes: display name, banner image, and a
  destination to open it. Used by both the Games List page (all games) and the Account page
  (filtered to games the current account has played).
- **Account**: The signed-in user's own identity record. Key attributes: username, email address,
  avatar image, and the list of games it has a profile for.
- **Game Profile**: The record that ties one Account to one Game once the account has played it,
  holding that game's own game-specific data captured during play (e.g., a Caro profile holds
  Caro-related game data; a different game's profile would hold that game's own data instead). Its
  presence or absence for a given (account, game) pair determines whether that game appears in
  the Account page's profiles section, and its existence is what the "corresponding profile page"
  (FR-007) represents.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can go from opening the Games List page to arriving at any listed game in a
  single click.
- **SC-002**: A user can go from opening the Account page to arriving at any of their played
  games' profile pages in a single click.
- **SC-003**: 100% of new accounts with no game activity see the "no profile yet" message on
  their first visit to the Account page, with no game cards shown.
- **SC-004**: 100% of accounts with at least one played game see a card for every one of those
  games on the Account page, and zero cards for games they have not played.
- **SC-005**: Users correctly identify which card corresponds to which game (by banner and name
  alone) on both pages, without needing any additional label or legend.

## Assumptions

- The Games List page is a general, public browsing surface and does not require the user to be
  signed in; the Account page does require the user to be signed in (consistent with account data
  being personal to that user).
- **Scope boundary** (confirmed via clarification): this feature builds only the Games List page
  and the Account page. It does not build, or change, any game's own entry page or any per-game
  profile page — those either already exist (e.g., the existing Caro game pages, which serve the
  Caro game itself) or will be built by separate future features. This feature's job is limited to
  displaying the two pages described here and wiring their cards' navigation to those destinations.
- "Navigate to that specific game" (FR-002) means the game's own existing entry/landing surface,
  which may itself decide whether sign-in or further action is needed — the Games List page's job
  is only to route the user there.
- "That game's corresponding profile page" (FR-007) is a destination distinct from the general
  game entry point in FR-002: it is the account-specific profile view for that game, reachable
  only once a profile exists.
- Game cards use the same visual presentation (banner + name) on both the Games List page and the
  Account page's profiles section, since the user description specifies the same card content in
  both places.
- Whether an account has "played" a game and thus has a profile for it is derived from existing
  per-game profile data already tracked elsewhere in the system; no new gameplay-tracking behavior
  is introduced by these two pages.
- The platform currently offers a single game, Caro, so both pages will in practice render a
  single-card catalog today; the pages themselves must still support an arbitrary number of games
  without change, since the catalog is expected to grow.
