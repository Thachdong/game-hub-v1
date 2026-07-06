---

description: "Task list template for feature implementation"
---

# Tasks: Cookie-Based Token Auth Migration (Replace NextAuth)

**Input**: Design documents from `/specs/003-cookie-auth-migration/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Not explicitly requested in spec.md. A modest set of unit tests is folded into each
story's implementation (mirroring `002-login-layout-nextauth`'s and `001-domain-service-layer`'s
convention), covering the pieces that are otherwise hard to verify by inspection alone: cookie
flags on the login route, the session-status resolution logic, and the refresh/concurrency
guarantee. quickstart.md's manual scenarios cover end-to-end verification (no new E2E tooling is
introduced).

**Organization**: Tasks are grouped by user story (from spec.md) on top of a Foundational phase
that every story depends on — this feature's nature (replacing the session/token mechanism itself)
makes that dependency unusually central, same as `002-login-layout-nextauth`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1–US4)
- Every task includes an exact file path

## Path Conventions

Single existing app in this Turborepo workspace — `apps/web/` — consuming the unchanged
`packages/*` domain services via `workspace:*` (plan.md Project Structure; no `packages/*` changes
in this feature).

---

## Phase 1: Setup

**Purpose**: Lay down the shared types/constants every later task imports.

- [X] T001 Create `apps/web/lib/session.ts` with `ACCESS_COOKIE_NAME`/`REFRESH_COOKIE_NAME`
  constants and the `SessionStatus`/`LoginResult`/`RefreshResult` types per data-model.md and
  `contracts/session-status.ts`

**Checkpoint**: Shared vocabulary exists for every subsequent task to import.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Replace NextAuth's cookie/session plumbing with the first-party mechanism every user
story depends on to be independently demonstrable at all.

**⚠️ CRITICAL**: No user story (Phase 3+) can begin until this phase is complete.

- [X] T002 Implement `decodeJwtExpiryMs()` in `apps/web/lib/session.ts`, generalized from the
  existing `apps/web/lib/token-refresh.ts` (depends on T001)
- [X] T003 Implement `getSessionStatus()` in `apps/web/lib/session.ts` — reads the `access_token`
  cookie via `next/headers`'s `cookies()`, returns `{ isSignedIn: false }` when absent, otherwise
  configures `@game-hub/account-service` with a synchronous `getAccessToken` closure over the
  already-resolved cookie value and a stub `onUnauthenticated: async () => null` (real refresh
  lands in US3, T021–T022), calls the package's existing `getCurrentAccount()`, and returns a
  `SessionStatus` (research.md §3, §5) (depends on T001, T002)
- [X] T004 [P] Unit test: `getSessionStatus()` returns `{ isSignedIn: false }` with no cookie,
  returns `{ isSignedIn: false }` when only an unrelated/legacy cookie (e.g. a leftover
  NextAuth `next-auth.session-token`) is present but `access_token` is absent (FR-009/SC-005), and
  returns `{ isSignedIn: true, account }` given a mocked `getCurrentAccount()` success, in
  `apps/web/lib/session.test.ts` (depends on T003)
- [X] T005 Modify `apps/web/app/api/auth/google/callback/route.ts` to set `access_token`/
  `refresh_token` as `httpOnly`/`Secure`(prod)/`SameSite=Lax` cookies directly from the backend's
  `LoginResult`, replacing the `signIn("credentials", ...)` call — redirect/error branches (declined
  consent, backend failure) are unchanged (research.md §2) (depends on T001)
- [X] T006 [P] Update `apps/web/app/api/auth/google/callback/route.test.ts` to assert the cookies
  are set with the correct name/flags and that no token value appears anywhere in the response,
  replacing the mocked-`signIn` assertions (depends on T005)
- [X] T007 Implement `GET /api/auth/session` wrapping `getSessionStatus()` in
  `apps/web/app/api/auth/session/route.ts` per `contracts/auth-routes.md` (depends on T003)
- [X] T008 [P] Unit test for the session route (always `200`, correct body for signed-in/signed-out)
  in `apps/web/app/api/auth/session/route.test.ts` (depends on T007)
- [X] T009 Implement `POST /api/auth/logout` in `apps/web/app/api/auth/logout/route.ts`, clearing
  both cookies and returning `{ isSignedIn: false }` — no backend call (research.md §7) (depends on
  T001)
- [X] T010 [P] Unit test for the logout route (clears both cookies) in
  `apps/web/app/api/auth/logout/route.test.ts` (depends on T009)
- [X] T011 Implement a first-party `SessionProvider` React Context + `useAuthSession()` hook
  (accepts an initial `SessionStatus`, exposes `refresh()` via `GET /api/auth/session` and
  `logout()` via `POST /api/auth/logout` followed by `refresh()`) in
  `apps/web/components/templates/Providers.tsx`, replacing NextAuth's `SessionProvider` (depends on
  T007, T009)
- [X] T012 [P] Unit test for `Providers`/`useAuthSession` (seeds initial value, `refresh()`/
  `logout()` update context state) in `apps/web/components/templates/Providers.test.tsx` (depends
  on T011)
- [X] T013 Update `apps/web/app/layout.tsx` to call `getSessionStatus()` instead of `auth()` and
  seed `<Providers>` with the result, preserving the no-loading-flash guarantee (spec 002 FR-012)
  (depends on T003, T011)

**Checkpoint**: Cookies are set on login, session status is queryable server- and client-side,
logout clears cookies. `useAuthSession()`/`getSessionStatus()` are usable by every subsequent
phase.

---

## Phase 3: User Story 1 - Sign in without exposing tokens to page scripts (Priority: P1) 🎯 MVP

**Goal**: The Google sign-in flow completes and establishes a session with neither token ever
readable by client-side script (FR-001–FR-003).

**Independent Test**: Run quickstart.md Scenario 1 — sign in, then confirm in dev tools that
`access_token`/`refresh_token` are `HttpOnly` and never appear in `document.cookie`, any response
body, or the `/api/auth/session` payload.

### Implementation for User Story 1

- [ ] T014 [US1] Update `apps/web/app/(public)/login/page.tsx`'s already-signed-in redirect check
  to use `getSessionStatus()` instead of `auth()` (depends on T013)

**Checkpoint**: User Story 1 is functional and independently testable per quickstart.md Scenario 1
— the login route, cookie-setting, and session-status plumbing built in Foundational are fully
exercised end to end.

---

## Phase 4: User Story 2 - Existing signed-in experience keeps working, unchanged (Priority: P1)

**Goal**: `AppNav`'s sign-in-state chrome, `RequireSignIn`'s action gating, and
`(protected)/layout.tsx`'s route protection all keep working exactly as
`002-login-layout-nextauth` built them, now reading from the new mechanism instead of NextAuth
(FR-006, FR-007).

**Independent Test**: Run quickstart.md Scenario 2 — account/tournament/admin pages still render,
`JoinMatchButton`'s gated action fires when signed in and prompts sign-in when signed out.

### Implementation for User Story 2

- [ ] T015 [US2] Replace `useSession`/`signOut` in `apps/web/components/organisms/AppNav.tsx` with
  `useAuthSession()` (`isSignedIn`/`account`) and a `logout()` call (depends on T013)
- [ ] T016 [P] [US2] Update `apps/web/components/organisms/AppNav.test.tsx` to mock
  `useAuthSession()` instead of `useSession()` (depends on T015)
- [ ] T017 [US2] Replace `useSession` in `apps/web/components/molecules/RequireSignIn.tsx` with
  `useAuthSession()` (depends on T013)
- [ ] T018 [P] [US2] Update `apps/web/components/molecules/RequireSignIn.test.tsx` to mock
  `useAuthSession()` instead of `useSession()` (depends on T017)
- [ ] T019 [US2] Update `apps/web/app/(protected)/layout.tsx`'s redirect gate to call
  `getSessionStatus()` instead of `auth()` (depends on T013)
- [ ] T020 [P] [US2] Update `apps/web/app/(protected)/layout.test.tsx` to mock
  `getSessionStatus()` instead of `auth()` (depends on T019)

**Checkpoint**: User Stories 1 and 2 both work independently — quickstart.md Scenarios 1–2 pass.
Every NextAuth call site in application code (outside the files deleted in Phase 7) is gone.

---

## Phase 5: User Story 3 - Session renews itself without interrupting the visitor (Priority: P2)

**Goal**: An expired access token renews transparently via the refresh token, with zero visible
interruption; an also-expired refresh token is treated as signed out (FR-004, FR-005, FR-008).

**Independent Test**: Run quickstart.md Scenario 3 — force an access-token expiry mid-session and
confirm the next action succeeds transparently with a rotated cookie.

### Implementation for User Story 3

- [X] T021 [US3] Implement `refreshSession()` in `apps/web/lib/session.ts` — reads the
  `refresh_token` cookie, calls `POST {BACKEND_URL}/api/auth/refresh`, re-sets the `access_token`
  cookie on the current response on success and returns the new token, returns `null` on failure;
  memoizes its in-flight `Promise` for the lifetime of one request-handling invocation (research.md
  §4) (depends on T002)
- [X] T022 [US3] Wire `refreshSession()` as the real `onUnauthenticated` callback in
  `getSessionStatus()`'s `account-service` configuration, replacing Foundational's stub (`apps/web/
  lib/session.ts`) (depends on T021, T003)
- [X] T023 [P] [US3] Unit test: an expired `access_token` with a valid `refresh_token`
  transparently renews and `getSessionStatus()` still returns `isSignedIn: true`; an expired
  `access_token` with an invalid `refresh_token` returns `isSignedIn: false`; concurrent calls
  within one invocation trigger only one mocked backend refresh call — in
  `apps/web/lib/session.test.ts` (depends on T022)

**Checkpoint**: User Stories 1–3 all work independently — quickstart.md Scenario 3 passes.

---

## Phase 6: User Story 4 - One reusable auth mechanism, not one per integration point (Priority: P3)

**Goal**: The token-attachment/refresh logic is implemented once and reused by every call site
that needs it, rather than duplicated (FR-011).

**Independent Test**: Inspect (and assert via test) that both `getSessionStatus()`'s server-render
call site and the `GET /api/auth/session` route resolve through the exact same underlying
function — no second, parallel implementation.

### Implementation for User Story 4

- [X] T024 [US4] Extract the "resolve the `access_token` cookie and configure
  `@game-hub/account-service`" logic in `apps/web/lib/session.ts` into one small, explicitly named
  function that `getSessionStatus()` calls internally and that a doc comment marks as the pattern
  any future proxy route (e.g., for `tournament`/`admin`/Caro actions, once those pages get real
  content) MUST reuse rather than reimplement (depends on T022)
- [X] T025 [P] [US4] Unit test asserting `getSessionStatus()` (server-render call site) and
  `GET /api/auth/session` (client-revalidation call site, T007) both resolve through the same
  underlying function in `apps/web/lib/session.test.ts` (depends on T024, T007)

**Checkpoint**: All four user stories are independently functional — quickstart.md Scenarios 1–3
plus the reuse assertion all pass.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Remove the now-dead NextAuth code and validate the whole feature end to end.

- [ ] T026 Delete `apps/web/lib/auth.ts`, `apps/web/lib/next-auth.d.ts`,
  `apps/web/lib/token-refresh.ts`, `apps/web/lib/token-refresh.test.ts`, and
  `apps/web/app/api/auth/[...nextauth]/route.ts` — fully superseded by `lib/session.ts` and the new
  Route Handlers (depends on Phases 3–6 complete)
- [ ] T027 Remove the `next-auth` dependency from `apps/web/package.json` (depends on T026)
- [ ] T028 Run `grep -rn "next-auth" apps/web/package.json apps/web/app apps/web/lib
  apps/web/components` and confirm zero matches (SC-006, quickstart.md "Verifying NextAuth
  removal") (depends on T026, T027)
- [ ] T029 Run `pnpm turbo run typecheck --filter=web` and fix any type errors
- [ ] T030 Run `pnpm turbo run test --filter=web` and confirm every unit test passes
- [ ] T031 Run `pnpm turbo run build --filter=web` and confirm the production build succeeds
- [ ] T032 Execute quickstart.md's manual Scenarios 1–5 against a running backend and record the
  results

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup (T001's types/constants) — BLOCKS every user story
- **User Stories (Phase 3–6)**: All depend on Foundational completion. US3 (Phase 5) modifies the
  same `lib/session.ts` file US1/US2 don't touch, so it has no file conflict with them. US4 (Phase
  6) depends on US3 (T022) since it refactors the function US3 just wired up.
- **Polish (Phase 7)**: Depends on all four user stories being complete (T026 deletes files only
  once nothing in application code still references them)

### User Story Dependencies

- **US1 (P1, sign-in without token exposure)**: Depends only on Foundational
- **US2 (P1, existing chrome/gating keeps working)**: Depends only on Foundational — independent
  of US1's login-page change
- **US3 (P2, transparent renewal)**: Depends on Foundational's `getSessionStatus()` (T003); not on
  US1 or US2
- **US4 (P3, single reusable mechanism)**: Depends on US3 (T022) — refactors the function US3 just
  finished wiring with real refresh logic

### Within Each User Story

- Implementation before that story's tests (tests import from the module/route under test)
- `lib/session.ts` changes (US3) before route/component changes that consume it

### Parallel Opportunities

- Foundational: T005/T007/T009 can proceed in parallel once T001/T003 exist; their respective
  [P] test tasks (T006, T008, T010) follow each
- US1: single task, no parallelism within the story
- US2: T015/T017/T019 touch three different files and can proceed in parallel once T013 exists;
  their [P] test tasks follow each
- US3: T021 then T022 are sequential (same file); T023 follows
- US4: T024 then T025 are sequential (test depends on the refactor)
- US1 and US2 can be developed in parallel once the Foundational checkpoint is reached

---

## Parallel Example: Foundational → early user-story work

```bash
# After Phase 2 checkpoint, US1 and US2 can start in parallel:
Task: "Update login/page.tsx's already-signed-in check to use getSessionStatus()"   # T014 [US1]
Task: "Replace useSession/signOut in AppNav.tsx with useAuthSession()"              # T015 [US2]
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: run quickstart.md Scenario 1 against a running backend
5. This alone proves the core migration (login route sets cookies, no token ever client-readable)
   works

### Incremental Delivery

1. Setup + Foundational → the new mechanism exists, with a refresh stub
2. Add US1 (sign-in) → validate → the login flow is fully migrated
3. Add US2 (existing chrome/gating) → validate independently → zero remaining NextAuth call sites
   in `AppNav`/`RequireSignIn`/`(protected)/layout.tsx`
4. Add US3 (transparent renewal) → validate independently → the refresh stub is replaced with the
   real thing
5. Add US4 (single reusable mechanism) → validate independently → the pattern is named and
   documented for future proxy routes
6. Phase 7 polish once all four stories are complete — this is also when NextAuth is actually
   deleted, not before

### Parallel Team Strategy

With multiple developers, once Phase 2 (Foundational) is done:

- Developer A: US1 (sign-in flow, the highest-risk piece since it touches the OAuth callback route)
- Developer B: US2 (chrome/gating migration) — no dependency on US1
- Developer C: US3 then US4 once Foundational lands (both touch `lib/session.ts` sequentially)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- This feature deletes more application code (NextAuth wiring) than it adds; Phase 7's deletions
  are deliberately last so no story is ever blocked on a half-removed dependency
- `packages/*` is untouched throughout — see plan.md/research.md §5–§6 for why no task here
  modifies `packages/service-core` or any domain-service package
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
