---

description: "Task list template for feature implementation"
---

# Tasks: Login Page, Webapp Layout, and NextAuth Session Setup

**Input**: Design documents from `/specs/002-login-layout-nextauth/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Not explicitly requested in spec.md. A modest set of unit tests is folded into each
story's implementation (mirroring `001-domain-service-layer`'s convention) for the pieces that are
otherwise hard to verify by inspection alone: the NextAuth `jwt` callback's refresh-rotation logic
(research.md §6), the OAuth callback proxy route's forward/redirect behavior, and the
`(protected)/layout.tsx` redirect gate. No end-to-end test tooling is introduced (quickstart.md's
manual smoke test covers the full flow instead — see quickstart.md Known Limitations).

**Organization**: Tasks are grouped by user story (from spec.md) to enable independent
implementation and testing of each of the four stories, on top of a Foundational phase that every
story depends on (this feature's nature — session/auth — makes that dependency unusually central,
same as `001-domain-service-layer`'s auth story).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1–US4)
- Every task includes an exact file path

## Path Conventions

First `apps/*` package in this Turborepo workspace (see plan.md Project Structure) — `apps/web/`,
consuming the existing `packages/*` domain services via `workspace:*`.

---

## Phase 1: Setup (apps/web scaffolding)

**Purpose**: Scaffold the first Next.js app in this workspace — none of it exists yet.

- [X] T001 Add `apps/*` to `pnpm-workspace.yaml`'s `packages:` glob (currently only `packages/*`) at the repository root
- [X] T002 Scaffold `apps/web/package.json` (name `web`, Next.js + React + `next-auth` + `tailwindcss` dependencies, `@game-hub/account-service`/`profiles-service`/`admin-service`/`caro-service` via `workspace:*`, scripts: `dev`/`build`/`start`/`lint`/`test`/`typecheck`), `apps/web/tsconfig.json` (extends root `tsconfig.base.json`, Next.js's own plugin/paths additions), `apps/web/next.config.ts`
- [X] T003 [P] Configure Tailwind CSS in `apps/web` (`tailwind.config.ts`, `app/globals.css`, PostCSS config per research.md §7)
- [X] T004 [P] Add `apps/web/.env.local.example` documenting `NEXT_PUBLIC_GAME_HUB_API_BASE_URL`, `BACKEND_URL`, `AUTH_SECRET` per quickstart.md Prerequisites
- [X] T005 [P] Verify/extend root `turbo.json` pipeline for Next.js build output caching (`.next/**` excluding `.next/cache/**`) if the existing `build` task definition doesn't already cover it

**Checkpoint**: `pnpm install` resolves `apps/web` alongside `packages/*`; `pnpm --filter web dev` starts an empty Next.js app with zero TypeScript errors.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: NextAuth core wiring and the app shell every user story depends on to be
independently testable at all — no story can demonstrate "signed in" vs "signed out" without this.

**⚠️ CRITICAL**: No user story (Phase 3+) can begin until this phase is complete.

- [X] T006 Define the `Session`/`JWT` type augmentation per `contracts/session.ts` in `apps/web/lib/next-auth.d.ts` (depends on T002)
- [X] T007 Implement the NextAuth config — `Credentials` provider (pass-through `authorize()`, research.md §3), `jwt` callback (embeds `accessToken`/`refreshToken`/`account`, implements FR-003 refresh-rotation via `POST /api/auth/refresh` on expiry per research.md §6, sets `error: "RefreshFailed"` on rotation failure per FR-004), `session` callback (exposes `accessToken` + `account`, never `refreshToken`, per spec.md Clarifications 2026-07-03) — in `apps/web/lib/auth.ts`, with the refresh-rotation logic itself extracted to `apps/web/lib/token-refresh.ts` so it doesn't require importing `NextAuth()`'s full initialization (which pulls in `next/server`, unavailable outside the Next.js build) just to unit-test it (depends on T006)
- [X] T008 Implement the NextAuth route handler in `apps/web/app/api/auth/[...nextauth]/route.ts` (depends on T007)
- [X] T009 Implement the root layout — `<html>`/`<body>`, server-fetches `auth()` and seeds `<SessionProvider session={session}>` per research.md §5 (avoids the FR-012/SC-006 loading flash) — in `apps/web/app/layout.tsx` (depends on T007)
- [X] T010 [P] Implement the root `loading.tsx` fallback in `apps/web/app/loading.tsx` (depends on T002)
- [X] T011 [P] Unit test: `refreshAccessToken` renews an expired `accessToken` via a mocked refresh call and updates the token; sets `error: "RefreshFailed"` when the refresh call itself fails or throws — in `apps/web/lib/token-refresh.test.ts` (depends on T007)

**Checkpoint**: NextAuth session type, config, and route handler exist; root layout seeds session
correctly. `useSession()`/`auth()` are usable by every subsequent phase.

---

## Phase 3: User Story 1 - Sign in with Google (Priority: P1) 🎯 MVP

**Goal**: Deliver a working sign-in flow — login page, the OAuth callback proxy Route Handler
(research.md §1), and FR-011's decline-vs-error distinction.

**Independent Test**: Run quickstart.md §3 against a running backend with the external
`callbackUrl`/Google-Console config already applied — completing Google consent lands the visitor
back on the webapp signed in, with no other story's UI needing to exist yet.

### Implementation for User Story 1

- [X] T012 [US1] Implement the `/api/auth/google/callback` proxy Route Handler — forwards `code`/`state` to the backend server-to-server, calls `signIn('credentials', ...)` on success, reads + clears the `oauth_callback_url` cookie to determine the post-sign-in redirect target (research.md §2, FR-007), redirects to `/login?error=oauth_failed` on backend failure — per `contracts/auth-callback-route.md` in `apps/web/app/api/auth/google/callback/route.ts` (depends on T007)
- [X] T013 [P] [US1] Create login-page atoms (`Button`, `ErrorMessage`) in `apps/web/components/atoms/Button.tsx` and `apps/web/components/atoms/ErrorMessage.tsx` (depends on T002)
- [X] T014 [US1] Create the `LoginCard` organism — before navigating, sets the `oauth_callback_url` cookie (`Max-Age=300`, `Path=/`, `SameSite=Lax`) from the page's own `?callbackUrl=` query param if present (research.md §2, FR-007), then does a full-page navigation to the backend's `/api/auth/google`; reads the `?error=` query param to render FR-011's decline-vs-system-error distinction — in `apps/web/components/organisms/LoginCard.tsx` (depends on T013)
- [X] T015 [US1] Implement `apps/web/app/(public)/login/page.tsx` using `LoginCard`; if `auth()` already returns a session, redirect away (US1 Acceptance Scenario 3) instead of rendering the form (depends on T014, T009)
- [X] T016 [US1] Implement `apps/web/app/(public)/layout.tsx` (no auth gate; renders shared chrome once Phase 4 wires it in) (depends on T009)
- [X] T017 [P] [US1] Unit test: `LoginCard` renders the decline-vs-system-error branches correctly for each `error` value per FR-011 — in `apps/web/components/organisms/LoginCard.test.tsx` rather than the page itself, since `login/page.tsx` is an async Server Component RTL cannot render directly; the error-branching logic under test lives entirely in `LoginCard` (depends on T015)
- [X] T018 [P] [US1] Unit test: the callback route forwards `code`/`state` unmodified, redirects correctly on backend success vs. backend failure, and redirects to the `oauth_callback_url` cookie's value (falling back to `/` when absent) and clears it (mocked `fetch` + mocked `signIn` + mocked cookie store) in `apps/web/app/api/auth/google/callback/route.test.ts` (depends on T012)

**Checkpoint**: User Story 1 is functional and independently testable per quickstart.md §3 —
`apps/web` builds, typechecks, and its tests pass.

---

## Phase 4: User Story 2 - Consistent webapp layout (Priority: P1)

**Goal**: Deliver the shared navigation/sign-in-state chrome (`AppNav`) applied across every page,
per FR-005 and FR-012.

**Independent Test**: Run quickstart.md §3 step 4 (reload while signed in) and §6 (sign out) —
`AppNav` correctly reflects sign-in state with no flash, and sign-out ends the session, independent
of Stories 3/4's pages existing.

### Implementation for User Story 2

- [X] T019 [P] [US2] Create `AppNav` atoms (`Avatar`, `NavLink`) in `apps/web/components/atoms/Avatar.tsx` and `apps/web/components/atoms/NavLink.tsx` (depends on T002)
- [X] T020 [US2] Create the `AppNav` organism — reads `useSession()`, shows a "Sign in" affordance when `status === 'unauthenticated'` **or when `session?.error === 'RefreshFailed'`** (FR-004 — a failed-refresh session must render as signed-out, per contracts/session.ts), shows `session.account`'s username/avatar plus a sign-out affordance only when `status === 'authenticated'` and no `error` flag is set, shows a skeleton when `status === 'loading'` (FR-012) — in `apps/web/components/organisms/AppNav.tsx` (depends on T019, T009)
- [X] T021 [US2] Wire `AppNav` into the root layout (`apps/web/app/layout.tsx`) so it's shared across every route (depends on T020, T009)
- [X] T022 [US2] Implement the sign-out action (NextAuth `signOut()`, redirect to a public page per US2 Acceptance Scenario 3) inside `AppNav` in `apps/web/components/organisms/AppNav.tsx` (depends on T020)
- [X] T023 [P] [US2] Unit test: `AppNav` renders the signed-out, signed-in, and loading states correctly given a mocked `useSession()` return value in `apps/web/components/organisms/AppNav.test.tsx` (depends on T020)

**Checkpoint**: User Stories 1 AND 2 both work independently — every page built so far shares
`AppNav`'s chrome, correctly reflecting sign-in state with no loading-state flash.

---

## Phase 5: User Story 3 - Protected pages require sign-in (Priority: P2)

**Goal**: Deliver route protection for `account`, `tournament`, `admin` per FR-006/FR-007, plus
their placeholder pages.

**Independent Test**: Run quickstart.md §4 — direct navigation to any of the three protected
routes while signed out redirects to `/login?callbackUrl=...`; completing sign-in lands back on
the originally-requested page.

### Implementation for User Story 3

- [X] T024 [US3] Implement `apps/web/middleware.ts` (forwards the current pathname onto an `x-pathname` request header — no auth decision, see research.md §4's implementation-discovery note) and `apps/web/app/(protected)/layout.tsx` — calls `auth()`, reads the pathname header, redirects to `/login?callbackUrl=<current path>` when there is no session **or when `session.error === 'RefreshFailed'`** (FR-006, FR-004), otherwise renders children inside the shared chrome (depends on T009, T020)
- [X] T025 [P] [US3] Create the placeholder `apps/web/app/(protected)/account/page.tsx` (depends on T024)
- [X] T026 [P] [US3] Create the placeholder `apps/web/app/(protected)/tournament/page.tsx` (depends on T024)
- [X] T027 [P] [US3] Create the placeholder `apps/web/app/(protected)/admin/page.tsx` — plain sign-in gate only via T024, no Platform Admin role check (spec.md Clarifications, 2026-07-03) (depends on T024)
- [X] T028 [US3] Extend `apps/web/app/(public)/login/page.tsx` to read its own `?callbackUrl=` search param (set by T024's redirect) and pass it as a prop to `LoginCard`, so T014's cookie-setting logic (research.md §2) receives the real destination instead of always defaulting — the actual post-sign-in redirect happens in T012, this task only wires the value from the URL into the component (FR-007) (depends on T015, T024)
- [X] T029 [P] [US3] Unit test: `(protected)/layout.tsx` redirects to `/login?callbackUrl=...` when a mocked `auth()` returns `null` **or a session with `error: 'RefreshFailed'`** (FR-004), and renders children when it returns a valid error-free session, in `apps/web/app/(protected)/layout.test.tsx` (depends on T024)

**Checkpoint**: User Stories 1–3 all work independently — quickstart.md §4 passes end-to-end.

---

## Phase 6: User Story 4 - Public pages stay public, gate only interactive parts (Priority: P3)

**Goal**: Deliver the Caro list/detail placeholder pages per FR-008/FR-009 — viewable by anyone,
gating only the interactive actions.

**Independent Test**: Run quickstart.md §5 — an anonymous visitor views both pages without a
redirect or prompt, then triggers a gated action and is prompted to sign in rather than failing
silently.

### Implementation for User Story 4

- [ ] T030 [P] [US4] Create the placeholder `apps/web/app/(public)/game-caro/page.tsx` (list view; renders for anonymous visitors, exposes a gated "join" action hook point per FR-009) (depends on T016)
- [ ] T031 [P] [US4] Create the placeholder `apps/web/app/(public)/game-caro/[matchId]/page.tsx` (detail view; exposes gated "chat"/"report"/"play" action hook points per FR-009) (depends on T016)
- [ ] T032 [US4] Implement a reusable `RequireSignIn` molecule — wraps a gated action, checks `useSession()`, and prompts sign-in (per FR-009) instead of invoking the action when anonymous **or when `session?.error === 'RefreshFailed'`** (FR-004) — in `apps/web/components/molecules/RequireSignIn.tsx`, used by T030/T031's gated actions (depends on T020)
- [ ] T033 [P] [US4] Unit test: `RequireSignIn` prompts sign-in for an anonymous visitor and allows the wrapped action through for a signed-in visitor, given a mocked `useSession()` in `apps/web/components/molecules/RequireSignIn.test.tsx` (depends on T032)

**Checkpoint**: All four user stories are independently functional — quickstart.md §3–§5 all pass.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Validation and documentation spanning `apps/web`.

- [ ] T034 [P] Add `apps/web/README.md` documenting the route-group structure, the NextAuth session shape, and how to add a new protected or public page
- [ ] T035 Run `pnpm turbo run typecheck --filter=web` and fix any type errors (validates the Constitution Check's Principle IV/VI notes hold in code, not just in plan.md)
- [ ] T036 Run `pnpm turbo run test --filter=web` and confirm every unit test passes
- [ ] T037 Run `pnpm turbo run build --filter=web` and confirm the production build succeeds
- [ ] T038 Execute quickstart.md's manual smoke-test steps (§3–§6) against a running backend with the external `callbackUrl`/Google-Console config applied, and record the results
- [ ] T039 Re-review `checklists/ux.md` (CHK001–CHK023) against the finished implementation and check off any items the implementation itself resolved beyond spec level

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup (needs `apps/web`'s `package.json`/`tsconfig.json`) — BLOCKS every user story
- **User Stories (Phase 3–6)**: All depend on Foundational completion. US2 (layout) additionally
  benefits from US1 existing to have a real login page to navigate to/from, but its own components
  (`AppNav`) can be built and unit-tested in isolation with a mocked session. US3 and US4 depend on
  US2's `AppNav` (Phase 4, T020) for their shared chrome, and on Foundational's `auth()`/session
  plumbing — not on US1's specific login-page UI.
- **Polish (Phase 7)**: Depends on whichever user stories are in scope for a given release being complete

### User Story Dependencies

- **US1 (P1, sign-in flow)**: Depends only on Foundational
- **US2 (P1, layout)**: Depends only on Foundational; `AppNav`'s own unit test (T023) does not
  require US1's login page to exist (mocks `useSession()` directly)
- **US3 (P2, route protection)**: Depends on Foundational and on US2's `AppNav` (T020) for the
  chrome rendered inside `(protected)/layout.tsx`; depends on US1's login page (T015) only for
  T028's `callbackUrl` wiring — the redirect-to-login behavior itself (T024) works standalone
- **US4 (P3, public pages)**: Depends on Foundational, US1's `(public)/layout.tsx` (T016), and
  US2's `AppNav` (T020) for `RequireSignIn`'s session check

### Within Each User Story

- Atoms before organisms/molecules that compose them
- Organisms before the page(s) that use them
- Page implementation before that story's tests (tests import from the page/component)

### Parallel Opportunities

- Setup: T003–T005 in parallel once T001–T002 exist
- Foundational: T006 first; T007 depends on it; T008/T009/T010 can proceed once T007 exists (T010
  is fully parallel); T011 once T007 exists
- Within US1: T013 parallel with T012; T017/T018 parallel with each other once their dependencies
  land
- Within US2: T019 parallel with nothing blocking it (only needs T002); T023 once T020 exists
- Within US3: T025/T026/T027 (three placeholder pages) fully parallel once T024 exists; T029
  parallel with them
- Within US4: T030/T031 parallel once T016 exists; T033 once T032 exists
- US2 and US1 can be developed in parallel once Foundational is checkpointed (US2 doesn't need
  US1's login page for its own unit tests); US3 and US4 should follow both, per the Dependencies
  note above

---

## Parallel Example: Foundational → early user-story work

```bash
# After Phase 2 checkpoint, US1 and US2 can start in parallel:
Task: "Implement the /api/auth/google/callback proxy Route Handler"          # T012 [US1]
Task: "Create AppNav atoms (Avatar, NavLink)"                                # T019 [US2]
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1 (sign-in flow)
4. **STOP and VALIDATE**: run quickstart.md §3 against a running backend (requires the external
   `callbackUrl`/Google-Console config change — see quickstart.md Prerequisites)
5. This alone proves the hardest part of this feature (research.md §1's OAuth callback fix) works

### Incremental Delivery

1. Setup + Foundational → NextAuth core ready
2. Add US1 (sign-in) → validate → the auth mechanism now works end-to-end
3. Add US2 (layout) → validate independently → every page now shares consistent chrome
4. Add US3 (route protection) → validate independently → account/tournament/admin gated correctly
5. Add US4 (public pages) → validate independently → Caro pages viewable without sign-in
6. Phase 7 polish once the desired subset of stories is complete

### Parallel Team Strategy

With multiple developers, once Phase 2 (Foundational) is done:

- Developer A: US1 (sign-in flow) — the OAuth callback proxy route is the highest-risk piece
  (research.md §1), worth prioritizing first even solo
- Developer B: US2 (layout) — can start immediately in parallel, no dependency on US1's login page
- Developer C/D: US3/US4 — start once US2's `AppNav` (T020) lands

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- This feature's stories are less mutually independent than a typical multi-domain feature (see
  spec.md User Story 1's own "Why this priority": auth is foundational to everything else) — the
  Dependencies section above documents the real coupling honestly rather than forcing an artificial
  independence the spec itself doesn't claim.
- Commit after each task or logical group
- Stop at any checkpoint to validate a story independently
- T012 (the OAuth callback proxy route) is the highest-risk task in this feature — it depends on an
  **external configuration change** (backend `callbackUrl` + Google Cloud Console redirect URI,
  research.md §1) that is coordinated outside this feature's own deliverable; do not treat T012's
  code being complete as sufficient without confirming that external change has also landed before
  running quickstart.md §3.
