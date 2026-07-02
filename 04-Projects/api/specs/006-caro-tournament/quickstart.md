# Quickstart Validation Guide: Caro Tournament

**Feature**: `006-caro-tournament` | **Date**: 2026-07-01

This guide describes how to validate the tournament feature end-to-end after implementation. It is a run guide, not an implementation reference — for API shapes see [contracts/rest-api.md](contracts/rest-api.md) and [contracts/websocket-events.md](contracts/websocket-events.md); for schema details see [data-model.md](data-model.md).

---

## Prerequisites

- API server running locally (follow existing project README)
- PostgreSQL migration applied: `npm run migration:run`
- At least 6 player accounts created (players A–F) and JWT tokens obtained
- A Game Admin account with valid JWT
- A game config already active (or create one via `POST /caro/admin/game-configs`)
- A WebSocket client (e.g., Postman WebSocket, `wscat`) connected to the API's Socket.IO endpoint

---

## Scenario 1 — Tournament Creator Role Flow

**Validates**: US1 (role request, approval, rejection, revocation), FR-001–FR-006

### Steps

1. **Player A requests the role**
   ```
   POST /caro/tournament-creator-requests
   Auth: Player A JWT
   → Expect 201 { requestId, status: "pending" }
   ```

2. **Admin lists pending requests**
   ```
   GET /caro/admin/tournament-creator-requests?status=pending
   Auth: Admin JWT
   → Expect Player A's request in the list
   ```

3. **Admin approves Player A's request**
   ```
   PATCH /caro/admin/tournament-creator-requests/{requestId}
   Body: { "action": "approve" }
   Auth: Admin JWT
   → Expect 200 { status: "approved" }
   → Notification module should receive TournamentCreatorRoleGrantedEvent
   ```

4. **Player A can now create a tournament** (validated in Scenario 2)

5. **Player B requests and is rejected**
   ```
   POST /caro/tournament-creator-requests          (Player B JWT)
   PATCH /caro/admin/tournament-creator-requests/{id}  Body: { "action": "reject" }
   → Expect Player B JWT cannot create a tournament (403 from TournamentCreatorGuard)
   ```

6. **Admin revokes Player A's role (after Scenario 2 with an active tournament)**
   ```
   DELETE /caro/admin/tournament-creators/{playerAId}
   Auth: Admin JWT
   → Expect 200
   ```
   Verify: Player A's existing tournament (from Scenario 2) continues to run normally (still accepts registrations, pairings occur). Verify: Player A can no longer create a new tournament after their JWT is refreshed.

---

## Scenario 2 — Tournament Creation and Public Visibility

**Validates**: US2, US3 (public view, guest view), FR-007, FR-007a, FR-009

### Steps

1. **Player A creates a tournament**
   ```
   POST /caro/tournaments
   Auth: Player A (Tournament Creator) JWT
   Body: {
     "gameConfigId": "{activeConfigId}",
     "minElo": 1400,
     "startAt": "<now + 3 minutes>",
     "endAt": "<now + 30 minutes>"
   }
   → Expect 201 { tournamentId, status: "waiting", ... }
   ```

2. **Any player / guest can view it immediately**
   ```
   GET /caro/tournaments           (no auth)
   GET /caro/tournaments/{id}      (no auth)
   → Expect tournament visible with status: "waiting"
   ```

3. **Player with elo < 1400 can view but cannot register** (validated in Scenario 3)

---

## Scenario 3 — Registration (Elo Gate + Late Registration)

**Validates**: US3, FR-010, FR-010a, FR-011, FR-012

### Steps

1. **Player C (elo < 1400) tries to register**
   ```
   POST /caro/tournaments/{id}/registrations
   Auth: Player C JWT (elo < 1400)
   → Expect 403
   ```

2. **Players D, E, F (elo >= 1400) register**
   ```
   POST /caro/tournaments/{id}/registrations   (Player D JWT) → 201
   POST /caro/tournaments/{id}/registrations   (Player E JWT) → 201
   POST /caro/tournaments/{id}/registrations   (Player F JWT) → 201
   ```

3. **Verify participant list updates**
   ```
   GET /caro/tournaments/{id}/participants   (no auth)
   → Expect 3 participants, each with tournamentPoints: 0, status: "idle"
   ```
   WebSocket: Connect to `tournament:{id}` room; each registration should emit `tournament:participant-updated`.

4. **Late registration (after tournament starts)**
   - Start tournament (see Scenario 4)
   - Player G (elo >= 1400, not yet registered) registers:
   ```
   POST /caro/tournaments/{id}/registrations   (Player G JWT)
   → Expect 201; Player G immediately in idle queue
   ```

---

## Scenario 4 — Automatic Start & Auto-Cancellation

**Validates**: US4, FR-013, FR-014, SC-003, SC-004

### Test A: Successful start (>= 5 registered)

1. Ensure 5+ players are registered (from Scenario 3, register players B, G too to reach 5+).
2. Wait until `startAt` arrives (or set `startAt` to 20 seconds from now in test).
3. Within 10 seconds of `startAt`:
   ```
   GET /caro/tournaments/{id}
   → Expect status: "in_progress"
   ```
   WebSocket: Receive `tournament:status-changed { newStatus: "in_progress" }`.
   WebSocket: Receive `tournament:match-created` events as idle players are paired.

### Test B: Auto-cancellation (< 5 registered)

1. Create a new tournament with `startAt` 30 seconds from now.
2. Register only 3 players.
3. Wait until `startAt` + 10 seconds:
   ```
   GET /caro/tournaments/{id}
   → Expect status: "cancelled"
   ```
   Verify: All 3 registered players receive a cancellation notification.

---

## Scenario 5 — Swiss Arena Matchmaking & Scoring

**Validates**: US5, US6, FR-016, FR-016a, FR-017, FR-018, FR-019, FR-020, SC-005, SC-008, SC-009

### Steps (within a running tournament)

1. **Confirm pairings happen within 5 seconds**
   - Tournament starts with 6 idle players (all at 0 points)
   - WebSocket: 3 `tournament:match-created` events should arrive within 5 seconds
   - Verify each `matchId` maps to a real `caro_matches` row with `tournament_id` set

2. **Verify score update after a match completes**
   - Player D wins their match
   - `GET /caro/tournaments/{id}/participants`
   - Player D should have `tournamentPoints: 2`, `winStreak: 1`
   - Player's opponent should have `tournamentPoints: 0`, `winStreak: 0`
   - Player D's elo should also change (same as a regular match) — verify via `GET /caro/player-profiles/{playerId}`

3. **Verify streak bonus**
   - Arrange Player D to win 3 consecutive matches (points: 2, 4, 6 — wait, 3rd win does NOT yet trigger bonus)
   - Actually: after 3 wins, winStreak = 3; 4th win gives 4 pts (verify `tournamentPoints = 6 + 4 = 10`)
   - After a draw following the 3-win streak: draw gives 2 pts (verify `tournamentPoints = 10 + 2 = 12`, `winStreak = 0`)

4. **Verify concurrent pairing safety**
   - Register 20 players simultaneously; let all complete a match at the same time
   - `GET /caro/tournaments/{id}/participants`
   - Every player should have `status: "idle"` with exactly one assigned match (no duplicates)

5. **Idle with no partner**
   - With an odd number of players, one will be idle with no partner
   - Verify that player remains in the participant list with `status: "idle"` (not an error state)
   - Once any other player's match completes, the idle player is paired within 5 seconds

---

## Scenario 6 — Tournament End

**Validates**: FR-015, SC-003

### Steps

1. Create a tournament with a short `endAt` (e.g., 2 minutes from start).
2. Start the tournament; let some matches run.
3. Wait until `endAt` + 10 seconds:
   ```
   GET /caro/tournaments/{id}
   → Expect status: "ended"
   ```
   WebSocket: Receive `tournament:status-changed { newStatus: "ended" }`.
4. Attempt to register a new player after `ended`:
   ```
   POST /caro/tournaments/{id}/registrations
   → Expect 422
   ```
5. Verify any matches that started before `endAt` continue to completion (check `GET /caro/matches/{matchId}` for those matches — they should reach a natural conclusion).

---

## Scenario 7 — Tournament Chat

**Validates**: US7, FR-024

### Steps

1. Player D (registered) sends a chat message:
   ```
   POST /caro/tournaments/{id}/chat
   Auth: Player D JWT
   Body: { "content": "Good luck everyone!" }
   → Expect 201
   ```
   WebSocket: All sockets in `tournament:{id}` room receive `tournament:chat-message`.

2. Player C (not registered) tries to send a chat message:
   ```
   POST /caro/tournaments/{id}/chat
   Auth: Player C JWT
   → Expect 403
   ```

3. Retrieve chat history:
   ```
   GET /caro/tournaments/{id}/chat
   Auth: Player D JWT
   → Expect array containing Player D's message
   ```

---

## Scenario 8 — Realtime Participant List

**Validates**: US7, FR-022, FR-023, SC-006, SC-007

### Steps

1. Two WebSocket clients connect and join `tournament:{id}` room.
2. A match completes and a score changes.
3. Both clients should receive `tournament:participant-updated` within 3 seconds.
4. A new player registers — both clients receive `tournament:participant-updated` for the new joiner.

---

## Success Indicators

| Scenario | Pass Condition |
|----------|---------------|
| S1 | Role request → approval → creation access; revoke → creation blocked; existing tournament unaffected |
| S2 | Tournament visible immediately after creation; accessible without auth |
| S3 | Low-elo player blocked; qualified players registered; late join enters idle queue |
| S4A | Status → `in_progress` within 10 s; matches created |
| S4B | Status → `cancelled` within 10 s; all registrants notified |
| S5 | Pairings within 5 s; correct points and streaks; elo updated; no duplicate pairings |
| S6 | Status → `ended` within 10 s; in-progress matches continue; new registrations blocked |
| S7 | Registered players can chat; non-registered blocked; message delivered via WebSocket |
| S8 | Score and registration updates reach all WebSocket subscribers within 3 s |
