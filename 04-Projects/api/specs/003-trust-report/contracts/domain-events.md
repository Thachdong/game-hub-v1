# Domain Event & Cross-Module Contract: Trust & Report

**Module**: `trust-report`

This is the canonical reference for every event and exported service this feature emits,
consumes, or exposes — consolidated here for `/speckit-tasks` so each integration point becomes
its own task. Full rationale lives in [research.md](../research.md) §4, §7, §8, §9.

---

## Events Consumed

| Event name | Emitted by | Payload | Handled by |
|---|---|---|---|
| `account-social.account-created` | `account-social` (**new emit call to add**) | `{ accountId: string }` | `AccountCreatedListener` → `InitializeTrustScoreUseCase` (FR-011) |
| `auth.request-authenticated` | `shared-auth` `JwtAuthGuard` (**new emit call to add**) | `{ accountId: string, occurredAt: Date }` | `RequestAuthenticatedListener` → `RecordDailyRecoveryUseCase` (FR-018/019) |

## Events Emitted

| Event name | Consumed by | Payload | When |
|---|---|---|---|
| `notification.trust-score-alert` | `notification` module (**existing contract, no change**) | `{ recipientId: string, content: string, referenceId?: string }` | Once per threshold (50/20/10) newly crossed downward (FR-013), and once when score reaches/extends a lock at 0 (FR-016) |

## Exported Services (synchronous, in-process)

| Port | Exported by | Method | Consumed by |
|---|---|---|---|
| `IAccountExistencePort` (implemented via adapter) | `trust-report` internally wraps `account-social`'s `AccountExistenceService` (**existing export, no change**) | `exists(accountId): Promise<boolean>` | `SubmitReportUseCase`, to validate `reportedUserId` |
| `ITrustStatusPort` | `trust-report` (**new export**) | `isLocked(accountId): Promise<{ locked: boolean; until: Date \| null }>` | Future game modules (no consumer in this codebase yet) — gate on starting/joining new game participation |

---

## Required Changes Outside `trust-report`

These are the only two modifications needed in other modules, both additive (new emit calls or
relocated guard — no behavior change to existing endpoints):

1. **`account-social`**: in the OAuth login/account-creation use-case, after a *new* account row
   is inserted (not on a repeat login), emit `account-social.account-created` with `{ accountId
   }`.
2. **`shared-auth`**: in `JwtAuthGuard.canActivate`, after successful token validation, emit
   `auth.request-authenticated` with `{ accountId: payload.sub, occurredAt: new Date() }`.
   **The emit MUST be fire-and-forget (no `await`)** — the trust-report recovery use-case runs
   asynchronously via EventEmitter2 and must not add latency to the authenticated request.
   Additionally, promote `PlatformAdminGuard` from `account-social/interface/guards/` into
   `shared-auth/`, exported the same way `JwtAuthGuard`/`OptionalJwtGuard` already are.
