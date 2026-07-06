<!--
SYNC IMPACT REPORT
==================
Version change: 3.0.0 → 3.1.0
Bump rationale: MINOR — Two new, previously-unstated constraints are ratified: (1) this project
has no visual-design-tool workflow (no Figma/mockups/wireframes as a source of truth) — specs
describe features and per-page component layout in text only; (2) a fixed CSS color palette and a
"classic and vintage" visual direction are mandated for all styling. Both are additive: no
existing principle is redefined or removed, so this is not a MAJOR bump; it is more than a wording
clarification (a new principle plus new mandatory coding-convention rules), so it is not a PATCH.

Principles added:
  - VII. Text-Only Feature & Layout Specifications (No Visual Design Assets) — new principle

Sections modified:
  - Coding Conventions — added a "Styling & Visual Language" rule: mandated color palette (as CSS
    custom properties) and a classic/vintage visual direction requirement.

Sections removed: none

Templates status:
  - .specify/templates/plan-template.md  ✅ No update required — Constitution Check gate remains a
                                            generic placeholder; Technical Context still has no
                                            dedicated design-asset or styling field to reconcile.
  - .specify/templates/spec-template.md  ✅ No update required — template is already
                                            technology/visual-agnostic prose; no mockup/design-file
                                            section exists to remove.
  - .specify/templates/tasks-template.md ✅ No update required — no design-asset-producing task
                                            category exists to rename or remove.
  - CLAUDE.md                            ✅ No update required — points at the active plan.md, not
                                            principle text.
  - .specify/templates/commands/*.md     ✅ N/A — directory does not exist in this workspace.
  - README.md                            ⚠ Pending — no color-palette/styling-convention section
                                            exists yet; add one when README is next touched (not
                                            required to unblock this amendment).

Deferred items (carried over from 3.0.0):
  - Testing principle: ADR-TONG has no accepted testing decisions yet (mirrors the same gap in
    the sibling API constitution). Marked with TODO(TESTING_PRINCIPLE) below.
  - CSS framework/engine (e.g. Tailwind vs. CSS Modules vs. vanilla-extract) is still not
    mandated — only the token values and aesthetic direction are. Left to each app's plan.md
    Technical Context.
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
  mechanism. It MUST NOT implement a traditional server-side session store (an opaque session ID
  mapped to server-held user/session state, looked up on each request) as a substitute for the
  JWT — identity and role/permission checks MUST always be derived from the JWT's own
  signature/claims, never from a session-store lookup.
- The backend's login endpoint returns both the access and refresh token as plain JSON and sets no
  cookies of its own. Session and token lifecycle MUST be implemented as **hand-rolled Next.js
  Route Handlers plus first-party httpOnly cookies** — **NextAuth (Auth.js) MUST NOT be used** for
  this purpose:
  - A webapp-owned **login route** (e.g. `app/api/auth/login/route.ts`) is the only code that
    calls the backend's `/login` API. On success, it takes the access and refresh token out of the
    backend's JSON response and sets both as `httpOnly`, `Secure`, `SameSite` cookies on its own
    response to the client. Neither token MUST ever be returned to the client as a readable JSON
    body field or otherwise exposed to client-side JavaScript.
  - Any call to a backend resource endpoint MUST go through a webapp-owned **proxy route** (not
    `fetch`/an HTTP client invoked directly from a Client Component — Principle IV already requires
    this). The proxy route reads the access token out of the httpOnly cookie server-side, attaches
    it as the `Authorization` header on its own outbound call to the backend, and returns the
    backend's response to the client. Client-side code MUST NEVER read, hold, or forward the access
    token itself.
  - Token refresh follows the same shape: a webapp-owned route reads the refresh token cookie
    server-side, calls the backend's refresh endpoint, and re-sets the rotated access/refresh
    cookies on its response — never performed client-side.
  *(amended 2026-07-06, superseding the 2.0.0 NextAuth (Auth.js) delegation rule; see that
  version's Sync Impact Report for why NextAuth was originally adopted, and the current report for
  why it was retired. `apps/web`'s existing NextAuth-based implementation from feature
  002-login-layout-nextauth has not yet been migrated to this pattern — see the Follow-up section
  of this version's Sync Impact Report)*
- Any countdown, deadline, or time-limited UI element MUST render based on the deadline timestamp
  returned by the API. The client's local clock MUST NEVER be treated as the source of truth for
  expiry/timing logic.
- Any feature requiring live server updates (notifications, game state, matchmaking, chat) MUST
  consume the API's WebSocket/SSE transport through the service-interface layer — polling MUST
  NOT be used as a substitute.

### VII. Text-Only Feature & Layout Specifications (No Visual Design Assets)

This project does not use a visual design tool (Figma, mockups, wireframes, etc.) as a source of
truth. Each page/screen is specified through prose: a feature description plus a description of
the component layout on that page.

**Rules:**
- Feature specs (`spec.md`) MUST describe each page/screen's layout in text — which components
  appear, their relative position/grouping (e.g. "Header: logo left, primary nav center, account
  menu right"), and how they respond to state/interaction — instead of linking to or embedding a
  visual mockup or design-tool artifact.
- Component breakdown and Atomic Design layering (Principle III) MUST be derived from these
  textual layout descriptions; a design file MUST NOT be treated as an authoritative input to
  implementation.
- If a visual reference is ever attached to a feature (e.g. a screenshot for inspiration), it is
  supplementary only. The textual spec remains the binding source of truth for implementation and
  review; conflicts MUST be resolved in favor of the text.

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
- **Styling & Visual Language**: All apps MUST use the following fixed color palette, defined as
  CSS custom properties (design tokens) at the root/theme level, and MUST NOT introduce ad-hoc hex
  colors outside it:
  - `--color-background: #0F0F0F` — page background
  - `--color-surface: #181818` — cards, panels, elevated surfaces
  - `--color-text-primary: #F5F5F5` — primary text
  - `--color-text-secondary: #A3A3A3` — secondary/muted text
  - `--color-border: #2A2A2A` — dividers, borders, outlines
  - `--color-accent: #FFFFFF` — primary accent (CTAs, active/focus states, key highlights)

  A component MUST reference these tokens rather than hard-coding the hex values or introducing
  new colors; a new color requires an ADR superseding this convention.

  The overall visual language MUST read as **classic and vintage**: restrained, high-contrast
  monochrome-first UI (dark surface + off-white text + a single white accent, per the palette
  above), serif or slab-serif display type for headings, subtle borders/rules over
  shadows-and-gradients, and deliberate, understated motion — not a modern flat/neon/gradient-heavy
  SaaS look.

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

**Version**: 3.1.0 | **Ratified**: 2026-07-02 | **Last Amended**: 2026-07-06
