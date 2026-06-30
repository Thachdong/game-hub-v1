# HTTP API Contract: Trust & Report

**Module**: `trust-report`
**Auth**: JWT Bearer token required on all endpoints (`JwtAuthGuard`). Admin endpoints
additionally require `PlatformAdminGuard` (promoted to `shared-auth` in this feature).
**Response envelope**: All endpoints use the existing global envelope —
`{ "statusCode": number, "data": <payload|null>, "message": string }` — applied by the existing
`ResponseInterceptor`; payload shapes below show the `data` field's contents only. Errors use
the existing `GlobalExceptionFilter` shape: `{ "statusCode": number, "data": null, "message":
string }`.

---

## Player Endpoints

### POST /reports

Submit a report against another user (User Story 1).

**Request body**:
```json
{
  "reportedUserId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "reportTypeId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "context": "Used an aim-assist tool during ranked match #4821."
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `reportedUserId` | UUID string | Yes | Must differ from the authenticated reporter (`401`→`400` `SELF_REPORT_NOT_ALLOWED`, FR-003) and must reference an existing account (`404` `ACCOUNT_NOT_FOUND`) |
| `reportTypeId` | UUID string | Yes | Must reference an active report type (`404` `REPORT_TYPE_NOT_FOUND` or `422` `REPORT_TYPE_INACTIVE`) |
| `context` | string, 1–2000 chars | Yes | Free-text description/evidence. The length constraint (1–2000 chars) is the **only** validation rule; no content-format or character-set restrictions apply. |

### Response `201 Created`
```json
{
  "id": "5e2c1a0e-2f1e-4d3b-9a8b-1c2d3e4f5a6b",
  "reportedUserId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "reportTypeId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "context": "Used an aim-assist tool during ranked match #4821.",
  "status": "pending",
  "submittedAt": "2026-06-30T10:00:00.000Z"
}
```
`reporterId` is intentionally omitted from the response (the caller already knows who they are);
it is still stored (FR-002).

---

### GET /report-types

List report types a player can select when submitting a report (supports User Story 1's UI).

**Query**: none. Always returns only `active = true` types.

### Response `200 OK`
```json
{
  "items": [
    { "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d", "name": "cheating" },
    { "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7", "name": "harassment" }
  ]
}
```
`deductionPoints` is intentionally NOT exposed to players — it is an admin/moderation detail, not
part of the reporting UX (the spec does not require players to see the point cost of a report
type, and surfacing it could invite gaming the threshold math).

**Empty list**: if no active report types exist, returns `{ "items": [] }` with `200 OK`. This
is an admin misconfiguration state — players cannot submit reports until at least one active type
exists.

---

### GET /trust-score/me

Self-view of the authenticated user's own trust score and lock status (supporting infrastructure
for the account page, which per FR-015 must remain accessible during a lock and would otherwise
have no way to render the lock state).

### Response `200 OK`
```json
{
  "score": 45,
  "locked": false,
  "lockedUntil": null
}
```
When locked: `"locked": true, "lockedUntil": "2026-07-07T10:00:00.000Z"`.

**Missing row**: Per FR-011, a `trust_scores` row is guaranteed for every authenticated user
(initialized at account creation via the `account-social.account-created` event). If somehow
absent (e.g., a lost initialization event), this endpoint returns
`{ "score": 100, "locked": false, "lockedUntil": null }` — the same initial state FR-011 would
have set — rather than a `404`, to avoid surfacing initialization failures to the account page.

**Timezone**: `score` recovery increments are bounded by **server-clock calendar day**, not the
user's local timezone (Spec §Assumptions).

---

## Platform Admin Endpoints

### GET /admin/reports

List reports for moderation (User Story 2).

**Query Parameters**:

| Parameter | Type | Required | Description |
|---|---|---|---|
| `status` | `"pending" \| "valid" \| "invalid"` | No | Default: `pending` |
| `limit` | integer 1–50 | No | Default 20, max 50 |
| `cursorSubmittedAt` | ISO 8601 datetime | No | Pagination cursor (paired with `cursorId`) |
| `cursorId` | UUID | No | Pagination cursor (paired with `cursorSubmittedAt`) |

Same cursor-coupling and ordering-guarantee rules as `002-notification`'s `GET /notifications`
(both-or-neither cursor params; ordered by `(submittedAt DESC, id DESC)`). Providing exactly one
of `cursorSubmittedAt` / `cursorId` without the other returns `400 Bad Request`.

### Response `200 OK`
```json
{
  "items": [
    {
      "id": "5e2c1a0e-2f1e-4d3b-9a8b-1c2d3e4f5a6b",
      "reporterId": "11111111-1111-1111-1111-111111111111",
      "reportedUserId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "reportTypeId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "context": "Used an aim-assist tool during ranked match #4821.",
      "status": "pending",
      "appliedPoints": null,
      "submittedAt": "2026-06-30T10:00:00.000Z",
      "resolvedAt": null,
      "resolvedBy": null
    }
  ],
  "nextCursor": { "submittedAt": "2026-06-30T09:00:00.000Z", "id": "..." }
}
```
Empty list: `{ "items": [], "nextCursor": null }`.

---

### PATCH /admin/reports/:id/confirm

Confirm a pending report as valid or invalid (User Story 2).

**Request body**:
```json
{ "decision": "valid" }
```
`decision` is `"valid"` or `"invalid"`.

**Errors**:
| Status | `message` code | Condition |
|---|---|---|
| `404` | `REPORT_NOT_FOUND` | No report with this ID |
| `409` | `REPORT_ALREADY_RESOLVED` | Report status is not `pending` (FR-006) |

**Notes**:
- **Concurrent access**: if two admins simultaneously confirm the same pending report, the second
  request observes `status ≠ pending` and receives `409 REPORT_ALREADY_RESOLVED` — identical to
  any sequential re-review attempt (FR-006).
- **`reportedUserTrustScore`**: present **only** when `decision = "valid"`; this object is absent
  from the `"invalid"` response body (see both response shapes below).
- **Score floor**: `reportedUserTrustScore.score` is always ≥ 0 — the deduction applies
  `GREATEST(0, score − deductionPoints)`, so the value never goes negative.

### Response `200 OK` (decision = "valid")
```json
{
  "id": "5e2c1a0e-2f1e-4d3b-9a8b-1c2d3e4f5a6b",
  "status": "valid",
  "appliedPoints": 20,
  "resolvedAt": "2026-06-30T11:00:00.000Z",
  "resolvedBy": "22222222-2222-2222-2222-222222222222",
  "reportedUserTrustScore": {
    "score": 45,
    "locked": false,
    "lockedUntil": null
  }
}
```
`reportedUserTrustScore` reflects the state *after* this deduction was applied (AC-2 of User
Story 2) — gives the admin immediate feedback without a second call.

### Response `200 OK` (decision = "invalid")
```json
{
  "id": "5e2c1a0e-2f1e-4d3b-9a8b-1c2d3e4f5a6b",
  "status": "invalid",
  "appliedPoints": null,
  "resolvedAt": "2026-06-30T11:00:00.000Z",
  "resolvedBy": "22222222-2222-2222-2222-222222222222"
}
```

---

### GET /admin/report-types

List all report types, including inactive ones (admin management view; User Story 3).

### Response `200 OK`
```json
{
  "items": [
    {
      "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "name": "cheating",
      "deductionPoints": 20,
      "active": true,
      "createdAt": "2026-06-26T00:00:00.000Z",
      "updatedAt": "2026-06-26T00:00:00.000Z"
    }
  ]
}
```

### POST /admin/report-types

**Request body**: `{ "name": "spam", "deductionPoints": 5 }`

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | Yes | Must be unique across all report types (active and inactive). `409 REPORT_TYPE_NAME_TAKEN` if already taken. |
| `deductionPoints` | integer | Yes | Range: **1–100** inclusive. `400 Bad Request` if out of range. |

**Response `201 Created`**: the created report type (same shape as list items above).
**Errors**: `409 REPORT_TYPE_NAME_TAKEN` if `name` is not unique.

### PATCH /admin/report-types/:id

**Request body** (all fields optional, at least one required):
`{ "name"?: string, "deductionPoints"?: number, "active"?: boolean }`

**Validation**:
- Empty body (no fields provided): `400 Bad Request`.
- `deductionPoints`, if provided: must be in the range **1–100** inclusive.
- `name`, if provided: must be unique across all types; `409 REPORT_TYPE_NAME_TAKEN` if taken by
  another type (active or inactive).

**Response `200 OK`**: the updated report type.
**Note**: Updating `deductionPoints` or `active` never changes `appliedPoints` on
already-confirmed reports (FR-010).

### DELETE /admin/report-types/:id

Soft-deletes (deactivates) the report type — equivalent to `PATCH { "active": false }`.
**Response `204 No Content`**.
**Idempotency**: calling `DELETE` on an already-inactive type returns `204 No Content` without
error — the `active` flag is already `false`, so the operation is a no-op.
**Errors**: `404 REPORT_TYPE_NOT_FOUND` (type ID does not exist at all).

---

## Non-Functional Notes

**No response-time SLA**: no latency or throughput requirements are defined for any endpoint in
this feature. Plan.md targets "well under 1s" for report submission and admin review as an
implementation goal; SC-001's "under 1 minute" is a UX completion-time target, not a server-side
latency SLA.

**Concurrency-safe writes**: `trust_scores` rows are written exclusively via single atomic
`UPDATE … RETURNING` statements (Constitution §IV, ADR-TRUST-REPORT-002). Under concurrent valid
report confirmations for the same user, each deduction is serialized at the DB level and no
updates are lost — satisfying SC-002 without application-layer locking.
