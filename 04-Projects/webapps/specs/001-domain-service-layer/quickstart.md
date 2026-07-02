# Quickstart: Domain Service Layer for Backend Integration

Validates that the five domain packages (plus `service-core`) work end-to-end against the running
backend API. No `apps/*` webapp exists yet in this workspace, so validation happens at the package
level (typecheck, unit tests, and a scripted smoke call) rather than through a browser UI.

## Prerequisites

- Node.js 20 LTS, pnpm installed (`corepack enable` is sufficient).
- The backend API (`04-Projects/api`) running locally and reachable (see that project's own
  quickstart/README for `npm run start:dev`), with a valid Google OAuth test account available.
- This repo's root `pnpm install` completed after `/speckit-tasks` scaffolds `package.json` /
  `pnpm-workspace.yaml` / `turbo.json` and the six packages.

## 1. Install & build

```bash
pnpm install
pnpm turbo run build --filter=@game-hub/*
```

Expected: all six packages (`service-core`, `auth-service`, `account-service`,
`profiles-service`, `admin-service`, `caro-service`) build with zero TypeScript errors.

## 2. Typecheck the contracts

```bash
pnpm turbo run typecheck --filter=@game-hub/*
```

Expected: passes — confirms SC-005 (mismatched request/response shapes caught at compile time),
verifiable by intentionally passing a wrong-shaped input to any exported function in an editor and
observing a type error before running anything.

## 3. Unit tests (HOF normalization + retry policy)

```bash
pnpm turbo run test --filter=@game-hub/*
```

Expected: `withServiceResult` tests demonstrate that a mocked 200, 400, 401, 403, 404, and 5xx
response each normalize to the correct `ServiceResult` shape and `reason` (research.md §4), and
that a simulated network error on a `GET` triggers exactly 2 retries before returning
`NETWORK_ERROR` (research.md §6).

## 4. Manual smoke test — authenticate and fetch account (User Story 1 + 2)

This requires the backend running and reachable, plus a minimal Node script (no browser needed for
this smoke test since the OAuth browser redirect itself is out of scope for a package-level
check):

```ts
// scratch script, not part of the package — validates the client/bff split manually
import { getGoogleLoginUrl } from "@game-hub/auth-service/client";
import { exchangeGoogleCallback, rotateAccessToken } from "@game-hub/auth-service/bff";

console.log(getGoogleLoginUrl()); // -> paste into a browser, complete Google login manually,
// copy the `code` query param from the callback URL the backend redirects to

const result = await exchangeGoogleCallback({ code: "<paste code here>" });
console.log(result);
// Expected: { ok: true, data: { accessToken, account, refreshTokenCookieValue } }

const refreshed = await rotateAccessToken(result.data.refreshTokenCookieValue);
console.log(refreshed);
// Expected: { ok: true, data: { accessToken } } — a different token than the first accessToken
```

Expected outcome: both calls return `ok: true`; `account.email` matches the Google account used to
log in; the second `accessToken` differs from the first (confirms rotation, not a cached value).

## 5. Manual smoke test — a read across each package (User Stories 2–5)

Using the `accessToken` obtained above, wire a temporary `getAccessToken: () => accessToken` into
each package's http client and call one representative read from each:

| Package | Call | Expected |
|---|---|---|
| account-service | `getCurrentAccount()` | `ok: true`, `data.email` matches login |
| account-service | `listGames()` | `ok: true`, array includes a Caro entry |
| profiles-service | `listFriends()` | `ok: true`, array (possibly empty) |
| profiles-service | `getMyTrustScore()` | `ok: true`, `data.score` is a number |
| admin-service | `listReportsForModeration()` (non-admin account) | `ok: false`, `reason: 'UNAUTHORIZED'` |
| caro-service | `listGameConfigs()` | `ok: true`, non-empty array |
| caro-service | `getLeaderboard()` | `ok: true`, array (possibly empty) |

This exercises SC-001 (every operation reachable as a typed function), SC-003 (every result
handled through the same `ok`/`reason` pattern — note the admin-service row deliberately expects a
failure to confirm the uniform shape covers errors too), and the FR-005 failure taxonomy.

## Cleanup

No persistent state is created by this quickstart beyond whatever match/report/etc. records the
smoke test itself creates against the backend's dev database — discard or reset that database as
usual for the API project's own development workflow.
