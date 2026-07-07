# Contract Addendum: Proxy Auth Policy — Chat History

Extends `specs/006-caro-guest-access/contracts/proxy-auth-policy.md` and
`specs/007-caro-game-dashboard/contracts/proxy-auth-policy-addendum.md`. Adds one row to
`apps/web/lib/proxy.ts`'s `OPTIONAL_AUTH_ROUTES` allowlist:

| Method | Path shape | Backend status |
|---|---|---|
| GET | `caro/matches/{id}/chat` | Now public — `ChatController.history()` moved from the class-level `JwtAuthGuard` to a route-level `OptionalJwtGuard`, per research.md §5. |

No other row changes. In particular, `POST caro/matches/{id}/chat` (send) and
`POST caro/matches/{id}/chat/mute` (mute/kick) remain **not** in this allowlist — both still
require the `access_token` cookie, matching this feature's FR-015/FR-016 (sending chat and
muting/kicking a viewer both require sign-in; muting further requires match-participant status,
enforced by the backend's `MuteViewerUseCase`).

`POST caro/matches/{id}/moves` was already added to this allowlist by spec 006, on the assumption
the backend's guard had been removed for it too. Code inspection during this feature's planning
found `GameplayController` (which owns that route) is still strictly `JwtAuthGuard`-gated with no
override, so that pre-existing allowlist entry is currently inert (a guest POST there still 401s
from the backend). This feature deliberately leaves that as-is: spec 008's own FR-013 requires
guests to be redirected to login *before* a move request is ever sent, so the request never reaches
this dead allowlist entry in practice. Fixing `GameplayController`'s guard is out of scope here — it
belongs to whoever revisits spec 006's original move-submission story.
