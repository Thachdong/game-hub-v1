# API Requirements Quality Checklist: Game Admin Config (Caro)

**Purpose**: Full-coverage requirements quality review (author self-review, pre-PR) — validates that
spec requirements are complete, clear, consistent, measurable, and constitution-compliant. This is a
"unit test for English": it checks what is *written* (or missing) in the spec, not whether an
implementation works.
**Created**: 2026-06-30
**Feature**: [spec.md](../spec.md)
**Focus**: All dimensions — CRUD, lifecycle, security, error handling, integration, NFR, constitution
**Depth**: Author self-review (pre-PR)
**Constitution**: Game Hub API Constitution v1.0.0

---

## Requirement Completeness

- [ ] CHK001 - Are success response body requirements defined for each write operation (create, update,
  deactivate, reactivate) — is it specified what data the system returns on a successful operation?
  [Completeness, Gap]

- [ ] CHK002 - Are filtering and querying parameters documented for the Game Admin management view
  (FR-008) — e.g., can admins filter by active/inactive state, sort, or paginate results?
  [Completeness, Gap, Spec §FR-008]

- [ ] CHK003 - Is the identifier used for "the identity of the Game Admin" in FR-010 explicitly
  defined — user ID, email, or username? [Completeness, Gap, Spec §FR-010]

- [ ] CHK004 - Is a consumable definition of "ongoing game" or "active game" present or referenced —
  FR-002 and FR-003 make claims about in-progress games without defining what makes a game
  "in progress" within the scope of this feature? [Completeness, Gap, Spec §FR-002, FR-003]

- [ ] CHK005 - Is the duplicate-check scope for update operations explicitly stated — does FR-009
  (conflict on duplicate pair) apply only to create, or also to update operations that result in a
  (boardSize, moveTime) pair already held by another active configuration? [Completeness, Gap, Spec §FR-009]

- [ ] CHK006 - Does FR-007 ("create, update, delete") explicitly include reactivation (FR-011) as a
  protected action requiring the Game Admin role, or is reactivation implicitly unprotected?
  [Completeness, Spec §FR-007, FR-011]

---

## Requirement Clarity

- [ ] CHK007 - Is "immediately visible to players" in FR-004 and FR-011 quantified — is synchronous,
  real-time visibility required, or is an eventual-consistency window acceptable?
  [Clarity, Spec §FR-004, FR-011]

- [ ] CHK008 - Are error response formats consistent for FR-005 (invalid enum value), FR-009
  (duplicate conflict), and FR-007 (unauthorized) — do all share a single error structure, or are
  they independently specified? [Clarity, Gap]

- [ ] CHK009 - Is "management view" in FR-008 distinguished clearly from the player list (FR-004) —
  is it a separate endpoint, the same endpoint with a query parameter, or a different response
  shape? [Clarity, Spec §FR-008]

- [ ] CHK010 - Is "deactivated" the single canonical term used for the soft-delete state across all
  FRs, SCs, and User Stories — is there any inconsistent use of "deleted", "inactive", or
  "removed" that could cause ambiguity? [Clarity, Terminology, Spec §FR-003]

- [ ] CHK011 - Is "any game already in progress" in FR-002 and FR-003 scoped explicitly — does it
  include games in a waiting/lobby state, or only games where at least one move has been played?
  [Clarity, Gap, Spec §FR-002, FR-003]

- [ ] CHK012 - Is SC-001 ("in a single interaction without additional guidance or retries")
  objectively testable — is "single interaction" defined (e.g., one API call on a well-formed
  request), or is the phrasing ambiguous? [Clarity, Spec §SC-001]

---

## Requirement Consistency

- [ ] CHK013 - Does FR-006 ("preserve parameters when configuration is subsequently deleted") use
  "deleted" while SC-004 uses "deactivated or updated" — are these two requirements aligned on
  the set of operations covered? [Consistency, Spec §FR-006, SC-004]

- [ ] CHK014 - Does FR-011 (reactivation) reference FR-009's duplicate-check rules explicitly, and
  are the conflict conditions identical — i.e., no separate or stricter rules for reactivation?
  [Consistency, Spec §FR-009, FR-011]

- [ ] CHK015 - Do US2 Acceptance Scenarios 3 and 4 (active-game protection during deactivation and
  update) use the same definition of "in progress" as FR-002 and FR-003?
  [Consistency, Spec §US2, FR-002, FR-003]

- [ ] CHK016 - Are the functional requirements ordered sequentially (FR-001 → FR-011) in the
  Requirements section — FR-008 currently appears between FR-004 and FR-005, which may cause
  traceability confusion? [Clarity, Spec §Requirements]

---

## Acceptance Criteria Quality

- [ ] CHK017 - Are all 11 functional requirements (FR-001 through FR-011) traceable to at least one
  Given/When/Then acceptance scenario in the User Stories section?
  [Measurability, Traceability]

- [ ] CHK018 - Do US2 Acceptance Scenarios 3 and 4 (parameter preservation for in-progress games)
  specify an observable outcome that distinguishes preserved parameters from silently changed ones?
  [Measurability, Spec §US2]

- [ ] CHK019 - Is SC-004 ("zero incidents of parameter loss") measurable in practice — is there an
  observation method defined (e.g., audit log, game snapshot comparison, post-hoc assertion)?
  [Measurability, Spec §SC-004]

- [ ] CHK020 - Are acceptance scenarios present for FR-010 (audit tracking) — is there a scenario
  verifying that createdBy and deactivatedBy values are correctly captured after each respective
  operation? [Completeness, Gap, Spec §FR-010]

---

## Scenario Coverage

- [ ] CHK021 - Is there an acceptance scenario for the Game Admin management view (FR-008) —
  retrieving a list that includes both active and deactivated configurations and confirming
  deactivated ones appear there but not in the player list? [Coverage, Gap, Spec §FR-008]

- [ ] CHK022 - Is there an acceptance scenario for unauthorized access (FR-007) — a Player or
  unauthenticated user attempting a write operation and receiving an authorization error?
  [Coverage, Gap, Spec §FR-007]

- [ ] CHK023 - Is there an acceptance scenario for the duplicate-on-update case — a Game Admin
  updating config A so it becomes identical to another already-active config B?
  [Coverage, Gap, Spec §FR-009]

- [ ] CHK024 - Is the empty-list scenario covered by an acceptance scenario — when no active
  configurations exist, does the player-facing list return an empty response rather than an
  error? [Coverage, Spec §Edge Cases]

---

## Edge Case Coverage

- [ ] CHK025 - Is the behavior explicitly defined when updating a configuration results in a
  (boardSize, moveTime) pair that already exists in another active configuration — is this
  treated as a conflict (same as create duplicate) or permitted?
  [Edge Case, Gap, Spec §FR-009]

- [ ] CHK026 - Is the behavior defined when the last remaining active configuration is deactivated
  — does the spec address the resulting empty state for players and whether it is a valid system
  state? [Edge Case, Gap, Spec §FR-004]

- [ ] CHK027 - Is the behavior defined for concurrent duplicate creation — two Game Admins
  simultaneously submitting the same (boardSize, moveTime) before either transaction commits?
  [Edge Case, Gap, Spec §FR-009]

- [ ] CHK028 - Is the behavior defined for a stale JWT scenario — a Game Admin whose role is
  revoked between token issuance and a configuration operation, where the token still carries
  the Game Admin claim? [Edge Case, Gap, Spec §FR-007]

---

## Non-Functional Requirements

- [ ] CHK029 - Are response time requirements defined for the player-facing configuration list
  (FR-004), given it is invoked during the time-sensitive game creation flow?
  [NFR, Gap]

- [ ] CHK030 - Are rate limiting or abuse-prevention requirements specified for configuration
  write operations (create, update, deactivate, reactivate) on the admin endpoints?
  [NFR, Gap]

- [ ] CHK031 - Is the ordering of the player-facing configuration list formally elevated from an
  assumption ("default ordering by creation time is acceptable" in Assumptions) to a testable
  requirement, or is unordered explicitly acceptable? [NFR, Spec §Assumptions]

---

## Dependencies & Assumptions

- [ ] CHK032 - Is the dependency on BRD-ACCOUNT-SOCIAL-001 (role provisioning) documented with
  a failure mode — what does the system do if role data in the JWT is absent or malformed at
  request time? [Dependency, Gap, Spec §Assumptions]

- [ ] CHK033 - Is the assumption "game retains parameters at creation time" tied to a clear data
  relationship — does the game record snapshot config values at creation, or does it hold a
  foreign key reference to the config ID (which would require the soft-deleted record to remain
  readable)? [Assumption, Gap, Spec §Assumptions]

- [ ] CHK034 - Is the "no limit on the number of configurations" assumption validated against
  any operational constraint — e.g., does an unlimited config count create a UX concern for
  players browsing a long list? [Assumption, Spec §Assumptions]

- [ ] CHK035 - Is the "API-first" assumption tied to a concrete versioning or contract stability
  requirement — e.g., a versioned URL path or backward-compatibility policy for web and mobile
  clients? [Assumption, Gap, Spec §Assumptions]

---

## Constitution Compliance Gates

- [ ] CHK036 - Does the GameConfig entity use an explicit `active` flag attribute (not a nullable
  `deletedAt` column or a separate `deleted` boolean), consistent with Constitution Principle IV
  ("dedicated DB config table with active flag")? [Constitution, Spec §Key Entities]

- [ ] CHK037 - Does the spec avoid specifying or implying caching of the active configuration
  list, consistent with Constitution Principle IV ("caching MUST NOT be added unless a concrete
  NFR requires it and is documented in the feature spec")? [Constitution, Spec §FR-004]

- [ ] CHK038 - Does FR-007 (role enforcement) align with Constitution Principle III — is the Game
  Admin role expected to be verified from JWT token claims without a runtime DB lookup, consistent
  with "Role/permission claims MUST be baked into the access token"? [Constitution, Spec §FR-007]

- [ ] CHK039 - Does the spec avoid language that would imply cross-module data access — e.g., the
  game module reading directly from the config table to preserve parameters, rather than
  consuming an exported interface — consistent with Constitution Principle II?
  [Constitution, Spec §FR-002, FR-003]

- [ ] CHK040 - Are all configuration management endpoints expected to be covered by the OpenAPI
  documentation requirement in Constitution Principle VI (@ApiOperation, @ApiResponse, DTO
  decorators), and is this documented as a delivery requirement? [Constitution, Gap]

- [ ] CHK041 - Does the deactivation operation (FR-003) avoid read-modify-write patterns at the
  application layer — is the `active` flag update expressed as a single atomic DB-level state
  mutation, consistent with Constitution Principle IV's atomic statement requirement?
  [Constitution, Spec §FR-003]

---

## Notes

- Items marked `[Gap]` indicate requirements that appear absent from the spec and may need to be
  added before planning.
- Items marked `[Constitution]` are gates enforced by Game Hub API Constitution v1.0.0; violations
  require either a fix or an explicit documented exception in the PR description.
- CHK016 flags a non-sequential FR numbering issue (FR-008 appears between FR-004 and FR-005)
  which should be corrected for readability before handoff.
- CHK013 flags a terminology inconsistency between FR-006 ("deleted") and SC-004 ("deactivated or
  updated") that must be aligned.
- CHK005 and CHK025 both point to the same gap: whether the duplicate-pair check applies to
  update operations — this is the most likely source of downstream rework if left unresolved.
