# Quickstart: Validate Caro Guest Access

Prerequisites: app running locally with a Postgres instance migrated (existing `npm run start:dev` / dev DB setup — no new migrations for this feature), at least one `public` match and one `private` match seeded, plus one tournament.

Endpoint shapes referenced below are documented in [contracts/rest-api.md](contracts/rest-api.md).

## 1. Guest can browse and view without a token

```bash
BASE=http://localhost:3000

# Lobby — expect 200 with the public waiting/in-progress matches
curl -i "$BASE/caro/matches/lobby"

# A specific public match — expect 200
curl -i "$BASE/caro/matches/$PUBLIC_MATCH_ID"
curl -i "$BASE/caro/matches/$PUBLIC_MATCH_ID/moves"

# Tournaments — expect 200 (already public before this feature; confirm no regression)
curl -i "$BASE/caro/tournaments"
curl -i "$BASE/caro/tournaments/$TOURNAMENT_ID"
curl -i "$BASE/caro/tournaments/$TOURNAMENT_ID/participants"
```

Expected: every call above returns `200`, with no `Authorization` header sent.

## 2. Guest cannot view a private match

```bash
curl -i "$BASE/caro/matches/$PRIVATE_MATCH_ID"
```

Expected: `404`, same body shape as requesting a random nonexistent match ID. Not `403` (would confirm the match exists).

## 3. Guest is refused every restricted action

```bash
curl -i -X POST "$BASE/caro/matches" -H 'Content-Type: application/json' -d '{"configId":"...","visibility":"public"}'
curl -i -X POST "$BASE/caro/matches/$PUBLIC_MATCH_ID/join"
curl -i -X POST "$BASE/caro/quick-pair" -H 'Content-Type: application/json' -d '{"configId":"..."}'
curl -i -X POST "$BASE/caro/tournaments/$TOURNAMENT_ID/registrations"
curl -i -X POST "$BASE/caro/matches/$PUBLIC_MATCH_ID/chat" -H 'Content-Type: application/json' -d '{"content":"hi"}'
curl -i -X POST "$BASE/caro/tournaments/$TOURNAMENT_ID/chat" -H 'Content-Type: application/json' -d '{"content":"hi"}'
```

Expected: every call returns `401`, distinguishable from the `404`s above and from any `400`/`422` validation error — this is the signal the client uses to redirect to the login page (FR-013).

## 4. Expired/invalid token behaves as guest on view routes, not as an error

```bash
# Replace with any syntactically valid but expired/garbage JWT
curl -i "$BASE/caro/matches/lobby" -H "Authorization: Bearer eyJhbGciOiJI...expired"
```

Expected: `200` (same as with no header at all) — not `401`. Then confirm a *mutating* route still correctly rejects the same expired token:

```bash
curl -i -X POST "$BASE/caro/matches/$PUBLIC_MATCH_ID/join" -H "Authorization: Bearer eyJhbGciOiJI...expired"
```

Expected: `401`.

## 5. Live updates still reach a guest viewer

Connect a Socket.IO client to `/realtime` with no `auth.token`, `join_room` on `match:$PUBLIC_MATCH_ID`, have an authenticated player make a move via `POST /caro/matches/:id/moves` (gameplay controller), and confirm the guest socket receives the move broadcast — this path is unchanged by this feature (see research.md Decision 4) but is worth re-confirming as part of end-to-end validation.

## 6. Regression check — nothing previously restricted became public

Re-run step 3's list with a *valid* authenticated token for a non-participant account where relevant (e.g. joining someone else's match, leaving a match you're not in) and confirm existing 401/403/409 behaviors for those flows are unchanged.
