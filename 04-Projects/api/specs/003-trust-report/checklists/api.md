# API Contract Quality Checklist: Trust & Report

**Purpose**: Validate the completeness, clarity, consistency, and measurability of API contract
requirements for all 9 endpoints in the trust-report feature before implementation begins.
**Created**: 2026-06-30
**Resolved**: 2026-06-30
**Feature**: [spec.md](../spec.md) | [contracts/http-api.md](../contracts/http-api.md) | [contracts/domain-events.md](../contracts/domain-events.md)
**Audience**: PR Reviewer
**Depth**: Standard

---

## Requirement Completeness

- [x] CHK001 — Are error response requirements defined for all identified failure modes of `POST
  /reports` (SELF_REPORT_NOT_ALLOWED, ACCOUNT_NOT_FOUND, REPORT_TYPE_NOT_FOUND, and an inactive
  but existing report type)? [Completeness, Spec §FR-001–003, contracts/http-api.md §POST /reports]
  > ✅ Already covered: http-api.md field-constraints table lists `400 SELF_REPORT_NOT_ALLOWED`,
  > `404 ACCOUNT_NOT_FOUND`, `404 REPORT_TYPE_NOT_FOUND`, and `422 REPORT_TYPE_INACTIVE`.

- [x] CHK002 — Are request-body field-level validation requirements (field types, length, and format
  constraints) fully specified for every write endpoint (`POST /reports`, `POST /admin/report-types`,
  `PATCH /admin/report-types/:id`, `PATCH /admin/reports/:id/confirm`)? [Completeness,
  contracts/http-api.md]
  > 🔧 Fixed: added field-constraint tables to `POST /admin/report-types` (`name` unique,
  > `deductionPoints` 1–100 required) and validation block to `PATCH /admin/report-types/:id`
  > (empty body → 400, range 1–100, name uniqueness). `POST /reports` and `PATCH confirm` were
  > already fully specified.

- [x] CHK003 — Are pagination requirements for `GET /admin/reports` fully documented — including
  the cursor-coupling rule (both-or-neither), the ordering guarantee (`submittedAt DESC, id DESC`),
  the default page size (20), and the maximum limit (50)? [Completeness, contracts/http-api.md
  §GET /admin/reports]
  > ✅ Already covered: all four elements were present in the query-parameters table and cursor
  > description.

- [x] CHK004 — Are authentication requirements (`JwtAuthGuard`, `PlatformAdminGuard`) explicitly
  stated for every endpoint, including the two player-facing read endpoints (`GET /report-types`,
  `GET /trust-score/me`)? [Completeness, Spec §III, contracts/http-api.md §Auth header]
  > ✅ Already covered: contract header states "JWT Bearer token required on all endpoints
  > (`JwtAuthGuard`)" and admin endpoints additionally require `PlatformAdminGuard`.

---

## Requirement Clarity

- [x] CHK005 — Is the distinction between a missing report type (`404 REPORT_TYPE_NOT_FOUND`) and
  an existing-but-inactive report type unambiguously specified with different HTTP status codes and
  error codes? [Clarity, contracts/http-api.md §POST /reports field constraints]
  > ✅ Already covered: field-constraints table uses `404 REPORT_TYPE_NOT_FOUND` vs
  > `422 REPORT_TYPE_INACTIVE`.

- [x] CHK006 — Is the `context` field length constraint (1–2000 characters) the sole validation
  rule for that field, or are additional format or content constraints (e.g., character encoding,
  prohibited characters) expected but not yet documented? [Clarity, contracts/http-api.md §POST
  /reports]
  > 🔧 Fixed: added "The length constraint (1–2000 chars) is the **only** validation rule; no
  > content-format or character-set restrictions apply." to the `context` row.

- [x] CHK007 — Is the `deductionPoints` input range (1–100) explicitly specified as a validation
  constraint in the API contract for `POST /admin/report-types` and `PATCH /admin/report-types/:id`
  — not just implied by the DB CHECK constraint? [Clarity, data-model.md §ReportTypeOrmEntity,
  contracts/http-api.md §POST /admin/report-types]
  > 🔧 Fixed: field tables for both `POST` and `PATCH /admin/report-types` now explicitly state
  > "Range: **1–100** inclusive. `400 Bad Request` if out of range."

- [x] CHK008 — Is the cursor "both-or-neither" coupling rule for `GET /admin/reports` documented
  clearly enough to specify (a) the HTTP status code returned when only one cursor param is
  provided, and (b) the error code or message for that validation failure? [Clarity,
  contracts/http-api.md §GET /admin/reports]
  > 🔧 Fixed: added "Providing exactly one of `cursorSubmittedAt` / `cursorId` without the other
  > returns `400 Bad Request`." to the cursor description.

- [x] CHK009 — Is the `reportedUserTrustScore` field in the `PATCH /admin/reports/:id/confirm`
  valid-decision response explicitly described as reflecting the post-deduction state, with its
  full shape (`score`, `locked`, `lockedUntil`) and the condition under which it is absent (invalid
  decision) clearly stated? [Clarity, contracts/http-api.md §PATCH confirm, Spec §US2 AC-2]
  > 🔧 Fixed: added Notes block before the response shapes: "`reportedUserTrustScore`: present
  > **only** when `decision = "valid"`; absent from the `"invalid"` response body." Shape was
  > already defined in the valid response example.

---

## Requirement Consistency

- [x] CHK010 — Is the response envelope (`{ statusCode, data, message }`) consistently referenced
  across all 9 endpoint response shapes, and is the error envelope (`{ statusCode, data: null,
  message }`) consistent with the format used in existing modules (`001-account-social`,
  `002-notification`)? [Consistency, contracts/http-api.md §Response envelope]
  > ✅ Already covered: contract header explicitly states the shared `ResponseInterceptor` envelope
  > and `GlobalExceptionFilter` error shape; all response examples show the `data` field only.

- [x] CHK011 — Does the `DELETE /admin/report-types/:id` behavior (soft-delete = sets `active:
  false`) align without contradiction with FR-009's "delete/deactivate" language and with the
  `PATCH /admin/report-types/:id { "active": false }` equivalence stated in the contract?
  [Consistency, Spec §FR-009, contracts/http-api.md §DELETE /admin/report-types]
  > ✅ Already covered: contract explicitly states "equivalent to `PATCH { 'active': false }`",
  > and FR-009 uses "delete/deactivate" to acknowledge both are the same action.

- [x] CHK012 — Is the `nextCursor` shape (`{ submittedAt, id }`) in `GET /admin/reports`
  consistent in structure and semantics with the cursor shape established by `002-notification`'s
  `GET /notifications` endpoint? [Consistency, contracts/http-api.md §GET /admin/reports,
  Spec §Assumptions]
  > ✅ Already covered: contract explicitly calls out "Same cursor-coupling and ordering-guarantee
  > rules as `002-notification`'s `GET /notifications`."

- [x] CHK013 — Are the authentication requirements for admin endpoints (requiring both
  `JwtAuthGuard` and `PlatformAdminGuard`) consistently stated throughout the contract, aligned
  with the plan to promote `PlatformAdminGuard` into `shared-auth`? [Consistency,
  contracts/domain-events.md §Required Changes, contracts/http-api.md §Auth]
  > ✅ Already covered: contract header states the combined guard requirement; domain-events.md
  > §Required Changes explains the `PlatformAdminGuard` promotion into `shared-auth`.

- [x] CHK014 — Is the default `status=pending` filter for `GET /admin/reports` consistent with
  the User Story 2 workflow (admin wants to see pending reports first), and does it avoid hiding
  the already-reviewed queue without an explicit filter? [Consistency, Spec §US2,
  contracts/http-api.md §GET /admin/reports]
  > ✅ Already covered: default is `pending` (consistent with US2); admins can pass
  > `status=valid` or `status=invalid` to access reviewed reports.

---

## Acceptance Criteria Quality

- [x] CHK015 — Does SC-002 ("100% of valid confirmations result in a score decrease by exactly
  the configured point value") map precisely to the `appliedPoints` field frozen on the report
  at confirmation time (FR-010), making it objectively verifiable without ambiguity about which
  value is "configured"? [Acceptance Criteria, Spec §SC-002, §FR-010]
  > ✅ Already covered: FR-010 explicitly states the value is snapshotted from the report type at
  > confirmation time and frozen. SC-002 "configured point value" refers to that snapshot.
  > `appliedPoints` in the confirm response makes verification trivial.

- [x] CHK016 — Is SC-006 ("immediately available to players, zero code deployments") specified
  precisely enough to test — i.e., is "immediately" defined as synchronous availability from the
  moment the admin's `POST /admin/report-types` call returns `201 Created`? [Measurability, Spec
  §SC-006]
  > 🔧 Fixed: SC-006 in spec.md now reads: "('Immediately available' means: the new type appears
  > in `GET /report-types` synchronously after the admin's `POST /admin/report-types` call returns
  > `201 Created`; no cache invalidation or propagation delay — read directly from DB per
  > ADR-TRUST-REPORT-001.)"

- [x] CHK017 — Is SC-001 ("player can submit a report in under 1 minute") a UX outcome (human
  time from decision to submit) or an API latency SLA — and if it implies a performance NFR for
  the `POST /reports` endpoint, is that NFR explicitly stated? [Measurability, Spec §SC-001, Gap]
  > 🔧 Fixed: SC-001 in spec.md now includes "(UX completion-time target — total human interaction
  > time from deciding to report to clicking submit — not an API endpoint latency SLA. No
  > server-response-time NFR is defined for this feature.)" Also added to http-api.md §NFR Notes.

---

## Scenario Coverage

- [x] CHK018 — Are requirements defined for submitting a report where `reportedUserId` does not
  correspond to any existing account, including the HTTP status code and error code the API
  returns? [Coverage, Spec §FR-001, contracts/http-api.md §ACCOUNT_NOT_FOUND]
  > ✅ Already covered: `POST /reports` field-constraints table: `reportedUserId` "Must reference
  > an existing account (`404` `ACCOUNT_NOT_FOUND`)."

- [x] CHK019 — Is the behavior of `PATCH /admin/report-types/:id` when called with an empty body
  (no fields provided) explicitly specified — either as a validation error or as a no-op with
  `200 OK`? [Coverage, contracts/http-api.md §PATCH /admin/report-types, Gap]
  > 🔧 Fixed: added Validation block to `PATCH /admin/report-types/:id`: "Empty body (no fields
  > provided): `400 Bad Request`." (The existing "at least one required" phrasing in the request
  > body description was clarified into an enforced error response.)

- [x] CHK020 — Is the behavior specified when `DELETE /admin/report-types/:id` is called on a
  type that is already inactive — is it idempotent (`204 No Content`) or does it return an
  error? [Coverage, contracts/http-api.md §DELETE /admin/report-types, Gap]
  > 🔧 Fixed: added "**Idempotency**: calling `DELETE` on an already-inactive type returns
  > `204 No Content` without error." `404` is reserved for non-existent IDs only.

- [x] CHK021 — Is the `GET /trust-score/me` response specified for the edge case where a
  `trust_scores` row does not yet exist for the authenticated user (e.g., if the
  account-created event was lost or delayed)? [Coverage, Spec §FR-011, Edge Case]
  > 🔧 Fixed: added "**Missing row**" note: if row is absent, returns `{ score: 100, locked:
  > false, lockedUntil: null }` (the FR-011 initial state) rather than 404, to avoid surfacing
  > initialization failures to the account page.

- [x] CHK022 — Are requirements defined for `GET /admin/reports` when no matching records exist
  for the requested `status` filter, and does the spec explicitly state the empty-list response
  shape (`{ items: [], nextCursor: null }`)? [Coverage, contracts/http-api.md §empty list]
  > ✅ Already covered: contract explicitly shows `{ "items": [], "nextCursor": null }` for the
  > empty case.

---

## Edge Case Coverage

- [x] CHK023 — Are concurrent-call requirements for `PATCH /admin/reports/:id/confirm` specified:
  if two admins simultaneously submit decisions on the same pending report, what does the
  second request receive (race condition; `409 REPORT_ALREADY_RESOLVED` or something else)?
  [Edge Case, Spec §FR-006, Gap]
  > 🔧 Fixed: added "**Concurrent access**" note: the second request sees `status ≠ pending` and
  > receives `409 REPORT_ALREADY_RESOLVED` — identical to any sequential re-review (FR-006).
  > The atomic UPDATE-then-status-check pattern makes this deterministic.

- [x] CHK024 — Is the API-level response to a deduction that floors the trust score at 0 clearly
  specified: does `reportedUserTrustScore.score` always show `0` (not negative), consistent with
  the `GREATEST(0, score - X)` atomic SQL floor? [Edge Case, Spec §FR-012, data-model.md §atomic
  SQL]
  > 🔧 Fixed: added "**Score floor**" note to PATCH confirm: "`reportedUserTrustScore.score` is
  > always ≥ 0 — the deduction applies `GREATEST(0, score − deductionPoints)`."

- [x] CHK025 — Are requirements specified for what `GET /report-types` returns when no active
  report types exist (empty list), and is this acceptable to the reporting flow (player would be
  unable to submit)? [Edge Case, Spec §FR-009, Gap]
  > 🔧 Fixed: added "**Empty list**" note: returns `{ "items": [] }` with `200 OK`; noted this is
  > an admin misconfiguration state and players cannot submit until at least one active type exists.

- [x] CHK026 — Is the behavior defined when exactly one of the paired cursor parameters
  (`cursorSubmittedAt`, `cursorId`) is provided to `GET /admin/reports` without the other, and
  is the expected error response specified? [Edge Case, contracts/http-api.md §cursor coupling]
  > 🔧 Fixed (same edit as CHK008): "Providing exactly one of `cursorSubmittedAt` / `cursorId`
  > without the other returns `400 Bad Request`."

---

## Non-Functional Requirements

- [x] CHK027 — Are OpenAPI documentation requirements (per Constitution §VI: `@ApiOperation`,
  `@ApiResponse`, `@ApiProperty` on all DTOs) explicitly referenced for all 9 endpoints, and is
  the commitment to regenerate and commit `openapi.yml` as part of this PR stated in the plan?
  [Gap, Constitution §VI, plan.md]
  > ✅ Already covered in plan.md Constitution Check §VI: "All controllers … get
  > `@ApiOperation`/`@ApiResponse`/DTO `@ApiProperty` decorators; `openapi.yml` regenerated as
  > part of this feature's PR."

- [x] CHK028 — Are latency or throughput requirements specified for high-concurrency scenarios
  (e.g., multiple simultaneous `PATCH /admin/reports/:id/confirm` calls for the same user), given
  that SC-002 requires zero lost updates? [Gap, Spec §SC-002, Constitution §IV]
  > 🔧 Fixed: added §Non-Functional Notes to http-api.md explicitly stating no response-time SLA
  > exists, and that SC-002's correctness guarantee is satisfied by the atomic
  > `UPDATE … RETURNING` DB statement (Constitution §IV), not by application-layer locking.

- [x] CHK029 — Is the non-functional impact of emitting `auth.request-authenticated` on every
  successful JWT validation (adding an async EventEmitter2 call to every authenticated request)
  addressed in the requirements — is "non-blocking / fire-and-forget" explicitly stated?
  [Gap, contracts/domain-events.md §auth.request-authenticated, research.md §9]
  > 🔧 Fixed: added "**The emit MUST be fire-and-forget (no `await`)**" to domain-events.md
  > §Required Changes item 2, and a "Non-blocking" note to data-model.md §auth.request-authenticated
  > event contract.

---

## Dependencies & Assumptions

- [x] CHK030 — Is the dependency on `AccountExistenceService` (from `account-social`) for `POST
  /reports` documented in the API contract at the error-response level, so the implementor knows
  exactly which HTTP status code and error code to return when `reportedUserId` is valid UUID
  format but the account does not exist? [Dependency, contracts/domain-events.md
  §IAccountExistencePort]
  > ✅ Already covered: http-api.md `POST /reports` field constraints table: `reportedUserId`
  > "Must … reference an existing account (`404` `ACCOUNT_NOT_FOUND`)." The port implementation
  > is documented in domain-events.md §IAccountExistencePort.

- [x] CHK031 — Is the assumption that `isPlatformAdmin` is a baked-in JWT claim (not re-checked
  against the DB on each admin request) explicitly stated, and is the implication — that a newly
  promoted admin must refresh their token before accessing admin endpoints — documented?
  [Assumption, Spec §Assumptions, Constitution §III]
  > 🔧 Fixed: added new assumption to spec.md §Assumptions: "A user granted or revoked
  > platform-admin status must re-authenticate or renew their token for the change to take effect
  > on admin endpoints — the server does not re-query admin role from the DB on each request
  > (Constitution §III)."

- [x] CHK032 — Is the "calendar day evaluated on the server clock/timezone" assumption (Spec
  §Assumptions) explicitly carried into the `GET /trust-score/me` response contract, so that
  implementors know the recovery increment observable via that endpoint is server-timezone-bounded?
  [Assumption, Spec §Assumptions, contracts/http-api.md §GET /trust-score/me]
  > 🔧 Fixed: added "**Timezone**" note to `GET /trust-score/me`: "`score` recovery increments
  > are bounded by **server-clock calendar day**, not the user's local timezone (Spec §Assumptions)."

- [x] CHK033 — Is the dependency on the existing `notification.trust-score-alert` event contract
  (established by `002-notification`) documented with the precise payload shape and an explicit
  statement that no notification-module changes are required for this feature? [Dependency,
  contracts/domain-events.md §Events Emitted]
  > ✅ Already covered: domain-events.md §Events Emitted table lists the full payload
  > `{ recipientId, content, referenceId? }` and explicitly marks "existing contract, no change."

---

## Notes

- Check items off as completed: `[x]`
- Items marked `[Gap]` that were fixed: CHK002, CHK006, CHK007, CHK008, CHK009, CHK016, CHK017,
  CHK019, CHK020, CHK021, CHK023, CHK024, CHK025, CHK026, CHK028, CHK029, CHK031, CHK032
- Items confirmed already covered: CHK001, CHK003, CHK004, CHK005, CHK010, CHK011, CHK012,
  CHK013, CHK014, CHK015, CHK018, CHK022, CHK027, CHK030, CHK033
- All gaps resolved by targeted edits to `contracts/http-api.md`, `contracts/domain-events.md`,
  `data-model.md`, and `spec.md` — no requirement was left open.
