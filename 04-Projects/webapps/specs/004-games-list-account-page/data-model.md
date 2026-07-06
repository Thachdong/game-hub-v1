# Phase 1 Data Model: Games List & Account Profile Pages

## Entities

### Game

Source: `@game-hub/account-service`'s `Game` interface (`packages/account-service/src/types.ts`),
extended per research.md §4.

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | Existing. Stable identifier, not displayed. |
| `name` | `string` | Existing. Displayed as the Game Card's title (spec.md FR-001, FR-006). |
| `slug` | `string` | Existing. Used to derive `entryPath`/`profilePath` (see GameLinkTarget below); not displayed directly. |
| `hasProfile` | `boolean \| undefined` | Existing. `true` when the current account has played this game. `undefined`/absent for anonymous requests (Games List page) where profile status doesn't apply. Account page filters `listGames()`'s result to entries where this is `true` (spec.md FR-006, FR-008). |
| `bannerUrl` | `string` | **New** (research.md §4). The game's banner image, rendered by `GameCard`. Required — every catalog entry must have one for FR-001/FR-006 to hold. |

No lifecycle/state transitions on `Game` itself within this feature — it is read-only from both
pages' perspective.

### Account

Source: `@game-hub/account-service`'s `Account` interface — unchanged, no new fields needed.

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | Existing. Not displayed. |
| `email` | `string` | Existing. Displayed on the Account page (spec.md FR-004). |
| `username` | `string` | Existing. Displayed on the Account page (spec.md FR-004). |
| `avatarUrl` | `string` | Existing. Rendered via the existing `Avatar` atom; falls back to a default placeholder per spec.md Edge Cases when absent/empty. |

### GameLinkTarget (derived, not persisted)

A pure function's output — not a new stored entity, but the shape both pages compute per `Game` to
know where its card navigates (research.md §1):

| Field | Type | Derivation |
|---|---|---|
| `entryPath` | `string` | `` `/game-${game.slug}` `` — the game's own entry page (Games List page's link target, spec.md FR-002). |
| `profilePath` | `string` | `` `${entryPath}/profile` `` — that game's per-account profile page (Account page's link target, spec.md FR-007). |

Both fields are computed client/server-side from a `Game` record by a single shared helper
(`lib/game-routes.ts`, per research.md §2's plan.md reference) — never duplicated inline in either
page or in `GameCard`.

## Relationships

- One `Account` has zero-or-more `Game`s for which `hasProfile === true` (surfaced via the same
  `listGames()` call already scoped to the signed-in account through the cookie-configured
  service client — no separate "my games" endpoint).
- Every `Game` (regardless of `hasProfile`) has exactly one `GameLinkTarget`, computed the same way
  on both pages — this is what guarantees the two pages' cards look and link consistently
  (spec.md Assumptions: "Game cards use the same visual presentation... in both places").

## Validation Rules (from spec.md Functional Requirements)

- A `Game` rendered by either page MUST have a non-empty `name` and `bannerUrl` (FR-001/FR-006); if
  `bannerUrl` fails to load at render time, the card still renders `name` and remains clickable
  (spec.md Edge Cases) — this is a rendering fallback, not a data validation rejection.
- The Account page's Profiles section MUST render zero `Game` cards when `listGames()`'s result
  contains no entry with `hasProfile === true` (FR-005), and MUST render exactly one card per such
  entry otherwise (FR-006).
- The Games List page MUST render one card per entry in `listGames()`'s full result, independent of
  `hasProfile` (FR-001), and an empty-state message when that result is empty (FR-003).
