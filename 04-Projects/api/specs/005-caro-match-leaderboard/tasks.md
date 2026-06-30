# Tasks: Caro Match & Leaderboard

**Input**: Design documents from `specs/005-caro-match-leaderboard/`

**Prerequisites**: [plan.md](plan.md) | [spec.md](spec.md) | [data-model.md](data-model.md) | [contracts/rest-api.md](contracts/rest-api.md) | [contracts/websocket-events.md](contracts/websocket-events.md) | [research.md](research.md)

**Tests**: Not requested — test tasks excluded per constitution TODO_TESTING_PRINCIPLE.

**Organization**: Tasks grouped by user story. Each phase is independently deployable and testable.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Parallelizable — different files, no dependencies within the phase
- **[Story]**: User story label (US1–US6)
- Exact TypeScript file paths included in every task

---

## Phase 1: Setup

**Purpose**: Create new directory trees needed for this feature inside the existing project.

- [ ] T001 Create new directories: `src/caro-game/domain/events/`, `src/caro-game/infrastructure/timer/`, `src/caro-game/infrastructure/events/`, `src/caro-game/infrastructure/friend-check/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core domain types, shared infrastructure, and DB schema that ALL user stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T002 [P] Extend domain errors in `src/caro-game/domain/errors/index.ts` — add `MatchNotFoundError`, `PlayerAlreadyInActiveStateError`, `NotAParticipantError`, `MatchNotInExpectedStatusError`, `NotMatchCreatorError`, `PlayerNotInMatchError`, `NotYourTurnError`, `CellAlreadyOccupiedError`, `ViewerMutedError`, `NoActiveQuickPairRequestError`
- [ ] T003 [P] Create `Match` domain entity in `src/caro-game/domain/entities/match.ts` — fields: id, configId, boardSize, moveTimeSeconds, visibility, status (enum: `looking_for_opponent | waiting_for_start | in_progress | completed | cancelled`), creatorId, secondPlayerId, playerXId, playerOId, currentTurnPlayerId, pendingDrawRequestFromId, result, winnerPlayerId, deadlineAt, startedAt, endedAt, createdAt, updatedAt
- [ ] T004 [P] Create `PlayerProfile` domain entity in `src/caro-game/domain/entities/player-profile.ts` — fields: id, playerId, elo (default 1200), matchesPlayed, wins, losses, draws, createdAt, updatedAt
- [ ] T005 [P] Create `MatchMove` domain entity in `src/caro-game/domain/entities/match-move.ts` — fields: id, matchId, playerId, row, col, sequenceNumber, placedAt
- [ ] T006 [P] Define `IMatchRepositoryPort` in `src/caro-game/domain/ports/match.repository.port.ts` — methods: `findById`, `findByPlayerId` (active match), `save`, `update` (status, deadlineAt, playerX/O, currentTurn, result, draw request), `findLobbyMatches` (public, looking/in-progress), `findByPlayerIdHistory` (paginated, completed)
- [ ] T007 [P] Define `IPlayerProfileRepositoryPort` in `src/caro-game/domain/ports/player-profile.repository.port.ts` — methods: `findByPlayerId`, `createWithElo1200`, `updateEloAtomic(playerId, delta, result)`, `findTopN(n)` (leaderboard)
- [ ] T008 [P] Define `IMatchTimerServicePort` in `src/caro-game/domain/ports/match-timer.service.port.ts` — methods: `scheduleStartWindow(matchId, deadlineAt, onExpire)`, `scheduleMoveTimer(matchId, deadlineAt, onExpire)`, `cancelTimer(matchId)`
- [ ] T009 [P] Define `IFriendCheckPort` in `src/caro-game/domain/ports/friend-check.port.ts` — method: `areFriends(playerAId: string, playerBId: string): Promise<boolean>`
- [ ] T010 [P] Create `Match` TypeORM ORM entity in `src/caro-game/infrastructure/persistence/typeorm-entities/match.orm-entity.ts` — maps all `Match` domain fields with correct column types; `deadline_at` as `TIMESTAMPTZ`; composite indexes on `status`, `creator_id`, `(player_x_id, player_o_id)`
- [ ] T011 [P] Create `PlayerProfile` TypeORM ORM entity in `src/caro-game/infrastructure/persistence/typeorm-entities/player-profile.orm-entity.ts` — maps `PlayerProfile` domain fields; B-tree index on `elo DESC`
- [ ] T012 [P] Create `MatchMove` TypeORM ORM entity in `src/caro-game/infrastructure/persistence/typeorm-entities/match-move.orm-entity.ts` — maps `MatchMove` domain fields; unique constraints on `(match_id, row, col)` and `(match_id, sequence_number)`; index on `(match_id, sequence_number)`
- [ ] T013 Implement `MatchTypeOrmRepository` in `src/caro-game/infrastructure/persistence/match.typeorm-repository.ts` — implements `IMatchRepositoryPort`; `findByPlayerId` queries active matches; `updateEloAtomic` not here (see PlayerProfile repo)
- [ ] T014 Implement `PlayerProfileTypeOrmRepository` in `src/caro-game/infrastructure/persistence/player-profile.typeorm-repository.ts` — implements `IPlayerProfileRepositoryPort`; `updateEloAtomic` uses `UPDATE caro_player_profiles SET elo = elo + $1, matches_played = matches_played + 1, wins/losses/draws = ... + 1 WHERE player_id = $2 RETURNING elo` (single atomic statement per player in a transaction)
- [ ] T015 Write TypeORM migration in `src/database/migrations/[timestamp]-caro-match-leaderboard.ts` — creates all 5 tables (`caro_matches`, `caro_match_moves`, `caro_player_profiles`, `caro_quick_pair_requests`, `caro_chat_messages`) and all indexes as specified in [data-model.md](data-model.md)
- [ ] T016 Add `IRealtimeRoomPort` interface to `src/realtime/realtime-push.port.ts` — methods: `joinRoom(socketId: string, room: string)`, `leaveRoom(socketId: string, room: string)`, `pushToRoom(room: string, event: string, payload: unknown): Promise<void>`; export symbol `REALTIME_ROOM_PORT`
- [ ] T017 Extend `RealtimeGateway` in `src/realtime/realtime.gateway.ts` — add `handleJoinRoom` and `handleLeaveRoom` message handlers; allow connections without auth token (observer role); block all mutations from observer sockets; store socket role in connection map
- [ ] T018 Extend `RealtimeService` in `src/realtime/realtime.service.ts` — implement `IRealtimeRoomPort`; use `socket.io` `server.to(room).emit(event, payload)` for room broadcast
- [ ] T019 Implement `FriendCheckAdapter` in `src/caro-game/infrastructure/friend-check/friend-check.adapter.ts` — implements `IFriendCheckPort` by calling the exported friendship query service from `AccountSocialModule`; export the adapter from `AccountSocialModule` and import it in `CaroGameModule`

**Checkpoint**: Migration runs, tables exist, domain types compile, realtime gateway accepts room joins and guest connections. No user story work begins before here.

---

## Phase 3: User Story 1 — Create and Join a Caro Match (Priority: P1) 🎯 MVP

**Goal**: Players can create public/private matches, join from lobby, invite friends, cancel matches, and second player can leave before Start. Lobby updates via WebSocket.

**Independent Test**: Create a public match as playerA, join as playerB from lobby, verify both players reach `waiting_for_start`; lobby WebSocket room shows `match_added` and `match_updated` events; private match does not appear in lobby.

- [ ] T020 [P] [US1] Create match DTOs in `src/caro-game/interface/dto/match.dto.ts` — `CreateMatchDto` (`configId`, `visibility`), `LobbyMatchDto`, `MatchStateDto` (includes `playerX/O`, `moves`, `viewers`, `deadlineAt`), `InvitePlayerDto` (`friendId`), `RespondInvitationDto` (`action: accept|decline`) — all fields annotated with `@ApiProperty`
- [ ] T021 [P] [US1] Create domain events in `src/caro-game/domain/events/match-invitation-sent.event.ts` and `src/caro-game/domain/events/match-invitation-declined.event.ts` — plain POJOs with `matchId`, `fromPlayerId`, `toPlayerId` fields
- [ ] T022 [US1] Implement `CreateMatchUseCase` in `src/caro-game/application/commands/create-match.use-case.ts` — validate config is active (via `IGameConfigRepositoryPort`), check player has no active state (via `IMatchRepositoryPort.findByPlayerId`), create match row, publish `lobby:match_added` WebSocket event to `lobby` room
- [ ] T023 [US1] Implement `CancelMatchUseCase` in `src/caro-game/application/commands/cancel-match.use-case.ts` — verify caller is creator, verify status is `looking_for_opponent`, update to `cancelled`, broadcast `lobby:match_removed`
- [ ] T024 [US1] Implement `InvitePlayerUseCase` in `src/caro-game/application/commands/invite-player.use-case.ts` — verify caller is creator, verify status is `looking_for_opponent`, verify `IFriendCheckPort.areFriends(creatorId, friendId)`, emit `MatchInvitationSentEvent` via `EventEmitter2`
- [ ] T025 [US1] Implement event handler `MatchInvitationHandler` in `src/caro-game/infrastructure/events/match-invitation.handler.ts` — listens to `MatchInvitationSentEvent` and `MatchInvitationDeclinedEvent`; calls notification module (via its exported service/EventEmitter2 bridge) to send in-app notification to invited player / creator
- [ ] T026 [US1] Implement `RespondToInvitationUseCase` in `src/caro-game/application/commands/respond-to-invitation.use-case.ts` — `accept`: verify match still `looking_for_opponent`, set `secondPlayerId`, update status to `waiting_for_start`, schedule Start window timer, broadcast `match:player_joined` to `match:<id>` room and `lobby:match_updated` to `lobby` room; `decline`: emit `MatchInvitationDeclinedEvent`, leave match status unchanged
- [ ] T027 [US1] Implement `JoinMatchUseCase` in `src/caro-game/application/commands/join-match.use-case.ts` — verify match is public + `looking_for_opponent`, verify caller has no active state, set `secondPlayerId`, update to `waiting_for_start`, schedule Start window timer, broadcast `match:player_joined` + `lobby:match_updated`
- [ ] T028 [US1] Implement `LeaveMatchBeforeStartUseCase` in `src/caro-game/application/commands/leave-match-before-start.use-case.ts` — verify caller is `secondPlayerId`, verify status is `waiting_for_start`, cancel Start window timer, clear `secondPlayerId`, revert to `looking_for_opponent`, broadcast `match:player_left` + `lobby:match_updated`
- [ ] T029 [US1] Implement `GetLobbyUseCase` in `src/caro-game/application/queries/get-lobby.use-case.ts` — queries all public matches with `looking_for_opponent` or `in_progress` status; includes creator/second-player usernames (resolved via account-social port)
- [ ] T030 [US1] Implement `GetMatchStateUseCase` in `src/caro-game/application/queries/get-match-state.use-case.ts` — returns full match state including moves list; enforces private-match access guard (only participants)
- [ ] T031 [US1] Implement `MatchController` in `src/caro-game/interface/http/match.controller.ts` — endpoints: `POST /caro/matches`, `GET /caro/lobby` (public), `GET /caro/matches/:id` (public for public matches), `DELETE /caro/matches/:id`, `POST /caro/matches/:id/invite`, `POST /caro/matches/:id/invitation/respond`, `POST /caro/matches/:id/join` — with `@ApiTags('Caro — Matches')`, `@ApiOperation`, `@ApiResponse`, `@ApiBearerAuth` on protected routes
- [ ] T032 [US1] Register US1 providers in `src/caro-game/caro-game.module.ts` — add `MatchTypeOrmRepository`, `PlayerProfileTypeOrmRepository`, `FriendCheckAdapter`, `MatchTimerService` (stub), `MatchInvitationHandler`, and all US1 use-cases; import `TypeOrmModule.forFeature` for new ORM entities

**Checkpoint**: `POST /caro/matches`, `GET /caro/lobby`, lobby WebSocket events, public/private match access control, and invitation flow all work end-to-end.

---

## Phase 4: User Story 2 — Play a Caro Match to Completion (Priority: P1)

**Goal**: Two players can start a match, take turns placing pieces with per-move timer enforcement, and the match ends correctly (5-in-a-row, draw, timeout, surrender, accepted draw). ELO is updated atomically.

**Independent Test**: Create and start a match, alternate moves to a 5-in-a-row win, verify `match:result` WebSocket event with correct `eloChanges`; separately verify timeout: do not move within `moveTimeSeconds` and verify the mover loses.

- [ ] T033 [P] [US2] Create `MatchCompletedEvent` domain event in `src/caro-game/domain/events/match-completed.event.ts` — fields: `matchId`, `playerXId`, `playerOId`, `result`, `winnerPlayerId`
- [ ] T034 [P] [US2] Create gameplay DTOs in `src/caro-game/interface/dto/` — `PlaceMoveDto` (`row`, `col`), `DrawRequestResponseDto` (`action: accept|decline`) — with `@ApiProperty`
- [ ] T035 [US2] Implement `MatchTimerService` in `src/caro-game/infrastructure/timer/match-timer.service.ts` — implements `IMatchTimerServicePort`; manages `Map<matchId, NodeJS.Timeout>`; `scheduleStartWindow(matchId, deadlineAt, onExpire)`: sets `setTimeout` for remaining ms until `deadlineAt`; `scheduleMoveTimer(matchId, deadlineAt, onExpire)`: same pattern; `cancelTimer(matchId)`: calls `clearTimeout`; `onModuleInit()`: re-registers timers for all in-progress/waiting-for-start matches from DB
- [ ] T036 [US2] Implement `StartMatchUseCase` in `src/caro-game/application/commands/start-match.use-case.ts` — verify caller is creator, verify status is `waiting_for_start`, verify deadline not expired, randomly assign playerX/playerO, set status to `in_progress`, set `currentTurnPlayerId = playerXId`, set new `deadlineAt = now + moveTimeSeconds`, cancel Start window timer, schedule move timer, broadcast `match:started`
- [ ] T037 [US2] Implement `PlaceMoveUseCase` in `src/caro-game/application/commands/place-move.use-case.ts` — verify status is `in_progress`, verify `currentTurnPlayerId = callerId`, verify `deadlineAt` not expired, verify cell not occupied, insert `MatchMove` row with next `sequenceNumber`, run 5-in-a-row detection from placed piece (check 4 directions, up to 4 neighbors each), check board-full draw; if match ends: call `endMatch` (update status, result, set ELO atomically for both players via `IPlayerProfileRepositoryPort.updateEloAtomic`, cancel move timer, broadcast `match:result`); if match continues: toggle `currentTurnPlayerId`, set new `deadlineAt`, reset move timer, broadcast `match:move_made`
- [ ] T038 [US2] Implement `SurrenderUseCase` in `src/caro-game/application/commands/surrender.use-case.ts` — verify caller is participant, verify `in_progress`, determine winner (the other player), call `endMatch` (same as above), broadcast `match:result` with `reason: "surrender"`
- [ ] T039 [US2] Implement `SendDrawRequestUseCase` in `src/caro-game/application/commands/send-draw-request.use-case.ts` — verify `in_progress`, verify caller is participant, verify `pendingDrawRequestFromId` is null (no existing pending request from caller), set `pendingDrawRequestFromId = callerId`, broadcast `match:draw_request`
- [ ] T040 [US2] Implement `RespondDrawRequestUseCase` in `src/caro-game/application/commands/respond-draw-request.use-case.ts` — verify `pendingDrawRequestFromId` is set and caller is NOT the requester, if `accept`: call `endMatch` with result `draw`, broadcast `match:result`; if `decline`: clear `pendingDrawRequestFromId`, broadcast `match:draw_declined`
- [ ] T041 [US2] Add `onModuleInit()` restart recovery to `MatchTimerService` in `src/caro-game/infrastructure/timer/match-timer.service.ts` — on startup, query all matches with status `in_progress` or `waiting_for_start` and `deadline_at > now`, re-register timers for remaining duration; for matches where `deadline_at` has already passed, trigger the expiry handler immediately
- [ ] T042 [US2] Add gameplay endpoints to `MatchController` in `src/caro-game/interface/http/match.controller.ts` — `POST /caro/matches/:id/start`, `POST /caro/matches/:id/moves`, `GET /caro/matches/:id/moves` (move replay), `POST /caro/matches/:id/surrender`, `POST /caro/matches/:id/draw-request`, `PATCH /caro/matches/:id/draw-request` — with `@ApiOperation`, `@ApiResponse` per [contracts/rest-api.md](contracts/rest-api.md)
- [ ] T043 [US2] Register US2 providers in `src/caro-game/caro-game.module.ts` — register real `MatchTimerService` (replacing stub), all US2 use-cases; register `MatchMove` TypeORM entity

**Checkpoint**: Full gameplay loop works. Start window timeout cancels match. Move timer timeout declares loser. 5-in-a-row, board-full draw, surrender, and accepted draw all produce correct `match:result` events with ELO changes.

---

## Phase 5: User Story 3 — Quick Pair Automatic Matchmaking (Priority: P2)

**Goal**: A player requesting Quick Pair is matched with another player waiting for the same configuration, creating a new public match atomically.

**Independent Test**: playerA and playerB both call `POST /caro/quick-pair` with the same `configId`; verify both receive `quick_pair:matched` WebSocket event with same `matchId` and the match is in `waiting_for_start`.

- [ ] T044 [P] [US3] Create `QuickPairRequest` domain entity in `src/caro-game/domain/entities/quick-pair-request.ts` — fields: id, playerId, configId, boardSize, moveTimeSeconds, status (`waiting | matched | cancelled`), matchId (nullable), createdAt
- [ ] T045 [P] [US3] Define `IQuickPairRepositoryPort` in `src/caro-game/domain/ports/quick-pair.repository.port.ts` — methods: `save`, `findActiveByPlayerId`, `claimWaitingRequest(boardSize, moveTimeSeconds, excludePlayerId)` (SELECT FOR UPDATE SKIP LOCKED), `markMatched(requestId, matchId)`, `markCancelled(requestId)`
- [ ] T046 [P] [US3] Create `QuickPairRequest` TypeORM ORM entity in `src/caro-game/infrastructure/persistence/typeorm-entities/quick-pair-request.orm-entity.ts` — partial index on `(board_size, move_time_seconds, status, created_at) WHERE status = 'waiting'`
- [ ] T047 [US3] Implement `QuickPairTypeOrmRepository` in `src/caro-game/infrastructure/persistence/quick-pair.typeorm-repository.ts` — `claimWaitingRequest` runs `SELECT … FOR UPDATE SKIP LOCKED LIMIT 1` inside a DB transaction that also creates the match row and marks both requests as `matched`; atomicity prevents double-booking
- [ ] T048 [US3] Implement `RequestQuickPairUseCase` in `src/caro-game/application/commands/request-quick-pair.use-case.ts` — verify player has no active state, verify configId is active, try `claimWaitingRequest`; if found: create match (both players as participants), push `quick_pair:matched` event to both users via `IRealtimePushPort.pushToUser`, return `{ status: "matched", matchId }`; if not found: insert waiting request, return `{ status: "queued", requestId }`
- [ ] T049 [US3] Implement `CancelQuickPairUseCase` in `src/caro-game/application/commands/cancel-quick-pair.use-case.ts` — find active request for player, verify status is `waiting`, mark as `cancelled`
- [ ] T050 [US3] Implement `QuickPairController` in `src/caro-game/interface/http/quick-pair.controller.ts` — `POST /caro/quick-pair`, `DELETE /caro/quick-pair`; with `@ApiTags('Caro — Quick Pair')`, `@ApiOperation`, `@ApiResponse`, `@ApiBearerAuth`
- [ ] T051 [US3] Register US3 providers in `src/caro-game/caro-game.module.ts` — add `QuickPairTypeOrmRepository`, `RequestQuickPairUseCase`, `CancelQuickPairUseCase`, `QuickPairController`; register `QuickPairRequest` TypeORM entity

**Checkpoint**: Two players calling Quick Pair simultaneously with the same config are matched exactly once (no double-booking). Only one match is created. Both receive `quick_pair:matched` event.

---

## Phase 6: User Story 4 — In-Match Chat and Spectating (Priority: P2)

**Goal**: Logged-in viewers can join public match rooms, send chat, and be muted by participants. Guests can join as observers. Chat is persisted for audit/report purposes. Mute is prospective-only.

**Independent Test**: playerC (viewer) joins `match:<id>` WebSocket room, sends a chat message via `POST /caro/matches/:id/chat`, verifies `match:chat` event is broadcast; playerA mutes playerC via `POST /caro/matches/:id/mute/:viewerId`; playerC attempts to send another message and gets 403.

- [ ] T052 [P] [US4] Create `ChatMessage` domain entity in `src/caro-game/domain/entities/chat-message.ts` — fields: id, matchId, senderId, content (max 500 chars), sentAt
- [ ] T053 [P] [US4] Define `IChatMessageRepositoryPort` in `src/caro-game/domain/ports/chat-message.repository.port.ts` — methods: `save(chatMessage)`, `findByMatchId(matchId)` (for admin/audit — not exposed as endpoint)
- [ ] T054 [P] [US4] Create `ChatMessage` TypeORM ORM entity in `src/caro-game/infrastructure/persistence/typeorm-entities/chat-message.orm-entity.ts` — index on `(match_id, sent_at)`
- [ ] T055 [P] [US4] Create `ChatMessageDto` in `src/caro-game/interface/dto/chat-message.dto.ts` — `SendChatMessageDto` (`content: string`), `ChatMessageResponseDto` (`id`, `senderId`, `senderUsername`, `content`, `sentAt`) — with `@ApiProperty`
- [ ] T056 [US4] Implement `ChatMessageTypeOrmRepository` in `src/caro-game/infrastructure/persistence/chat-message.typeorm-repository.ts` — implements `IChatMessageRepositoryPort`
- [ ] T057 [US4] Implement `SendChatMessageUseCase` in `src/caro-game/application/commands/send-chat-message.use-case.ts` — verify match is `in_progress`, verify sender is authenticated (participants or non-muted viewers), check in-memory mute registry: if `mutedViewers.get(matchId)?.has(senderId)` → throw `ViewerMutedError`; persist `ChatMessage`; broadcast `match:chat` to `match:<matchId>` room
- [ ] T058 [US4] Implement `MuteViewerUseCase` in `src/caro-game/application/commands/mute-viewer.use-case.ts` — verify caller is participant, verify match is `in_progress`, add `viewerId` to in-memory mute set for this match (`Map<matchId, Set<viewerId>>`), push `match:viewer_muted` event to muted viewer's socket via `pushToUser`; mute is prospective only (existing messages remain)
- [ ] T059 [US4] Add chat and mute endpoints to `MatchController` in `src/caro-game/interface/http/match.controller.ts` — `POST /caro/matches/:id/chat`, `POST /caro/matches/:id/mute/:viewerId`; with `@ApiOperation`, `@ApiResponse`
- [ ] T060 [US4] Register US4 providers in `src/caro-game/caro-game.module.ts` — add `ChatMessageTypeOrmRepository`, `SendChatMessageUseCase`, `MuteViewerUseCase`, register `ChatMessage` TypeORM entity

**Checkpoint**: Chat messages broadcast to all room members. Muted viewer cannot post but can still watch. Guest observers receive chat events read-only via WebSocket.

---

## Phase 7: User Story 5 — View the Leaderboard (Priority: P2)

**Goal**: Any user (including guests) can view the top 10 players by ELO, reflecting the latest ELO after each completed match.

**Independent Test**: After completing a match that changes ELO, call `GET /caro/leaderboard` and verify the 10 entries are ordered by `elo DESC` with updated values.

- [ ] T061 [P] [US5] Create `LeaderboardDto` in `src/caro-game/interface/dto/leaderboard.dto.ts` — `LeaderboardEntryDto` (`rank`, `playerId`, `username`, `elo`, `matchesPlayed`, `wins`, `losses`, `draws`), `LeaderboardResponseDto` (array of entries) — with `@ApiProperty`
- [ ] T062 [US5] Implement `GetLeaderboardUseCase` in `src/caro-game/application/queries/get-leaderboard.use-case.ts` — calls `IPlayerProfileRepositoryPort.findTopN(10)` (direct `ORDER BY elo DESC LIMIT 10` — no cache per ADR-CARO-GAME-004); resolves usernames from account-social
- [ ] T063 [US5] Implement `LeaderboardController` in `src/caro-game/interface/http/leaderboard.controller.ts` — `GET /caro/leaderboard` (public — no `JwtAuthGuard`); with `@ApiTags('Caro — Leaderboard')`, `@ApiOperation`, `@ApiResponse`
- [ ] T064 [US5] Register US5 providers in `src/caro-game/caro-game.module.ts` — add `GetLeaderboardUseCase`, `LeaderboardController`

**Checkpoint**: `GET /caro/leaderboard` returns top 10 without auth, correct ordering, updates within one DB query of match completion.

---

## Phase 8: User Story 6 — View Player Profiles and Match History (Priority: P2)

**Goal**: Any logged-in player can view their own or another player's Caro profile with ELO, stats, and paginated match history. Individual match move history is accessible for replay.

**Independent Test**: After completing at least one match, call `GET /caro/profiles/:playerId` and verify ELO + stats are correct; call `GET /caro/profiles/:playerId/matches?limit=5` and verify pagination works with `nextCursor`; open a completed match via `GET /caro/matches/:id/moves` and verify full move sequence returned.

- [ ] T065 [P] [US6] Create `PlayerProfileDto` in `src/caro-game/interface/dto/player-profile.dto.ts` — `PlayerProfileResponseDto` (`playerId`, `username`, `elo`, `matchesPlayed`, `wins`, `losses`, `draws`, `winRate`), `MatchHistoryItemDto` (`id`, `boardSize`, `moveTimeSeconds`, `opponentId`, `opponentUsername`, `result`, `eloChange`, `endedAt`), `MatchHistoryResponseDto` (`matches`, `nextCursor`) — with `@ApiProperty`
- [ ] T066 [US6] Implement `GetPlayerProfileUseCase` in `src/caro-game/application/queries/get-player-profile.use-case.ts` — calls `IPlayerProfileRepositoryPort.findByPlayerId(playerId)`; throws 404 if no profile; resolves username from account-social; computes `winRate`
- [ ] T067 [US6] Implement `GetMatchHistoryUseCase` in `src/caro-game/application/queries/get-match-history.use-case.ts` — calls `IMatchRepositoryPort.findByPlayerIdHistory(playerId, { cursor, limit })` for cursor-based pagination (cursor encodes `endedAt + id`); returns `{ matches, nextCursor }`; each history item includes `eloChange` (requires storing per-match ELO delta — add `elo_change` column to `caro_matches` and populate in `endMatch` flow)
- [ ] T068 [US6] Add `eloChange` field to `caro_matches` table — add `player_x_elo_change` and `player_o_elo_change` columns in the migration (or add an addendum migration if migration already applied); populate in `PlaceMoveUseCase` / `SurrenderUseCase` / `RespondDrawRequestUseCase` when `endMatch` runs
- [ ] T069 [US6] Implement `PlayerProfileController` in `src/caro-game/interface/http/player-profile.controller.ts` — `GET /caro/profiles/:playerId`, `GET /caro/profiles/:playerId/matches`, `GET /caro/matches/:id/moves` (move replay — also add to `MatchController` if preferred); with `@ApiTags('Caro — Profiles')`, `@ApiOperation`, `@ApiResponse`, `@ApiBearerAuth`
- [ ] T070 [US6] Register US6 providers in `src/caro-game/caro-game.module.ts` — add `GetPlayerProfileUseCase`, `GetMatchHistoryUseCase`, `PlayerProfileController`

**Checkpoint**: Profile page shows correct ELO and stats. Match history paginates correctly. Move replay returns full sequence for completed matches.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [ ] T071 Run `npm run openapi:generate` from repo root and commit the updated `openapi.json` — verify all 20+ new endpoints appear with complete request/response schemas
- [ ] T072 [P] Add `viewer_joined` / `viewer_left` WebSocket broadcasts in `RealtimeGateway` connection/disconnection handlers in `src/realtime/realtime.gateway.ts` — on join to `match:<id>` room, push `match:viewer_joined`; on disconnect or room leave, push `match:viewer_left`
- [ ] T073 [P] Clear match mute state on match completion — extend the `endMatch` logic in `PlaceMoveUseCase` / `SurrenderUseCase` / `RespondDrawRequestUseCase` to call `muteRegistry.delete(matchId)` to release in-memory mute sets
- [ ] T074 Run all 9 quickstart validation scenarios from [quickstart.md](quickstart.md) and confirm each passes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — **BLOCKS all user stories**
- **Phase 3 (US1 — P1)**: Depends on Phase 2
- **Phase 4 (US2 — P1)**: Depends on Phase 3 (requires match to exist to play it)
- **Phase 5 (US3 — P2)**: Depends on Phase 2; can run in parallel with US1/US2 after foundational
- **Phase 6 (US4 — P2)**: Depends on Phase 3 (match must exist to chat in it)
- **Phase 7 (US5 — P2)**: Depends on Phase 4 (ELO only populated after matches complete)
- **Phase 8 (US6 — P2)**: Depends on Phase 4 (profiles created when matches complete)
- **Phase 9 (Polish)**: Depends on all story phases complete

### User Story Dependencies

| Story | Depends On | Reason |
|-------|-----------|--------|
| US1 (Create/Join) | Foundational | Needs match entity + table |
| US2 (Gameplay) | US1 | Needs match to exist to start |
| US3 (Quick Pair) | Foundational | Creates matches directly; parallel with US1 |
| US4 (Chat) | US1 | Needs match room to exist |
| US5 (Leaderboard) | US2 | Leaderboard only meaningful after ELO set |
| US6 (Profile) | US2 | Profile created on first completed match |

### Within Each Phase

- Models/entities before repositories
- Ports before use-cases
- Use-cases before controllers
- Controllers before module wiring
- Module wiring (last task in each phase) enables end-to-end test

---

## Parallel Opportunities

### Phase 2 (Foundational)

All of T002–T012 are marked `[P]` and can run simultaneously — they are all in different files with no intra-phase dependencies.

### Phase 3 (US1)

```
Parallel: T020 (DTOs) + T021 (events)
Then sequential: T022 → T023 → T024 → T025 → T026 → T027 → T028 → T029 → T030
Then: T031 (controller) → T032 (module wiring)
```

### Phases 5, 6, 7, 8 (US3, US4, US5, US6)

After Phase 2 foundational completes and Phase 3 is underway:
- US3 (Phase 5) can be developed independently in parallel with US1/US2
- US4 (Phase 6) can begin once US1 controller exists (for the match room)
- US5 and US6 require US2 ELO/profile logic first

---

## Implementation Strategy

### MVP First (US1 + US2 Only)

1. Complete Phase 1 (Setup)
2. Complete Phase 2 (Foundational) — critical blocker
3. Complete Phase 3 (US1: Create & Join)
4. **STOP and VALIDATE**: Test lobby, match creation, invitation, lobby WebSocket
5. Complete Phase 4 (US2: Gameplay)
6. **STOP and VALIDATE**: Test full match loop, timer expiry, ELO update
7. Deploy/demo: basic 1v1 Caro matches are playable

### Incremental Delivery

After MVP:
1. Add Phase 5 (US3: Quick Pair) → instant matchmaking available
2. Add Phase 6 (US4: Chat + Spectating) → social layer
3. Add Phase 7 (US5: Leaderboard) → competitive context
4. Add Phase 8 (US6: Profile + History) → personal tracking
5. Phase 9 (Polish) → OpenAPI, cleanup

### Parallel Team Strategy (if 3 developers)

After Phase 2 foundational:
- **Dev A**: Phase 3 (US1) → Phase 4 (US2)
- **Dev B**: Phase 5 (US3) → Phase 7 (US5) after US2 merges
- **Dev C**: Phase 6 (US4) → Phase 8 (US6) after US2 merges

---

## Notes

- `[P]` tasks = different files, no intra-phase dependencies — safe to parallelize
- `[Story]` label maps task to spec.md user story for traceability
- Module wiring (`caro-game.module.ts`) is updated at the end of each phase — not at the end of the entire feature
- ELO updates MUST use atomic SQL — never read `elo` then write `elo = readValue + delta`
- Timer cancellation MUST be called any time a match action resolves before the deadline (move placed, surrender, draw accepted) — stale timers cause phantom losses
- In-memory mute state is cleared when match ends (T073) to avoid memory leaks in long-running process
- `openapi:generate` (T071) must be run and committed in the same PR as any new endpoint
