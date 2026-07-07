# Contract Addendum: Tournament REST Endpoints

Addendum to the existing `04-Projects/api` tournament controller (`interface/http/tournament.controller.ts`).
Only the two changes this feature needs are described here — every other existing tournament
endpoint (create, list, register, chat, creator-role admin routes) is unchanged.

## GET /api/caro/tournaments/{tournamentId}/participants (MODIFIED)

Adds pagination. Existing ordering (`tournament_points DESC, registered_at ASC`) and per-row shape
are unchanged; only the envelope and two new query params are added.

**Query params (new)**:
- `page` (optional, default `1`, min `1`)
- `pageSize` (optional, default `20`, min `1`, max `50`)

**Response (200)** — was `TournamentRegistration[]` directly; now:

```jsonc
{
  "items": [
    {
      "rank": 1,
      "registrationId": "uuid",
      "playerId": "uuid",
      "tournamentPoints": 8,
      "winStreak": 2,
      "isPaused": false,
      "status": "idle",
      "eloAtRegistration": 1200,
      "registeredAt": "2026-07-07T10:00:00.000Z"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 37
}
```

`rank` is computed against the full ordering (not reset per page) — page 2 with `pageSize=20`
starts at `rank: 21`.

## PATCH /api/caro/tournaments/{tournamentId}/registrations/pause (NEW)

**Auth**: `JwtAuthGuard` — the caller must be the registered participant themselves (no `playerId`
body field; always acts on `req.user.sub`'s own registration for this tournament).

**Request body**:

```jsonc
{ "paused": true }
```

**Response (200)**:

```jsonc
{
  "registrationId": "uuid",
  "tournamentId": "uuid",
  "playerId": "uuid",
  "isPaused": true
}
```

**Errors**: `404` if the caller has no registration for this tournament; `409` if the tournament has
already ended/been cancelled (pausing a finished tournament's registration is a no-op error, not a
silent success).

**Behavior**: Setting `paused: true` removes the participant from `claimTwoIdlePlayers`'s eligible
set immediately (FR-004/FR-005). Setting `paused: false` (resume) makes them eligible again on the
next pairing pass — including the presence-triggered one (research.md §3), so resuming while already
present on the tournament page can pair them right away rather than waiting for someone else to
trigger a re-pair.
