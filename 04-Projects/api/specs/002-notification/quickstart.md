# Quickstart Validation Guide: In-App Notification

**Feature**: specs/002-notification  
**Date**: 2026-06-29

This guide describes how to validate the notification feature end-to-end once implementation
is complete. It does not contain implementation code — see `tasks.md` for implementation steps.

---

## Prerequisites

- Docker running (for the PostgreSQL database via `docker-compose up -d`)
- Two test accounts created via Google OAuth (players A and B)
- Valid JWT access tokens for both accounts
- A WebSocket client (e.g., `wscat`, the `socket.io-client` CLI, or Postman's WS support)

---

## Scenario 1 — Friend Invite Creates a Notification (US1, P1)

**Goal**: Verify that sending a friend request from A to B creates a notification in B's list.

**Steps**:
1. Authenticate as player A; note access token.
2. `POST /friends/request` body `{ "email": "<player B email>" }` with A's token.
   → Expect `201 Created`.
3. Authenticate as player B; note access token.
4. `GET /notifications` with B's token.
   → Expect `200 OK` with at least one item where `type = "friend-or-game-invite"` and
   `isRead = false`.
5. `GET /notifications` with A's token.
   → Expect `200 OK` with no item of type `"friend-or-game-invite"` (A's list is empty).

---

## Scenario 2 — Mark Notification as Read (US2, P2)

**Goal**: Verify that marking a notification as read changes its status and is idempotent.

**Steps**:
1. Complete Scenario 1. Note the notification `id` from step 4.
2. `PATCH /notifications/{id}/read` with B's token.
   → Expect `200 OK`; response body has `isRead = true`.
3. `GET /notifications` with B's token.
   → Expect the same notification now shows `isRead = true`.
4. `PATCH /notifications/{id}/read` again with B's token (idempotency).
   → Expect `200 OK` (no error).
5. `PATCH /notifications/{id}/read` with A's token (cross-player attempt).
   → Expect `403 Forbidden`.

---

## Scenario 3 — Real-Time Badge Count (US3, P3)

**Goal**: Verify that a connected client receives a push event when a new notification arrives.

**Steps**:
1. Open a WebSocket connection as player B:
   - Connect to `ws://localhost:3000/realtime` with handshake `{ auth: { token: "<B's token>" } }`.
   - Subscribe to all events and watch for `notification.unread-count` and `notification.new`.
2. As player A, send a second friend request to player B (or use any account that can emit a
   notification event for B).
3. Observe the WebSocket session for player B.
   → Expect a `notification.unread-count` event with `unreadCount ≥ 1` received within 2 seconds.
   → Expect a `notification.new` event carrying the new notification payload.
4. As player B (via REST), mark the notification as read (`PATCH /notifications/{id}/read`).
   → Expect another `notification.unread-count` event with the decremented count on B's socket.

---

## Scenario 4 — Auth & Boundary Guards

**Goal**: Verify that unauthenticated and cross-user access is rejected.

**Steps**:
1. `GET /notifications` with no token.
   → Expect `401 Unauthorized`.
2. `PATCH /notifications/{B's notification id}/read` with A's token.
   → Expect `403 Forbidden`.
3. `PATCH /notifications/{non-existent-id}/read` with B's token.
   → Expect `404 Not Found`.

---

## Scenario 5 — Unknown Notification Type Rejected

**Goal**: Verify the domain rejects events with unrecognized types.

**Note**: This cannot be triggered via HTTP (no public creation endpoint). It must be tested via
a unit test on the `CreateNotificationUseCase` or by emitting a malformed `EventEmitter2` event
in an integration test environment.

**Expected outcome**: `CreateNotificationUseCase` throws a domain error (e.g.,
`InvalidNotificationTypeError`) when the type is not one of the four valid values; no record is
persisted.

---

## Scenario 6 — Pagination

**Goal**: Verify cursor-based pagination works correctly.

**Steps**:
1. Create more than 20 notifications for player B (via multiple friend-request events or direct
   DB insert for testing).
2. `GET /notifications?limit=20` with B's token.
   → Expect 20 items and a non-null `nextCursor`.
3. `GET /notifications?limit=20&cursorCreatedAt={nextCursor.createdAt}&cursorId={nextCursor.id}`
   → Expect items older than the cursor, no overlap with the first page.
4. Continue until `nextCursor` is `null`.
   → Expect all notifications retrieved with no duplicates.

---

## Contracts Reference

- HTTP API shape: [contracts/http-api.md](contracts/http-api.md)
- Data model & DB schema: [data-model.md](data-model.md)
- Full feature spec: [spec.md](spec.md)
