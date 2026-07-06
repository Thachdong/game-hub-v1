---

description: "Task list template for feature implementation"
---

# Tasks: Auth Service Interface Audit & Proxy Route Refactor

**Input**: Design documents from `/specs/005-auth-proxy-refactor/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Revised during `/speckit-clarify`**: the proxy mechanism is a single catch-all Route Handler
(`app/api/proxy/[...path]/route.ts`) that forwards raw requests to the backend, not one
hand-written Route Handler per resource calling a typed domain-service function server-side. This
removed the originally-planned `ensureServiceConfigured()`/`ensure*ServiceConfigured()` additions
to `apps/web/lib/session.ts` entirely — `lib/session.ts` is not touched by this feature at all. See
research.md §4–§8 for the full reasoning, including why this doesn't violate Constitution
Principle II/IV (§8).

**Tests**: Not explicitly requested in spec.md. Following `003-cookie-auth-migration`'s and
`001-domain-service-layer`'s convention, a modest set of unit tests is folded into each story's
implementation. quickstart.md's manual scenarios cover end-to-end verification; no new E2E tooling
is introduced.

**Organization**: Tasks are grouped by user story (from spec.md) on top of a small Setup step and
a Foundational phase both stories build on.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1–US4)
- Every task includes an exact file path

## Path Conventions

Single existing app (`apps/web/`) plus one-line edits in the four existing `packages/*` domain
packages (plan.md Project Structure) — no new app or package. `apps/web/lib/session.ts` is not
modified by this feature.

---

## Phase 1: Setup

**Purpose**: Lay down the proxy helper's cookie-gate — the first branch every later task builds on.

- [X] T001 Create `apps/web/lib/proxy.ts` exporting `forwardToBackend(request: Request, pathSegments:
  string[]): Promise<Response>`: reads the `access_token` cookie via `next/headers`'s `cookies()`
  (reusing the existing `ACCESS_COOKIE_NAME` constant from `apps/web/lib/session.ts` — no change to
  that file), and returns `NextResponse.json({ message: "Not signed in" }, { status: 401 })`
  immediately when it is absent (data-model.md "Proxy Response", research.md §4 step 1–2)

**Checkpoint**: the cookie-gate exists; every subsequent task extends the same function.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the full forward-attach-relay-refresh mechanism — the piece every user story
either exercises or depends on to be independently demonstrable at all.

**⚠️ CRITICAL**: No user story (Phase 3+) can begin until this phase is complete.

- [X] T002 Extend `forwardToBackend()` (`apps/web/lib/proxy.ts`) to build the target URL from
  `process.env.BACKEND_URL` plus `pathSegments` plus the incoming request's query string, and
  forward the request's method, body (for non-`GET`/`HEAD`), and `Content-Type` header with
  `Authorization: Bearer <access_token>` attached — ignoring any `Authorization` header the
  incoming request itself carries (contracts/proxy-routes.md, research.md §4 step 3) (depends on
  T001)
- [X] T003 Extend `forwardToBackend()` to relay the backend's response status, body, and
  `Content-Type` verbatim to the caller on any non-`401` response (data-model.md, research.md §6)
  (depends on T002)
- [X] T004 Extend `forwardToBackend()` so that a `401` from the backend triggers a call to the
  existing `refreshSession()` (`apps/web/lib/session.ts`, unchanged) and, on success, retries the
  forward once with the rotated access token and relays that response; on failure (`null`), returns
  `NextResponse.json({ message: "Not signed in" }, { status: 401 })` without a further backend call
  (research.md §4 step 4, FR-003/FR-004) (depends on T003)
- [X] T005 Create the catch-all Route Handler `apps/web/app/api/proxy/[...path]/route.ts` exporting
  `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, each delegating to `forwardToBackend(request,
  params.path)` per `contracts/proxy-routes.md` (depends on T004)
- [X] T006 [P] Unit tests for `forwardToBackend` in `apps/web/lib/proxy.test.ts` (mocking
  `next/headers` and global `fetch`, mirroring `apps/web/lib/session.test.ts`'s mocking style):
  no `access_token` cookie → `401`, `fetch` never called; valid token → backend's mocked
  status/body relayed verbatim, request forwarded with the correct `Authorization` header and
  ignoring any inbound one; backend `401` + successful refresh → retried forward succeeds; backend
  `401` + `refreshSession()` resolving `null` → `401 { message: "Not signed in" }` (depends on
  T005)

**Checkpoint**: The catch-all proxy mechanism is built and unit-tested in isolation. Every user
story phase below either exercises it directly or builds on it.

---

## Phase 3: User Story 1 - One proxy mechanism ready for every future signed-in browser action (Priority: P1) 🎯 MVP

**Goal**: Prove the mechanism end-to-end against a real, already-integrated backend resource.

**Independent Test**: Trigger `GET /api/proxy/accounts/me` from a signed-in browser and confirm
the account identity comes back with no token exposed anywhere; trigger it signed-out and confirm
a clean, distinguishable failure instead of a silent success or unhandled error.

### Implementation for User Story 1

- [X] T007 [US1] Add a test case in `apps/web/lib/proxy.test.ts` exercising the real
  `GET /api/proxy/accounts/me` → backend `GET /api/accounts/me` path specifically (not just a
  generic/fake path), asserting the account identity payload is relayed verbatim on success and a
  clean `401` is returned when signed out — this is the concrete proof spec.md's Independent Test
  for this story asks for (depends on T006)

**Checkpoint**: User Story 1 is independently complete. Run quickstart.md Scenarios 1–2 against a
running backend to confirm live behavior matches the tests.

---

## Phase 4: User Story 2 - Signed-in actions survive an access-token expiry without breaking (Priority: P1)

**Goal**: Prove the existing transparent-refresh and concurrency-dedup guarantees
(`003-cookie-auth-migration`'s `refreshSession()`, unchanged) hold through the new proxy path,
beyond the single happy-path retry already covered by T006.

**Independent Test**: Several proxied calls at once, at the moment of token expiry, only trigger
one backend refresh; with an invalid refresh token too, the visitor is cleanly treated as signed
out rather than seeing a raw/ambiguous error.

### Implementation for User Story 2

- [X] T008 [US2] Add a test case asserting that several concurrent `forwardToBackend` calls at the
  moment of token expiry result in exactly one `refreshSession()` call (reusing the existing
  refresh-token-keyed `inFlightRefreshes` dedup from `apps/web/lib/session.ts`, FR-008 carried over
  from `003`), in `apps/web/lib/proxy.test.ts` (depends on T006)
- [X] T009 [US2] Add a test case explicitly asserting that when `refreshSession()` resolves `null`,
  `forwardToBackend` returns the *synthesized* `401 { message: "Not signed in" }` rather than
  relaying the backend's own (possibly differently-shaped) `401` body — distinguishing "not signed
  in" from any other backend error, per FR-004 — in `apps/web/lib/proxy.test.ts` (depends on T006)

**Checkpoint**: User Story 2 is independently verified. Run quickstart.md Scenarios 3–4 against a
running backend to confirm live behavior matches the tests.

---

## Phase 5: User Story 3 - Every domain-service package is safe to wire into the same mechanism (Priority: P2)

**Goal**: Confirm a second domain-service package round-trips through the proxy exactly like
`account-service` does, proving the "point `baseURL` at `/api/proxy`, `getAccessToken: () => null`"
pattern (research.md §5) is package-agnostic rather than something that happens to work only for
`account-service`.

**Independent Test**: Configure `profiles-service` with `baseURL` pointed at a mocked `/api/proxy`
origin and `getAccessToken: () => null`, call one of its existing functions, and confirm the
request carries no `Authorization` header and succeeds against the mock — identical to how
`account-service` already behaves.

### Implementation for User Story 3

- [X] T010 [US3] Add a test in `packages/profiles-service/src/index.test.ts` (or a new
  `packages/profiles-service/src/http-client.test.ts`, following the package's existing
  `axios-mock-adapter` test convention) that configures `configureProfilesService({ baseURL:
  "<mock-origin>", getAccessToken: () => null })`, calls an existing exported function (e.g.
  `getFriends` or equivalent), and asserts the outbound request carries no `Authorization` header
  — confirming the client-side proxy-pointed wiring pattern works without any package-specific
  change (research.md §5)

**Checkpoint**: All four domain packages can be pointed at the proxy with the identical
one-line client configuration — verified directly for `account-service` (already proven in
production by the account page) and `profiles-service` (T010), and true by construction for
`admin-service`/`caro-service` since all four packages' `http-client.ts` are structurally
identical (research.md §3, §5). No new product route or page is added for these three packages
yet, since none has a real client-side consumer.

---

## Phase 6: User Story 4 - No lingering interface invites a client-held token (Priority: P3)

**Goal**: Remove the client-callable default and the stale, pre-`003` documentation the audit
found (research.md §2, §3).

**Independent Test**: Reviewing each domain package's exports/defaults and the three affected
documentation files shows nothing suggesting or enabling a Client Component calling the backend
directly with a held token — and the documentation now describes the actual catch-all proxy
mechanism and its client-side wiring pattern.

### Implementation for User Story 4

- [ ] T011 [P] [US4] In `packages/account-service/src/http-client.ts`, change `defaultBaseUrl()`
  to read `process.env.BACKEND_URL` instead of `process.env.NEXT_PUBLIC_GAME_HUB_API_BASE_URL`
  (research.md §3)
- [ ] T012 [P] [US4] Same one-line change in `packages/profiles-service/src/http-client.ts`
- [ ] T013 [P] [US4] Same one-line change in `packages/admin-service/src/http-client.ts`
- [ ] T014 [P] [US4] Same one-line change in `packages/caro-service/src/http-client.ts`
- [ ] T015 [US4] Remove the `NEXT_PUBLIC_GAME_HUB_API_BASE_URL` line and its comment from
  `apps/web/.env.local.example`, leaving `BACKEND_URL` as the single backend-origin variable with
  an updated comment reflecting it's read only server-side (research.md §3) (depends on
  T011-T014)
- [ ] T016 [US4] Rewrite `apps/web/README.md`: remove the NextAuth-era content (the `useSession()`/
  `auth()` "Session shape" section, the `[...nextauth]` route-structure entry, and the "Wiring a
  new domain-service call from a Client Component" section's `useSession`-based example) and
  replace it with (a) a description of the actual cookie-based session (`lib/session.ts`,
  unchanged) and (b) the catch-all proxy mechanism (`lib/proxy.ts`,
  `app/api/proxy/[...path]/route.ts`) plus its client-side wiring example
  (`configureAccountService({ baseURL: "/api/proxy", getAccessToken: () => null })`), pointing
  readers at `contracts/proxy-routes.md` (research.md §2, §5)
- [ ] T017 [US4] Update the root `README.md`'s "Wiring session state" example to configure with
  `baseURL: process.env.BACKEND_URL` for server-side (SSR) usage, and add the client-side
  `baseURL: "/api/proxy"` variant alongside it so the section covers both wiring patterns
  (research.md §2, §5)

**Checkpoint**: `grep -rn "NEXT_PUBLIC_GAME_HUB_API_BASE_URL\|useSession\|next-auth" apps/web
packages README.md` returns no matches (quickstart.md's verification commands).

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final end-to-end validation across all four stories.

- [ ] T018 Run quickstart.md Scenarios 1–5 end-to-end against a running backend, and confirm both
  of its `grep`-based verification commands return no matches
- [ ] T019 [P] Run `pnpm turbo run typecheck lint test --filter=web --filter=account-service
  --filter=profiles-service --filter=admin-service --filter=caro-service` and fix any failures
  surfaced by the above changes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Setup (T001) — BLOCKS all user stories. T002→T003→T004→
  T005→T006 are strictly sequential (each extends the same function/file).
- **User Story 1 (Phase 3)**: Depends on Foundational (T006).
- **User Story 2 (Phase 4)**: Depends on Foundational (T006). Independent of US1 — both add test
  cases to the same file but target different scenarios.
- **User Story 3 (Phase 5)**: Independent of Foundational and of US1/US2/US4 — only touches
  `packages/profiles-service`. Can start as soon as the design is agreed (no code dependency on
  `lib/proxy.ts` at all).
- **User Story 4 (Phase 6)**: Independent of Foundational and of US1/US2/US3 — only touches the
  four packages' default base URL and documentation. T016/T017 (docs) are easiest to write last,
  after Foundational/US1 exist, so the examples describe real, working code, but nothing
  technically blocks them.
- **Polish (Phase 7)**: Depends on all four user stories being complete.

### Parallel Opportunities

- T011–T014 (US4's four package edits) are four different files — fully parallelizable.
- US3 (T010) and US4 (T011–T017) have no dependency on Foundational or on each other — a second
  and third contributor can pick these up while Foundational/US1/US2 are in progress.
- Within Foundational, T002–T006 are sequential (same file); T007–T009 (US1/US2 test additions)
  are also sequential edits to the same test file in practice, even though logically independent.

---

## Parallel Example: User Story 4

```bash
# Launch the four independent package edits together:
Task: "Change defaultBaseUrl() in packages/account-service/src/http-client.ts"
Task: "Change defaultBaseUrl() in packages/profiles-service/src/http-client.ts"
Task: "Change defaultBaseUrl() in packages/admin-service/src/http-client.ts"
Task: "Change defaultBaseUrl() in packages/caro-service/src/http-client.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational (T002–T006) — CRITICAL, blocks US1/US2
3. Complete Phase 3: User Story 1 (T007)
4. **STOP and VALIDATE**: run quickstart.md Scenarios 1–2 against a running backend
5. This alone proves the core gap this feature closes: a browser can reach any authenticated
   backend resource through a single Next.js proxy route without ever holding the token

### Incremental Delivery

1. Setup + Foundational → the catch-all proxy mechanism exists and is unit-tested
2. Add US1 → validate → the mechanism is proven live against a real resource
3. Add US2 → validate independently → the transparent-renewal/concurrency guarantees are
   confirmed to survive the new call path
4. Add US3 → validate independently → a second domain package is confirmed wireable, closing the
   "is this really package-agnostic" question by test, not just by inspection
5. Add US4 → validate independently → zero remaining interface or documentation artifact
   describes the retired client-direct-call pattern
6. Phase 7 polish once all four stories are complete

### Parallel Team Strategy

With multiple developers, once Phase 1 (Setup) is done:

- Developer A: Phase 2 (Foundational) then US1 then US2 — sequential for one person, since US1/US2
  both build directly on the same `lib/proxy.ts`
- Developer B: US3 (T010) — can start immediately, no dependency on Foundational
- Developer C: US4 (T011–T017) — can start immediately; hold T016/T017 (documentation) until
  Foundational/US1 land so the written examples reflect real, working code

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- This feature adds a small, well-scoped amount of new code (`lib/proxy.ts`, one catch-all route)
  — most of the task list is tests and documentation correction, not new mechanism, because the
  refresh/dedup logic itself is reused unchanged from `003-cookie-auth-migration` (research.md §4)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
