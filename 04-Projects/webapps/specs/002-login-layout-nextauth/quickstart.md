# Quickstart: Login Page, Webapp Layout, and NextAuth Session Setup

Validates the sign-in flow, shared layout, and route protection end-to-end against a running
backend. This is the first `apps/*` package in the workspace, so this quickstart also covers
first-time app setup.

## Prerequisites

- Node.js 20 LTS, pnpm (`corepack enable`).
- The backend API (`04-Projects/api`) running locally and reachable, with a Google OAuth test
  account available.
- **External config change coordinated separately** (research.md §1, decided with the user
  2026-07-03): the backend's `callbackUrl` env var must be set to
  `http://localhost:3000/api/auth/google/callback` (or the deployed webapp's equivalent URL) —
  **not** the backend's own origin — and that same URL registered as an authorized redirect URI in
  Google Cloud Console. Without this, sign-in will fail at the Google consent step with a
  `redirect_uri_mismatch` error. This quickstart cannot proceed past step 3 until this is done.
- `apps/web/.env.local` with: `NEXT_PUBLIC_GAME_HUB_API_BASE_URL` (backend origin, used by the
  domain service packages per their existing `configure*Service` pattern), `BACKEND_URL` (same
  origin, used server-side by the `/api/auth/google/callback` Route Handler), `AUTH_SECRET`
  (NextAuth's session-encryption secret — generate via `npx auth secret`).

## 1. Install & build

```bash
pnpm install
pnpm turbo run build --filter=web
```

Expected: `apps/web` builds with zero TypeScript errors, alongside the existing `packages/*`.

## 2. Run the dev server

```bash
pnpm --filter web dev
```

Expected: app reachable at `http://localhost:3000`.

## 3. Manual smoke test — sign in (User Story 1)

1. Visit `http://localhost:3000/login`. Expected: a "Sign in with Google" button, no account
   information shown, `AppNav` shows the signed-out affordance (FR-005).
2. Click it. Expected: full-page navigation to the backend's `/api/auth/google`, then to Google's
   consent screen.
3. Complete consent with a real Google test account. Expected: browser lands back on the webapp
   (not the backend's raw-JSON page — confirms research.md §1's proxy is wired correctly), signed
   in, `AppNav` now shows the account's username/avatar.
4. Reload the page. Expected: still signed in, no re-authentication prompt (SC-003) — and no
   visible flash of the signed-out state before the account chrome appears (SC-006, FR-012).

## 4. Manual smoke test — route protection (User Story 3)

1. While signed out (use a private/incognito window), navigate directly to
   `http://localhost:3000/account`. Expected: redirected to `/login?callbackUrl=%2Faccount`, not
   shown any account page content (FR-006, SC-002).
2. Complete sign-in from that redirected login page. Expected: landed back on `/account`, not the
   homepage (FR-007).
3. Repeat for `/tournament` and `/admin` — both redirect identically; `/admin` does **not** require
   anything beyond being signed in (spec.md Clarifications, 2026-07-03 — no Platform Admin check in
   this feature).

## 5. Manual smoke test — public pages stay public (User Story 4)

1. While signed out, visit `/game-caro`. Expected: page renders (placeholder content), no redirect
   to login (FR-008, SC-005).
2. Attempt a gated action on the page (per the placeholder's join/chat/report/play hook points).
   Expected: prompted to sign in, not a silent failure or thrown error (FR-009).

## 6. Manual smoke test — sign out

1. While signed in, use `AppNav`'s sign-out affordance. Expected: session ends, landed on a public
   page signed out (User Story 2, Acceptance Scenario 3).
2. If a second tab was open and signed in, perform any authenticated action in it. Expected: that
   tab no longer acts as signed in on its next authenticated action (Edge Cases).

## Known Limitations (explicitly out of scope for this feature)

- `/account`, `/tournament`, `/admin`, and the real (non-placeholder) content of `/game-caro` /
  `/game-caro/[matchId]` are route-structure placeholders only — their business logic ships in
  separate, future features (spec.md Assumptions).
- No automated end-to-end test (Playwright or similar) is included — validation here is manual per
  the steps above; component-level tests (Vitest + React Testing Library) cover `AppNav`,
  the login page's error states, and the `(protected)/layout.tsx` redirect logic in isolation (see
  tasks.md once generated).
- The known backend gap where `/api/caro/game-configs` and `/api/caro/matches/lobby` require a
  Bearer token despite being "public view" pages (flagged in `001-domain-service-layer`'s
  conversation history) is being addressed by the user separately; this quickstart's step 5 assumes
  it is either already fixed or that the placeholder page tolerates the resulting failure
  gracefully.

## Cleanup

No persistent state beyond the browser's NextAuth session cookie and whatever the backend's own
dev database accumulates from sign-ins during testing.
