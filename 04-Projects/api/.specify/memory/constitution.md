<!--
SYNC IMPACT REPORT
==================
Version change: [template — no version] → 1.0.0
Bump rationale: MAJOR — initial ratification; all principles established from scratch.

Principles added:
  - I.   Hexagonal Architecture (Ports & Adapters)
  - II.  Modular Monolith
  - III. Authentication & Security
  - IV.  Data Access
  - V.   Event-Driven Communication & Realtime
  - VI.  NestJS Standards & API Documentation

Sections added:
  - Core Principles (6 principles)
  - Coding Conventions
  - Governance

Templates status:
  - .specify/templates/plan-template.md  ✅ No update required — "Constitution Check" section
                                            already contains a generic placeholder
                                            "[Gates determined based on constitution file]"
                                            that correctly defers gate logic to this file.
  - .specify/templates/spec-template.md  ✅ No update required — template is technology-agnostic
                                            and compatible with this constitution.
  - .specify/templates/tasks-template.md ✅ No update required — task phases (Setup, Foundational,
                                            User Story phases) align with hexagonal layer ordering.

Deferred items:
  - Testing principle: ADR-TONG has no accepted testing decisions yet.
    Marked with TODO(TESTING_PRINCIPLE) below.
  - Atomic Design for webapp/mobile: present in ADR-TONG but out-of-scope for this API-only
    codebase; excluded intentionally.
-->

# Game Hub API Constitution

## Core Principles

### I. Hexagonal Architecture (Ports & Adapters)

The API codebase MUST organise all business logic inside a framework-agnostic **core** composed
of two inner layers:

- **Domain layer** — entities, value objects, domain events, and repository interfaces.
  MUST NOT import anything from NestJS, TypeORM, HTTP adapters, or any external library.
- **Application layer** — use-cases / command handlers that orchestrate domain objects.
  MUST NOT import concrete infrastructure classes; MAY import domain interfaces (ports) only.

Two outer layers wrap the core:

- **Infrastructure layer** — TypeORM repositories, third-party clients, EventEmitter adapters,
  WebSocket gateways. Each class MUST implement exactly one port (interface) defined by the core.
- **Interface layer** — NestJS controllers, DTOs, guards, pipes, interceptors, OpenAPI decorators.
  Translates HTTP/WebSocket requests into use-case calls; MUST NOT contain business logic.

**Rules:**
- The dependency arrow MUST always point inward: interface → application → domain.
- Infrastructure adapters MUST be injected into use-cases via constructor (no service-locator).
- Core layers (domain + application) MUST NOT import an adapter class directly — only the port
  interface it fulfils.
- A use-case class that imports a TypeORM entity class directly is a constitution violation.

### II. Modular Monolith

The application is a **single deployable unit with one shared PostgreSQL database**.
Each bounded-context business domain is one NestJS module.

**Rules:**
- A module MUST NOT import another module's internal providers. Cross-module calls go through
  the exported service/interface only.
- Each module MUST own its tables under a dedicated PostgreSQL schema (preferred) or at minimum
  a consistent table-name prefix matching the domain name.
- Communication from module A to module B MUST use exported service methods or domain events —
  never direct repository access across module boundaries.
- Distributed message queues (Kafka, RabbitMQ) MUST NOT be introduced while the service runs
  as a single process.

### III. Authentication & Security

**JWT dual-token flow:**
- Every protected API endpoint MUST be secured via JWT verification (access token).
- Access tokens: short-lived (15–30 minutes). Refresh tokens: long-lived (7–30 days).
- Role/permission claims MUST be baked into the access token at login or refresh time.
  Requests MUST NOT trigger a DB lookup for authorisation under normal operation.
- Server-side session cookies MUST NOT be used as the primary authentication mechanism.

**Server-authoritative timers:**
- Any countdown or deadline that affects game state or system behaviour MUST be stored as a
  server-side timestamp and enforced by a server-side timer.
- The server MUST broadcast the authoritative result when a deadline expires via the default
  realtime transport.
- Clients receive the deadline timestamp and render a local countdown for UX purposes only;
  the client timestamp is NEVER used as the source of truth for time-limited actions.

### IV. Data Access

**Stack:**
- Database: **PostgreSQL** (only).
- ORM: **TypeORM** with explicit migration files. Schema changes MUST be captured in a numbered
  TypeORM migration file (`src/database/migrations/`). Running `synchronize: true` in any
  non-development environment is forbidden.

**Concurrency rules:**
- Any field that multiple concurrent requests may increment or decrement (score, balance,
  counter) MUST be updated with a single atomic DB statement
  (`UPDATE … SET col = col ± X WHERE … RETURNING col`). Read-modify-write at the application
  layer on such fields is a constitution violation.
- Claim-once operations inside a concurrent queue (e.g., matchmaking) MUST use a DB transaction
  with a row-level lock (`SELECT … FOR UPDATE SKIP LOCKED`). Application-layer check-then-act
  is forbidden for these patterns.

**Query rules:**
- Leaderboard top-N queries MUST use a direct indexed DB query (`ORDER BY score DESC LIMIT N`).
  External sorted sets or caches MUST NOT be added unless a concrete NFR requires it and the
  requirement is documented in the feature spec.
- Admin-configurable values (thresholds, limits, game parameters) MUST be stored in a dedicated
  DB config table (with `active` flag). Application reads directly from DB at use time; caching
  MUST NOT be added unless a concrete NFR requires it.

### V. Event-Driven Communication & Realtime

**Internal events:**
- When multiple modules must react to one domain event (e.g., notification on user action),
  the emitting module MUST publish a domain event via NestJS `EventEmitter2`.
  Consuming modules MUST subscribe; they MUST NOT call the emitting module's service directly
  in response.

**Realtime transport:**
- Any feature requiring live updates to clients (notification badge, game state, matchmaking
  status) MUST use **WebSocket** (bidirectional) or **SSE** (server→client only) as the default
  transport, reusing a shared gateway — not polling or separate transport stacks.
- When the service scales horizontally across multiple instances, a Redis pub/sub backplane
  MUST be added to synchronise WebSocket broadcasts across instances.

### VI. NestJS Standards & API Documentation

**Configuration:**
- All environment-sourced config MUST be loaded via NestJS `ConfigModule` with
  `validationSchema` (Joi) or a validated `ConfigService` class (class-validator +
  `@nestjs/config`).
- Config values MUST be grouped by domain (e.g., `DatabaseConfig`, `JwtConfig`,
  `AppConfig`) — no flat environment variable access scattered across services.
- No service or module MUST read `process.env` directly; all env access goes through the
  typed `ConfigService`.

**API documentation:**
- The project MUST maintain an `openapi.yml` (or `openapi.json`) at the repository root,
  generated from NestJS Swagger decorators (`@nestjs/swagger`) via a dedicated script.
- Every public endpoint MUST have `@ApiOperation`, `@ApiResponse`, and DTO decorators
  (`@ApiProperty`) on request/response types.
- The generated OpenAPI spec is the contract for API consumers; it MUST be regenerated and
  committed as part of any PR that changes an endpoint.

## Coding Conventions

- **No hardcoded admin-tunable values**: game rules, limits, and parameters configurable by
  Admin MUST live in a DB config table, not in source code constants or environment variables.
- **Atomic Design for UI** is out-of-scope for this API-only codebase. Frontend conventions
  are governed by the webapp/mobile constitution, not this document.
- **No synchronize: true in production**: TypeORM `synchronize` option MUST be `false` in
  staging and production. Schema changes ship exclusively via migration files.

## Testing

TODO(TESTING_PRINCIPLE): No architecture decisions on testing strategy have been ratified yet.
Once decisions are made (e.g., unit test boundaries, integration test scope, coverage gates),
they MUST be added here and reflected in `.specify/templates/tasks-template.md`.

Current guidance (non-binding until ratified):
- Unit tests cover domain and application layers in isolation (mock ports).
- Integration tests cover infrastructure adapters against a real PostgreSQL instance (no mocks).

## Governance

- This constitution supersedes all other written or verbal practices for the API codebase.
- **Amendments**: Any change to a principle requires (1) an ADR file in
  `03-ADR (Architecutre Decission Record)/`, (2) an update to `_ADR-TONG.md`, and
  (3) a `/speckit-constitution` run to propagate changes here and to templates.
- **Versioning**: Follows semantic versioning. MAJOR = principle removed or redefined.
  MINOR = new principle or section added. PATCH = wording/clarification only.
- **Compliance review**: Every PR MUST be checked against the Constitution Check gate in
  `plan.md` before merge. Violations require either a fix or a documented exception with
  justification in the PR description.
- **Complexity justification**: Any deviation from a MUST rule in this constitution requires
  an explicit justification entry in the `Complexity Tracking` table of `plan.md`.

**Version**: 1.0.0 | **Ratified**: 2026-06-28 | **Last Amended**: 2026-06-28
