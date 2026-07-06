# Game Hub Webapps

Turborepo + pnpm workspace holding the domain service layer that mediates all webapp ↔ backend-API
communication for the Game Hub backend (`04-Projects/api`). See
`specs/001-domain-service-layer/` for the full spec, plan, and contracts this was built from.

## Package layout

```text
packages/
├── service-core/       # shared: ServiceResult types, http client factory, retry policy, HOF
├── account-service/     # current account, games list
├── profiles-service/    # friends, notifications, reports, trust score
├── admin-service/       # game-admin assignment, report moderation (platform-wide)
└── caro-service/        # Caro game configs, matches, gameplay, chat, leaderboard, tournaments
```

Each domain package depends on `@game-hub/service-core` via the pnpm `workspace:*` protocol and
exposes exactly one public entry point (`src/index.ts`). No package imports another domain
package; a consuming app wires session state into each one independently via its
`configure*Service` function (see "Wiring session state" below).

**Note:** There is no `auth-service` package. Session/token lifecycle (login, refresh, logout) is
implemented as hand-rolled Next.js Route Handlers inside each `apps/*` Next.js app: a login route
calls the backend's `/login` API and sets the returned access/refresh tokens as first-party
httpOnly cookies, and a proxy route reads the access token from that cookie server-side to call
backend resource endpoints on the client's behalf. NextAuth (Auth.js) is NOT used — see
`.specify/memory/constitution.md` v3.0.0 Principle VI and
`specs/001-domain-service-layer/research.md` §5 for the history of prior approaches that were
tried and retired.

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

Each domain package starts with a no-op access-token getter. A consuming app must call each
package's `configure*Service` once at startup, wiring in a `getAccessToken`/`onUnauthenticated`
pair sourced from the webapp's own httpOnly cookie — read server-side inside a proxy Route Handler,
never exposed to client-side code (see constitution v3.0.0 Principle VI):

```ts
import { configureAccountService } from "@game-hub/account-service";

configureAccountService({
  baseURL: process.env.NEXT_PUBLIC_GAME_HUB_API_BASE_URL,
  getAccessToken: () => readAccessTokenCookie(), // server-side only, from the httpOnly cookie
  onUnauthenticated: async () => {
    /* call the webapp's own refresh route, which rotates the cookies; return the new access token or null */
  },
});
```

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
