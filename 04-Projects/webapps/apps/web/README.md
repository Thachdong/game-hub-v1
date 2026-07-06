# web

First `apps/*` package in this Turborepo workspace. Next.js App Router webapp with Google sign-in
via NextAuth (Auth.js), delegating session/token lifecycle per
`.specify/memory/constitution.md` v2.0.0 Principle VI. See
`specs/002-login-layout-nextauth/` for the full spec, plan, and research behind this package.

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
└── api/auth/
    ├── [...nextauth]/   # NextAuth's own handler
    └── google/callback/ # proxies Google's OAuth callback to the backend (research.md §1)
```

`account`, `tournament`, `admin`, and the real content of `game-caro`/`game-caro/[matchId]` are
placeholders — their business logic ships in separate, future features (spec.md Assumptions).

## Session shape

`useSession()` (client) / `auth()` (server) return:

```ts
{
  user: { name?, email?, image? },
  account: { id, email, username, avatarUrl },
  accessToken: string,       // exposed to client code — attach as `Authorization: Bearer` yourself
  error?: "RefreshFailed",   // treat as signed-out if present (FR-004) — see below
  expires: string,
}
```

**Important**: `session.error === "RefreshFailed"` means the backend's refresh token is no longer
valid, but NextAuth's own `status` still reports `"authenticated"` (it only reflects whether a
session object exists, not this app-specific flag). Every place that branches on sign-in state
(`AppNav`, `(protected)/layout.tsx`, `RequireSignIn`) checks `!session?.error` in addition to
`status`/session presence — copy this pattern for any new component that needs to know if the
visitor is really signed in.

`refreshToken` is never present on the client-visible session — only inside NextAuth's
server-only encrypted token (see `lib/auth.ts`'s `jwt` callback).

## Wiring a new domain-service call from a Client Component

The existing packages (`@game-hub/account-service`, `@game-hub/profiles-service`,
`@game-hub/admin-service`, `@game-hub/caro-service`) are **Client-Component-only** — they hold
session/config state in module-level variables, which is safe in the browser (one JS instance per
tab) but would leak between users if ever called from a Server Component in this shared Node.js
process. Always call them from a `"use client"` component, wiring the session in once:

```ts
"use client";
import { useSession } from "next-auth/react";
import { configureAccountService, getCurrentAccount } from "@game-hub/account-service";

const { data: session } = useSession();
configureAccountService({
  baseURL: process.env.NEXT_PUBLIC_GAME_HUB_API_BASE_URL,
  getAccessToken: () => session?.accessToken ?? null,
});
```

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
