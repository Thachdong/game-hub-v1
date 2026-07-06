# Phase 0 Research: Games List & Account Profile Pages

## 1. How is a Game's navigation target (entry route, profile route) derived?

**Decision**: Adopt the convention `entryPath = "/game-${slug}"` for a game's own entry page, and
`profilePath = "${entryPath}/profile"` for that game's per-game profile page. Compute both from
`Game.slug` in a single small helper (e.g. `lib/game-routes.ts`), used by both new pages — not
duplicated inline.

**Rationale**: The only existing game, Caro, already has `slug: "caro"` (per
`packages/account-service/src/index.test.ts`) but lives at route `/game-caro`
(`apps/web/app/(public)/game-caro/`) — a `game-` prefix, not a bare slug. `Game` carries no
`entryPath`/`profilePath` field today, and adding one would require a backend contract change,
which is out of scope per this feature's confirmed scope boundary (spec.md Assumptions — building
destination pages, and by extension their backend-declared routes, is future work). The
`/game-${slug}` convention is the smallest rule that both (a) reproduces today's one real example
exactly and (b) gives every future game a predictable, collision-free entry route without any
backend change. `/${entryPath}/profile` extends that same rule one level for the profile
destination, consistent with the spec's requirement that the profile page be a distinct route from
the game entry route (spec.md FR-007, Assumptions).

**Alternatives considered**:
- *Use `Game.slug` directly as the route (`/${slug}`)* — rejected: contradicts the one real
  example (`/game-caro`, not `/caro`), so adopting it would require renaming the existing Caro
  route, which is out of scope for this feature.
- *Have the backend return `entryPath`/`profilePath` on `Game`* — rejected for now: would touch a
  shared package's contract and the backend API, both out of scope; revisit if a second game's
  actual route breaks the `/game-${slug}` pattern.
- *Hardcode a per-game lookup table in `apps/web`* — rejected: equivalent to the convention above
  but without the predictability benefit for games not yet added; a pure string-template function
  is simpler and covers the same one-game case today with no extra maintenance surface.

## 2. How do the new pages authenticate their `@game-hub/account-service` calls?

**Decision**: Export the existing private `configureAccountServiceFromCookies` helper from
`apps/web/lib/session.ts` (rename to `ensureAccountServiceConfigured` for clarity as a public API),
and have both new/changed `page.tsx` files call it before calling `listGames()` /
`getCurrentAccount()` — exactly the pattern `getSessionStatus()` already uses internally.

**Rationale**: `003-cookie-auth-migration` already solved "how does server-side code call
`@game-hub/account-service` with the visitor's cookie-derived access token" — `getSessionStatus()`
does this today but only exposes its *result*, not the configuration step itself, so a second
caller (the Games List page, which isn't fetching session status, just games) can't reuse it
without duplicating the cookie-read + `configureAccountService` call. Exporting the one function
avoids that duplication (Principle IV/V) and keeps a single source of truth for "how this app
authenticates outbound service calls," matching `003`'s plan.md note that this function is "the
one place any server-side code that needs the visitor's identity/backend access MUST go through."

**Alternatives considered**:
- *Duplicate the cookie-read + configure logic inline in each new page* — rejected: directly
  contradicts the existing code comment's own stated intent and Principle IV/V.
- *Call `getSessionStatus()` from the Games List page too, ignoring its account result* — rejected:
  works for the Account page (which needs the account anyway) but is wasteful and misleading for
  the Games List page, which must render for signed-out visitors too and shouldn't imply an auth
  check is happening.

## 3. Component approach for Game Card banner images

**Decision**: Render the banner as a plain `<img>` (not `next/image`), matching the existing
`Avatar` atom's pattern.

**Rationale**: `next.config.ts` has no `images.remotePatterns` configured for any external banner
host, and adding one is an infra change out of this feature's scope. The existing `Avatar` atom
already renders account avatars (also externally-hosted images) via plain `<img>`, so `GameCard`
follows the same established, already-reviewed pattern rather than introducing a second image
strategy.

**Alternatives considered**:
- *Configure `next/image` with `remotePatterns` for the banner host* — rejected: no banner host is
  known/declared yet (the only current game's banner URL shape isn't specified in `Game`'s type
  beyond `id`/`name`/`slug`/`hasProfile`... banner URL itself comes from wherever `Game` is
  extended to include it — see §4), and `next/image` config is an infra decision better made
  once, deliberately, for all remote images at once rather than piecemeal per feature.

## 4. Does `Game` need a banner image field?

**Decision**: `packages/account-service/src/types.ts`'s `Game` interface does not yet include a
banner-image field; this feature adds one (`bannerUrl: string`) to that shared type, since both
pages require it and it is a natural extension of an existing, already-shared service contract
(not a new package, not premature abstraction — Principle IV explicitly expects service contracts
to evolve).

**Rationale**: Re-reading `Game { id, name, slug, hasProfile? }` — there is no field for the card's
banner image, which both this spec's pages require. Since `Game` is already the shared,
cross-page-reusable type this feature depends on, and both consuming pages need the same new
field, adding `bannerUrl` here (rather than inventing a webapp-local parallel type) keeps a single
source of truth per Principle IV. This is the one small, additive shared-package touch this
feature requires; everything else about `@game-hub/account-service` is reused as-is.

**Alternatives considered**:
- *Derive a banner URL client-side from `slug` (e.g. `/banners/${slug}.png`)* — rejected: makes
  the webapp responsible for asset-location knowledge that belongs with whatever system manages
  game metadata, and silently breaks for any future game whose banner isn't a static local asset.
- *Leave banner out and use a static placeholder for every game* — rejected: fails spec.md FR-001
  ("each showing that game's banner image"), which requires a real, game-specific banner.

## 5. Styling

**Decision**: Follow Constitution Coding Conventions as-is (fixed CSS custom-property palette,
classic/vintage visual direction) — no new tokens or exceptions needed for this feature's cards or
empty-state text.

**Rationale**: Game Card and EmptyState are simple content containers; nothing about their content
requires a color or type treatment outside the six existing tokens (`--color-background`,
`--color-surface`, `--color-text-primary`, `--color-text-secondary`, `--color-border`,
`--color-accent`).

**Alternatives considered**: None — no motivation to deviate.
