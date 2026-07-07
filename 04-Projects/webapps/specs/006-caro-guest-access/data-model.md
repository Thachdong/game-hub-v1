# Phase 1 Data Model: Caro Guest Access

This feature introduces **no new entities and no shape changes** to any existing entity. It only
changes *who may request* three existing read/write operations, not what they return. The three
entities the spec's Key Entities section names already exist, unchanged, in
`packages/caro-service/src/types.ts`:

- **Match Lobby Entry** → `LobbyMatch` (`types.ts:23`) — returned by `listLobbyMatches()`
  (`matches.ts`). No field changes.
- **Match State** → `MatchState` (`types.ts:48`) — returned by `getMatch({ id })` (`matches.ts`).
  No field changes.
- **Move** → `CaroMove` / `PlaceMoveResult` (`types.ts:40`, `types.ts:72`) — returned by
  `submitMove({ id, row, col })` (`gameplay.ts`). No field changes. `PlaceMoveResult.playerId`
  continues to be whatever identity the backend attributes the move to; when the caller has no
  session, that attribution is entirely the backend's concern (already updated on the backend side
  per the feature's premise) — this feature does not add or infer a fallback identity on the
  webapp side.

## New concept: proxy route authorization policy (not a persisted entity)

The one new piece of "data" this feature adds is a small, in-memory, hardcoded policy table inside
`apps/web/lib/proxy.ts` describing which `(method, path shape)` pairs may proceed without a
session cookie. It is not persisted, not user-facing, and not part of any API contract — it exists
purely to decide, per incoming proxied request, whether the existing "no cookie → 401" gate
applies.

| Method | Path shape (segments after `api/`) | Optional auth? |
|---|---|---|
| GET | `caro`, `matches`, `lobby` | Yes |
| GET | `caro`, `matches`, `{id}` | Yes |
| POST | `caro`, `matches`, `{id}`, `moves` | Yes |
| *(any other combination)* | | No — unchanged, cookie required |

`{id}` denotes "any single path segment" (not matched literally) — see `contracts/` for the exact
matching rule and the neighboring authed paths it must not accidentally loosen (e.g.
`POST caro/matches/{id}/join`, `DELETE caro/matches/{id}`, `POST caro/matches/{id}/invite`).
