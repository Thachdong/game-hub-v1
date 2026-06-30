# Feature Specification: Trust & Report

**Feature Branch**: `003-trust-report`

**Created**: 2026-06-30

**Status**: Draft

**Input**: User description: "hãy tạo spec cho tính năng trust và report bằng cách đọc BRD (business requirement document) sau 02-BRD(Business Requirement Document)/trust-report"

**Source**: [BRD-TRUST-REPORT-001 — Report user & Admin review](../../../../02-BRD(Bussiness%20Requirement%20Document)/trust-report/report-review.md), [BRD-TRUST-REPORT-002 — Điểm tin cậy (Trust Score)](../../../../02-BRD(Bussiness%20Requirement%20Document)/trust-report/trust-score.md)

## Clarifications

### Session 2026-06-30

- Q: When a user's game-participation lock triggers (score hits 0, or an existing lock is
  extended), should any game session already in progress for that user be force-interrupted? → A:
  No — the lock only blocks new participation (joining/starting new matches); a session already
  in progress when the lock triggers is allowed to finish naturally.
- Q: What counts as "logging in" for the +1/day recovery rule, given that authentication uses a
  short-lived access token plus a long-lived refresh token (a user may not redo the OAuth flow
  daily)? → A: Any day on which the user has at least one successfully authenticated request
  (including a silent refresh-token renewal) counts as that day's login — no separate explicit
  check-in action is required.
- Q: Should this feature impose a limit on how many reports a player can submit against the same
  target user (anti-spam)? → A: No business-layer limit in this feature; unlimited report
  submissions are allowed, consistent with the BRD not mentioning this constraint. Generic API
  rate limiting (if any) is an infrastructure-level concern applied uniformly across endpoints, not
  a business rule of this feature.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Player reports another user (Priority: P1)

A player who witnesses cheating or harassment from another player can submit a report against
that user, selecting a report type and providing supporting context/description as evidence.

**Why this priority**: This is the entry point of the whole feature — without the ability to
report, there is nothing for an admin to review and no signal to ever affect anyone's trust
score. It delivers value on its own (a durable record of misconduct) even before any review
happens.

**Independent Test**: Can be fully tested by having a player submit a report against another
user and verifying a report record is created with status "pending", capturing reporter,
reported user, report type, context, and timestamp.

**Acceptance Scenarios**:

1. **Given** player A wants to report player B, **When** A submits a report selecting a report
   type and providing context, **Then** the system creates a new report in "pending" status
   linked to A, B, and the selected report type.
2. **Given** a submitted report, **When** it is stored, **Then** the report retains reporter
   identity, reported user identity, report type, context/description, submission timestamp, and
   processing status for later admin review.

---

### User Story 2 - Platform Admin reviews a report and confirms its validity (Priority: P2)

A Platform Admin views the list of pending reports, reviews the evidence/context for one, and
marks it either "valid" or "invalid". Confirming a report as valid triggers the trust-score
deduction for the reported user; marking it invalid leaves the reported user's trust score
unaffected.

**Why this priority**: This is the moderation control point that turns a raw report into a
consequence. It is the second most critical capability because trust-score deductions must never
happen automatically from an unreviewed report.

**Independent Test**: Can be fully tested by taking a pending report, confirming it as valid, and
verifying the report transitions to "valid" status and a trust-score deduction is triggered for
the reported user; separately, marking a report "invalid" and verifying no deduction occurs.

**Acceptance Scenarios**:

1. **Given** a pending report, **When** the Platform Admin confirms it as valid, **Then** the
   report transitions to "valid" status and the system triggers a trust-score deduction for the
   reported user equal to the point value configured for that report type.
2. **Given** a pending report, **When** the Platform Admin marks it as invalid, **Then** the
   report transitions to "invalid" status and no trust-score change occurs for the reported user.
3. **Given** a report that has already been confirmed (valid or invalid), **When** anyone
   attempts to review it again, **Then** the system prevents a second decision on that report.

---

### User Story 3 - Platform Admin configures report types and point values (Priority: P3)

A Platform Admin maintains the list of report types (e.g., "cheating", "harassment") and the
trust-score points deducted for each type, without requiring a code change or redeploy.

**Why this priority**: Report types must exist before players can select them in User Story 1,
and the points configured here are what User Story 2 deducts — but the platform can launch with a
small seeded set of types, so this configurability is valuable yet not blocking for an initial
demo of the reporting flow.

**Independent Test**: Can be fully tested by having a Platform Admin create a new report type
with a point value, then confirming that value is the one applied when a report of that type is
later confirmed valid.

**Acceptance Scenarios**:

1. **Given** the Platform Admin wants a new report category, **When** they create a report type
   with a name and a deduction point value, **Then** the new type becomes available for players to
   select when submitting a report.
2. **Given** an existing report type, **When** the Platform Admin edits its point value or
   deletes/deactivates it, **Then** future reports reflect the updated value or the type is no
   longer selectable, while already-confirmed reports keep the point value that was applied at
   confirmation time.

---

### User Story 4 - Player receives trust-score threshold warnings (Priority: P4)

When a player's trust score drops below the 50, 20, or 10 point thresholds as a result of a
confirmed report, the player receives a warning notification about the milestone they crossed.

**Why this priority**: Warnings give the player a chance to course-correct before reaching a full
lockout, but the feature is still meaningfully complete (deduction + eventual lockout) without
them, so this ranks below the core report/review/deduct loop.

**Independent Test**: Can be fully tested by reducing a user's trust score across one of the
50/20/10 thresholds via a confirmed report and verifying exactly one warning notification is sent
for that threshold.

**Acceptance Scenarios**:

1. **Given** a user's trust score is 55, **When** a confirmed report deducts points and the score
   drops to 45 (crossing the 50 threshold), **Then** the system sends that user a "trust score
   threshold warning" notification referencing the 50 milestone.
2. **Given** a user's trust score is already below a given threshold, **When** a further confirmed
   report deducts points but the score does not cross any new threshold, **Then** no duplicate
   warning is sent for a threshold already crossed.

---

### User Story 5 - Automatic game-participation lockout and recovery (Priority: P5)

When a user's trust score reaches 0, the platform automatically locks that user out of game
participation for 7 days (account/profile access remains available) and notifies them. After the
7-day lock ends, the user's trust score is restored gradually: +1 point for each calendar day they
log in, capped at 100 and floored at 0.

**Why this priority**: This is the ultimate enforcement and recovery mechanism. It depends on the
deduction loop (User Stories 1-2) already working, and is the most complex piece of business
logic, so it is sequenced last while still being essential to the feature's purpose of automated
enforcement without manual admin intervention.

**Independent Test**: Can be fully tested by driving a user's trust score to 0 via confirmed
reports and verifying game participation is blocked platform-wide for 7 days while account access
remains available and a lockout notification is sent; separately, after the lock period, logging
in on consecutive new calendar days and verifying the trust score increases by 1 per day up to 100.

**Acceptance Scenarios**:

1. **Given** a confirmed report deduction brings a user's trust score to 0, **When** the deduction
   is applied, **Then** the system blocks that user from game participation for 7 days from that
   moment and sends a lockout notification, while account and account-page access remain normal.
2. **Given** a user is in the post-lock recovery period with a trust score of 3, **When** the user
   logs in on a new calendar day, **Then** their trust score increases to 4.
3. **Given** a user's trust score is already 100, **When** the user logs in on a new calendar day,
   **Then** the trust score remains at 100 (does not exceed the cap).
4. **Given** a user is currently locked out with 3 days remaining, **When** another report against
   that user is confirmed valid, **Then** the lockout is extended so that it now ends 7 days from
   the moment of this newest confirmation (the trust score remains at 0; recovery only starts once
   the user is no longer locked out).

---

### Edge Cases

- What happens when a player attempts to report themselves? The system should reject self-reports.
- What happens when the reported user account no longer exists at review time? The admin decision
  should still be recorded, but no trust-score effect can apply to a non-existent account.
- What happens when a single confirmed report's deduction causes the trust score to cross more
  than one threshold at once (e.g., 55 → 8, crossing 50, 20, and 10 in one step)? All crossed
  threshold warnings should be sent.
- What happens when a report type used by an already-submitted pending report is later
  deactivated by the Platform Admin? The pending report should still be reviewable using the point
  value that was configured at submission time.
- What happens when multiple reports against the same user are confirmed valid at nearly the same
  time? The final trust score must reflect every deduction with no lost updates, regardless of
  timing.
- How does the system handle a user logging in more than once on the same calendar day during
  recovery? Only one +1 recovery increment should apply per calendar day, not one per login.
- What happens to a game session already in progress when a lock triggers (or extends) mid-game?
  The session is allowed to finish naturally; only new participation is blocked.

## Requirements *(mandatory)*

### Functional Requirements

**Reporting**

- **FR-001**: System MUST allow a player to submit a report against another user, specifying a
  report type and a context/description.
- **FR-002**: System MUST persist each report with reporter identity, reported-user identity,
  report type, context/description, submission timestamp, and processing status ("pending",
  "valid", "invalid").
- **FR-003**: System MUST reject a report where the reporter and the reported user are the same
  person.

**Admin Review**

- **FR-004**: System MUST allow a Platform Admin to view the list of pending reports.
- **FR-005**: System MUST allow a Platform Admin to confirm a pending report as "valid" or
  "invalid".
- **FR-006**: System MUST prevent a report that has already been confirmed (valid or invalid) from
  being reviewed a second time.
- **FR-007**: When a report is confirmed "valid", system MUST trigger a trust-score deduction for
  the reported user equal to the point value configured for that report's type.
- **FR-008**: When a report is confirmed "invalid", system MUST NOT change the reported user's
  trust score.

**Report Type Configuration**

- **FR-009**: System MUST allow a Platform Admin to create, edit, and delete/deactivate report
  types, each with a name and a trust-score deduction point value, without requiring a code change
  or redeploy.
- **FR-010**: System MUST apply the deduction point value that was configured for a report's type
  at the time the report is confirmed valid, and that value MUST remain fixed for that report
  thereafter even if the report type's configured value later changes.

**Trust Score**

- **FR-011**: System MUST initialize a trust score of 100 for every new user account at the time
  the account is created.
- **FR-012**: System MUST update a user's trust score using an all-or-nothing operation that
  correctly applies the floor (0) and cap (100) even when multiple deductions or recoveries happen
  concurrently for the same user.
- **FR-013**: System MUST send the user a "trust score threshold warning" notification each time
  a confirmed report causes their trust score to drop below the 50, 20, or 10 threshold from at or
  above it — including re-triggering for a threshold the user had previously crossed, if their
  score had recovered back to or above that threshold before dropping below it again.
- **FR-014**: System MUST NOT send a duplicate threshold warning when a deduction does not cause
  the trust score to newly cross below a threshold (i.e., the score was already below that
  threshold before this deduction).
- **FR-015**: System MUST automatically block a user from starting or joining new game
  participation platform-wide for 7 days when their trust score reaches 0, while leaving account
  and account-page access unaffected. A game session already in progress at the moment the lock
  triggers is allowed to finish naturally and is not interrupted.
- **FR-016**: System MUST send the user a notification when their account is locked from game
  participation due to trust score reaching 0.
- **FR-017**: System MUST extend the game-participation lockout by 7 days, measured from the most
  recently confirmed valid report, each time an additional report against the same user is
  confirmed valid while the user is already locked out — so the lock does not expire until 7 days
  have passed since the last such confirmation.
- **FR-018**: After a user's 7-day lockout period ends, system MUST add +1 to that user's trust
  score for each calendar day on which the user has at least one successfully authenticated
  request (including a silent refresh-token renewal — no separate explicit check-in action is
  required), never exceeding 100 and never going below 0.
- **FR-019**: System MUST apply at most one +1 recovery increment per user per calendar day,
  regardless of how many authenticated requests the user makes that day.

### Key Entities

- **Report**: A single accusation filed by one user (reporter) against another (reported user).
  Carries a report type, free-text context/evidence, submission timestamp, and a processing
  status (pending / valid / invalid). Once confirmed, its status and the point value applied are
  final.
- **Report Type**: An admin-defined category of misconduct (e.g., "cheating") with an associated
  trust-score deduction point value and an active/inactive flag. Editable by the Platform Admin
  without a deployment.
- **Trust Score**: A numeric attribute of a user account, ranging 0-100, starting at 100. Decreases
  only via confirmed-valid reports; increases only via the post-lockout daily-login recovery rule.
- **Game-Participation Lock**: A time-bounded restriction (7 days from the moment the trust score
  reached 0, extended by another 7 days from each subsequent valid report confirmed while still
  locked) that blocks a user from participating in games platform-wide while leaving
  account-level access intact.
- **Trust Score Notification**: A message sent to a user when their score crosses a warning
  threshold (50/20/10) or when a game-participation lock is applied, owned by the notification
  domain.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A player can submit a report against another user, with type and context, in under
  1 minute. *(UX completion-time target — total human interaction time from deciding to report to
  clicking submit — not an API endpoint latency SLA. No server-response-time NFR is defined for
  this feature.)*
- **SC-002**: 100% of reports confirmed "valid" by a Platform Admin result in the reported user's
  trust score decreasing by exactly the configured point value for that report type, with no lost
  updates even when multiple reports for the same user are confirmed within the same short window.
- **SC-003**: 100% of users whose trust score newly drops below the 50, 20, or 10 thresholds
  receive exactly one warning notification for each such crossing, including re-crossings after a
  recovery above the threshold.
- **SC-004**: 100% of users whose trust score reaches 0 are blocked from game participation
  platform-wide for the full lockout period (7 days, extended by 7 more days for each additional
  valid report confirmed while still locked) while retaining account access, and receive a lockout
  notification.
- **SC-005**: 100% of locked-out users who log in on each calendar day after their 7-day lock ends
  see their trust score increase by 1 per day (up to 100) without any manual admin action.
- **SC-006**: A Platform Admin can introduce a new report type with its point value and have it
  immediately available to players, with zero code deployments required. *("Immediately available"
  means: the new type appears in `GET /report-types` synchronously after the admin's
  `POST /admin/report-types` call returns `201 Created`; no cache invalidation or propagation
  delay — the list is read directly from the DB at use time per ADR-TRUST-REPORT-001.)*

## Assumptions

- A report is assigned a single report type, chosen by the reporting player at submission time
  (not assigned later by the admin during review).
- "Calendar day" for the purposes of warning-threshold one-time triggering and daily-login trust
  score recovery is evaluated using the server's clock/timezone, not the individual user's local
  timezone.
- Game-participation lockout is enforced at the platform level (a single shared check usable by
  any game), not re-implemented independently inside each individual game.
- Players cannot see the processing status of reports they have submitted; this remains out of
  scope for this feature, consistent with the source BRD.
- There is no mechanism for a Platform Admin to manually adjust a user's trust score outside of
  the automated deduction/recovery rules described here.
- There is no mechanism to increase trust score for good behavior other than the post-lockout
  daily-login recovery.
- There is no business-layer limit on how many reports a player may submit, including repeated
  reports against the same target; abuse mitigation, if needed, is handled by generic
  infrastructure-level rate limiting outside this feature's scope.
- Admin-endpoint access depends on the `isPlatformAdmin: true` claim being present in the
  caller's **current access token**. A user granted or revoked platform-admin status must
  re-authenticate or renew their token for the change to take effect on admin endpoints — the
  server does not re-query admin role from the DB on each request (Constitution §III).
