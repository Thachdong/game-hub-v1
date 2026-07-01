# Quickstart Validation Guide: Caro Match & Leaderboard

**Feature**: 005-caro-match-leaderboard | **Date**: 2026-07-01

This guide describes how to validate the feature end-to-end after implementation. It assumes the API is running locally and at least one active `GameConfig` exists (created via the Game Admin flow from feature 004).

**References**: [REST API Contract](contracts/rest-api.md) | [WebSocket Events](contracts/websocket-events.md) | [Data Model](data-model.md)

---

## Prerequisites

1. Local API running: `npm run start:dev`
2. PostgreSQL migration applied: `npm run migration:run`
3. At least one active game config exists (e.g., boardSize `25x25`, moveTimeSeconds `15`). Note its `configId`.
4. Two test player accounts with valid JWT access tokens: `TOKEN_A` (playerA) and `TOKEN_B` (playerB).
5. playerA and playerB are friends in the social module (required for private match invitation).

---

## Scenario 1 — Public Match: Create, Join, Play to Win

**Goal**: Validate the full lobby-join-start-play-win flow and ELO update.

**Steps**:

1. playerA opens a WebSocket connection with `TOKEN_A`, joins the `lobby` room.
2. playerA calls `POST /caro/matches` with `{ configId, visibility: "public" }`.
   - Expect: 201 response with `status: "looking_for_opponent"`.
   - Expect: WebSocket `lobby:match_added` event received in the `lobby` room.
3. playerB calls `POST /caro/matches/:id/join`.
   - Expect: 200 response with `status: "waiting_for_start"`.
   - Expect: WebSocket `match:player_joined` event with `startDeadlineAt` ~15s in the future, received by both players after joining `match:<id>` room.
4. playerA calls `POST /caro/matches/:id/start` within 15 seconds.
   - Expect: 200 response with `status: "in_progress"`, `playerXId` and `playerOId` assigned randomly, `deadlineAt` set.
   - Expect: WebSocket `match:started` event to both.
5. Players alternate moves (playerX goes first) calling `POST /caro/matches/:id/moves` with valid board coordinates.
   - After each move, expect WebSocket `match:move_made` with updated `nextTurnPlayerId` and `deadlineAt`.
6. The current player places a piece completing five in a row.
   - Expect: `POST /caro/matches/:id/moves` returns `matchStatus: "completed"`, `result: "x_wins" or "o_wins"`.
   - Expect: WebSocket `match:result` event with `reason: "five_in_a_row"` and `eloChanges` for both players.
7. Call `GET /caro/leaderboard`. Expect both players appear with updated ELO.
8. Call `GET /caro/profiles/<playerA_id>`. Expect `matchesPlayed: 1`, correct `wins/losses`, updated `elo`.

---

## Scenario 2 — Start Window Timeout

**Goal**: Validate that a match is cancelled when the creator fails to press Start in time.

**Steps**:

1. playerA creates a match; playerB joins.
   - Expect: `status: "waiting_for_start"`, `startDeadlineAt` = now + 15s.
2. Wait 16+ seconds without calling `/start`.
   - Expect: WebSocket `match:result` event to both players with `reason: "start_timeout"`, `result: "cancelled"`.
3. Call `GET /caro/profiles/<playerA_id>`. Expect `matchesPlayed` unchanged (cancelled matches not counted).

---

## Scenario 3 — Move Timer Timeout

**Goal**: Validate loss on move timer expiry (including disconnection simulation).

**Steps**:

1. Create a match with `moveTimeSeconds: 5` config, join, start.
2. X player takes their first move. O player does NOT make a move.
3. Wait 6+ seconds.
   - Expect: WebSocket `match:result` with `reason: "timeout"` and O player as loser.
4. Verify `GET /caro/profiles/<o_player>` shows `losses: 1` and reduced ELO.

---

## Scenario 4 — Private Match + Invitation Flow

**Goal**: Validate private match creation, invitation, decline, and re-invite.

**Steps**:

1. playerA creates a match with `visibility: "private"`.
   - Expect: match does NOT appear in `GET /caro/lobby` response.
2. playerA calls `POST /caro/matches/:id/invite` with `{ friendId: playerB_id }`.
   - Expect: 200 response. playerB receives a notification (in-app via WebSocket on their user channel).
3. playerB calls `POST /caro/matches/:id/invitation/respond` with `{ action: "decline" }`.
   - Expect: 200 with `status: "looking_for_opponent"`.
   - Expect: playerA receives `match_invitation:declined` WebSocket event.
4. playerA invites a third playerC (also a friend).
   - Expect: success (match can be re-invited after decline).
5. playerC accepts.
   - Expect: `status: "waiting_for_start"`.
   - Confirm: no other player (playerB, guest) can access `GET /caro/matches/:id` — expect 403.

---

## Scenario 5 — Quick Pair Matchmaking

**Goal**: Validate two players are paired for the same config.

**Steps**:

1. playerA opens a WebSocket connection, subscribes to user-scoped events.
2. playerA calls `POST /caro/quick-pair` with `{ configId }`.
   - Expect: 202 with `status: "queued"`.
3. playerB calls `POST /caro/quick-pair` with same `configId`.
   - Expect: 202 with `status: "matched"`, `matchId` set. OR `status: "queued"` initially.
   - Expect: WebSocket `quick_pair:matched` event delivered to both playerA and playerB with the new `matchId`.
4. Both players join `match:<matchId>` room. Confirm `status: "waiting_for_start"`.

---

## Scenario 6 — Second Player Leaves Before Start

**Goal**: Validate match returns to `looking_for_opponent` when second player leaves.

**Steps**:

1. playerA creates public match; playerB joins → `waiting_for_start`.
2. playerB calls `DELETE /caro/matches/:id` (leave before start).
   - Expect: 200 with `status: "looking_for_opponent"`.
   - Expect: WebSocket `match:player_left` event. Lobby receives `lobby:match_updated` event.
3. playerA can now invite or wait for another join. Confirm `GET /caro/matches/:id` shows `secondPlayerId: null`.

---

## Scenario 7 — Draw Request Flow

**Goal**: Validate draw request pending-only enforcement and result.

**Steps**:

1. Create and start a match. Both players in `in_progress`.
2. playerX calls `POST /caro/matches/:id/draw-request`.
   - Expect: 200. WebSocket `match:draw_request` event to both.
3. playerX tries to send another draw request immediately.
   - Expect: 409 (draw request already pending from caller).
4. playerO calls `PATCH /caro/matches/:id/draw-request` with `{ action: "decline" }`.
   - Expect: WebSocket `match:draw_declined`. Match remains `in_progress`.
5. playerX can now send another draw request (after previous one was resolved).
6. playerO calls `PATCH` with `{ action: "accept" }`.
   - Expect: `match:result` with `result: "draw"`, `reason: "draw_accepted"`. Both players' ELO updated with draw formula.

---

## Scenario 8 — Leaderboard & Profile Correctness

**Goal**: Validate leaderboard top-10 ordering and profile pagination.

**Steps**:

1. Ensure 12+ players have profiles (by simulating matches).
2. Call `GET /caro/leaderboard`. Expect exactly 10 entries ordered by `elo DESC`.
3. Call `GET /caro/profiles/:playerId/matches` with `limit=5`.
   - Expect: 5 entries, most recent first, `nextCursor` present.
4. Call again with `cursor=<nextCursor>`. Expect the next page of results with no overlap.
5. ELO tie-breaking: if two players share the same ELO, both may appear; any 10 of tied players for rank 10 are acceptable.

---

## Scenario 9 — Guest Access

**Goal**: Validate guests can view lobby and public matches but cannot chat or join.

**Steps**:

1. Connect to `/realtime` WebSocket without `auth.token`. Join `lobby` room.
   - Expect: connection accepted (observer role). Lobby events received.
2. Call `GET /caro/lobby` without Authorization header.
   - Expect: 200 with public match list.
3. Call `GET /caro/matches/:id` (public match) without Authorization header.
   - Expect: 200 with board state.
4. Attempt `POST /caro/matches/:id/chat` without token.
   - Expect: 401.
5. Attempt `POST /caro/matches/:id/join` without token.
   - Expect: 401.

---

## OpenAPI Verification

After all controllers are implemented:

```bash
npm run openapi:generate
```

Verify `openapi.json` at repo root contains all new endpoints listed in [rest-api.md](contracts/rest-api.md) with complete request/response schemas and `@ApiOperation`/`@ApiResponse` annotations.
