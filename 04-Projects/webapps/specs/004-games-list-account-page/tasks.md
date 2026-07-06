---
description: "Task list for Games List & Account Profile Pages"
---

# Tasks: Games List & Account Profile Pages

**Input**: Design documents from `/specs/004-games-list-account-page/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md (no `contracts/` —
see plan.md's Project Structure)

**Tests**: Included below, following this repo's existing convention (`002`/`003`) of colocated
`*.test.tsx`/`*.test.ts` files per component/page using Vitest + React Testing Library.

**Organization**: Tasks are grouped by user story (spec.md's P1 Games List, P2 Account page) so
each can be implemented and validated independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1 = Games List page, US2 = Account page
- File paths are relative to `apps/web/` unless prefixed `packages/`

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: Shared contract/helper changes both user stories depend on (research.md §1, §2, §4)

**⚠️ CRITICAL**: No user story task may start until this phase is complete

- [X] T001 Add `bannerUrl: string` to the `Game` interface in
      `packages/account-service/src/types.ts`, and update the `listGames` mock fixture (and its
      expected assertion) in `packages/account-service/src/index.test.ts` to include a
      `bannerUrl` value (research.md §4, data-model.md Game)
- [X] T002 [P] Create `lib/game-routes.ts` exporting `getGameLinkTarget(game: Pick<Game, "slug">):
      { entryPath: string; profilePath: string }`, implementing `entryPath = "/game-${slug}"` and
      `profilePath = "${entryPath}/profile"` (research.md §1, data-model.md GameLinkTarget), with
      a colocated `lib/game-routes.test.ts` covering both fields for a sample slug
- [X] T003 In `lib/session.ts`, rename the existing private `configureAccountServiceFromCookies`
      to `ensureAccountServiceConfigured` and export it; update `getSessionStatus()`'s internal
      call site to the new name; update `lib/session.test.ts` if it references the old name
      (research.md §2)

**Checkpoint**: Foundation ready — both user story phases can now begin

---

## Phase 2: User Story 1 - Browse the Games List (Priority: P1) 🎯 MVP

**Goal**: A visitor (signed in or not) opens `/` and sees a card per game; clicking a card
navigates to that game's entry page (spec.md FR-001–FR-003, FR-010).

**Independent Test**: With the backend seeded with ≥1 game, open `/` without signing in, confirm
one card per game renders with banner + name, and clicking one navigates to `/game-${slug}`. With
the catalog empty, confirm the empty-state message renders instead (quickstart.md Scenarios 1–2).

### Tests for User Story 1

- [X] T004 [P] [US1] Write `components/molecules/GameCard.test.tsx`: renders a game's banner and
      name, renders as a link to the `href` prop, and still renders the name (and stays a link)
      when the banner image errors (spec.md Edge Cases)
- [X] T005 [P] [US1] Write `components/molecules/EmptyState.test.tsx`: renders the given message
      text
- [X] T006 [P] [US1] Write `components/organisms/GameGrid.test.tsx`: renders one `GameCard` per
      item in a non-empty `games` prop (using each game's `entryPath` as `href`), and renders
      `EmptyState` instead when `games` is empty
- [X] T007 [US1] Write `app/(public)/page.test.tsx`: mocks `listGames`, asserts the page renders a
      `GameGrid` populated from its result, and separately asserts an empty result renders the
      empty-state path

### Implementation for User Story 1

- [X] T008 [P] [US1] Implement `components/molecules/GameCard.tsx`: a `next/link` `Link` (given an
      `href` prop) wrapping a banner `<img>` (plain `<img>`, per research.md §3 — mirrors the
      `Avatar` atom) and the game's name text
- [X] T009 [P] [US1] Implement `components/molecules/EmptyState.tsx`: a single centered text
      message component taking a `message: string` prop, styled per the constitution's fixed
      palette (`--color-text-secondary`)
- [X] T010 [US1] Implement `components/organisms/GameGrid.tsx`: takes a `games: Array<{ name:
      string; bannerUrl: string; href: string }>` prop and an `emptyMessage: string` prop; renders
      a responsive grid of `GameCard` when `games` is non-empty, otherwise renders `EmptyState`
      with `emptyMessage` (depends on T008, T009)
- [X] T011 [US1] Implement `app/(public)/page.tsx` (new file — currently `/` 404s): a Server
      Component that calls `ensureAccountServiceConfigured()` then `listGames()`, maps each result
      through `getGameLinkTarget(game).entryPath`, and renders `GameGrid` with an empty-state
      message for "no games available" (depends on T002, T003, T010)

**Checkpoint**: User Story 1 is fully functional and independently testable — `/` renders the full
games catalog for any visitor.

---

## Phase 3: User Story 2 - View Account Summary & Game Profiles (Priority: P2)

**Goal**: A signed-in user opens `/account` and sees their username/email/avatar plus either a
"no profile yet" message or one card per played game, linking to that game's profile page
(spec.md FR-004–FR-009).

**Independent Test**: Sign in as an account with no played games, open `/account`, confirm the
identity fields render and the empty-profile message shows with no cards. Sign in as an account
with ≥1 played game, confirm exactly one card per `hasProfile: true` game renders, and clicking one
navigates to `/game-${slug}/profile` (quickstart.md Scenarios 3–5).

### Tests for User Story 2

- [ ] T012 [US2] Write `app/(protected)/account/page.test.tsx`: mocks `getCurrentAccount` and
      `listGames`, and asserts (a) username/email/avatar render, (b) an account whose
      `listGames()` result has no `hasProfile: true` entries renders the "no profile yet" message
      and zero cards, and (c) an account with some `hasProfile: true` entries renders exactly one
      card per such entry (and none for the rest), each linking to that game's `profilePath`

### Implementation for User Story 2

- [ ] T013 [US2] Implement `app/(protected)/account/page.tsx` (replaces the "Coming soon."
      placeholder): a Server Component that calls `ensureAccountServiceConfigured()`, then
      `getCurrentAccount()` and `listGames()`; renders the `Avatar` atom plus username/email at
      the top; filters `listGames()`'s result to `hasProfile === true` and renders `GameGrid` (via
      each game's `getGameLinkTarget(game).profilePath`) with the "no profile yet" empty-state
      message when that filtered list is empty (depends on T002, T003, T008, T009, T010 from
      Phase 2 — reuses the same `GameCard`/`GameGrid`/`EmptyState` components, no new ones)

**Checkpoint**: User Stories 1 and 2 both work independently; the Account page reuses Phase 2's
grid/card/empty-state components with no duplication.

---

## Phase 4: Polish & Cross-Cutting Concerns

- [ ] T014 [P] Run `turbo run lint typecheck test --filter=web --filter=@game-hub/account-service`
      and fix any failures surfaced by the `bannerUrl` type change or new components
- [ ] T015 [P] Manually run through quickstart.md's five scenarios and two edge-case spot-checks
      against `turbo run dev --filter=web`, confirming the classic/vintage palette (constitution
      Coding Conventions) is applied to `GameCard`/`EmptyState` with no ad-hoc colors

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: No dependencies — start immediately. Blocks both user stories.
- **User Story 1 (Phase 2)**: Depends on Phase 1 (T002, T003 specifically). No dependency on US2.
- **User Story 2 (Phase 3)**: Depends on Phase 1 (T002, T003) **and** on Phase 2's T008–T010
  (reuses `GameCard`/`GameGrid`/`EmptyState` as-is — no new component work). This mirrors spec.md's
  own stated priority rationale (US2 "layered on top of" US1).
- **Polish (Phase 4)**: Depends on both user stories being complete.

### Parallel Opportunities

- T002 and T003 can run in parallel with each other (different files); T001 is independent of both.
- T004, T005, T006 (US1 tests) can run in parallel with each other.
- T008 and T009 (US1 implementation) can run in parallel with each other; T010 depends on both.
- T014 and T015 can run in parallel.

---

## Parallel Example: Phase 1 (Foundational)

```bash
Task: "Add bannerUrl to Game in packages/account-service/src/types.ts (T001)"
Task: "Create lib/game-routes.ts + test (T002)"
Task: "Export ensureAccountServiceConfigured from lib/session.ts (T003)"
```

## Parallel Example: User Story 1 tests

```bash
Task: "Write components/molecules/GameCard.test.tsx (T004)"
Task: "Write components/molecules/EmptyState.test.tsx (T005)"
Task: "Write components/organisms/GameGrid.test.tsx (T006)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Foundational
2. Complete Phase 2: User Story 1 (Games List page)
3. **STOP and VALIDATE**: quickstart.md Scenarios 1–2 against `/`
4. Deploy/demo if ready — the games catalog is independently useful even before the Account page
   changes ship

### Incremental Delivery

1. Foundational → Phase 2 (US1) → validate → demo (MVP)
2. Phase 3 (US2, reusing Phase 2's components) → validate → demo
3. Phase 4 Polish

## Notes

- No `contracts/` tasks — this feature has no new Route Handler (plan.md Project Structure).
- `GameCard`/`GameGrid`/`EmptyState` are built once in Phase 2 and reused as-is in Phase 3 —
  do not duplicate them for the Account page (constitution Principle III/V).
- Commit after each task or logical group; stop at each Checkpoint to validate independently.
- FR-009 (Account page reachable only when signed in) has no dedicated task: it's satisfied by
  the existing `(protected)/layout.tsx` redirect gate from `003-cookie-auth-migration`, which
  T013's page.tsx stays under unchanged. Validated via quickstart.md Scenario 5, not a new
  automated test — adding one here would duplicate `003`'s existing coverage of that gate.
