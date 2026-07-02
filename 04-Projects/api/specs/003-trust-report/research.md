# Research: Trust & Report

**Feature**: `003-trust-report` | **Date**: 2026-06-30

All unknowns below were resolved from: the feature spec's Clarifications, the two source ADRs
(ADR-TRUST-REPORT-001, ADR-TRUST-REPORT-002), the project constitution, and the existing
codebase (`001-account-social`, `002-notification`). No items remain marked
`NEEDS CLARIFICATION`.

---

## 1. Module boundary and schema ownership

- **Decision**: A single new `trust-report` NestJS module owning a dedicated `trust_report`
  PostgreSQL schema with three tables: `report_types`, `reports`, `trust_scores`.
- **Rationale**: BRD-TRUST-REPORT-001 and -002 are two BRDs but one bounded context (reporting
  feeds directly into trust score; both folders live under the same `trust-report` BRD/ADR
  directory). Splitting into two NestJS modules would force a synchronous cross-module call on
  every confirmed-valid report — a single module avoids that without violating Modular Monolith
  (Principle II), since nothing outside this bounded context needs to reach into `reports` or
  `report_types` directly.
- **Alternatives considered**: Two separate modules (`report` and `trust-score`) communicating via
  domain events — rejected as needless indirection for an in-process, same-transaction operation
  (confirm report → deduct score) with no other consumer of the intermediate event today.

## 2. Admin-tunable report types

- **Decision**: `report_types` is a plain DB table with `name`, `deductionPoints`, `active`
  columns, read directly at request time, no cache.
- **Rationale**: Directly reaffirms the accepted **ADR-TRUST-REPORT-001** decision — this is the
  generalized pattern it set for any future admin-tunable config.
- **Alternatives considered**: None re-evaluated; the ADR already closed this question.

## 3. Concurrency-safe trust-score mutation

- **Decision**: Every change to `trust_scores.score` (deduction on confirmed report, +1 daily
  recovery) and to `trust_scores.game_locked_until` is a single `UPDATE … SET … WHERE …
  RETURNING` statement. The application layer never reads the current score, computes a new
  value, and writes it back in a separate statement.
- **Rationale**: Directly reaffirms the accepted **ADR-TRUST-REPORT-002** decision. `RETURNING`
  gives the use-case the post-update value in the same round trip, which is what threshold-warning
  and lockout logic needs (see §5 and §6).
- **Alternatives considered**: Optimistic locking with a version column and retry — rejected by
  the ADR as unnecessary complexity for simple bounded add/subtract operations.

## 4. Promoting `PlatformAdminGuard` into `shared-auth`

- **Decision**: Move `PlatformAdminGuard` from `account-social/interface/guards/` into
  `shared-auth/`, exported alongside `JwtAuthGuard`/`OptionalJwtGuard`.
- **Rationale**: `trust-report`'s admin endpoints (review reports, manage report types) need the
  same admin check account-social already uses. Importing a class from inside another module's
  `interface/` directory would reach into that module's internals; `002-notification` already
  established the precedent of promoting cross-cutting auth guards into `shared-auth` (it moved
  `JwtAuthGuard` and `OptionalJwtGuard` there for the same reason). `PlatformAdminGuard` is a pure,
  stateless `CanActivate` class with no constructor dependencies, so the move is a relocation, not
  a refactor.
- **Alternatives considered**: Duplicate a second `PlatformAdminGuard` inside `trust-report` —
  rejected: two copies of the same security check drift out of sync over time.

## 5. Threshold-crossing detection (50 / 20 / 10)

- **Decision**: No extra "already warned" flags are stored. Every deduction's `UPDATE …
  RETURNING` yields both the score *before* and *after* the statement (read via a `CTE` that
  captures the old value, or by passing the pre-read value alongside — see data-model.md). The
  use-case compares `oldScore` vs `newScore` and fires one `notification.trust-score-alert` event
  per threshold `t` in `{50, 20, 10}` where `oldScore >= t > newScore`.
- **Rationale**: This makes the spec's clarified behavior (FR-013: warnings re-trigger every time
  the score newly drops below a threshold, including after recovering back above it) fall out of
  a stateless comparison — no separate "has been warned" bookkeeping to keep in sync, and it
  naturally handles a single deduction crossing multiple thresholds at once (Edge Cases).
- **Alternatives considered**: Persisting a "lowest threshold already warned" flag per account —
  rejected because the clarified requirement explicitly wants re-triggering after recovery, which
  a monotonic "already warned" flag cannot express without itself being reset on recovery (which
  just reduces to the same before/after comparison, with extra state).

## 6. Lockout set/extend formula (FR-015, FR-017)

- **Decision**: In the same atomic statement that applies a deduction, if the resulting score is
  `0`, set `game_locked_until = now() + interval '7 days'` unconditionally (whether this is the
  first time the score hits 0 or a repeat hit while already locked). If the resulting score is
  `> 0`, `game_locked_until` is left untouched.
- **Rationale**: "Set to now+7d whenever a deduction lands the score at the floor" is exactly
  equivalent to both FR-015 (initial lock) and the clarified FR-017 (extend by 7 days from the
  *most recent* confirmation while already locked) — no branching logic needed to distinguish
  "first lock" from "extension."
- **Alternatives considered**: Tracking lock count / cumulative stacking (e.g., +7 days per extra
  report instead of resetting to now+7d) — rejected per the clarification answer, which specified
  the lock should end 7 days from the *latest* confirmation, not stack additively.

## 7. Game-participation enforcement scope

- **Decision**: `trust-report` exports a port (`isLocked(accountId): Promise<{ locked: boolean;
  until: Date | null }>`) for other modules to call before allowing a user to start or join a new
  game session. No existing module in this codebase currently implements game session
  start/join, so there is no consumer to wire up yet — the port is defined and ready for the
  first game module that needs it.
- **Rationale**: Constitution Principle II requires cross-module reads to go through an exported
  service, not direct repository access. Per the spec's clarification, the lock only blocks *new*
  participation; a session already in progress is unaffected, so this is a pre-action gate check,
  not a kill-switch needing real-time push to active sessions.
- **Alternatives considered**: Baking lock status into the JWT access token (like
  `isPlatformAdmin`) — rejected: the constitution reserves baked-in claims for slow-changing
  authorization roles where "no DB lookup under normal operation" matters; trust-score lock status
  is dynamic, business-critical state (an admin can confirm a report — and a player must be
  blocked — well before a 15–30 minute access token would naturally refresh), so it must be read
  fresh at the moment of the gated action, consistent with how admin-configurable values are read
  directly from DB (ADR-TRUST-REPORT-001).

## 8. Trust-score initialization on account creation (FR-011)

- **Decision**: `account-social`'s OAuth login use-case emits a new
  `account-social.account-created` domain event (payload: `{ accountId }`) the first time an
  account is created (not on repeat logins). `trust-report` subscribes and inserts a
  `trust_scores` row with `score = 100`, `game_locked_until = null`.
- **Rationale**: Matches the existing precedent from `002-notification`, where account-social was
  modified to add new outgoing events for a new consuming module (e.g., `friend-request.resolved`).
  Event-driven keeps account-social decoupled from trust-report's existence.
- **Alternatives considered**: Lazy initialization (`INSERT … ON CONFLICT DO NOTHING` the first
  time any trust-report operation touches that account) — rejected: it would silently default a
  user who has never triggered any trust-report write to "score 100" only implicitly, making
  FR-011's "at the time the account is created" guarantee unverifiable by a direct query
  immediately after signup, and risks divergent behavior if a report is filed against a user who
  has a `trust_scores` row missing for unrelated reasons.

## 9. "Logging in" for daily recovery (FR-018, FR-019)

- **Decision**: `shared-auth`'s `JwtAuthGuard` emits a lightweight `auth.request-authenticated`
  event (payload: `{ accountId, occurredAt }`) on every successful token validation (including
  silent refresh-token-issued access tokens — any authenticated request). `trust-report`
  subscribes and applies a single atomic statement: `UPDATE trust_scores SET score =
  LEAST(100, score + 1), last_recovery_date = CURRENT_DATE WHERE account_id = $1 AND
  game_locked_until IS NOT NULL AND game_locked_until <= now() AND (last_recovery_date IS NULL OR
  last_recovery_date < CURRENT_DATE)`. Concurrent requests on the same day after the first one
  match zero rows (cheap no-op).
- **Rationale**: Directly implements the clarified answer (any authenticated activity that day
  counts, no separate check-in action). Doing this as an event keeps the recovery logic entirely
  inside `trust-report` rather than spreading "is this user in recovery" logic into `shared-auth`.
  The `WHERE` clause's date guard is what makes "at most one +1 per calendar day" (FR-019) correct
  under concurrent requests without extra locking.
- **Alternatives considered**: A scheduled nightly cron job that grants +1 to everyone who was
  active "yesterday" — rejected: adds a new infrastructure concept (job scheduler) for a rule the
  constitution already gives a simpler pattern for (event + atomic statement), and a cron job
  introduces a day's latency between "user becomes eligible" and "score updates."

## 10. Report-type deletion semantics

- **Decision**: The "delete" report-type admin action is implemented as setting `active = false`
  (soft delete), never a row deletion.
- **Rationale**: Reports already confirmed valid keep the point value that was applied at
  confirmation time (FR-010) by storing it on the `reports` row itself (see data-model.md), so a
  deactivated type cannot retroactively corrupt history — but a hard delete would still break any
  pending report still referencing that type by ID. ADR-TRUST-REPORT-001 explicitly calls for an
  active/inactive flag for this reason.
- **Alternatives considered**: Hard delete with `ON DELETE SET NULL` on the report's
  `reportTypeId` — rejected: loses the audit trail of which type a historical report belonged to.

## 11. Self-report rejection (FR-003)

- **Decision**: Checked in the application layer by comparing the JWT `sub` (reporter) against
  the `reportedUserId` in the request body — no DB round trip needed.
- **Rationale**: It's a pure equality check; adding a repository call would be unnecessary I/O.
- **Alternatives considered**: DB constraint (`CHECK (reporter_id != reported_user_id)`) —
  retained as a defense-in-depth constraint in the migration in addition to the application check,
  not instead of it (the application check produces the FR-003-required clean error response;
  the DB constraint is a safety net against any future write path that bypasses the use-case).

## 12. Abuse/spam rate limiting on report submission

- **Decision**: No business-layer limit on report volume per player or per reporter→target pair.
- **Rationale**: Directly reaffirms the spec's clarified Assumption — out of scope for this
  feature; any future need is an infrastructure-level (generic API rate limiting) concern.
- **Alternatives considered**: Per-pair "one pending report at a time" constraint — considered and
  rejected per the clarification answer.
