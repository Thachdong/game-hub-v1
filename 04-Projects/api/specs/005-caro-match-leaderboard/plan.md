# Implementation Plan: Caro Match & Leaderboard

**Branch**: `005-caro-match-leaderboard` | **Date**: 2026-07-01 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/005-caro-match-leaderboard/spec.md`

## Summary

Extends the existing `caro-game` NestJS module with the complete Caro 1v1 match experience: match creation/joining (lobby, friend invitation, Quick Pair), live gameplay with server-authoritative timers (move countdown + Start window), in-match chat and spectating including guests, ELO recalculation with atomic DB updates, a top-10 leaderboard, and paginated player profiles with move replay.

All new code follows the project's hexagonal architecture. ELO updates use a single atomic SQL statement (constitution IV). Quick Pair claim uses `SELECT … FOR UPDATE SKIP LOCKED` (ADR-CARO-GAME-003). The shared `src/realtime/` WebSocket gateway is extended with room-based broadcasting and optional guest observer connections.

## Technical Context

**Language/Version**: TypeScript 5.1 / Node.js LTS

**Primary Dependencies**: NestJS 10, TypeORM 0.3, Socket.IO 4 (`@nestjs/websockets` + `@nestjs/platform-socket.io`), EventEmitter2 (`@nestjs/event-emitter`), class-validator, `@nestjs/swagger`

**Storage**: PostgreSQL — 5 new tables (`caro_matches`, `caro_match_moves`, `caro_player_profiles`, `caro_quick_pair_requests`, `caro_chat_messages`) in the existing `public` schema; one numbered TypeORM migration file

**Testing**: ts-jest (unit — domain + application); supertest (integration — controllers). Constitution testing principle not yet ratified (TODO_TESTING_PRINCIPLE); following current non-binding guidance.

**Target Platform**: Linux server (single-process NestJS monolith)

**Project Type**: Web service — REST API + WebSocket (Socket.IO via shared `src/realtime/` gateway)

**Performance Goals**: Lobby list updates within 2 s (SC-003); Quick Pair within 30 s of compatible opponent (SC-002); leaderboard within 5 s of match result (SC-005); move timer within 1 s of server deadline (SC-004)

**Constraints**: Server-authoritative timers only; atomic ELO updates; Quick Pair SKIP LOCKED; no Redis or external cache added for leaderboard

**Scale/Scope**: MVP; no concurrent-player cap; leaderboard top-10; paginated match history (most recent first)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Gate I — Hexagonal Architecture ✅

| Layer | New additions | Constraint |
|-------|---------------|------------|
| Domain | `Match`, `MatchMove`, `PlayerProfile`, `QuickPairRequest`, `ChatMessage` entities; 7 port interfaces; 3 domain events | MUST NOT import NestJS / TypeORM |
| Application | 15 command use-cases + 5 query use-cases | Import ports only — no infrastructure classes |
| Infrastructure | 4 TypeORM repositories, `MatchTimerService`, room-broadcast adapter, friend-check adapter | Each implements exactly one port |
| Interface | 4 HTTP controllers + extended WebSocket gateway | No business logic; translate HTTP/WS → use-case |

Inward dependency arrow preserved throughout: interface → application → domain. Infrastructure injected into use-cases via constructor.

### Gate II — Modular Monolith ✅

All new code lives in `src/caro-game/`. Cross-module traffic:

| From → To | Mechanism |
|-----------|-----------|
| caro-game → account-social (friend check) | `IFriendCheckPort` defined in `caro-game/domain/ports/`; implemented by adapter exported from `AccountSocialModule` |
| caro-game → notification (match invitation sent) | `EventEmitter2` publishes `MatchInvitationSentEvent`; notification module subscribes |
| caro-game → notification (invitation declined) | `EventEmitter2` publishes `MatchInvitationDeclinedEvent` |
| caro-game → trust-report (player report) | Player calls the platform `/reports` HTTP endpoint — no direct module dependency |
| caro-game → realtime | Shared `IRealtimePushPort` (existing) + new `IRealtimeRoomPort` for room broadcasts |

No module imports another module's internal providers directly.

### Gate III — Authentication & Security ✅

- All mutation endpoints require `JwtAuthGuard`.
- `GET /caro/lobby` and `GET /caro/matches/:id` (public match) are public routes — no guard, satisfies guest access (FR-022).
- WebSocket gateway extended to accept connections without a token: unauthenticated sockets receive an `observer` role; they may join public match rooms and the lobby room but all mutations are blocked server-side before reaching any use-case.
- Server-authoritative timers: `deadline_at TIMESTAMP WITH TIME ZONE` stored on `caro_matches`. A per-match in-process `setTimeout` fires at the deadline, checks current DB status (to handle race with a last-second move), updates state if still applicable, and broadcasts result via WebSocket. Timer is cancelled when the triggering action completes before the deadline.

### Gate IV — Data Access ✅

| Pattern | Implementation |
|---------|----------------|
| ELO atomic update | `UPDATE caro_player_profiles SET elo = elo + $1 WHERE id = $2 RETURNING elo` — one statement, no app-layer read-modify-write |
| Quick Pair claim | `SELECT * FROM caro_quick_pair_requests WHERE config_id = $1 AND status = 'waiting' ORDER BY created_at ASC FOR UPDATE SKIP LOCKED LIMIT 1` inside a transaction that also inserts the match row |
| Leaderboard top-10 | `SELECT * FROM caro_player_profiles ORDER BY elo DESC LIMIT 10` — B-tree index on `elo`; no cache |
| Player participation guard | Query active match or queue row for the player before create/join/queue |
| Game config read | Direct DB read at use-time per constitution (no application cache) |

### Gate V — Event-Driven & Realtime ✅

| Signal | Transport |
|--------|-----------|
| Match invitation → notification module | `EventEmitter2` → `MatchInvitationSentEvent` |
| Invitation declined → creator notification | `EventEmitter2` → `MatchInvitationDeclinedEvent` |
| Lobby updates (new match, status change) | WebSocket broadcast to `lobby` room |
| Match state, moves, timer deadline, chat, draw request | WebSocket broadcast to `match:{matchId}` room |
| Guest lobby / match view | WebSocket observer role (no auth token required) |

No polling; no Redis pub/sub (single-process monolith).

### Gate VI — NestJS Standards ✅

- All new controllers decorated with `@ApiTags`, `@ApiOperation`, `@ApiResponse`, `@ApiBearerAuth`.
- All new DTOs annotated with `@ApiProperty`.
- `npm run openapi:generate` must be run and `openapi.json` committed in the same PR as any endpoint change.
- No `process.env` direct access — all config through typed `ConfigService`.

### Post-Design Re-check ✅

Design artifacts (`data-model.md`, `contracts/`) introduce no new constitution issues. All gates remain passing.

---

## Project Structure

### Documentation (this feature)

```text
specs/005-caro-match-leaderboard/
├── plan.md                      ← this file
├── research.md                  ← Phase 0 output
├── data-model.md                ← Phase 1 output
├── quickstart.md                ← Phase 1 output
├── contracts/
│   ├── rest-api.md              ← Phase 1 output
│   └── websocket-events.md      ← Phase 1 output
└── tasks.md                     ← Phase 2 output (/speckit-tasks)
```

### Source Code

```text
src/caro-game/
├── domain/
│   ├── entities/
│   │   ├── game-config.ts                        ← EXISTING
│   │   ├── match.ts                              ← NEW
│   │   ├── match-move.ts                         ← NEW
│   │   ├── player-profile.ts                     ← NEW
│   │   ├── quick-pair-request.ts                 ← NEW
│   │   └── chat-message.ts                       ← NEW
│   ├── errors/
│   │   └── index.ts                              ← EXTEND (add match/profile errors)
│   ├── events/                                    ← NEW directory
│   │   ├── match-invitation-sent.event.ts
│   │   ├── match-invitation-declined.event.ts
│   │   └── match-completed.event.ts
│   └── ports/
│       ├── game-config.repository.port.ts        ← EXISTING
│       ├── match.repository.port.ts              ← NEW
│       ├── player-profile.repository.port.ts     ← NEW
│       ├── quick-pair.repository.port.ts         ← NEW
│       ├── chat-message.repository.port.ts       ← NEW
│       ├── match-timer.service.port.ts           ← NEW
│       └── friend-check.port.ts                 ← NEW
├── application/
│   ├── commands/
│   │   ├── [existing game-config commands]       ← EXISTING
│   │   ├── create-match.use-case.ts              ← NEW
│   │   ├── cancel-match.use-case.ts              ← NEW
│   │   ├── invite-player.use-case.ts             ← NEW
│   │   ├── respond-to-invitation.use-case.ts     ← NEW
│   │   ├── join-match.use-case.ts                ← NEW
│   │   ├── leave-match-before-start.use-case.ts  ← NEW
│   │   ├── start-match.use-case.ts               ← NEW
│   │   ├── place-move.use-case.ts                ← NEW
│   │   ├── surrender.use-case.ts                 ← NEW
│   │   ├── send-draw-request.use-case.ts         ← NEW
│   │   ├── respond-draw-request.use-case.ts      ← NEW
│   │   ├── send-chat-message.use-case.ts         ← NEW
│   │   ├── mute-viewer.use-case.ts               ← NEW
│   │   ├── request-quick-pair.use-case.ts        ← NEW
│   │   └── cancel-quick-pair.use-case.ts         ← NEW
│   └── queries/
│       ├── [existing game-config queries]        ← EXISTING
│       ├── get-lobby.use-case.ts                 ← NEW
│       ├── get-match-state.use-case.ts           ← NEW
│       ├── get-leaderboard.use-case.ts           ← NEW
│       ├── get-player-profile.use-case.ts        ← NEW
│       └── get-match-history.use-case.ts         ← NEW
├── infrastructure/
│   ├── persistence/
│   │   ├── [existing game-config repo]           ← EXISTING
│   │   ├── typeorm-entities/
│   │   │   ├── game-config.orm-entity.ts         ← EXISTING
│   │   │   ├── match.orm-entity.ts               ← NEW
│   │   │   ├── match-move.orm-entity.ts          ← NEW
│   │   │   ├── player-profile.orm-entity.ts      ← NEW
│   │   │   ├── quick-pair-request.orm-entity.ts  ← NEW
│   │   │   └── chat-message.orm-entity.ts        ← NEW
│   │   ├── match.typeorm-repository.ts           ← NEW
│   │   ├── player-profile.typeorm-repository.ts  ← NEW
│   │   ├── quick-pair.typeorm-repository.ts      ← NEW
│   │   └── chat-message.typeorm-repository.ts    ← NEW
│   ├── timer/                                     ← NEW directory
│   │   └── match-timer.service.ts
│   ├── events/                                    ← NEW directory
│   │   └── match-invitation.handler.ts
│   └── friend-check/                              ← NEW directory
│       └── friend-check.adapter.ts
├── interface/
│   ├── dto/
│   │   ├── [existing DTOs]                       ← EXISTING
│   │   ├── match.dto.ts                          ← NEW
│   │   ├── create-match.dto.ts                   ← NEW
│   │   ├── place-move.dto.ts                     ← NEW
│   │   ├── draw-request.dto.ts                   ← NEW
│   │   ├── chat-message.dto.ts                   ← NEW
│   │   ├── leaderboard.dto.ts                    ← NEW
│   │   └── player-profile.dto.ts                 ← NEW
│   └── http/
│       ├── [existing controllers]                ← EXISTING
│       ├── match.controller.ts                   ← NEW
│       ├── quick-pair.controller.ts              ← NEW
│       ├── leaderboard.controller.ts             ← NEW
│       └── player-profile.controller.ts          ← NEW
└── caro-game.module.ts                           ← EXTEND

src/realtime/
├── realtime-push.port.ts       ← EXTEND (add IRealtimeRoomPort interface)
├── realtime.gateway.ts         ← EXTEND (room join/leave + guest observer role)
├── realtime.service.ts         ← EXTEND (room broadcast implementation)
└── realtime.module.ts          ← EXISTING

src/account-social/
└── [export friend-check adapter implementing IFriendCheckPort]  ← EXTEND

src/database/migrations/
└── [timestamp]-caro-match-leaderboard.ts  ← NEW
```

**Structure Decision**: Single project (existing NestJS API). All new logic added to `src/caro-game/`. `src/realtime/` minimally extended with room broadcast. `src/account-social/` extended to export a friend-check adapter. No new NestJS modules created.

## Complexity Tracking

> No constitution violations detected — no entries required.
