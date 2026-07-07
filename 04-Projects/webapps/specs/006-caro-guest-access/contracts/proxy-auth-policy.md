# Contract: Proxy Auth Policy for Caro Match Endpoints

This documents the exact matching contract `forwardToBackend` (`apps/web/lib/proxy.ts`) must
implement for the "no cookie required" exception. It is the interface between the generic proxy
and every caller (`packages/caro-service`'s `matches.ts` / `gameplay.ts` today; any future
resource that needs the same treatment later).

## Matching rule

A proxied request is **optional-auth** (allowed to proceed with no `access_token` cookie) only if
its HTTP method and full path-segment sequence (as already parsed by the catch-all Route Handler,
i.e. everything after `/api/proxy/`) exactly match one of:

| # | Method | Path segments | Real endpoint |
|---|---|---|---|
| 1 | `GET` | `["caro", "matches", "lobby"]` | `GET /api/caro/matches/lobby` |
| 2 | `GET` | `["caro", "matches", <any single segment>]` | `GET /api/caro/matches/:id` |
| 3 | `POST` | `["caro", "matches", <any single segment>, "moves"]` | `POST /api/caro/matches/:id/moves` |

Segment count and every literal segment (`"caro"`, `"matches"`, `"lobby"`, `"moves"`) must match
exactly; `<any single segment>` matches exactly one path segment of any value (the match ID),
never zero and never more than one.

Any request not matching one of the three rows above — regardless of resource — keeps today's
behavior: missing cookie → synthesized `401 { message: "Not signed in" }`, backend never called.

## Explicit non-matches (must remain authed)

These sit one segment away from an allowlisted shape and must **not** be loosened by an overly
broad match (e.g. a prefix match on `["caro", "matches"]`, or matching any method on
`["caro", "matches", id]`):

| Method | Path segments | Why it's excluded |
|---|---|---|
| `POST` | `["caro", "matches"]` | Create match — different segment count than row 1/2. |
| `POST` | `["caro", "matches", id, "join"]` | Extra trailing segment vs. row 2. |
| `POST` | `["caro", "matches", id, "leave"]` | Extra trailing segment vs. row 2. |
| `DELETE` | `["caro", "matches", id]` | Same segments as row 2 but a different method (creator-cancel) — method must be checked, not just path. |
| `POST` | `["caro", "matches", id, "invite"]` | Extra trailing segment vs. row 2. |
| `PUT` | `["caro", "matches", id, "invitation", "respond"]` | Different segment count/method. |
| `POST` | `["caro", "matches", id, "start"]` | Extra trailing segment vs. row 2. |
| `POST` | `["caro", "matches", id, "surrender"]` | Extra trailing segment vs. row 2. |
| `POST` | `["caro", "matches", id, "draw-request"]` | Extra trailing segment vs. row 2. |
| `PUT` | `["caro", "matches", id, "draw-request", "respond"]` | Different segment count/method. |
| `GET` | `["caro", "matches", id, "moves"]` | Same segments as row 3 but a different method (this path doesn't exist as GET today; must not be silently allowed if ever added without deliberate review). |

## Behavior when a cookie IS present

Unaffected regardless of path. The existing flow (attach `Authorization: Bearer <token>`;
on a `401` from the backend, call `refreshSession()` once and retry; on refresh failure, return
the synthesized `401`) applies identically whether or not the path is in the allowlist above. The
allowlist is consulted **only** when there is no `access_token` cookie at all.

## Behavior when the path is allowlisted and there is no cookie

Forward the request to the backend exactly as built today (same URL construction, same query
string and body passthrough), but with no `Authorization` header. Relay the backend's response
verbatim (unchanged `relay()` behavior) — including if the backend itself returns a 401/403 for
some other reason (e.g. a malformed match ID); the webapp must not intercept or rewrite that
response.
