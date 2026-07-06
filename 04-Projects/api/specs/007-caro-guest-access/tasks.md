# Tasks: Caro Guest (Unauthenticated) Access

**Input**: Design documents from `/specs/007-caro-guest-access/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/rest-api.md](contracts/rest-api.md), [quickstart.md](quickstart.md)

**Tests**: Omitted. Not requested in the spec, and no test runner is currently wired into this repository (no jest config, no `test` npm script — confirmed by audit; specs 001–006 also ship without automated tests). Validation instead relies on the manual [quickstart.md](quickstart.md) script, referenced directly from the relevant tasks below.

**Organization**: Tasks are grouped by user story (all P1) to enable independent validation of each story. Because the whole feature is 3 files, most of the concrete code lives in the Foundational phase (shared, indivisible for security reasons — see rationale on T003); each story phase then validates its own slice.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files/concerns, no dependency on an incomplete task)
- **[Story]**: US1 / US2 / US3 / US4, mapping to the four user stories in [spec.md](spec.md)
- Paths are relative to the repository root (`04-Projects/api/`)

---

## Phase 1: Setup

**Purpose**: Establish the "before" baseline so the fix's effect is provable.

- [X] T001 Run [quickstart.md](quickstart.md) steps 1, 3, and 4 against the current (unmodified) app and record the actual responses — expect `401` on `GET /caro/matches/lobby`, `GET /caro/matches/:id`, and `GET /caro/matches/:id/moves` with no `Authorization` header, and `401` on the same lobby call with an expired/invalid token. This confirms the exact gap being closed.
  - **Result (2026-07-07, live run against local app)**: `GET /api/caro/matches/lobby` → `401` (no header); `GET /api/caro/matches/:id` (any id) → `401`; `GET /api/caro/matches/lobby` with a malformed/invalid-signature token → `401`; `GET /api/caro/tournaments` → `200` (already public, as expected). Baseline confirmed.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The guard-placement change in `MatchController` must happen as a single atomic edit — removing the class-level `@UseGuards(JwtAuthGuard)` without simultaneously re-applying a guard to every mutating route in the same commit would leave a real window where create/join/cancel/leave/invite/respond are briefly unguarded. This phase is therefore the shared, blocking prerequisite for US1 and US2 (US3 and US4 need no code changes — see their phases below).

**⚠️ CRITICAL**: Do not merge T003 partially (e.g., only adding `OptionalJwtGuard` to `lobby()` while leaving other routes without an explicit per-route guard).

- [X] T002 [P] Fix `handleRequest` in `src/shared-auth/optional-jwt.guard.ts` so that **any** authentication failure (expired token, invalid signature, malformed token — not only a missing `Authorization` header) falls back to returning `null` (guest) instead of throwing `UnauthorizedException`. Keep the existing `if (err) throw err` branch for genuine strategy errors. Implements FR-015 / research.md Decision 2.
- [X] T003 [P] In `src/caro-game/interface/http/match.controller.ts`: remove the class-level `@UseGuards(JwtAuthGuard)` and `@ApiBearerAuth()`. Add `@UseGuards(OptionalJwtGuard)` (imported from `../../../shared-auth/optional-jwt.guard`) to `lobby()`, `getState()`, and `getMoves()`. Add `@UseGuards(JwtAuthGuard)` + `@ApiBearerAuth()` individually to `create()`, `join()`, `cancel()`, `leave()`, `invite()`, and `respondToInvitation()`. Update each route's `@ApiOperation` summary to state whether authentication is required. Implements FR-001, FR-003 (guard portion), FR-008, FR-009 / research.md Decision 1.
  - **Result (2026-07-07, live run)**: post-fix, `GET /api/caro/matches/lobby` with no header → `200`; same request with a malformed/invalid-signature token → `200` (guest, was `401`); `POST /api/caro/matches` and `POST /api/caro/matches/:id/join` with no header remain `401`. `openapi.yml` regenerated automatically by the dev server's boot-time writer (`src/main.ts`) and committed alongside.

**Checkpoint**: `MatchController`'s lobby route is now guest-accessible and every mutating route is still explicitly authenticated. US1 is fully implemented; US2 needs one more layer (private-match confidentiality) before it's complete.

---

## Phase 3: User Story 1 - Guest Browses the Lobby and Tournament Listings (Priority: P1) 🎯 MVP

**Goal**: A guest can list waiting/in-progress public matches and all tournaments with no `Authorization` header.

**Independent Test**: Request `GET /caro/matches/lobby` and `GET /caro/tournaments` with no credentials; both return `200` with the same data an authenticated player would see.

- [X] T004 [US1] Validate [quickstart.md](quickstart.md) step 1's lobby and tournament-list requests both return `200` with no `Authorization` header (exercises T002 + T003 for the lobby route; confirms `src/caro-game/interface/http/tournament.controller.ts` needed no change since `GET /caro/tournaments` was already guard-free). Then re-run [quickstart.md](quickstart.md) step 4 post-fix: the same lobby request with an expired/invalid token must now return `200` (guest) — the inverse of the `401` recorded as the T001 baseline. Closes the loop opened by T002 for FR-015.
  - **Result (2026-07-07, live run)**: `GET /api/caro/matches/lobby` → `200` (no header); `GET /api/caro/tournaments` → `200` (no header); `GET /api/caro/matches/lobby` with an invalid/expired-shaped token → `200`. All confirmed against the running app.

**Checkpoint**: User Story 1 is fully functional and independently demonstrable.

---

## Phase 4: User Story 2 - Guest Watches an In-Progress or Waiting Match (Priority: P1)

**Goal**: A guest can open a specific public match, see its board/moves/timer, and is still denied access to a private match — without ever being told the private match exists.

**Independent Test**: Request `GET /caro/matches/:id` and `GET /caro/matches/:id/moves` for a public match as a guest (expect `200`); request the same for a private match as a guest (expect `404`, identical shape to a nonexistent ID).

- [X] T005 [US2] In `src/caro-game/application/use-cases/get-match-state.use-case.ts`, add an optional `requesterId?: string` parameter to `execute(matchId, requesterId?)`. After fetching `match`, if `match.visibility === 'private'` and `requesterId` is not equal to `match.creatorId`, `match.playerXId`, or `match.playerOId`, throw the existing `MatchNotFoundError` (same error already thrown for a genuinely missing match — never a distinct 403). Implements FR-005 / research.md Decision 3.
- [X] T006 [US2] In `src/caro-game/interface/http/match.controller.ts`, add `@Req() req: Request & { user?: { sub?: string } }` to `getState(id)` and `getMoves(id)`, and pass `req.user?.sub` as the second argument to `this.getMatchState.execute(id, req.user?.sub)` in both handlers. Depends on T003 (guard already moved) and T005 (use-case signature exists).
- [X] T007 [US2] Validate [quickstart.md](quickstart.md) step 1 (guest viewing a public match/moves → `200`) and step 2 (guest viewing a private match → `404`, not `403`).
  - **Result (2026-07-07, live run with seeded fixtures)**: guest → public match `200`, public match moves `200`, private match `404` (body identical in shape to a genuinely nonexistent match ID), private match moves `404`. Bonus check: an *authenticated but non-participant* user also gets `404` on the private match (the use-case check protects against more than just guests), while the match's actual creator gets `200`.

**Checkpoint**: User Stories 1 and 2 both work independently; private matches remain confidential from guests and from any authenticated non-participant.

---

## Phase 5: User Story 3 - Guest Views a Tournament in Progress (Priority: P1)

**Goal**: A guest can view a tournament's details and live participant list with no login.

**Independent Test**: Request `GET /caro/tournaments/:id` and `GET /caro/tournaments/:id/participants` with no credentials; both return `200`.

- [X] T008 [US3] Confirm no code change is needed: `GET /caro/tournaments/:tournamentId` and `GET /caro/tournaments/:tournamentId/participants` in `src/caro-game/interface/http/tournament.controller.ts` are already guard-free. Validate via [quickstart.md](quickstart.md) step 1's tournament requests.
  - **Result (2026-07-07, live run, seeded tournament)**: `GET /api/caro/tournaments` → `200`; `GET /api/caro/tournaments/:id` → `200`; `GET /api/caro/tournaments/:id/participants` → `200`, all with no `Authorization` header.

**Checkpoint**: All three viewing stories (US1, US2, US3) are independently functional.

---

## Phase 6: User Story 4 - Guest Is Redirected to Login When Attempting a Restricted Action (Priority: P1)

**Goal**: Every restricted action (create match, join match, quick match, tournament registration, chat) is refused for a guest with a `401` that's clearly distinguishable from `404`/`400`/`409`.

**Independent Test**: Attempt each restricted action with no credentials; every attempt returns `401`.

- [X] T009 [US4] Validate [quickstart.md](quickstart.md) step 3: `POST /caro/matches`, `POST /caro/matches/:id/join`, `POST /caro/quick-pair`, `POST /caro/tournaments/:tournamentId/registrations`, `POST /caro/matches/:id/chat`, and `POST /caro/tournaments/:tournamentId/chat` all return `401` for a guest (exercises T003's per-route `JwtAuthGuard` placement, plus the already-unchanged guards on `QuickPairController`, `ChatController`, and `TournamentController`'s mutating routes, including its tournament-chat routes). Confirm each `401` is distinguishable from the `404`s produced in T007, satisfying FR-013.
  - **Result (2026-07-07, live run)**: all six restricted actions → `401` for a guest, vs. `404` for a nonexistent match and `400` for an authenticated-but-invalid create payload — clearly distinguishable per FR-013.

**Checkpoint**: All four user stories are independently functional. No previously-restricted action has become accessible to a guest.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Documentation/build-artifact upkeep and regression coverage for code this feature touches indirectly.

- [ ] T010 [P] Run `npm run openapi:generate` and commit the updated `openapi.yml`, reflecting the guard/`@ApiBearerAuth()` changes made in T003 (Constitution Gate VI).
- [ ] T011 [P] Manually verify `GET /games` in `src/account-social/interface/http/games.controller.ts` still returns `200` for both a guest and an authenticated caller after the `OptionalJwtGuard` fix (T002) — blast-radius regression check per research.md Decision 2.
- [ ] T012 [P] Run [quickstart.md](quickstart.md) step 6: re-attempt existing restricted flows with a valid authenticated token for a non-participant account (e.g., joining someone else's match, leaving a match you're not in) and confirm their existing 401/403/409 outcomes are unchanged.
- [ ] T013 [P] Run [quickstart.md](quickstart.md) step 5: connect a Socket.IO client to `/realtime` with no `auth.token`, join `match:{publicMatchId}`, and confirm a live move broadcast still reaches the guest socket (no code change expected here — confirms research.md Decision 4 still holds).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion. BLOCKS US1 (Phase 3) and US2 (Phase 4). Does **not** block US3 (Phase 5) or US4 (Phase 6), which need no code changes, but validating them after Phase 2 is still recommended so the full regression picture is checked together.
- **User Stories (Phases 3–6)**: US1 and US2 depend on Phase 2. US3 and US4 have no code dependency but are ordered after Phase 2 for a coherent validation pass.
- **Polish (Phase 7)**: Depends on all four user-story phases being complete.

### User Story Dependencies

- **US1 (P1)**: Depends on T002 + T003 (Foundational). No dependency on US2/US3/US4.
- **US2 (P1)**: Depends on T002 + T003 (Foundational), plus its own T005/T006. No dependency on US1/US3/US4, though it shares `match.controller.ts` with US1 (sequenced via the shared Foundational task, not a story-to-story dependency).
- **US3 (P1)**: No code dependency on anything; ordered here for a complete validation pass.
- **US4 (P1)**: No new code dependency; validates guard placements already established in Phase 2 and the untouched guards on `QuickPairController`/`ChatController`/`TournamentController`.

### Within Each Story

- US2's use-case change (T005) precedes its controller change (T006), since T006 calls the new signature.

### Parallel Opportunities

- T002 and T003 (Foundational) touch different files and can be done in parallel.
- T010, T011, T012, T013 (Polish) are independent of each other and can run in parallel once Phases 3–6 are complete.

---

## Parallel Example: Foundational Phase

```bash
Task: "Fix OptionalJwtGuard.handleRequest fallback in src/shared-auth/optional-jwt.guard.ts"
Task: "Restructure MatchController guard placement in src/caro-game/interface/http/match.controller.ts"
```

---

## Implementation Strategy

### MVP First

Every story here is P1, and the whole feature is three files, so the practical MVP is: complete Phase 1 (baseline) → Phase 2 (Foundational — this alone makes the lobby publicly browsable and re-secures every mutating route) → Phase 3 (US1 validation). That is independently demonstrable: a guest can browse the lobby, and nothing they weren't supposed to do has become possible.

### Incremental Delivery

1. Setup + Foundational → lobby is guest-viewable, mutating routes still guarded.
2. Add US2 (T005, T006) → a guest can now open a specific public match and is correctly denied a private one.
3. Validate US3 and US4 (no new code — confirms existing correct behavior).
4. Polish (openapi regeneration + regression checks).

### Single-Developer Strategy

Given the tight file overlap (Foundational touches the same controller US1 and US2 validate against), this feature is best done sequentially by one person in task-ID order rather than split across parallel developers — the "parallel opportunities" above are within-phase (T002/T003, and T010–T013), not across user-story phases.
