# Phase 0 Research: Domain Service Layer for Backend Integration

All unknowns from the Technical Context are resolved below. Each entry: Decision, Rationale,
Alternatives considered.

## 1. Monorepo tooling & package manager

- **Decision**: pnpm workspaces + Turborepo, packages scoped as `@game-hub/*`.
- **Rationale**: The constitution (Principle I) mandates Turborepo and explicitly illustrates
  cross-package consumption with the `workspace:*` protocol string — that protocol syntax is a
  pnpm/Yarn-Berry feature, not supported by npm workspaces (which use plain semver or `*`). The
  sibling API project uses npm, but the webapp constitution's own example locks in pnpm's
  semantics for this workspace. `@game-hub/*` mirrors the repository name and gives every package
  an unambiguous scope distinct from the API's own package names.
- **Alternatives considered**: npm workspaces (rejected — doesn't support the `workspace:*`
  protocol the constitution's example depends on); Yarn Berry (viable alternative, also supports
  `workspace:*`, but pnpm is the more common default for new Turborepo projects and has no
  compelling advantage here, so not chosen without a reason to deviate from the more common
  choice).

## 2. HTTP client

- **Decision**: `axios`, one instance per domain package created through a shared factory in
  `@game-hub/service-core`.
- **Rationale**: Explicitly mandated by the feature request. A shared factory (not a single global
  instance) keeps each domain package independently consumable (constitution Principle I: no
  package forced to depend on another's runtime state) while still centralizing interceptor logic
  (auth header injection, retry, error normalization) in one place.
- **Alternatives considered**: native `fetch` (rejected — explicitly overridden by the user's
  request for axios); a single shared axios singleton across all packages (rejected — would make
  packages implicitly coupled through shared mutable client state, violating the "independently
  consumable" requirement in FR-003).

## 3. Uniform response shape ("HOC/HOF" requirement)

- **Decision**: A higher-order function, `withServiceResult`, wraps every axios call and normalizes
  it into a `ServiceResult<T>` discriminated union (`ServiceSuccess<T> | ServiceFailure`). Each
  domain package's exported functions are themselves produced by composing this HOF with a
  per-endpoint request definition — i.e., the "HOC" the request asked for is realized as a
  **factory higher-order function** that produces a family of typed service methods, since there
  is no UI component tree in this feature for a literal React higher-order *component* to wrap.
- **Rationale**: This is the only place `FR-001`/`FR-002` (uniform result shape, explicit
  input/output types) can be enforced once, centrally, instead of per-endpoint.
- **Alternatives considered**: per-package bespoke try/catch blocks (rejected — this is exactly
  the duplication FR-001 exists to eliminate); a class-based service base (rejected — the
  constitution's TypeScript convention and the request's own "HOF" wording favor a functional
  composition style over inheritance).

## 4. Failure taxonomy → HTTP status mapping

- **Decision**: `ServiceFailure.reason` is one of `UNAUTHENTICATED` (401 with no/invalid access
  token), `UNAUTHORIZED` (403), `VALIDATION` (400), `NOT_FOUND` (404), `SERVER_ERROR` (5xx or
  unmapped 4xx), `NETWORK_ERROR` (request never reached the server: timeout, DNS, connection
  reset).
- **Rationale**: Resolves FR-005 unambiguously against the backend's actual status-code usage
  (confirmed against `openapi.yml`, e.g. `/api/auth/refresh` documents 400 for missing token and
  401 for invalid/expired token). `NETWORK_ERROR` is kept distinct from `SERVER_ERROR` because only
  the former is eligible for automatic retry (see §6).
- **Alternatives considered**: mapping 1:1 to raw HTTP status codes with no semantic reason field
  (rejected — defeats the purpose of FR-005, which is to let UI branch on failure *meaning*, not
  memorize status codes).

## 5. Session storage & the BFF correction

> **SUPERSEDED 2026-07-02**: The decision below (a hand-rolled Next.js BFF proxy layer) was
> implemented as `packages/auth-service` and then removed. Decided directly with the user:
> session/token lifecycle is now delegated to **NextAuth (Auth.js)**, configured inside the future
> `apps/*` Next.js app via a `Credentials`-style provider wrapping the backend's own
> Google-OAuth-and-JWT-issuance flow (NextAuth is not used as an independent Google OAuth
> provider). Rationale: a hand-rolled cookie/session layer duplicates functionality NextAuth
> already provides (encrypted session cookie, refresh-rotation callback, CSRF handling) with no
> compensating benefit once the backend still owns the actual OAuth exchange either way. See
> constitution v2.0.0 Principle VI for the current rule. The analysis below is kept for historical
> context on the underlying constraint (backend sets no cookies, refresh token must stay
> server-only) that any solution — hand-rolled or NextAuth — still has to satisfy.

- **Decision**: The access token lives only in an in-memory client-side store (module-level, not
  persisted). The refresh token is **never held by client-side service functions at all** — it is
  owned exclusively by a small server-side proxy layer inside the webapp (Next.js Route Handlers,
  built by whichever app consumes `@game-hub/auth-service`), which stores it in a first-party
  httpOnly cookie and is the only caller of the backend's `/api/auth/refresh` and
  `/api/auth/google/callback` endpoints. `@game-hub/auth-service` exports this proxy logic as
  plain, framework-agnostic functions (`bff.ts`) for a Route Handler to call, plus the
  client-facing functions (`client.ts`) that call same-origin proxy routes instead of the backend
  directly for anything refresh-token-related.
- **Rationale**: This corrects the original spec clarification. Research against `openapi.yml`
  showed `/api/auth/refresh` requires `refreshToken` explicitly in the JSON request body
  (`RefreshRequestDto`) and `/api/auth/google/callback` returns both tokens as plain JSON
  (`LoginResponseDto`) — the backend sets no cookies at all, so a plain "httpOnly cookie set by the
  backend" (the original clarification answer) is not achievable without a backend change. A
  first-party cookie owned by a webapp-side proxy achieves the same XSS-resistance and
  reload-survival without touching the backend contract, and keeps the actual authentication
  artifact a JWT (constitution Principle VI: "JWT access/refresh tokens as the sole authentication
  mechanism") — the cookie here is a transport detail for that JWT, not a server-side session
  scheme, since no session state is stored server-side beyond holding the token itself.
- **Alternatives considered**: in-memory-only for both tokens (loses session on every reload — user
  confirmed this UX cost was worse than the added architecture); access-token-in-memory +
  refresh-token-in-`localStorage` (rejected on user's explicit request for a stronger option — XSS
  exposure of a long-lived credential).
- **Scope note**: Building the actual Next.js `app/api/.../route.ts` wiring is **out of scope** for
  this feature, since no `apps/*` Next.js application exists yet in this workspace. This feature
  delivers the framework-agnostic proxy logic (`bff.ts`) ready to be wired up with ~3 lines of
  Route Handler code whenever an app adopts it.

## 6. Retry policy for transient failures

- **Decision**: Automatic retry applies **only to `NETWORK_ERROR` and `SERVER_ERROR` results on
  safe (`GET`) requests** — up to 2 extra attempts, exponential backoff starting at 300ms. Mutating
  requests (`POST`/`PUT`/`PATCH`/`DELETE`) are never automatically retried by the generic policy,
  because several of them are not safe to repeat blindly (e.g., `POST /api/caro/matches/{id}/moves`
  submitting a move, `POST /api/caro/matches` creating a match) — repeating them on an ambiguous
  network failure risks a duplicate side effect the backend does not guarantee is idempotent.
  Session refresh (§5) has its own dedicated single-retry-after-refresh flow, independent of this
  generic policy.
- **Rationale**: Directly resolves the idempotency-boundary gap flagged during checklist review
  (`checklists/api.md` CHK023) by drawing the line at HTTP method safety, which is the closest
  approximation available to the backend without a per-endpoint idempotency contract.
- **Alternatives considered**: retrying all methods (rejected — risks duplicate mutations);
  retrying nothing automatically (rejected — the clarified requirement, FR-024, calls for
  automatic retry on transient failures).

## 7. Type source for request/response contracts

- **Decision**: Hand-written TypeScript interfaces per package, shaped directly from
  `04-Projects/api/openapi.yml`'s component schemas (captured in `data-model.md` and
  `contracts/*.ts`), rather than generated code.
- **Rationale**: Keeps this feature self-contained (no new codegen build step, no generated-file
  churn to review) while still satisfying FR-002 (explicit input/output types). The OpenAPI file is
  stable enough at this stage to hand-map without much risk.
- **Alternatives considered**: `openapi-typescript` or a NestJS-client codegen tool (rejected for
  this iteration — adds a build-time dependency and a generated-code review burden not requested by
  the feature; worth revisiting if the OpenAPI contract starts changing faster than the webapp can
  hand-track it).

## 8. Testing approach

- **Decision**: Vitest for unit tests of `withServiceResult`, the retry policy, and each package's
  response-mapping logic, using `axios`'s built-in adapter mocking (or `axios-mock-adapter`) rather
  than hitting the real backend.
- **Rationale**: The webapp constitution has no ratified testing principle yet
  (`TODO(TESTING_PRINCIPLE)`), so this is a pragmatic default, not a constitutional mandate. Vitest
  is fast, ESM/TS-native, and needs no additional config beyond what a Turborepo TS package already
  has.
- **Alternatives considered**: Jest (rejected — slower ESM/TS setup for no added benefit here);
  no automated tests (rejected — SC-005 requires compile-time type safety to be verifiable, and a
  minimal test suite is the only way to verify the HOF's runtime normalization behavior, which
  types alone cannot check).

## 9. Non-functional defaults (deferred items from spec)

- **Decision**: Per-request timeout of 10s before a call is treated as `NETWORK_ERROR` (eligible
  for retry per §6). No client-side logging/observability requirement is added in this feature.
- **Rationale**: These were flagged as low-impact outstanding items during `/speckit-clarify` and
  the requirements checklist; a reasonable default unblocks planning without a further clarification
  round. Revisit if a later feature adds observability requirements.
- **Alternatives considered**: leaving timeout unbounded (rejected — an unbounded hang can never
  resolve to a `ServiceResult`, breaking FR-001's "always returns a result" guarantee).
