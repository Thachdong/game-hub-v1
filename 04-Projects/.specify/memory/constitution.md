<!--
Sync Impact Report
==================
Version change: [TEMPLATE] → 1.0.0
Rationale: Initial ratification. The constitution was still the unfilled template;
this is the first concrete version, populated entirely from the accepted
architecture decisions in `03-ADR (Architecutre Decission Record)/_ADR-TONG.md`.
MAJOR bump (0.x→1.0.0 treated as initial adoption) because this establishes the
full governing principle set for the first time.

Modified principles: none (first population, not a modification)

Added sections:
- Core Principles I–IX (Modular Monolith Architecture, Internal Event-Driven
  Communication, JWT-Based Stateless Authentication, Server-Authoritative
  Timing, Atomic Database Writes for Shared Counters, Row-Level Locking for
  Exclusive Claims, Indexed Query-Time Leaderboards, DB-Backed Admin-Tunable
  Configuration, Realtime Transport via WebSocket/SSE)
- Technology Constraints
- Development Workflow & Quality Gates
- Governance

Removed sections: none (template placeholders only)

Templates requiring updates:
- ✅ .specify/templates/plan-template.md — Constitution Check gate is generic
  ("[Gates determined based on constitution file]"), no edit needed.
- ✅ .specify/templates/spec-template.md — no constitution references, no edit needed.
- ✅ .specify/templates/tasks-template.md — no constitution references, no edit needed.
- ✅ .specify/templates/commands/*.md — no agent-specific or stale references found
  (directory contains no command files outside this skill's own template set).

Deferred items / TODOs:
- TODO(TESTING_PRINCIPLE): `_ADR-TONG.md`'s "Testing" section has no accepted ADR
  yet ("Chưa có nguyên tắc nào ở mục này."). No Testing principle is defined in
  this constitution. Add one and bump MINOR when a Testing ADR is accepted.
-->

<!--
Sync Impact Report (v1.1.0)
==================
Version change: 1.0.0 → 1.1.0
Rationale: MINOR bump — two new principles added (Hexagonal Architecture for the
api, Atomic Design for webapp/mobile components). These are standing team-dev
default conventions (not derived from a feature-specific BRD), now recorded as
declarative entries in `_ADR-TONG.md` ("nguồn: team dev default convention") and
mirrored here, per this constitution's own amendment procedure.

Modified principles: none renamed or removed
Added sections: Core Principles X (Hexagonal Architecture for API), XI (Atomic
Design for Webapp/Mobile Components)
Removed sections: none

Templates requiring updates:
- ✅ .specify/templates/plan-template.md — Constitution Check gate is generic, no edit needed.
- ✅ .specify/templates/spec-template.md — no constitution references, no edit needed.
- ✅ .specify/templates/tasks-template.md — no constitution references, no edit needed.
- ✅ .specify/templates/commands/*.md — no stale references found.

Deferred items / TODOs (carried over): Testing principle still undefined, see above.
-->

# Game Hub Constitution

## Core Principles

### I. Modular Monolith Architecture
The system MUST be built as a single application backed by a single database,
not as separate deployable services. Each business domain MUST live in its own
module within the codebase and MUST communicate with other modules only through
an explicitly exported interface/service — direct imports of another module's
internal implementation are forbidden. Each module MUST own a separate
schema/namespace within the shared database (a dedicated Postgres schema, or at
minimum a domain-prefixed table naming convention).

**Rationale**: Keeps domain boundaries enforceable in code review without paying
the operational cost of a distributed system before there is a proven need for it.
*(Source: ADR-ACCOUNT-SOCIAL-001)*

### II. Internal Event-Driven Communication
When one module's action must trigger a side effect in a shared module (e.g. a
shared notification module), the source module MUST emit an in-process domain
event (e.g. via `EventEmitter`) and the destination module MUST only subscribe —
it MUST NOT be called synchronously in the reverse direction. Distributed message
queues (Kafka, RabbitMQ, etc.) MUST NOT be introduced while the system remains a
single-process modular monolith.

**Rationale**: Decouples many-source-to-one-destination side effects without
introducing distributed-systems complexity the current scale does not require.
*(Source: ADR-NOTIFICATION-001)*

### III. JWT-Based Stateless Authentication
Every API MUST authenticate using JWT access + refresh tokens: short-lived access
tokens (15–30 minutes) and long-lived refresh tokens (7–30 days). User
role/permissions MUST be baked into the access token at login or refresh time and
verified via signature — routine requests MUST NOT query the database for
authorization on every call. Server-side session/cookie-based auth MUST NOT be
used as the primary authentication mechanism.

**Rationale**: Avoids per-request DB round-trips for authorization while keeping
auth stateless and horizontally scalable. *(Source: ADR-ACCOUNT-SOCIAL-001)*

### IV. Server-Authoritative Timing
Any time-bound action (countdown, deadline) MUST be governed by a deadline
timestamp stored on the server plus an in-process timer that actively detects
expiry and broadcasts the result over the default realtime transport. Clients
MUST only render a countdown derived from the server-provided deadline and MUST
NEVER be treated as the source of truth for remaining time.

**Rationale**: Prevents client clock manipulation or drift from corrupting
time-sensitive game/business logic. *(Source: ADR-CARO-GAME-002)*

### V. Atomic Database Writes for Shared Counters
Any counter-like field that can be written concurrently by multiple requests
(score, balance, count, etc.) MUST be updated via a single atomic database
statement (e.g. `UPDATE ... SET col = col ± X` with the bound check in the same
statement) — read-modify-write (read into application memory, recompute, write
back) is forbidden. If subsequent logic needs the post-update value, it MUST be
taken from the update statement's own result (e.g. `RETURNING`), never inferred
from a prior read.

**Rationale**: Eliminates lost-update races on shared counters without relying on
application-level locking. *(Source: ADR-TRUST-REPORT-002)*

### VI. Row-Level Locking for Exclusive Claims
Any matchmaking/queue system that pulls a row out for exclusive processing (e.g.
claiming a player to pair) MUST use a transaction with row-level locking (e.g.
`SELECT ... FOR UPDATE SKIP LOCKED`). Check-then-act logic implemented in the
application layer is forbidden for this purpose.

**Rationale**: Guarantees exactly-once claiming under concurrency without
race-prone application-level coordination. *(Source: ADR-CARO-GAME-003)*

### VII. Indexed Query-Time Leaderboards
Any "top-N by score" leaderboard MUST be served via a direct, indexed query (e.g.
`ORDER BY score DESC LIMIT N`) executed at display time. A separate cache or
sorted-set structure MUST NOT be introduced by default — only add one when a
specific, documented performance NFR requires it.

**Rationale**: Keeps leaderboard data always consistent and avoids premature
caching infrastructure before performance data justifies it.
*(Source: ADR-CARO-GAME-004)*

### VIII. DB-Backed Admin-Tunable Configuration
Any value an Admin needs to change at runtime without a code deployment MUST be
stored in a dedicated database table for that config type (with an
active/inactive flag if soft-deletion is needed). The application MUST read
directly from the database at the point of use. Caching MUST NOT be added by
default — only when a specific, documented performance NFR requires it.

**Rationale**: Keeps admin-tunable behavior deployable-free and avoids stale
cached config without a proven performance need. *(Source: ADR-TRUST-REPORT-001)*

### IX. Realtime Transport via WebSocket/SSE
Any feature requiring live client updates (notification badges, live game state,
etc.) MUST use WebSocket (or SSE for server→client-only needs) as the default
transport, reusing the same connection infrastructure. Polling or other
transports MUST NOT be chosen instead unless a specific, distinct technical
reason applies. When scaling horizontally across multiple instances, a pub/sub
backplane (e.g. Redis pub/sub) MUST be used to synchronize realtime state across
instances.

**Rationale**: Standardizes how realtime features are delivered and how they
scale, instead of each feature picking its own transport.
*(Source: ADR-NOTIFICATION-001)*

### X. Hexagonal Architecture for the API
The api codebase MUST organize business logic (domain/use-case layer) as the
core, with no direct dependency on framework or infrastructure code (DB, HTTP,
queue, third-party APIs). Every outward integration MUST go through a port
(interface) defined by the core; framework/infrastructure code implements the
adapter for that port. The core MUST NOT import a concrete adapter directly —
adapters are only received via dependency injection against the port interface.

**Rationale**: Keeps domain logic testable and framework-agnostic, and makes
swapping infrastructure (DB driver, HTTP framework, queue) a contained change.
*(Source: team dev default convention)*

### XI. Atomic Design for Webapp/Mobile Components
UI components in webapp and mobile MUST be organized using Atomic Design (atoms
→ molecules → organisms → templates → pages/screens). A component MUST NOT
depend on a component from a higher tier than itself. Before creating a new
component, an existing lower-tier component MUST be reused if one already
covers the need.

**Rationale**: Keeps component hierarchy predictable and maximizes reuse across
webapp and mobile instead of duplicating UI building blocks per screen.
*(Source: team dev default convention)*

## Technology Constraints

This constitution intentionally tracks only technology-layer decisions recorded
as `accepted` ADRs in `03-ADR (Architecutre Decission Record)/_ADR-TONG.md` — it
does not encode business logic, feature requirements, or acceptance criteria.

No Testing-discipline principle exists yet: as of this version, the "Testing"
section of `_ADR-TONG.md` has no accepted ADR (see deferred TODO above). Until
one exists, testing approach is decided per-feature in `plan.md` and is not
constitution-gated.

## Development Workflow & Quality Gates

- `/speckit.plan`'s "Constitution Check" gate MUST verify the proposed design
  against every principle in this document before Phase 0 research begins, and
  again after Phase 1 design.
- Any violation of a principle MUST be explicitly justified in the plan's
  Complexity Tracking section, or the design MUST be changed to comply.
- This constitution is amended only by first recording a new `accepted` ADR
  under `03-ADR (Architecutre Decission Record)/<feature>/`, appending its
  declarative principle to `_ADR-TONG.md`, and then re-running
  `/speckit.constitution` to propagate it here. This file MUST NOT be edited by
  hand outside of that flow.

## Governance

This constitution supersedes all other development practices and templates in
this repository for technology-layer decisions. All `/speckit.plan` outputs MUST
demonstrate compliance via the Constitution Check gate.

Amendment procedure: amendments originate as `accepted` ADRs (see Development
Workflow & Quality Gates above), not as direct edits to this file. Versioning
follows semantic versioning: MAJOR for backward-incompatible principle removals
or redefinitions, MINOR for new or materially expanded principles, PATCH for
wording/clarification fixes. Each amendment MUST update the Sync Impact Report
at the top of this file and the version/date line below.

Compliance review: every feature plan MUST pass the Constitution Check gate in
`plan-template.md`; reviewers MUST reject plans with unjustified violations.

**Version**: 1.1.0 | **Ratified**: 2026-06-27 | **Last Amended**: 2026-06-27
</content>
</invoke>
