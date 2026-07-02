<!--
SYNC IMPACT REPORT
==================
Version change: 1.0.0 → 1.1.0
Bump rationale: MINOR — new mandated technology guidance added (icon library) to Coding
Conventions; no principle redefined or removed.

Principles added: none (this amendment touches Coding Conventions, not Core Principles)

Sections modified:
  - Coding Conventions — added an "Icons" convention mandating `lucide-react`.

Templates status:
  - .specify/templates/plan-template.md  ✅ No update required — Constitution Check gate remains
                                            a generic placeholder; no new gate needed for a
                                            library-choice convention.
  - .specify/templates/spec-template.md  ✅ No update required.
  - .specify/templates/tasks-template.md ✅ No update required.
  - CLAUDE.md                            ✅ No update required.
  - .specify/templates/commands/*.md     ✅ N/A — directory does not exist in this workspace.

Deferred items (carried over from 1.0.0):
  - Testing principle: ADR-TONG has no accepted testing decisions yet (mirrors the same gap in
    the sibling API constitution). Marked with TODO(TESTING_PRINCIPLE) below.
  - Styling library (CSS framework/engine) choice: still not mandated — only the icon library was
    specified in this amendment. Left to each app's plan.md Technical Context.
-->

# Game Hub Webapp Constitution

## Core Principles

### I. Turborepo Monorepo Structure

The repository is a **Turborepo workspace**. Apps live under `apps/*`; shared, cross-app code
lives under `packages/*`.

**Rules:**
- Each app MUST define its own build/dev/lint/test scripts orchestrated through the Turborepo
  pipeline (`turbo.json`); scripts MUST be run via `turbo run <task>` filters so caching and task
  graph ordering apply — not invoked standalone in a way that bypasses the pipeline.
- Apps MUST NOT import from one another directly. Cross-app reuse MUST go through a package under
  `packages/*`, consumed via the workspace protocol (e.g. `workspace:*`).
- A new shared package MUST have its own `package.json`, an explicit public entry point, and MUST
  NOT be imported via deep relative paths that reach into another package's internals.

### II. Next.js App Router with Route Groups

Every webapp MUST be built with the Next.js **App Router** (`app/` directory).

**Rules:**
- Route Groups (`(groupName)`) MUST be used to organize routes by concern (e.g. an
  authenticated-layout group vs. a public-layout group, or by feature area) without affecting the
  resulting URL path, and to scope layouts/loading/error boundaries per group.
- Route segment files (`page.tsx`, `layout.tsx`, route handlers) MUST only compose UI and call
  into the service-interface layer (Principle IV); they MUST NOT contain business logic, direct
  HTTP calls, or ad-hoc data transformation that belongs in a service.

### III. Atomic Design Component Architecture

All UI components MUST be organized per **Atomic Design**: atoms → molecules → organisms →
templates → pages/screens. *(source: `_ADR-TONG.md`, team dev default convention)*

**Rules:**
- A component at a given layer MUST NOT depend on a component from a higher layer (an atom MUST
  NOT import a molecule; a molecule MUST NOT import an organism; and so on).
- Before creating a new component, existing components at a lower layer MUST be reused or
  composed first. A new component MUST only be created when no suitable lower-layer component
  satisfies the need.

### IV. Webapp/API Boundary via Service Interfaces

Webapp code and backend API code are separate concerns, bridged only through **service
interfaces**.

**Rules:**
- All communication with a backend API MUST go through a dedicated service-interface layer
  (e.g. `services/`) exposing typed functions/hooks. Components and route segment files MUST NOT
  call `fetch`/an HTTP client directly.
- Each service interface MUST define its contract (input/output types) independently of the
  underlying HTTP client implementation, so that implementation detail can change without
  requiring changes to UI code that consumes the service.
- Constructing API request payloads and parsing API responses MUST happen only inside the service
  interface layer, never inline in components or pages.

### V. Progressive Common Code Extraction (Rule of Two)

Whether a UI component, hook, or utility is "common" is decided **during coding**, not upfront.

**Rules:**
- New components, hooks, and utilities MUST first be created locally within the app that needs
  them. Code MUST NOT be placed under a shared `packages/*` package in anticipation of future
  reuse that hasn't happened yet.
- Code MUST be promoted to a shared package only at the point a **second** app needs the same
  functionality — not before.
- The promoting change MUST update the original app's call site to import from the new shared
  package, so no duplicate implementation is left behind.

### VI. Client-Side Auth & Realtime Contract

The webapp MUST honor the auth and realtime contracts established by the API side
(`_ADR-TONG.md`; see the API constitution's Principles III and V).

**Rules:**
- The webapp MUST treat backend-issued JWT access/refresh tokens as the sole authentication
  mechanism; it MUST NOT implement or depend on server-side session cookies for auth state.
- Any countdown, deadline, or time-limited UI element MUST render based on the deadline timestamp
  returned by the API. The client's local clock MUST NEVER be treated as the source of truth for
  expiry/timing logic.
- Any feature requiring live server updates (notifications, game state, matchmaking, chat) MUST
  consume the API's WebSocket/SSE transport through the service-interface layer — polling MUST
  NOT be used as a substitute.

## Coding Conventions

- **Language**: TypeScript across all apps and packages, for consistency with the API codebase
  and to keep service-interface contracts (Principle IV) type-checked end to end.
- **No premature shared abstractions**: see Principle V — this applies to utility functions,
  custom hooks, and components alike.
- **Atomic Design is authoritative for UI structure** in this workspace; it is intentionally
  out of scope for the API constitution, which defers UI conventions to this document.
- **Icons**: `lucide-react` is the mandated icon library across all apps and packages. A second
  icon library (e.g. `react-icons`, `heroicons`, inline custom SVGs for anything lucide already
  covers) MUST NOT be introduced without an ADR superseding this convention.

## Testing

TODO(TESTING_PRINCIPLE): No architecture decisions on testing strategy have been ratified yet in
`_ADR-TONG.md`. Once decisions are made (e.g., component test boundaries, integration/E2E scope,
coverage gates), they MUST be added here and reflected in `.specify/templates/tasks-template.md`.

## Governance

- This constitution supersedes all other written or verbal practices for the webapp codebase.
- **Amendments**: Any change to a principle requires (1) an ADR file in
  `03-ADR (Architecutre Decission Record)/`, (2) an update to `_ADR-TONG.md`, and
  (3) a `/speckit-constitution` run to propagate changes here and to templates.
- **Versioning**: Follows semantic versioning. MAJOR = principle removed or redefined.
  MINOR = new principle or section added. PATCH = wording/clarification only.
- **Compliance review**: Every PR MUST be checked against the Constitution Check gate in
  `plan.md` before merge. Violations require either a fix or a documented exception with
  justification in the PR description.
- **Complexity justification**: Any deviation from a MUST rule in this constitution requires an
  explicit justification entry in the `Complexity Tracking` table of `plan.md`.

**Version**: 1.1.0 | **Ratified**: 2026-07-02 | **Last Amended**: 2026-07-02
