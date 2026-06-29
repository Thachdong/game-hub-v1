# API Contract Quality Checklist: In-App Notification

**Purpose**: Pre-PR author sanity check — validate that REST, WebSocket, and cross-module event
contract requirements are complete, clear, and consistent before implementation begins.
**Created**: 2026-06-29
**Feature**: [spec.md](../spec.md) | [contracts/http-api.md](../contracts/http-api.md) | [data-model.md](../data-model.md)
**Scope**: Includes cross-cutting changes (SharedAuthModule refactor, account-social event changes)

---

## REST API — GET /notifications

- [ ] CHK001 — Is the behavior fully defined when `cursorCreatedAt` is supplied without
  `cursorId` (or vice versa)? Is the error response (status + body shape) specified for
  mismatched cursor parameters? [Clarity, Gap — contracts/http-api.md]

- [ ] CHK002 — Is the error response for an out-of-range `limit` value (e.g., `limit=200`)
  documented? [Completeness, Gap — contracts/http-api.md]

- [ ] CHK003 — Is the `nextCursor` field type and nullability precisely specified? (e.g., is it
  `null` vs. absent vs. `{}` when there are no more pages?) [Clarity, contracts/http-api.md]

- [ ] CHK004 — Is the ordering guarantee documented when two notifications share the same
  `created_at` timestamp? The composite cursor `(created_at, id)` implies determinism — is that
  invariant stated in the contract? [Clarity, data-model.md — Pagination section]

- [ ] CHK005 — Is the `referenceId` field in list-item responses documented as explicitly
  `null` (not absent) when no reference exists? [Clarity, contracts/http-api.md — Response shape]

- [ ] CHK006 — Is the `type` field in list responses constrained to the four defined enum
  values, or could a client receive an unknown string? Is the guarantee documented?
  [Completeness, contracts/http-api.md + data-model.md — NotificationType]

- [ ] CHK007 — Are requirements defined for an empty list response? (Is `items: []` with
  `nextCursor: null` the documented shape, or is there a different empty-state contract?)
  [Clarity, Gap — contracts/http-api.md]

---

## REST API — PATCH /notifications/:id/read

- [ ] CHK008 — Is the error response defined for a non-UUID `:id` path parameter
  (e.g., `id = "not-a-uuid"`)? [Completeness, Gap — contracts/http-api.md]

- [ ] CHK009 — Is the response body shape for the idempotent case (notification already read)
  documented to be identical to the first-time case? Or is a different body/status expected?
  [Clarity, contracts/http-api.md — 200 OK]

- [ ] CHK010 — Is the response DTO for `PATCH .../read` specified to be identical to a list
  item DTO? Or are they different shapes? (spec.md and data-model.md both imply a single
  `Notification` shape, but two separate DTOs are listed.) [Consistency, data-model.md vs.
  contracts/http-api.md]

- [ ] CHK011 — Are requirements defined for what happens when the notification `id` exists but
  belongs to a soft-deleted or expired notification? (Current spec assumes notifications persist
  indefinitely — is this assumption documented explicitly in the contract?) [Assumption, Spec §Assumptions]

---

## WebSocket Contract Quality

- [ ] CHK012 — Is the connection rejection behavior fully specified for an invalid or expired
  JWT at handshake time? (e.g., error code, message, whether a `disconnect` event is fired?)
  [Completeness, Gap — contracts/http-api.md — Authentication handshake]

- [ ] CHK013 — Are requirements defined for what happens when a JWT access token expires
  *while the WebSocket connection is active*? (Is the connection dropped? Is the client notified
  with a specific event?) [Coverage, Gap]

- [ ] CHK014 — Is the `unreadCount` field type (integer, ≥0) and its minimum value (0, never
  negative) explicitly documented in the event payload schema? [Clarity, contracts/http-api.md —
  notification.unread-count]

- [ ] CHK015 — Are requirements defined for a user with *multiple concurrent connections*
  (multiple browser tabs)? Should `notification.unread-count` and `notification.new` be pushed
  to **all** active connections for that user or only the most recent one? [Coverage, Gap]

- [ ] CHK016 — Is the ordering guarantee for `notification.new` vs. `notification.unread-count`
  events documented? (e.g., must `notification.new` always arrive before or with
  `notification.unread-count` in the same push cycle?) [Clarity, Gap]

- [ ] CHK017 — Is the namespace (`/realtime`) documented as a stable, versioned contract? If
  the gateway path changes, is there a versioning strategy requirement? [Completeness, Gap —
  contracts/http-api.md — Gateway path]

- [ ] CHK018 — Are requirements defined for whether the `notification.new` event is optional
  or mandatory alongside `notification.unread-count`? The spec says "at minimum the unread count"
  (Assumptions) — is this optionality explicitly documented in the contract so clients know not
  to depend on `notification.new`? [Clarity, Spec §Assumptions vs. contracts/http-api.md]

---

## Cross-Module Event Contract (EventEmitter2)

- [ ] CHK019 — Is `referenceId` in the internal event payload documented as `string | undefined`
  vs. `string | null`? The contract uses `referenceId?` (TypeScript optional) but the DB schema
  uses `UUID | NULL`. Are these consistent, and is the distinction documented? [Consistency,
  contracts/http-api.md — Internal Domain Events vs. data-model.md — ORM Entity]

- [ ] CHK020 — Are requirements defined for what `NotificationModule` does when an incoming
  event has an empty or whitespace-only `content` field? (Spec FR-004 requires rejection — is
  the error handling behavior from the listener's perspective documented?) [Completeness,
  Spec §FR-004 + contracts/http-api.md — Internal Domain Events]

- [ ] CHK021 — Are requirements defined for what `NotificationModule` does when an incoming
  event has an unrecognized event name (not one of the four)? (Is it silently ignored, or
  logged as a warning?) [Coverage, Gap]

- [ ] CHK022 — Is the payload schema for each of the four consumed events documented with
  precise field types and required/optional status beyond `string`? (e.g., is `recipientId`
  validated as UUID format? Is `content` length-bounded?) [Clarity, contracts/http-api.md —
  Internal Domain Events]

- [ ] CHK023 — Is the fire-and-forget nature of EventEmitter2 emission explicitly documented
  as a requirement? (i.e., "if `NotificationModule` listener fails, the emitting use-case MUST
  NOT be affected".) The ADR states this but it is not in spec.md as a testable requirement.
  [Completeness, Gap — Spec §FR-012 area]

---

## Cross-Cutting Changes — SharedAuthModule

- [ ] CHK024 — Are backward-compatibility requirements documented for `AccountSocialModule`
  after `JwtStrategy` and `JwtAuthGuard` are moved to `SharedAuthModule`? (e.g., does any
  existing test or consumer of `AccountSocialModule` depend on these being exported from there?)
  [Completeness, Gap — research.md §6]

- [ ] CHK025 — Is there a requirement specifying which NestJS module registers `PassportModule`
  as global after the refactor? (Currently scoped inside `AccountSocialModule` — moving it has
  a ripple effect.) [Clarity, Gap — research.md §6]

---

## Cross-Cutting Changes — account-social Event Changes

- [ ] CHK026 — Is there a requirement that the *existing* `friend-request.resolved` event
  (`EVENT_NAME = 'friend-request.resolved'`) continues to be emitted unchanged after the new
  `notification.friend-or-game-invite` event is added? The research says "supplement or replace"
  — this ambiguity should be resolved in the contract. [Ambiguity, research.md §1]

- [ ] CHK027 — Are requirements defined for the *sender* vs. *receiver* distinction in the
  two new account-social notification events? (When a request is sent: receiver gets notify;
  when resolved: sender gets notify.) Is this stated as a verifiable requirement, not just an
  implementation note? [Clarity, research.md §1 — "Updated account-social emit map"]

- [ ] CHK028 — Is there a requirement specifying the `content` string value in the
  `notification.friend-or-game-invite` event emitted by `account-social`? Who is responsible
  for composing the human-readable message — `account-social` or `NotificationModule`?
  [Completeness, Gap — contracts/http-api.md vs. Spec §Assumptions]

- [ ] CHK029 — Are requirements defined for what `account-social` should do if the
  EventEmitter2 `emit` call raises an exception? (Spec says notification failure MUST NOT affect
  the core flow — but is this a requirement on `account-social` or on `NotificationModule`?)
  [Clarity, Spec §FR-012 + research.md §1]

---

## Notes

- Items marked `[Gap]` indicate requirements not yet documented anywhere in spec, plan, or
  contracts — they need either a spec update or an explicit "out-of-scope" decision.
- Items marked `[Ambiguity]` have conflicting or underspecified language across documents.
- Items marked `[Assumption]` are documented as assumptions but may need to become explicit
  requirements if they affect client behavior.
- Run `/speckit-clarify` to resolve any gaps before `/speckit-tasks`.
