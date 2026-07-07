# Quickstart: Validating Caro Guest Access

Proves the three allowlisted endpoints work through the proxy with no session, and that every
neighboring endpoint still requires one. See [contracts/proxy-auth-policy.md](contracts/proxy-auth-policy.md)
for the exact matching rule and [data-model.md](data-model.md) for the (unchanged) response
shapes.

## Prerequisites

- `apps/web` installed (`turbo run install` or workspace root install), and this feature's change
  to `apps/web/lib/proxy.ts` applied.
- No backend needs to be running for the automated checks below — `apps/web/lib/proxy.test.ts`
  mocks `fetch`, matching the existing test style in that file.

## Automated validation (primary)

```bash
turbo run test --filter=@game-hub/web -- proxy.test.ts
```

Expected: all existing cases in `apps/web/lib/proxy.test.ts` still pass (regression), plus new
cases proving:

1. `GET` to `caro/matches/lobby` with **no** `access_token` cookie set → the mocked `fetch` is
   called against the backend (not short-circuited), and the backend's response is relayed
   verbatim.
2. `GET` to `caro/matches/{id}` with **no** cookie → same as above.
3. `POST` to `caro/matches/{id}/moves` with **no** cookie → same as above.
4. A neighboring authed path on the same resource (e.g. `POST caro/matches/{id}/join`, or
   `DELETE caro/matches/{id}`) with **no** cookie → still returns the synthesized
   `401 { message: "Not signed in" }` with the mocked `fetch` **not** called (unchanged from
   today).
5. Any of the three allowlisted paths **with** a valid cookie set → behaves exactly as the
   existing "forwards with the Bearer header" test already proves for other paths (no regression
   in the has-cookie case).

## Manual/live validation (optional, requires a running backend)

1. Start `apps/web` (`turbo run dev --filter=@game-hub/web`) pointed at a real `BACKEND_URL`.
2. Without signing in (no `access_token` cookie in the browser), open dev tools and run:
   ```js
   await fetch("/api/proxy/caro/matches/lobby").then((r) => r.status); // expect 200, not 401
   ```
3. Repeat for a known match ID: `fetch("/api/proxy/caro/matches/<id>")` → expect 200 (or the
   backend's own 404 if the ID doesn't exist — not a webapp-side 401).
4. Confirm a neighboring authed action still 401s with no cookie, e.g.
   `fetch("/api/proxy/caro/matches/<id>/join", { method: "POST" })` → expect 401
   `{ message: "Not signed in" }`.
5. Sign in, repeat step 2 — confirm identical 200 response shape to the signed-out case (no
   regression for signed-in callers, per spec FR-005/FR-006).
