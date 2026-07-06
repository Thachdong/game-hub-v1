# web

First `apps/*` package in this Turborepo workspace. Next.js App Router webapp with Google sign-in,
session/token lifecycle implemented as hand-rolled Route Handlers plus first-party httpOnly
cookies (constitution `.specify/memory/constitution.md` v3.1.0 Principle VI — **NextAuth (Auth.js)
is NOT used**). See `specs/003-cookie-auth-migration/` for the migration off NextAuth and
`specs/005-auth-proxy-refactor/` for the generic proxy-route mechanism described below.

## Route structure

```text
app/
├── (public)/            # no auth gate
│   ├── login/           # FR-001, FR-011
│   └── game-caro/       # FR-008/FR-009 — viewable by anyone, gated actions only
│       └── [matchId]/
├── (protected)/         # (protected)/layout.tsx redirects to /login if signed out (FR-006, FR-007)
│   ├── account/
│   ├── tournament/
│   └── admin/           # plain sign-in gate only — no Platform Admin role check yet
└── api/
    ├── auth/
    │   ├── google/callback/ # the sole login entry point — forwards Google's OAuth callback to
    │   │                     # the backend, sets access_token/refresh_token as httpOnly cookies
    │   ├── session/          # GET — client revalidation endpoint (SessionStatus)
    │   └── logout/            # POST — clears both cookies
    └── proxy/
        └── [...path]/         # catch-all — the only way browser-initiated code reaches an
                                 # authenticated backend resource (see below)
```

`account`, `tournament`, `admin`, and the real content of `game-caro`/`game-caro/[matchId]` are
placeholders — their business logic ships in separate, future features (spec.md Assumptions).

## Session shape

`getSessionStatus()` (server-only, `lib/session.ts`) is the single source of truth for "is this
visitor signed in, and as whom":

```ts
interface SessionStatus {
  isSignedIn: boolean;
  account?: { id: string; email: string; username: string; avatarUrl: string };
}
```

Neither the access token nor the refresh token is ever part of this shape, or of any other
client-visible response — both live only as `httpOnly` cookies (`access_token`, `refresh_token`),
read exclusively by server-side code (`lib/session.ts`, `lib/proxy.ts`). `GET /api/auth/session`
returns this same shape as JSON for client-side revalidation; `POST /api/auth/logout` clears both
cookies.

## Reaching an authenticated backend resource

There are two supported ways for `apps/web` code to reach a backend resource on a signed-in
visitor's behalf — pick based on where the call originates, never invent a third:

**From a Server Component** (e.g. the account page's data fetching): read the `access_token`
cookie, call the matching `ensure*ServiceConfigured()` helper from `lib/session.ts` (currently
`ensureAccountServiceConfigured` — see that file for the pattern), then call the domain-service
package's typed function directly:

```ts
import { cookies } from "next/headers";
import { getCurrentAccount } from "@game-hub/account-service";
import { ACCESS_COOKIE_NAME, ensureAccountServiceConfigured } from "@/lib/session";

const accessToken = (await cookies()).get(ACCESS_COOKIE_NAME)?.value ?? null;
await ensureAccountServiceConfigured(accessToken);
const result = await getCurrentAccount();
```

**From a Client Component**: never call a domain-service package with a client-held token —
instead configure it once to point at the catch-all proxy route, with no token attached
client-side at all (the proxy attaches the real one server-side):

```ts
"use client";
import { configureAccountService, getCurrentAccount } from "@game-hub/account-service";

configureAccountService({ baseURL: "/api/proxy", getAccessToken: () => null });
const result = await getCurrentAccount(); // → forwarded through /api/proxy/[...path]
```

Every domain-service package (`account-service`, `profiles-service`, `admin-service`,
`caro-service`) accepts this identically — see
`specs/005-auth-proxy-refactor/contracts/proxy-routes.md` for the full contract and
`specs/005-auth-proxy-refactor/research.md` §4–§8 for why the proxy route itself is allowed to
`fetch` the backend directly while every other route/component in this app is not.

## Adding a new protected or public page

- **Protected** (requires sign-in): add a folder under `app/(protected)/`. The layout there
  already gates it — no per-page auth code needed, unless the page also needs a specific
  permission beyond "signed in" (not yet built — see `admin/page.tsx`'s note).
- **Public** (viewable by anyone): add a folder under `app/(public)/`. If any action on the page
  needs sign-in, wrap it with `RequireSignIn` (see `components/molecules/RequireSignIn.tsx` and
  its usage in `game-caro/page.tsx`) rather than gating the whole page.
- Every page automatically gets the shared `AppNav` chrome from the root layout — no per-page
  wiring needed for that.

## Commands

```bash
pnpm install
pnpm --filter web dev
pnpm --filter web run build
pnpm --filter web run typecheck
pnpm --filter web run test
pnpm --filter web run lint
```
