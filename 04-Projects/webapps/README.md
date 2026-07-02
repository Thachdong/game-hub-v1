# Game Hub Webapps

Turborepo + pnpm workspace holding the domain service layer that mediates all webapp ↔ backend-API
communication for the Game Hub backend (`04-Projects/api`). See
`specs/001-domain-service-layer/` for the full spec, plan, and contracts this was built from.

## Package layout

```text
packages/
├── service-core/       # shared: ServiceResult types, http client factory, retry policy, HOF
├── auth-service/        # Google OAuth session flow (client.ts browser-safe, bff.ts server-only)
├── account-service/     # current account, games list
├── profiles-service/    # friends, notifications, reports, trust score
├── admin-service/       # game-admin assignment, report moderation (platform-wide)
└── caro-service/        # Caro game configs, matches, gameplay, chat, leaderboard, tournaments
```

Each domain package depends on `@game-hub/service-core` via the pnpm `workspace:*` protocol and
exposes exactly one public entry point (`src/index.ts`), except `auth-service`, which adds a
`./bff` subpath export for server-only code — see its own section below. No package imports
another domain package; a consuming app wires session state into each one independently via its
`configure*Service` function (see "Wiring session state" below).

## The `ServiceResult<T>` pattern

Every exported service function returns `Promise<ServiceResult<T>>` — never throws for an expected
failure. `ServiceResult<T>` is a discriminated union:

```ts
type ServiceResult<T> = ServiceSuccess<T> | ServiceFailure;

interface ServiceSuccess<T> {
  ok: true;
  data: T;
  statusCode: number;
  message: string;
}

interface ServiceFailure {
  ok: false;
  reason: "UNAUTHENTICATED" | "UNAUTHORIZED" | "VALIDATION" | "NOT_FOUND" | "SERVER_ERROR" | "NETWORK_ERROR";
  statusCode: number;
  message: string;
  fieldErrors?: Record<string, string[]>; // only when reason === "VALIDATION"
}
```

Callers branch on `result.ok`, never on a raw HTTP status code — `reason` is the semantic meaning
of the failure (see `packages/service-core/src/with-service-result.ts` for the exact status-code
mapping). List/paginated endpoints return `CursorPage<T>` (`{ items: T[]; nextCursor: Cursor | null }`)
instead of a bare array; endpoints that don't paginate return a plain `T[]`.

## Wiring session state

No `apps/*` webapp exists yet in this workspace, so each domain package (except `auth-service`,
which owns its own token store) starts with a no-op access-token getter. A consuming app must call
each package's `configure*Service` once at startup:

```ts
import { getAccessToken, handleSessionRefresh } from "@game-hub/auth-service";
import { configureAccountService } from "@game-hub/account-service";

configureAccountService({
  baseURL: process.env.NEXT_PUBLIC_GAME_HUB_API_BASE_URL,
  getAccessToken,
  onUnauthenticated: handleSessionRefresh, // renews the session on a 401, retries once
});
```

`auth-service`'s own `refreshSession`/`logout` always call a same-origin proxy route (never the
backend directly) so the refresh token never reaches client-side JS; `configureAuthService` from
`@game-hub/auth-service/bff` sets the real backend base URL for the server-only exchange/rotate
calls a Route Handler makes.

## Adding a new service function

1. Add the request/response types to the package's `types.ts` (or reuse existing ones).
2. Add a new exported function in the relevant module, built with `withServiceResult`:

   ```ts
   import { withServiceResult, type ServiceResult } from "@game-hub/service-core";
   import { getClient } from "./http-client.js";

   export function myNewCall(input: MyInput): Promise<ServiceResult<MyOutput>> {
     return withServiceResult(getClient(), {
       method: "GET", // GET requests get automatic retry-on-transient-failure; mutations don't
       buildRequest: (data: MyInput) => ({ url: `/api/...`, params: data }),
       mapResponse: (data) => data as MyOutput,
     })(input);
   }
   ```

3. Re-export it from the package's `src/index.ts`.
4. Add a unit test mocking the axios instance (`getClient()`) with `axios-mock-adapter` — see any
   existing `*.test.ts` file in the package for the pattern.

## Commands

```bash
pnpm install
pnpm turbo run build --filter=@game-hub/*
pnpm turbo run typecheck --filter=@game-hub/*
pnpm turbo run test --filter=@game-hub/*
```
