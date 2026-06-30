# Quickstart Validation Guide: Trust & Report

**Feature**: specs/003-trust-report
**Date**: 2026-06-30

This guide describes how to validate the trust-report feature end-to-end once implementation is
complete. It does not contain implementation code — see `tasks.md` for implementation steps.

---

## Prerequisites

- Docker running (for the PostgreSQL database via `docker-compose up -d`)
- Three test accounts created via Google OAuth: player A (reporter), player B (reported user),
  Platform Admin (`isPlatformAdmin: true` on the JWT)
- Valid JWT access tokens for all three accounts
- At least one seeded active report type (e.g., "cheating", 20 points) from the migration seed

---

## Scenario 1 — Submit a Report (US1, P1)

**Goal**: Verify a player can report another user and the record persists correctly.

**Steps**:
1. `GET /report-types` with A's token. → Expect `200 OK` with at least one active type; note its
   `id`.
2. `POST /reports` with A's token, body `{ "reportedUserId": "<B's account id>", "reportTypeId":
   "<noted id>", "context": "Used wallhacks in match #1" }`.
   → Expect `201 Created`, `status: "pending"`.
3. `POST /reports` with A's token, `reportedUserId` set to **A's own** account id.
   → Expect `400 Bad Request` (`SELF_REPORT_NOT_ALLOWED`).

---

## Scenario 2 — Admin Confirms a Report Valid → Trust Score Deducted (US2, P2)

**Goal**: Verify confirming a report valid deducts the configured points and is not reviewable
twice.

**Steps**:
1. Complete Scenario 1, step 2. Note the report `id`.
2. `GET /trust-score/me` with B's token. → Expect `score: 100` (fresh account, FR-011).
3. `GET /admin/reports?status=pending` with Admin's token. → Expect the report from step 1 in the
   list.
4. `PATCH /admin/reports/{id}/confirm` with Admin's token, body `{ "decision": "valid" }`.
   → Expect `200 OK`, `status: "valid"`, `appliedPoints` equal to the report type's configured
   points, and `reportedUserTrustScore.score = 100 - appliedPoints`.
5. `GET /trust-score/me` with B's token. → Expect the same decreased score.
6. Repeat step 4 on the same report `id`. → Expect `409 Conflict` (`REPORT_ALREADY_RESOLVED`,
   FR-006).

---

## Scenario 3 — Admin Confirms a Report Invalid → No Score Change (US2, P2)

**Steps**:
1. Submit a new report from A against B (as Scenario 1).
2. Note B's current `score` via `GET /trust-score/me`.
3. `PATCH /admin/reports/{id}/confirm` with Admin's token, body `{ "decision": "invalid" }`.
   → Expect `200 OK`, `status: "invalid"`, `appliedPoints: null`.
4. `GET /trust-score/me` with B's token. → Expect the score unchanged from step 2.

---

## Scenario 4 — Manage Report Types (US3, P3)

**Steps**:
1. `POST /admin/report-types` with Admin's token, body `{ "name": "spam", "deductionPoints": 5
   }`. → Expect `201 Created`.
2. `GET /report-types` with A's token. → Expect "spam" now present in the active list.
3. `DELETE /admin/report-types/{spam id}` with Admin's token. → Expect `204 No Content`.
4. `GET /report-types` with A's token. → Expect "spam" no longer present (deactivated, not
   deleted — `GET /admin/report-types` with Admin's token should still show it with `active:
   false`).
5. Submit and confirm-valid a report that used a type, then deactivate that type, then re-fetch
   the confirmed report via `GET /admin/reports?status=valid` → Expect `appliedPoints` unchanged
   from confirmation time (FR-010).

---

## Scenario 5 — Threshold Warnings (US4, P4)

**Goal**: Verify a notification fires when a confirmed deduction crosses 50/20/10, and does not
fire again for a deduction that doesn't cross a new threshold.

**Steps**:
1. Drive B's score to 55 via confirmed reports (repeat Scenario 2 with appropriately sized report
   types, or seed via direct test setup).
2. Confirm a report worth 10 points against B (55 → 45, crosses 50).
3. `GET /notifications` with B's token (notification module, `002-notification`). → Expect a new
   `type: "trust-score-alert"` item referencing the 50 milestone.
4. Confirm a second report worth 5 points against B (45 → 40, no threshold crossed).
   → Expect no new `trust-score-alert` notification for this step.
5. Confirm a report worth 25 points against B (40 → 15, crosses both 20 and 10 in one step).
   → Expect two new `trust-score-alert` notifications (one per threshold).

---

## Scenario 6 — Lockout, Extension, and Recovery (US5, P5)

**Goal**: Verify lockout triggers at 0, extends on further confirmed reports while locked, and
recovers via daily login after expiry.

**Steps**:
1. Drive B's score to exactly 0 via a confirmed report.
   → `GET /trust-score/me` with B's token: expect `locked: true`, `lockedUntil` ≈ now + 7 days.
   → Expect a `trust-score-alert` notification for the lockout (FR-016).
2. Confirm one more report against B while still locked (score floors at 0 again).
   → Expect `lockedUntil` to have moved to ≈ (this confirmation's time) + 7 days, not the original
   timestamp (FR-017).
3. (Test-environment only) Advance the lock to the past — either wait out 7 real days or adjust
   `game_locked_until` directly in a test DB fixture.
4. Make any authenticated request as B (e.g., `GET /trust-score/me`) on a new calendar day.
   → Expect `score` to increase by 1 (FR-018).
5. Make a second authenticated request as B later the same calendar day.
   → Expect `score` unchanged from step 4 (FR-019 — at most one +1 per day).
6. Repeat step 4 on a subsequent calendar day until `score` reaches 100.
   → Expect it to stop increasing once at 100 (AC-6).

---

## Contracts Reference

- HTTP API shape: [contracts/http-api.md](contracts/http-api.md)
- Domain events & exported services: [contracts/domain-events.md](contracts/domain-events.md)
- Data model & DB schema: [data-model.md](data-model.md)
- Full feature spec: [spec.md](spec.md)
