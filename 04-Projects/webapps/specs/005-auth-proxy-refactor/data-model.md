# Phase 1 Data Model: Auth Service Interface Audit & Proxy Route Refactor

No database or persistent storage is introduced or changed by this feature (unchanged from
`003-cookie-auth-migration` — JWTs in httpOnly cookies remain the sole auth artifact). The shapes
below are the transient, request-scoped values this feature adds on top of `003`'s existing
`SessionStatus`/`LoginResult`/`RefreshResult` (see `specs/003-cookie-auth-migration/data-model.md`,
unchanged by this feature).

**Revised during `/speckit-clarify`**: the proxy mechanism is a single catch-all Route Handler
that forwards raw requests (research.md §4), not a per-resource Route Handler calling a typed
domain-service function server-side. There is no new "Domain Service Configuration Contract"
formalization needed server-side — the existing `configure*Service({ baseURL, getAccessToken })`
shape (`@game-hub/service-core`'s `HttpClientConfig`, unchanged) is reused exactly as-is, just
pointed at the proxy prefix from client-side code (research.md §5).

## Proxy Response (client-visible)

The only shapes `apps/web/app/api/proxy/[...path]/route.ts` ever sends to the browser. Never
contains a token.

```ts
// The backend's own response, relayed verbatim: same status code, same body, same
// Content-Type. No transformation — see research.md §6 for why passthrough (not re-shaping)
// is the decision.

// The two cases the proxy itself produces, without ever reaching the backend:
interface ProxyUnauthenticatedBody {
  message: "Not signed in";
}
```

- Produced by `forwardToBackend()` (`apps/web/lib/proxy.ts`, research.md §4).
- On a successful (or backend-error, non-auth-related) forward, the response is the backend's own
  status code and body, untouched — a Client Component's own `ServiceResult` mapping
  (`@game-hub/service-core`'s `withServiceResult`, unchanged) parses it exactly as it would a
  direct backend response.
- A missing access-token cookie, or a failed refresh attempt after a `401`, both short-circuit to
  `401 ProxyUnauthenticatedBody` without forwarding to (or, in the refresh-failed case, without a
  further call to) the backend (FR-004's "no cookie at all" / "refresh also invalid" edge cases).

## State transitions (proxy call, layered on `003`'s existing session states)

```
browser calls /api/proxy/**
  no access_token cookie            → 401 ProxyUnauthenticatedBody, no backend call
  access_token valid                → backend call forwarded → backend's own status/body relayed
  access_token expired, refresh ok  → transparent refresh (existing refreshSession(), unchanged)
                                       → retried forward → backend's own status/body relayed
  access_token expired, refresh not ok (refresh token invalid too)
                                     → 401 ProxyUnauthenticatedBody
  backend call fails for any other reason (validation, not found, server error)
                                     → backend's own status/body relayed verbatim, no refresh attempted
```
