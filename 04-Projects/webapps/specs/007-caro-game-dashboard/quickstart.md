# Quickstart: Validating the Caro Game Dashboard

Proves the dashboard's guest-viewable content, the guest-gated actions, and the realtime bridge
work end to end. See [data-model.md](data-model.md) for view-model shapes and
[contracts/](contracts/) for the proxy allowlist addendum and the SSE bridge contract.

## Prerequisites

- `apps/web` installed (`turbo run install` or workspace root install).
- This feature's changes applied: `(public)/game-caro/page.tsx` replaced with the real dashboard,
  `(protected)/tournament/page.tsx` removed, `apps/web/lib/proxy.ts`'s allowlist extended per
  `contracts/proxy-auth-policy-addendum.md`, and the new components/Route Handler in place.
- No live backend needed for the automated checks below — component and Route Handler tests mock
  `packages/caro-service` calls and the `socket.io-client` connection, matching the existing
  `proxy.test.ts` style.

## Automated validation (primary)

```bash
turbo run test --filter=@game-hub/web
```

Expected coverage, by user story:

1. **US1 (guest browse)**: dashboard page test renders with a mocked signed-out `useAuthSession()`
   and confirms all three tabs, the leaderboard panel, and every card type render their read-only
   fields; Join/Create Game/Register/Find Match controls are present (not hidden) and each one's
   test click confirms a redirect to `/login?callbackUrl=...` rather than the guarded action firing.
2. **US2/US3 (join/create)**: with a mocked signed-in session, clicking "Join" calls `joinMatch`
   and navigates to the match view; submitting the Create Game modal calls `createMatch` and the
   new match appears in the Lobby list without a reload.
3. **US4 (register)**: signed-in click on "Register" calls `registerForTournament` and the card's
   registered count updates.
4. **US5 (quick pair)**: signed-in click on a Quick Pair card calls `requestQuickPair`; a
   `"waiting"` response is followed by a mocked `quick_pair:matched` SSE event driving navigation
   to the match.
5. **Proxy addendum**: `proxy.test.ts` gains cases for the three new allowlisted tournament read
   paths (no cookie → forwarded, not synthesized-401) plus a regression case for
   `POST caro/tournaments/{id}/registrations` still requiring a cookie.
6. **Realtime bridge**: a test for `app/api/caro/realtime/route.ts` mocks the backend
   `socket.io-client` connection, emits a `lobby:updated` event on it, and asserts the Route
   Handler's SSE response stream contains a correctly formatted `event: lobby:updated` message.

## Manual/live validation (optional, requires a running backend)

1. Start `apps/web` (`turbo run dev --filter=@game-hub/web`) pointed at a real `BACKEND_URL`.
2. **As a guest** (no cookies), open `/game-caro`:
   - Confirm the Lobby, Tournament, and Quick Pair tabs render, each with real cards (Lobby via
     the already-guest-accessible `matches/lobby`; Tournament via this feature's new allowlist
     entries).
   - Confirm the Leaderboard panel shows its guest-safe fallback (not a 401 error) until
     research.md §2 row 2 (backend guard) ships — expected, documented limitation.
   - Click "Join" on a Lobby card → confirm redirect to `/login?callbackUrl=/game-caro`.
3. **Sign in**, repeat step 2's Join click → confirm it actually joins the match and navigates to
   the match view.
4. Open the Create Game modal, submit valid settings → confirm the new match appears at the top
   of the Lobby list immediately, no page reload.
5. From a second signed-in browser session, create or join a match → confirm the first session's
   Lobby list does **not** yet update live (expected until research.md §2 row 5 ships) but does
   update after a manual refresh — this documents the current, honest limitation rather than
   masking it.
6. Trigger Quick Pair from two separate signed-in sessions with the same game type → confirm both
   land in the same match once matched, without either session needing to refresh (this one
   already works today, since `quick_pair:matched` is already emitted by the backend).
