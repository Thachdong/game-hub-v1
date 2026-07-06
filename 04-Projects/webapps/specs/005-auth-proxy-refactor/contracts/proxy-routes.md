# Contract: Proxy Route Handler

**Revised during `/speckit-clarify`**: a single catch-all Route Handler, not one per resource
(research.md §4).

## `ALL /api/proxy/[...path]` (new)

`apps/web/app/api/proxy/[...path]/route.ts`, methods `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, each
a thin wrapper around `forwardToBackend(request, params.path)` (`apps/web/lib/proxy.ts`).

- **Request**: any method above; `[...path]` is forwarded as the backend path
  (`/api/proxy/accounts/me` → backend `/api/accounts/me`, prefix aside — exact prefix mapping is
  an implementation detail); query string and request body (for non-`GET`/`HEAD`) are forwarded
  unchanged. The incoming request's own `Authorization` header, if any, is ignored — the only
  token ever used is the one read from the httpOnly `access_token` cookie server-side.
- **Behavior**:
  1. No `access_token` cookie → `401 { message: "Not signed in" }`, no backend call.
  2. Valid `access_token` → forwards to `${BACKEND_URL}/<path>` with
     `Authorization: Bearer <access_token>` attached, relays the backend's response verbatim
     (status, body, `Content-Type`).
  3. Backend responds `401` → calls the existing `refreshSession()` (`lib/session.ts`, unchanged);
     on success, retries the forward once with the rotated token and relays that response; on
     failure, returns `401 { message: "Not signed in" }`.
- **Response**: the backend's own status/body relayed verbatim, or the synthetic
  `401 ProxyUnauthenticatedBody` above (data-model.md).
- **MUST NOT** be used for the existing auth routes (`/api/auth/login`, `/api/auth/refresh`,
  `/api/auth/logout`, `/api/auth/session`) — those keep their own dedicated Route Handlers
  (`003-cookie-auth-migration/contracts/auth-routes.md`); this route is for backend *resource*
  endpoints only.

## Client-side usage (research.md §5)

A Client Component reaches any backend resource through the domain-service package it already
uses, configured once to point at this route instead of the real backend origin:

```ts
configureAccountService({ baseURL: "/api/proxy", getAccessToken: () => null });
```

Every one of the four domain-service packages (`account-service`, `profiles-service`,
`admin-service`, `caro-service`) accepts this identically — no package-specific change, no new
per-package server-side wiring. `getCurrentAccount()` (or any other exported function) then works
exactly as it does today; only the origin its underlying HTTP client points at differs.
