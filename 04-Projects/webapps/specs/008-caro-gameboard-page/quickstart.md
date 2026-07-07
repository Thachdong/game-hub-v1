# Quickstart: Validating the Caro Match Gameboard Page

Proves the four gameboard states, the guest/participant/spectator permission boundaries, and the
realtime match room work end to end. See [data-model.md](data-model.md) for view-model shapes and
[contracts/](contracts/) for the SSE bridge and proxy allowlist addenda.

## Prerequisites

- `apps/web` installed (`turbo run install` or workspace root install).
- This feature's changes applied: `(public)/game-caro/[matchId]/page.tsx` replaced with the real
  gameboard (was "Coming soon"), the new board/player-card/viewer-list/chat/countdown/replay
  components in place, `apps/web/app/api/caro/realtime/route.ts` extended per
  `contracts/realtime-bridge-addendum.md`, and `apps/web/lib/proxy.ts`'s allowlist extended per
  `contracts/proxy-auth-policy-addendum.md`.
- `04-Projects/api` changes already applied (this feature's plan): `join-match.use-case.ts`'s
  start window is 15s; `MatchController`/`ChatController` read routes use `OptionalJwtGuard`.
- No live backend needed for the automated checks below — component and Route Handler tests mock
  `packages/caro-service`/`packages/profiles-service` calls and the `socket.io-client` connection,
  matching the existing `realtime.test.ts` style from spec 007.

## Automated validation (primary)

```bash
turbo run test --filter=@game-hub/web
```

Expected coverage, by user story:

1. **US1 (guest spectate)**: page test renders with a mocked signed-out `useAuthSession()` for a
   match in each of the four states and confirms the board, both cards (or the waiting
   placeholder), viewer list, and chat history render; clicking Start/Request Draw/Surrender/a
   board cell/Report/a viewer's kick control each redirects to `/login?callbackUrl=...` rather than
   calling the corresponding `caro-service`/`profiles-service` function.
2. **US2 (waiting for opponent)**: signed-in, `playerO: null` — own card + waiting placeholder +
   chat render; a mocked `match:player_joined` SSE event swaps in the opponent card and countdown
   without a re-render of the whole page (no reload).
3. **US3 (start / auto-cancel)**: signed-in as creator — Start control calls `startMatch`; signed-in
   as the non-creator participant — Start control is present but inert (no call fires); a mocked
   countdown reaching the `deadlineAt` with no `match:started` event received drives the UI to the
   ended state client-side (matching what a real `match:cancelled` event would do), and a test
   confirms `match:cancelled` handling separately.
4. **US4 (active play)**: signed-in participant on `currentTurnPlayerId === self` — clicking a board
   cell calls `submitMove`; a mocked `match:move_placed` event appends to the board; "Request Draw"
   calls `requestDraw`; "Surrender" calls `surrenderMatch`; a mocked `match:draw_requested` targeted
   at the other participant renders accept/decline instead of the request button.
5. **US5 (review moves)**: `status: 'completed'` — clicking "Review Moves" steps `replayIndex`
   through `moves` and the board re-renders the board state at each index, without calling any
   service function (pure client-side derivation from already-fetched `moves`).
6. **Permission boundaries**: a signed-in spectator (account id matching neither `playerX.id` nor
   `playerO.id`) sees Start/Draw/Surrender/move/kick redirect exactly like a guest, but chat send
   and Report succeed (call their service functions) — covers FR-014/FR-015 directly.
7. **Realtime bridge**: `route.test.ts` gains a case asserting `?matchId=` triggers a `join_room`
   emit on the mocked socket and that each new forwarded event name produces a correctly framed SSE
   message.
8. **Proxy addendum**: `proxy.test.ts` gains a case for `GET caro/matches/{id}/chat` proceeding
   with no cookie (forwarded, not synthesized-401), plus a regression case confirming
   `POST caro/matches/{id}/chat` and `.../chat/mute` still require one.

## Manual/live validation (optional, requires a running backend)

1. Start `apps/web` (`turbo run dev --filter=@game-hub/web`) and `04-Projects/api`
   (`npm run start:dev`), both pointed at each other via `BACKEND_URL`.
2. Create a match as Player A (via the 007 dashboard's Create Game modal), open its gameboard URL
   in a second, signed-out browser (guest) — confirm the board, Player A's card, the waiting
   placeholder, and chat history render with no sign-in prompt, and that clicking Start/typing in
   chat redirects to `/login`.
3. Join the match as Player B (second signed-in session) — confirm Player A's tab updates live
   (opponent card + countdown appear) with no reload, and that only Player A (the creator) has a
   working Start control; Player B's Start control has no effect.
4. Let the 15-second countdown expire without clicking Start — confirm both tabs show the ended
   state within about a second.
5. Repeat matchmaking, this time clicking Start as the creator before the countdown ends — confirm
   both tabs transition to in-progress, alternating moves appear live on both boards, and the
   guest's board updates too.
6. From Player A, click "Request Draw" — confirm Player B sees an accept/decline prompt; accepting
   ends the match as a draw for both.
7. Start a fresh match and have Player A surrender — confirm both tabs immediately show the ended
   state with Player B as winner, and "Review Moves" replays the exact recorded sequence.
8. As the guest tab, confirm the viewer list gains an entry once a third signed-in spectator opens
   the same match URL, and that only Player A/B's clients can mute that spectator (mute call
   succeeds only from a participant's session).
