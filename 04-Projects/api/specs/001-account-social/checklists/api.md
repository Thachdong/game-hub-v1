# API Requirements Quality Checklist: Account & Social API

**Purpose**: Validate completeness, clarity, consistency, and coverage of API requirements before planning
**Created**: 2026-06-28
**Feature**: [spec.md](../spec.md)
**Scope**: Full-spectrum — all 4 user stories (US1–US4)
**Depth**: Thorough pre-planning gate

---

## Requirement Completeness

- [ ] CHK001 - Are the required request parameters for the OAuth initiation endpoint specified (e.g., requested scopes, redirect URI)? [Completeness, Gap, Spec §FR-001]
- [ ] CHK002 - Is the response payload structure of the token issuance endpoint defined — field names, types, and token format for both access and refresh tokens? [Completeness, Gap, Spec §FR-001]
- [ ] CHK003 - Does the spec define what claims are encoded in the access token beyond role/privilege flags (e.g., account ID, email, expiry)? [Completeness, Gap, Spec §FR-001, FR-003]
- [ ] CHK004 - Are the source and format of each profile field (username, email, avatar URL) explicitly defined — e.g., taken verbatim from Google, or transformed? [Completeness, Spec §FR-004]
- [ ] CHK005 - Does the spec define the full shape of a game entry in the game list response — required fields beyond name and `hasProfile`? [Completeness, Gap, Spec §FR-005]
- [ ] CHK006 - Are all friend management endpoints enumerated — send, list incoming, list outgoing, accept, reject — with distinct actions for each? [Completeness, Spec §FR-006–FR-013]
- [ ] CHK007 - Is the response structure for friend request listing defined — which fields of sender, receiver, status, and timestamps are returned? [Completeness, Gap, Spec §FR-013]
- [ ] CHK008 - Are Game Admin role assignment and revocation endpoint inputs fully specified — how is the target account and target game identified in each call? [Completeness, Gap, Spec §FR-014–FR-015]

---

## Requirement Clarity

- [ ] CHK009 - Is the "service-unavailable error" in FR-022 defined with a distinguishable error code or structure that differs from an authentication failure response? [Clarity, Spec §FR-022]
- [ ] CHK010 - Is the "already friends" error in FR-019 specified with a concrete, distinguishable error code or message contract for API callers? [Clarity, Spec §FR-019]
- [ ] CHK011 - Is the idempotent behavior of Game Admin assignment (FR-014) specified — what response is returned when the role is assigned to an account that already holds it? [Clarity, Spec §FR-014]
- [ ] CHK012 - Is "platform-registered games" defined — what qualifies a game as registered, and is the game registry a separate endpoint or a shared data source readable by this module? [Clarity, Gap, Spec §FR-005, Assumptions]
- [ ] CHK013 - Is "active profile" in `PlayerGameProfile` defined — does it mean any profile ever created, or only currently active (non-deleted) ones? [Clarity, Gap, Spec §Key Entities]
- [ ] CHK014 - Is the `resolution timestamp` on `FriendRequest` defined — is it populated on both acceptance and rejection, or only one? [Clarity, Spec §Key Entities]
- [ ] CHK015 - Is the scope of Platform Admin privilege quantified — can a Platform Admin call all platform endpoints or only Game Admin role-management endpoints? [Clarity, Spec §FR-014, FR-015]

---

## Requirement Consistency

- [ ] CHK016 - Does FR-008 (blocking rules for sending requests) explicitly align with Acceptance Scenario 9 (retry after rejection is allowed) — is the "pending only" blocking condition unambiguous? [Consistency, Spec §FR-008, US3 §AC-9]
- [ ] CHK017 - Does FR-003 (Platform Admin flag in access token) align with US4 Independent Test ("X's next token includes the role") — are both describing the same token encoding mechanism, applied at the same point in the flow? [Consistency, Spec §FR-003, US4]
- [ ] CHK018 - Are FR-008 (block send when already friends) and FR-019 (error on accept/reject when already friends) clearly distinct guards — is it explicit which layer each operates on (send vs. resolve)? [Consistency, Spec §FR-008, FR-019]
- [ ] CHK019 - Does SC-001 (3-second OAuth flow budget) account for the FR-022 fail-fast path — is the 3-second target defined for both the success path and the Google-outage error path? [Consistency, Spec §SC-001, FR-022]
- [ ] CHK020 - Is the "no cross-module query at request time" rule in FR-005/FR-021 consistent with how the platform game registry is accessed — is reading the game list also a cross-module call, or does it live within this module? [Consistency, Gap, Spec §FR-005, FR-021]

---

## State Machine & Lifecycle Coverage

- [ ] CHK021 - Are all valid `FriendRequest` state transitions enumerated — pending→accepted, pending→rejected, rejected→pending (FR-020)? Is there any other valid transition or terminal state? [Coverage, Spec §Key Entities, FR-020]
- [ ] CHK022 - Is the fate of an accepted `FriendRequest` record defined after friendship is established — does it remain as `accepted`, get archived, or get deleted? [Coverage, Gap, Spec §FR-009]
- [ ] CHK023 - Is the FR-019 scenario (second party acts on a pending request after friendship already formed) reflected as a named state or guard in the `FriendRequest` lifecycle? [Coverage, Spec §FR-019]
- [ ] CHK024 - Is the `PlayerGameProfile` record lifecycle defined — what happens when a game is deregistered from the platform after profiles have been recorded? [Edge Case, Gap, Spec §FR-021]

---

## Authentication & Authorization Requirements

- [ ] CHK025 - Are authorization requirements defined per endpoint — which caller role (Guest, Player, Platform Admin) is permitted for each of the 22 FRs? [Coverage, Gap, Spec §FR-001–FR-022]
- [ ] CHK026 - Are requirements defined for expired access tokens during an active session — is a specific error code/response mandated for 401 scenarios on protected endpoints? [Coverage, Gap, Spec §FR-001]
- [ ] CHK027 - Is the Platform Admin email list validation requirement defined — are there requirements for startup behaviour when the env var contains malformed entries (empty, invalid format)? [Edge Case, Gap, Spec §FR-003]
- [ ] CHK028 - Are requirements defined for the scenario where a Platform Admin's email is removed from the env list and the service restarts — do previously issued tokens with the admin flag remain valid until expiry? [Edge Case, Spec §FR-003, Assumptions]

---

## Cross-Module Integration Requirements

- [ ] CHK029 - Is the domain event payload for friend-request outcomes (FR-011) defined — what fields must the event carry for the notification domain to deliver a meaningful message to the sender? [Completeness, Gap, Spec §FR-011]
- [ ] CHK030 - Is the domain event schema for game profile creation (FR-021) defined — what fields must a game module include in the event for the account-social module to record a `PlayerGameProfile`? [Completeness, Gap, Spec §FR-021]
- [ ] CHK031 - Are failure-handling requirements specified for when a game module's profile-created event is lost, duplicated, or arrives out of order — is idempotent processing of FR-021 registry writes required? [Edge Case, Gap, Spec §FR-021]

---

## Non-Functional Requirements

- [ ] CHK032 - Is the SC-001 performance target (3 seconds) defined for both the first-login (account creation) and subsequent-login (account reuse) paths, or only one? [Clarity, Spec §SC-001]
- [ ] CHK033 - Are concurrency requirements specified for simultaneous friend request sends — beyond the cross-direction clarification, are there DB-consistency guarantees required for the same-direction concurrent case? [Completeness, Gap, Spec §FR-006]
- [ ] CHK034 - Are security requirements defined for the Platform Admin email list — is it treated as a secret value (e.g., encrypted env var) or a non-sensitive configuration? [Completeness, Gap, Spec §FR-003]
- [ ] CHK035 - Are throughput or concurrent-user requirements defined for any endpoint — or is SC-002 (500 ms under "normal load") the only non-functional target, without defining what "normal load" means? [Clarity, Spec §SC-002]

---

## Edge Case & Exception Flow Coverage

- [ ] CHK036 - Is the behavior defined when the platform game list is empty (no games registered) — does FR-005 return an empty list or a specific response? [Edge Case, Gap, Spec §FR-005]
- [ ] CHK037 - Is the idempotency requirement for `PlayerGameProfile` writes specified — if the same profile-created event is received twice, is a duplicate record prevented or silently ignored? [Edge Case, Gap, Spec §FR-021]
- [ ] CHK038 - Are requirements defined for what happens when a player tries to accept or reject a friend request that no longer exists (e.g., already resolved by the other-direction acceptance) — is a specific "not found" vs. "already friends" error required? [Edge Case, Gap, Spec §FR-019]

---

## Dependencies & Assumption Validation

- [ ] CHK039 - Is the assumption that "Google account email is immutable" documented with a reference to how Google account email changes would be handled — or explicitly confirmed as permanently out of scope? [Assumption, Spec §Assumptions]
- [ ] CHK040 - Are the availability guarantees of the platform game registry documented — is there a requirement for what FR-005 returns if the registry is temporarily unavailable? [Dependency, Gap, Spec §Assumptions, FR-005]

---

## Notes

- Items marked `[Gap]` indicate requirements that appear missing from the current spec and may need addition before or during planning.
- Items marked `[Consistency]` flag potential alignment issues between FRs, acceptance scenarios, and success criteria.
- Cross-module event contracts (CHK029, CHK030) are the highest-risk gap — they cannot be resolved within this module alone and require coordination with game/notification module specs.
- Resolve `[Gap]` items either by updating spec.md or documenting them as deferred in plan.md with explicit justification.
