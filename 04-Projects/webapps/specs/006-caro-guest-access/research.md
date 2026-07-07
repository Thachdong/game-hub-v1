# Phase 0 Research: Caro Guest Access

No `[NEEDS CLARIFICATION]` markers remain in `plan.md`'s Technical Context — this feature reuses
`005-auth-proxy-refactor`'s existing mechanism end to end, so there is no new technology choice or
integration pattern to evaluate. This document records the one real design decision (where to put
the allowlist) and the alternatives rejected.

## §1. Where should the "no-cookie-required" exception live?

**Decision**: Add a small allowlist check inside `apps/web/lib/proxy.ts`'s `forwardToBackend`,
keyed on `(HTTP method, path-segment shape)`, evaluated only when the `access_token` cookie is
absent. If the incoming request matches one of the three allowlisted shapes, forward it without an
`Authorization` header instead of short-circuiting with a synthesized 401. If a cookie *is*
present, behavior is completely unchanged (attach it, refresh-and-retry-once on a 401, exactly as
today) regardless of whether the path is allowlisted — the allowlist only ever relaxes the
no-cookie case, it never special-cases the has-cookie case.

**Rationale**:
- `forwardToBackend` is the single place today that decides "no cookie → refuse," for every
  domain-service package's proxied traffic (account, profile, admin, caro). It's the natural,
  smallest-blast-radius place to carve out three specific exceptions, mirroring how
  `005-auth-proxy-refactor` itself reasoned about Principle II/IV/VI carve-outs living in this one
  function rather than being duplicated per resource.
- The three now-public endpoints are heterogeneous in shape (`GET .../lobby`, `GET .../:id`,
  `POST .../:id/moves`) and sit alongside sibling paths on the *same* resource that must stay
  authed (`POST .../:id/join`, `DELETE .../:id`, `POST .../:id/invite`, etc.). A per-path-segment
  match (not just a prefix match on `/api/caro/matches`) is required to avoid accidentally
  loosening those neighbors.
- Keeping the exception list as data (an array of `{ method, matches(segments) }` entries) inside
  the one function that already owns this decision keeps `packages/caro-service` and the Route
  Handler completely untouched, satisfying Principle IV (service-interface layer doesn't need to
  know about the webapp's auth gate) and Principle V (no premature shared abstraction — this is
  three lines of data, not a policy engine).

**Alternatives considered**:
- *Bypass the proxy for these three calls and have `packages/caro-service` hit the backend
  directly.* Rejected: reintroduces the exact client-held-token/direct-fetch anti-pattern
  Principle VI and `005-auth-proxy-refactor` eliminated, and would require a second base-URL
  wiring path just for three endpoints.
- *A new dedicated Route Handler per allowlisted endpoint (e.g.
  `app/api/caro/matches/lobby/route.ts`), bypassing the generic catch-all for just these three.*
  Rejected: duplicates the request-forwarding logic `forwardToBackend` already has (query string,
  body passthrough, content-type handling), for no benefit — the generic proxy already receives
  method + path verbatim and can express "three specific paths behave differently" with a single
  small conditional.
- *A config-driven allowlist (e.g. a JSON/env list of public paths) instead of an inline array.*
  Rejected as premature: three fixed, known-in-advance paths don't warrant an external
  configuration surface; Principle V's "no premature abstraction" applies here too. If a fourth
  or fifth endpoint needs this later, promoting to a small config file is a cheap follow-up, not a
  blocker now.

## §2. Does relaxing the gate change refresh/retry behavior?

**Decision**: No change. The refresh-and-retry-once-on-401 path in `forwardToBackend` is entirely
orthogonal to the allowlist — it only ever runs when a cookie *was* present and the backend
rejected it. The allowlist only affects the branch that currently runs when the cookie is
*absent*. These are mutually exclusive branches today and remain so.

**Rationale**: Confirmed by reading `forwardToBackend`'s current control flow
(`apps/web/lib/proxy.ts`): the `if (!accessToken) return unauthenticatedResponse()` guard and the
`if (backendResponse.status === 401) { refresh... }` retry logic never interact — the former
exits before any backend call is made, the latter only triggers after a backend call was already
made with a token. No alternative was needed here; this is a direct code-reading finding, not a
choice between options.
