---

description: "Task list for Caro Guest Access (Lobby, Match View, Moves)"
---

# Tasks: Caro Guest Access (Lobby, Match View, Moves)

**Input**: Design documents from `/specs/006-caro-guest-access/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/proxy-auth-policy.md](contracts/proxy-auth-policy.md), [quickstart.md](quickstart.md)

**Tests**: Included — `plan.md`'s Technical Context and `quickstart.md` both commit to extending
`apps/web/lib/proxy.test.ts` with specific new cases, so test tasks are part of the plan, not
optional filler.

**Organization**: Tasks are grouped by user story (from spec.md) to enable independent
implementation and testing of each story. All work is concentrated in two files:
`apps/web/lib/proxy.ts` and `apps/web/lib/proxy.test.ts` (see plan.md's Project Structure —
`packages/caro-service` and the Route Handler need no changes).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- File paths are exact, relative to the repo root

---

## Phase 1: Setup

**Purpose**: Establish a baseline before touching `forwardToBackend`

- [ ] T001 Run `turbo run test --filter=@game-hub/web -- proxy.test.ts` to confirm the existing suite in `apps/web/lib/proxy.test.ts` passes before any change (baseline for later regression checks)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the generic "optional-auth route" mechanism that every user story below adds one entry to. No user story can add its entry until this exists.

**⚠️ CRITICAL**: No user story task can begin until this phase is complete

- [ ] T002 [Foundational] In `apps/web/lib/proxy.ts`, restructure `forwardToBackend` so the target URL and request body are built (`buildTargetUrl`, reading the body) before the `accessToken` presence check, and change `callBackend`'s signature to accept `accessToken: string | null`, omitting the `Authorization` header entirely when it is `null` (research.md §1, data-model.md)
- [ ] T003 [Foundational] In `apps/web/lib/proxy.ts`, add an `isOptionalAuthRoute(method: string, pathSegments: string[]): boolean` matcher with no entries yet (always returns `false`), and wire it into `forwardToBackend`'s no-cookie branch: when it returns `true`, call the backend via T002's nullable-token path and relay the response instead of returning the synthesized 401 (contracts/proxy-auth-policy.md)
- [ ] T004 [Foundational] Re-run `apps/web/lib/proxy.test.ts` (existing suite, unmodified) to confirm T002–T003's refactor changes no observable behavior yet — checkpoint before any story adds a real entry

**Checkpoint**: Foundation ready — the allowlist mechanism exists and is inert; each user story below can now add its own entry independently

---

## Phase 3: User Story 1 - Browse the open match lobby without signing in (Priority: P1) 🎯 MVP

**Goal**: A visitor with no active session can retrieve the open match lobby list through the proxy.

**Independent Test**: With no `access_token` cookie set, request `GET caro/matches/lobby` through `forwardToBackend` and confirm the backend is called and its response relayed, instead of getting the synthesized 401.

- [ ] T005 [US1] In `apps/web/lib/proxy.ts`, add the `GET` + `["caro", "matches", "lobby"]` entry to `isOptionalAuthRoute` (contracts/proxy-auth-policy.md row 1)
- [ ] T006 [P] [US1] Add a test in `apps/web/lib/proxy.test.ts`: `GET caro/matches/lobby` with no `access_token` cookie forwards to the backend (mocked `fetch` called) and relays the response verbatim (quickstart.md case 1)
- [ ] T007 [P] [US1] Add a test in `apps/web/lib/proxy.test.ts`: the same path with a valid `access_token` cookie still attaches the `Bearer` header exactly as today — no regression for signed-in callers (spec FR-005/FR-006, quickstart.md case 5)

**Checkpoint**: Guests can browse the open match lobby; every other Caro path still 401s with no cookie (T004's baseline still holds everywhere else)

---

## Phase 4: User Story 2 - View a specific match's state without signing in (Priority: P2)

**Goal**: A visitor with no active session can retrieve a single match's state through the proxy, while the same-shaped `DELETE` (creator-cancel) stays gated.

**Independent Test**: With no cookie set, request `GET caro/matches/{id}` and confirm the backend is called and its response relayed; then confirm `DELETE caro/matches/{id}` with no cookie still 401s.

- [ ] T008 [US2] In `apps/web/lib/proxy.ts`, add the `GET` + `["caro", "matches", <single wildcard segment>]` entry to `isOptionalAuthRoute`, keyed on method so it does not also match `DELETE` on the same path shape (contracts/proxy-auth-policy.md row 2)
- [ ] T009 [P] [US2] Add a test in `apps/web/lib/proxy.test.ts`: `GET caro/matches/{id}` with no cookie forwards to the backend and relays the response (quickstart.md case 2)
- [ ] T010 [P] [US2] Add a regression test in `apps/web/lib/proxy.test.ts`: `DELETE caro/matches/{id}` (creator-cancel — same path shape, different method) with no cookie still returns the synthesized 401 with `fetch` not called (contracts/proxy-auth-policy.md non-match table)

**Checkpoint**: Guests can browse the lobby and view a match; creator-cancel and every other same-resource action remain gated

---

## Phase 5: User Story 3 - Submit a move without signing in (Priority: P3)

**Goal**: A visitor with no active session can have a move-submission request evaluated through the proxy, while neighboring same-resource actions (e.g. join) stay gated.

**Independent Test**: With no cookie set, request `POST caro/matches/{id}/moves` and confirm the backend is called and its response relayed; then confirm a neighboring action like `POST caro/matches/{id}/join` with no cookie still 401s.

- [ ] T011 [US3] In `apps/web/lib/proxy.ts`, add the `POST` + `["caro", "matches", <single wildcard segment>, "moves"]` entry to `isOptionalAuthRoute` (contracts/proxy-auth-policy.md row 3)
- [ ] T012 [P] [US3] Add a test in `apps/web/lib/proxy.test.ts`: `POST caro/matches/{id}/moves` with no cookie forwards to the backend and relays the response (quickstart.md case 3)
- [ ] T013 [P] [US3] Add a regression test in `apps/web/lib/proxy.test.ts`: a neighboring same-resource action, `POST caro/matches/{id}/join`, with no cookie still returns the synthesized 401 with `fetch` not called (quickstart.md case 4)

**Checkpoint**: All three spec user stories are functional; every other Caro action (create, join, invite, start, surrender, draw request, leave/cancel) remains authed

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verify the whole feature end-to-end and keep documentation honest

- [ ] T014 [P] Run `turbo run test --filter=@game-hub/web -- proxy.test.ts` for the full suite (all new cases from T006–T013 plus every pre-existing case) and confirm all pass
- [ ] T015 Update the doc comment atop `forwardToBackend` in `apps/web/lib/proxy.ts` to mention the three allowlisted exceptions and point at `contracts/proxy-auth-policy.md` as the source of truth
- [ ] T016 Walk through quickstart.md's manual/live validation steps against a running backend, if available, to confirm end-to-end behavior beyond the mocked test suite

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup (T001) — BLOCKS all user stories (T002 → T003 → T004, strictly sequential, same file)
- **User Stories (Phase 3-5)**: All depend on Foundational (T004) completion; independent of each other otherwise
- **Polish (Phase 6)**: Depends on all three user stories being complete

### User Story Dependencies

- **US1 (P1)**: Can start after Foundational (T004) — no dependency on US2/US3
- **US2 (P2)**: Can start after Foundational (T004) — no dependency on US1/US3 (touches a different `isOptionalAuthRoute` entry and different test cases)
- **US3 (P3)**: Can start after Foundational (T004) — no dependency on US1/US2

Note: T005/T008/T011 all edit the same array in `apps/web/lib/proxy.ts`, and T006-T007/T009-T010/T012-T013 all edit the same `apps/web/lib/proxy.test.ts` file — if worked in parallel by different people, the three matcher-entry edits and the six test additions will need a trivial merge (each is an independent line/block, not a conflicting change to shared logic).

### Parallel Opportunities

- Within each user story, the test-writing tasks marked `[P]` (e.g. T006 + T007) can be drafted in parallel with each other, though both land in the same file as T005/T008/T011's matcher entry
- Once Foundational (T004) is done, US1, US2, and US3 can be worked in parallel by different people (see merge note above)
- T014 and T015 in Polish can run in parallel (different concerns: test run vs. doc comment)

---

## Parallel Example: User Story 1

```bash
# After T005 (matcher entry) lands, these two test tasks touch independent cases in the same file:
Task: "Add test: GET caro/matches/lobby with no cookie forwards and relays"
Task: "Add test: GET caro/matches/lobby with a valid cookie still attaches Bearer"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational (T002-T004) — CRITICAL, blocks all stories
3. Complete Phase 3: User Story 1 (T005-T007)
4. **STOP and VALIDATE**: Run `apps/web/lib/proxy.test.ts`; confirm guests can list the lobby and every other path still 401s
5. Ship — the lobby-browsing MVP is independently valuable even before US2/US3 land

### Incremental Delivery

1. Setup + Foundational → allowlist mechanism ready, inert
2. Add US1 → guests can browse the lobby → validate → ship
3. Add US2 → guests can also view a match → validate → ship
4. Add US3 → guests can also have moves evaluated → validate → ship
5. Polish (T014-T016) → full regression pass + doc/quickstart confirmation

---

## Notes

- No entity/model tasks — this feature changes an authorization check, not data (data-model.md)
- No contract-test-before-implementation split beyond what's listed — `packages/caro-service` and the Route Handler are unchanged, so there is nothing to contract-test outside `proxy.test.ts`
- Commit after each task or logical group (e.g. after each user story's checkpoint)
- Stop at any checkpoint to validate a story independently before moving to the next priority
