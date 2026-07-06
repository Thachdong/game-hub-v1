# Implementation Plan: Caro Guest (Unauthenticated) Access

**Branch**: `feature/api/dongt/public-game-caro-api` | **Date**: 2026-07-06 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/007-caro-guest-access/spec.md`

## Summary

An audit of the existing `src/caro-game/` module found that tournament viewing (list/details/participants) is already correctly public, and all mutating endpoints (create/join/quick-pair/register/chat) already correctly require a JWT. The one real gap is `MatchController` (`src/caro-game/interface/http/match.controller.ts`), which applies `@UseGuards(JwtAuthGuard)` at the class level, blocking guests from `GET /caro/matches/lobby`, `GET /caro/matches/:id`, and `GET /caro/matches/:id/moves`.

The fix moves the guard from the class to each individual route: view routes get the existing, already-proven `OptionalJwtGuard` (reused verbatim from the pattern in `src/account-social/interface/http/games.controller.ts`), and every mutating route keeps `JwtAuthGuard`. Two supporting fixes close gaps the audit surfaced along the way: (1) `OptionalJwtGuard.handleRequest` currently throws on an expired/invalid token instead of falling back to guest — fixed once, shared by every consumer of the guard; (2) `GetMatchStateUseCase` currently has no visibility check at all, so a private match's state is readable by anyone who has its ID — a `requesterId`-aware check is added so private matches stay hidden from non-participants (guest or not), matching FR-005.

No new entities, endpoints, dependencies, or DB schema changes are introduced.

## Technical Context

**Language/Version**: TypeScript 5.1 / Node.js LTS

**Primary Dependencies**: NestJS 10, `@nestjs/passport` + `passport-jwt` (existing `OptionalJwtGuard`/`JwtAuthGuard`/`JwtStrategy` in `src/shared-auth/`), TypeORM 0.3 (no schema change), `@nestjs/swagger` (regenerate `openapi.yml`)

**Storage**: PostgreSQL — no new tables, columns, or migrations; only read-time authorization logic changes

**Testing**: No automated tests for this iteration — `ts-jest`/`supertest` exist in `package.json` but no jest config, `test` script, or test files exist anywhere in the repo yet (specs 001–006 shipped the same way; see tasks.md for the full rationale). Validation relies on the manual `quickstart.md` script. If the project's `TODO(TESTING_PRINCIPLE)` is later ratified, `GetMatchStateUseCase`'s private-match branch and `OptionalJwtGuard.handleRequest`'s fallback branch are the two clean seams to cover first.

**Target Platform**: Linux server (single-process NestJS monolith) — same as existing deployment

**Project Type**: Web service — REST API (no WebSocket/gateway change required; see research.md decision 4)

**Performance Goals**: No new performance target; reuses existing read paths. Guest live-move visibility (SC-004, ≤3s) is already satisfied by the existing `RealtimeGateway` observer role and is unaffected by this change.

**Constraints**:
- MUST NOT weaken any currently-authenticated mutating route (FR-014) — every existing `JwtAuthGuard` on a mutating route in `MatchController`, `QuickPairController`, `ChatController`, and the mutating routes of `TournamentController` stays exactly as-is.
- MUST NOT change `OptionalJwtGuard` in a way that regresses its existing consumer, `src/account-social/interface/http/games.controller.ts` (no tests currently assert the old throw-on-invalid-token behavior — see research.md).
- MUST preserve private-match confidentiality for guests and non-participant authenticated users alike (FR-005) without confirming a private match's existence to an unauthorized caller (same "not found" outcome, not "forbidden").

**Scale/Scope**: Small, surgical change — one controller's guard placement, one shared guard's fallback branch, one use-case's authorization branch. No new modules.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Gate I — Hexagonal Architecture ✅

| Layer | Change | Constraint check |
|-------|--------|-------------------|
| Domain | None (reuses existing `MatchNotFoundError`, existing `visibility` field on `Match`) | No new domain code |
| Application | `GetMatchStateUseCase.execute` gains an optional `requesterId` parameter and a private-match authorization branch | Contains only a domain-object comparison (`match.visibility`, `match.creatorId`, `match.playerXId`, `match.playerOId` vs `requesterId`) — no framework imports |
| Infrastructure | None | No repository/adapter changes |
| Interface | `MatchController` guard placement moves from class-level to per-route; `OptionalJwtGuard.handleRequest` fallback branch fixed | Guard selection and request wiring only — no business logic added to the controller |

The private-match rule lives in the application layer (`GetMatchStateUseCase`), not the controller — satisfies the "no business logic in interface layer" rule.

### Gate II — Modular Monolith ✅ (with note)

All feature-specific code stays inside `src/caro-game/`. The one cross-cutting touch is `src/shared-auth/optional-jwt.guard.ts`, which is a `@Global()`-exported, framework-level authentication primitive (not a business bounded-context module) — already designed to be consumed by any module, exactly as `account-social` already does. Fixing its fallback behavior is a shared-infrastructure bug fix, not a business-boundary violation: no module reaches into another module's repository or service, and the change is behavior-preserving for every caller except the one incorrect edge case (expired/invalid token → now falls back to guest instead of throwing).

### Gate III — Authentication & Security ✅

- Mutating endpoints continue to require `JwtAuthGuard` — unchanged: `POST /caro/matches`, `POST /caro/matches/:id/join`, `DELETE /caro/matches/:id`, `POST /caro/matches/:id/leave`, `POST /caro/matches/:id/invite`, `PUT /caro/matches/:id/invitation/respond`, all of `QuickPairController`, all of `ChatController`, and the mutating routes of `TournamentController`.
- View-only endpoints (`GET /caro/matches/lobby`, `GET /caro/matches/:id`, `GET /caro/matches/:id/moves`) become intentionally public, consistent with the already-public `GET /caro/tournaments`, `GET /caro/tournaments/:id`, and `GET /caro/tournaments/:id/participants` — the constitution requires protected endpoints to use JWT; it does not require every endpoint to be protected, and this feature explicitly reclassifies these three as read-only/public.
- Role/permission claims are still read exclusively from the JWT when a token is present; no new DB lookup is added for authorization on the happy path (the private-match check is a single existing in-memory comparison on data already fetched for the response, not an extra query).

### Gate IV — Data Access ✅

No new queries. `findLobbyMatches()` already restricts results to `visibility: 'public'` (confirmed in `match.typeorm-repository.ts`) — no change needed there. `GetMatchStateUseCase` already fetches the match and its moves in one pair of existing queries; the new authorization check runs against data already in memory, adding no additional DB round-trip.

### Gate V — Event-Driven Communication & Realtime ✅ (with a documented deferral)

No change to `RealtimeGateway`. It already assigns any socket with no token or an invalid token the `observer` role (`handleConnection`), which is what makes FR-004 (live move updates for guest viewers) already work today. Deferred, out of scope for this feature: `join_room` does not check match visibility before allowing a socket to join a `match:{id}` room, so a guest who already has a private match's ID could still receive live WebSocket updates for it even though the REST view is now blocked. This is a pre-existing gap, not something introduced here; closing it needs room-level authorization shared across both match and tournament rooms, which is a larger change than "make the lobby/tournament/gameboard pages guest-viewable." This deferral is now formalized in spec.md's FR-005 (scoped to REST) and Assumptions section, not just recorded here.

### Gate VI — NestJS Standards ✅

- `MatchController`'s three view routes get `@ApiOperation` summaries updated to note "no authentication required"; `@ApiBearerAuth()` is removed from those three routes only (it stays on every mutating route).
- `npm run openapi:generate` MUST be run and `openapi.yml` committed in the same PR as the controller change.
- No `process.env` access introduced; no new config.

### Post-Design Re-check ✅

Design artifacts (`data-model.md`, `contracts/`) introduce no new constitution issues. All gates remain passing.

---

## Project Structure

### Documentation (this feature)

```text
specs/007-caro-guest-access/
├── plan.md                      ← this file
├── research.md                  ← Phase 0 output
├── data-model.md                ← Phase 1 output
├── quickstart.md                ← Phase 1 output
├── contracts/
│   └── rest-api.md              ← Phase 1 output
└── tasks.md                     ← Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
src/caro-game/
├── application/
│   └── use-cases/
│       └── get-match-state.use-case.ts        ← EXTEND (add optional requesterId param + private-match check)
├── interface/
│   └── http/
│       └── match.controller.ts                ← EXTEND (guard moves from class-level to per-route; getState/getMoves gain @Req())
└── (no other files touched)

src/shared-auth/
└── optional-jwt.guard.ts                      ← EXTEND (handleRequest: any auth failure falls back to guest, not just missing header)
```

No new files, no new modules, no new migrations.

**Structure Decision**: Everything lives in the two existing locations shown above — `src/caro-game/` (feature-owning module) and `src/shared-auth/` (the pre-existing, globally-exported auth primitive already used the same way by `account-social`). No new module or directory is introduced.

## Complexity Tracking

> No constitution violations requiring justification. The `src/shared-auth/optional-jwt.guard.ts` change touches code outside `src/caro-game/`, but it is a bug fix to a shared, `@Global()` cross-cutting primitive already intended for multi-module reuse (Gate II), not a business-boundary violation, so no complexity-tracking entry is required.
