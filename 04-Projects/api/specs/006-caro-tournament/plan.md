# Implementation Plan: Caro Tournament

**Branch**: `006-caro-tournament` | **Date**: 2026-07-01 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/006-caro-tournament/spec.md`

## Summary

Extends the existing `src/caro-game/` NestJS module with a Swiss Arena-style continuous tournament system: Tournament Creator role request/approval/revocation (Game Admin), tournament creation with elo-gated registration (open during both "waiting" and "in-progress" phases), a server-side cron-based lifecycle manager (start validation, auto-cancel, end), Swiss Arena matchmaking using `SELECT … FOR UPDATE SKIP LOCKED` (ADR-CARO-GAME-003), Arena scoring with streak tracking stored atomically in `caro_tournament_registrations`, realtime participant list and chat room broadcast via the existing `src/realtime/` WebSocket gateway (room `tournament:{id}`), and domain-event-driven elo propagation by reusing the existing match completion flow.

All new code follows hexagonal architecture. Tournament matches are standard `caro_matches` rows with a nullable `tournament_id` FK added via migration. Score updates use a single atomic `UPDATE … SET points = points + $1, win_streak = $2` statement. Concurrent idle-player pairing uses `SELECT … FOR UPDATE SKIP LOCKED` on `caro_tournament_registrations` (same pattern as Quick Pair). A `@Cron('*/10 * * * * *')` scheduler handles tournament lifecycle transitions within the 10-second window required by SC-003.

## Technical Context

**Language/Version**: TypeScript 5.1 / Node.js LTS

**Primary Dependencies**: NestJS 10, TypeORM 0.3, Socket.IO 4 (`@nestjs/websockets` + `@nestjs/platform-socket.io`), EventEmitter2 (`@nestjs/event-emitter`), `@nestjs/schedule` (already in project for cron), class-validator, `@nestjs/swagger`

**Storage**: PostgreSQL — 5 new tables (`caro_tournaments`, `caro_tournament_creator_requests`, `caro_tournament_registrations`, `caro_tournament_matches`, `caro_tournament_chat_messages`); 1 new column (`tournament_id NULLABLE FK`) on existing `caro_matches`; 1 new column (`is_tournament_creator BOOLEAN`) on `caro_player_profiles`; one numbered TypeORM migration file

**Testing**: ts-jest (unit — domain + application); supertest (integration — controllers). Constitution testing principle not yet ratified (TODO_TESTING_PRINCIPLE); following current non-binding guidance.

**Target Platform**: Linux server (single-process NestJS monolith)

**Project Type**: Web service — REST API + WebSocket (Socket.IO via shared `src/realtime/` gateway)

**Performance Goals**: Tournament start/cancel within 10 s of scheduled time (SC-003, SC-004); idle player paired within 5 s of becoming available (SC-005); participant list updated within 3 s of score change (SC-006, SC-007)

**Constraints**: Server-authoritative timers only (cron-based); atomic tournament score updates; Swiss pairing SKIP LOCKED; no Redis or external cache; tournament matches reuse existing `caro_matches` infrastructure; Tournament Creator role revocation takes effect at next JWT refresh (15–30 min max delay — acceptable per constitution III)

**Scale/Scope**: MVP; no cap on concurrent tournaments or participants; participant list ordered by tournament points DESC

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Gate I — Hexagonal Architecture ✅

| Layer | New additions | Constraint |
|-------|---------------|------------|
| Domain | `Tournament`, `TournamentCreatorRequest`, `TournamentRegistration`, `TournamentMatch`, `TournamentChatMessage` entities; 6 port interfaces; 5 domain events | MUST NOT import NestJS / TypeORM |
| Application | 11 command use-cases + 4 query use-cases | Import ports only — no infrastructure classes |
| Infrastructure | 5 TypeORM repositories, `TournamentSchedulerService` (cron), `TournamentMatchmakingService` (SKIP LOCKED adapter), `TournamentEventHandler` | Each implements exactly one port |
| Interface | 2 HTTP controllers (`TournamentController`, `TournamentAdminController`) + WebSocket events via shared gateway | No business logic; translate HTTP/WS → use-case |

Dependency arrow always points inward: interface → application → domain. Infrastructure injected into use-cases via constructor (no service locator).

### Gate II — Modular Monolith ✅

All new code lives in `src/caro-game/`. Cross-module traffic:

| From → To | Mechanism |
|-----------|-----------|
| caro-game → notification (Creator role approved) | `EventEmitter2` publishes `TournamentCreatorRoleGrantedEvent`; notification module subscribes |
| caro-game → notification (Creator role rejected) | `EventEmitter2` publishes `TournamentCreatorRoleRejectedEvent` |
| caro-game → notification (tournament cancelled) | `EventEmitter2` publishes `TournamentCancelledEvent` |
| caro-game (match domain) → caro-game (tournament domain) | `EventEmitter2` publishes `MatchCompletedEvent` (existing); `TournamentEventHandler` subscribes and checks `tournament_id` |
| caro-game → realtime | Shared `IRealtimePushPort` (existing) for `tournament:{id}` room broadcasts |

No module imports another module's internal providers. No cross-module repository access.

### Gate III — Authentication & Security ✅

- All mutation endpoints require `JwtAuthGuard`.
- Tournament creation and tournament-scoped management endpoints require `JwtAuthGuard` + `TournamentCreatorGuard` (NEW — checks `is_tournament_creator` JWT claim).
- Admin endpoints (review/revoke Tournament Creator requests) require `JwtAuthGuard` + `GameAdminCaroGuard` (EXISTING).
- `GET /caro/tournaments` and `GET /caro/tournaments/:id` are public routes (no guard) — satisfies FR-009 (guest access).
- Tournament Creator role revocation updates `is_tournament_creator = false` in `caro_player_profiles`. The revocation takes effect at the player's next JWT refresh (up to 15–30 min). This is acceptable: constitution III mandates JWT-claim-based authorisation; it does not require instantaneous revocation.
- Server-authoritative tournament timers: `start_at` and `end_at` timestamps stored on `caro_tournaments`. A `@Cron('*/10 * * * * *')` scheduler (running every 10 s) queries overdue tournaments and executes start/cancel/end transitions. Clients receive authoritative status broadcasts via WebSocket.

### Gate IV — Data Access ✅

| Pattern | Implementation |
|---------|----------------|
| Tournament score atomic update | `UPDATE caro_tournament_registrations SET tournament_points = tournament_points + $1, win_streak = $2 WHERE id = $3 RETURNING tournament_points` — single statement, no app-layer read-modify-write for the increment |
| Swiss Arena pairing claim | `SELECT * FROM caro_tournament_registrations WHERE tournament_id = $1 AND status = 'idle' ORDER BY tournament_points ASC FOR UPDATE SKIP LOCKED LIMIT 2` inside a transaction that also inserts the tournament match row and updates both registrations to `status = 'in_match'` |
| Participant leaderboard | `SELECT * FROM caro_tournament_registrations WHERE tournament_id = $1 ORDER BY tournament_points DESC` — index on `(tournament_id, tournament_points)` |
| Creator role check | `is_tournament_creator` boolean on `caro_player_profiles` — read at approve/revoke time, cached in JWT claim for endpoint auth |
| Game config read | Direct DB read via existing `IGameConfigRepository.findById()` — no application cache (constitution IV) |
| Overdue tournament scan | `SELECT * FROM caro_tournaments WHERE status = 'waiting' AND start_at <= NOW()` — index on `(status, start_at)` |

### Gate V — Event-Driven Communication & Realtime ✅

| Signal | Transport |
|--------|-----------|
| Creator role approved → notification module | `EventEmitter2` → `TournamentCreatorRoleGrantedEvent` |
| Creator role rejected → notification module | `EventEmitter2` → `TournamentCreatorRoleRejectedEvent` |
| Tournament cancelled → notification (all registrants) | `EventEmitter2` → `TournamentCancelledEvent` (carries registrant IDs) |
| Match completed (tournament context) → score update + re-pair | `EventEmitter2` → `MatchCompletedEvent` (existing) → `TournamentEventHandler` |
| Participant list / score change | WebSocket broadcast to `tournament:{id}` room → `tournament:participant-updated` |
| Tournament status change | WebSocket broadcast to `tournament:{id}` room → `tournament:status-changed` |
| New pair created | WebSocket broadcast to `tournament:{id}` room → `tournament:match-created` |
| Tournament chat message | WebSocket broadcast to `tournament:{id}` room → `tournament:chat-message` |

No polling; no Redis pub/sub (single-process monolith).

### Gate VI — NestJS Standards ✅

- All new controllers decorated with `@ApiTags`, `@ApiOperation`, `@ApiResponse`, `@ApiBearerAuth`.
- All new DTOs annotated with `@ApiProperty`.
- `npm run openapi:generate` must be run and `openapi.yml` committed in the same PR.
- No `process.env` direct access — all config through typed `ConfigService`.
- `TournamentCreatorGuard` and `GameAdminCaroGuard` are the sole authorisation guards; no inline role checks inside use-cases.

### Post-Design Re-check ✅

Design artifacts (`data-model.md`, `contracts/`) introduce no new constitution issues. All gates remain passing.

---

## Project Structure

### Documentation (this feature)

```text
specs/006-caro-tournament/
├── plan.md                      ← this file
├── research.md                  ← Phase 0 output
├── data-model.md                ← Phase 1 output
├── quickstart.md                ← Phase 1 output
├── contracts/
│   ├── rest-api.md              ← Phase 1 output
│   └── websocket-events.md      ← Phase 1 output
└── tasks.md                     ← Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
src/caro-game/
├── domain/
│   ├── entities/
│   │   ├── game-config.ts                                    ← EXISTING
│   │   ├── match.ts                                          ← EXTEND (add tournamentId?: string)
│   │   ├── match-move.ts                                     ← EXISTING
│   │   ├── player-profile.ts                                 ← EXTEND (add isTournamentCreator: boolean)
│   │   ├── tournament.ts                                     ← NEW
│   │   ├── tournament-creator-request.ts                     ← NEW
│   │   ├── tournament-registration.ts                        ← NEW
│   │   ├── tournament-match.ts                               ← NEW
│   │   └── tournament-chat-message.ts                        ← NEW
│   ├── errors/
│   │   └── index.ts                                          ← EXTEND (add tournament errors)
│   ├── events/
│   │   ├── match-invitation.events.ts                        ← EXISTING
│   │   └── tournament.events.ts                              ← NEW
│   ├── ports/
│   │   ├── game-config.repository.port.ts                    ← EXISTING
│   │   ├── match.repository.port.ts                          ← EXISTING
│   │   ├── player-profile.repository.port.ts                 ← EXISTING
│   │   ├── quick-pair.repository.port.ts                     ← EXISTING
│   │   ├── chat.repository.port.ts                           ← EXISTING
│   │   ├── match-timer.service.port.ts                       ← EXISTING
│   │   ├── friend-check.port.ts                              ← EXISTING
│   │   ├── tournament.repository.port.ts                     ← NEW
│   │   ├── tournament-creator-request.repository.port.ts     ← NEW
│   │   ├── tournament-registration.repository.port.ts        ← NEW
│   │   ├── tournament-match.repository.port.ts               ← NEW
│   │   └── tournament-chat.repository.port.ts                ← NEW
│   └── value-objects/
│       └── tournament-score-calculator.ts                    ← NEW (Arena scoring formula)
├── application/
│   ├── commands/                                             ← EXISTING directory
│   │   ├── [existing game-config commands]                   ← EXISTING
│   │   ├── request-tournament-creator-role.use-case.ts       ← NEW
│   │   ├── review-tournament-creator-request.use-case.ts     ← NEW (approve/reject)
│   │   ├── revoke-tournament-creator-role.use-case.ts        ← NEW
│   │   ├── create-tournament.use-case.ts                     ← NEW
│   │   ├── register-for-tournament.use-case.ts               ← NEW
│   │   ├── start-tournament.use-case.ts                      ← NEW (called by scheduler)
│   │   ├── cancel-tournament.use-case.ts                     ← NEW (called by scheduler)
│   │   ├── end-tournament.use-case.ts                        ← NEW (called by scheduler)
│   │   ├── pair-idle-players.use-case.ts                     ← NEW (SKIP LOCKED matchmaking)
│   │   ├── record-tournament-match-result.use-case.ts        ← NEW (called by event handler)
│   │   └── send-tournament-chat-message.use-case.ts          ← NEW
│   ├── use-cases/                                            ← EXISTING directory (match gameplay)
│   │   └── [existing use-cases]                              ← EXISTING
│   └── queries/
│       ├── [existing game-config queries]                    ← EXISTING
│       ├── list-tournaments.use-case.ts                      ← NEW
│       ├── get-tournament-details.use-case.ts                ← NEW
│       ├── get-tournament-participant-list.use-case.ts       ← NEW
│       └── list-tournament-creator-requests.use-case.ts      ← NEW (Admin)
├── infrastructure/
│   ├── persistence/
│   │   ├── typeorm-entities/
│   │   │   ├── [existing ORM entities]                       ← EXISTING
│   │   │   ├── match.orm-entity.ts                           ← EXTEND (add tournament_id column)
│   │   │   ├── player-profile.orm-entity.ts                  ← EXTEND (add is_tournament_creator)
│   │   │   ├── tournament.orm-entity.ts                      ← NEW
│   │   │   ├── tournament-creator-request.orm-entity.ts      ← NEW
│   │   │   ├── tournament-registration.orm-entity.ts         ← NEW
│   │   │   ├── tournament-match.orm-entity.ts                ← NEW
│   │   │   └── tournament-chat-message.orm-entity.ts         ← NEW
│   │   ├── [existing repositories]                           ← EXISTING
│   │   ├── tournament.typeorm-repository.ts                  ← NEW
│   │   ├── tournament-creator-request.typeorm-repository.ts  ← NEW
│   │   ├── tournament-registration.typeorm-repository.ts     ← NEW
│   │   ├── tournament-match.typeorm-repository.ts            ← NEW
│   │   └── tournament-chat.typeorm-repository.ts             ← NEW
│   ├── scheduling/                                           ← NEW directory
│   │   └── tournament-scheduler.service.ts                   ← NEW (@Cron every 10s lifecycle mgr)
│   ├── matchmaking/                                          ← NEW directory
│   │   └── tournament-matchmaking.service.ts                 ← NEW (SKIP LOCKED pairing adapter)
│   └── events/
│       ├── match-invitation.handler.ts                       ← EXISTING
│       └── tournament-match-completed.handler.ts             ← NEW
├── interface/
│   ├── dto/
│   │   ├── [existing DTOs]                                   ← EXISTING
│   │   ├── tournament.dto.ts                                 ← NEW
│   │   ├── create-tournament.dto.ts                          ← NEW
│   │   ├── register-tournament.dto.ts                        ← NEW
│   │   └── tournament-chat.dto.ts                            ← NEW
│   ├── guards/
│   │   ├── game-admin-caro.guard.ts                          ← EXISTING
│   │   └── tournament-creator.guard.ts                       ← NEW
│   └── http/
│       ├── [existing controllers]                            ← EXISTING
│       ├── tournament.controller.ts                          ← NEW (player-facing)
│       └── tournament-admin.controller.ts                    ← NEW (admin-only)
└── caro-game.module.ts                                       ← EXTEND (register new providers)

src/database/migrations/
└── 1751500000000-CaroTournament.ts                           ← NEW
```

**Structure Decision**: Single NestJS module (`src/caro-game/`) following the existing hexagonal layout. Tournament sub-domain is co-located with the existing match/game-config sub-domains within the same bounded context. No new module created — all tournament providers are registered in `CaroGameModule`.

## Complexity Tracking

> No constitution violations requiring justification.
