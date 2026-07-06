# Quickstart: Games List & Account Profile Pages

Validates the two pages end-to-end against a running `apps/web` dev server. Assumes the backend
API (whatever `NEXT_PUBLIC_GAME_HUB_API_BASE_URL`/`BACKEND_URL` point at per existing `apps/web`
env config) is reachable and seeded per the scenarios below — see data-model.md for the exact
fields each scenario's fixture data must include.

## Prerequisites

- `apps/web`'s existing `.env` configuration (unchanged by this feature).
- Backend seeded with:
  - At least one `Game` (`name`, `slug`, `bannerUrl`) for the "catalog has games" scenarios.
  - One test account with no played games (no `hasProfile: true` entries for it).
  - One test account with at least one played game (`hasProfile: true` for that game).

## Setup

```bash
turbo run dev --filter=web
```

## Scenario 1 — Games List page (public, populated catalog)

1. Open `/` without signing in.
2. **Expect**: one Game Card per seeded game, each showing its banner and name (spec.md FR-001).
3. Click any card.
4. **Expect**: navigation to that game's entry page at `/game-${slug}` (spec.md FR-002,
   research.md §1) — no sign-in prompt is forced by this navigation itself.

## Scenario 2 — Games List page (empty catalog)

1. With the backend's game catalog temporarily empty, open `/`.
2. **Expect**: an empty-state message in place of the grid (spec.md FR-003) — no blank grid area.

## Scenario 3 — Account page, no played games

1. Sign in as the test account with no played games.
2. Open `/account`.
3. **Expect**: username, email, and avatar are all displayed (spec.md FR-004).
4. **Expect**: the Profiles section shows the "no profile yet" message and zero Game Cards
   (spec.md FR-005).

## Scenario 4 — Account page, at least one played game

1. Sign in as the test account with ≥1 played game.
2. Open `/account`.
3. **Expect**: the Profiles section shows exactly one Game Card per game where `hasProfile: true`
   (spec.md FR-006) — and none for games that account hasn't played.
4. Click one of those cards.
5. **Expect**: navigation to `/game-${slug}/profile` (spec.md FR-007, research.md §1) — distinct
   from the `/game-${slug}` destination in Scenario 1.

## Scenario 5 — Account page, signed out

1. Without signing in, request `/account` directly.
2. **Expect**: redirect to `/login` (existing `(protected)/layout.tsx` gate, unchanged by this
   feature — spec.md FR-009).

## Edge cases to spot-check

- A game whose `bannerUrl` 404s: card still renders its name and remains clickable (spec.md Edge
  Cases).
- An account with no `avatarUrl`: Account page shows a default placeholder in its place (spec.md
  Edge Cases).
