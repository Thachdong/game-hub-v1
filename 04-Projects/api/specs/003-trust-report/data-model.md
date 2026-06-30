# Data Model: Trust & Report

**Feature**: `003-trust-report` | **Date**: 2026-06-30
**Schema**: `trust_report` (PostgreSQL — created by this feature's migration)

---

## Domain Entities (pure TypeScript, no ORM imports)

### ReportType
```typescript
// src/trust-report/domain/entities/report-type.ts
export class ReportType {
  id: string;             // UUID v4
  name: string;            // e.g., "cheating", "harassment"
  deductionPoints: number; // 1-100, points removed when a report of this type is confirmed valid
  active: boolean;         // false = no longer selectable for new reports; existing reports unaffected
  createdAt: Date;
  updatedAt: Date;
}
```

### Report
```typescript
// src/trust-report/domain/entities/report.ts
export enum ReportStatus {
  PENDING = 'pending',
  VALID   = 'valid',
  INVALID = 'invalid',
}

export class Report {
  id: string;
  reporterId: string;          // Account.id (account-social)
  reportedUserId: string;      // Account.id (account-social)
  reportTypeId: string;        // ReportType.id (at time of submission)
  context: string;             // free-text description/evidence, player-provided
  status: ReportStatus;
  appliedPoints: number | null; // set ONLY when status becomes VALID (FR-010) — frozen thereafter
  submittedAt: Date;
  resolvedAt: Date | null;     // set when status leaves PENDING
  resolvedBy: string | null;   // Platform Admin Account.id who made the decision
}
```

**State transitions**:
```
[none]  → pending : submitReport (FR-001/FR-002)
pending → valid   : reviewReport(VALID) — snapshots ReportType.deductionPoints into
                     appliedPoints at this moment (FR-007/FR-010), triggers trust-score deduction
pending → invalid : reviewReport(INVALID) — no trust-score effect (FR-008)
valid   → [terminal] : no further transitions (FR-006)
invalid → [terminal] : no further transitions (FR-006)
```

### TrustScore
```typescript
// src/trust-report/domain/entities/trust-score.ts
export class TrustScore {
  accountId: string;             // Account.id (account-social) — primary key, 1:1 with account
  score: number;                 // 0-100, starts at 100 (FR-011)
  gameLockedUntil: Date | null;  // null = not locked; future timestamp = locked until then
  lastRecoveryDate: string | null; // ISO date (YYYY-MM-DD), last calendar day +1 recovery applied
  updatedAt: Date;
}
```

**Derived state** (not stored, computed on read):
- `isLocked = gameLockedUntil !== null && gameLockedUntil > now()`

---

## TypeORM Entities (infrastructure layer only)

### ReportTypeOrmEntity
```typescript
// schema: 'trust_report', table: 'report_types'
@Entity({ schema: 'trust_report', name: 'report_types' })
export class ReportTypeOrmEntity {
  @PrimaryGeneratedColumn('uuid')              id: string;
  @Column({ unique: true })                    name: string;
  @Column({ name: 'deduction_points', type: 'int' }) deductionPoints: number;
  @Column({ default: true })                   active: boolean;
  @CreateDateColumn({ name: 'created_at' })     createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' })     updatedAt: Date;
}
// CHECK (deduction_points BETWEEN 1 AND 100)
```

### ReportOrmEntity
```typescript
// schema: 'trust_report', table: 'reports'
@Entity({ schema: 'trust_report', name: 'reports' })
export class ReportOrmEntity {
  @PrimaryGeneratedColumn('uuid')                 id: string;
  @Column({ name: 'reporter_id', type: 'uuid' })  reporterId: string;
  @Column({ name: 'reported_user_id', type: 'uuid' }) reportedUserId: string;
  @Column({ name: 'report_type_id', type: 'uuid' }) reportTypeId: string;
  @Column({ type: 'text' })                       context: string;
  @Column({ type: 'enum', enum: ReportStatus, default: ReportStatus.PENDING }) status: ReportStatus;
  @Column({ name: 'applied_points', type: 'int', nullable: true }) appliedPoints: number | null;
  @CreateDateColumn({ name: 'submitted_at' })      submittedAt: Date;
  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true }) resolvedAt: Date | null;
  @Column({ name: 'resolved_by', type: 'uuid', nullable: true }) resolvedBy: string | null;
}
// CHECK (reporter_id != reported_user_id)  -- defense-in-depth alongside the FR-003 app check
```

### TrustScoreOrmEntity
```typescript
// schema: 'trust_report', table: 'trust_scores'
@Entity({ schema: 'trust_report', name: 'trust_scores' })
export class TrustScoreOrmEntity {
  @PrimaryColumn({ name: 'account_id', type: 'uuid' }) accountId: string;
  @Column({ type: 'int', default: 100 })            score: number;
  @Column({ name: 'game_locked_until', type: 'timestamptz', nullable: true }) gameLockedUntil: Date | null;
  @Column({ name: 'last_recovery_date', type: 'date', nullable: true }) lastRecoveryDate: string | null;
  @UpdateDateColumn({ name: 'updated_at' })          updatedAt: Date;
}
// CHECK (score BETWEEN 0 AND 100)
```

---

## Database Indexes

| Table | Index | Reason |
|-------|-------|--------|
| `report_types` | `UNIQUE(name)` | Avoid duplicate type names |
| `report_types` | `INDEX(active)` (partial, `WHERE active = true`) | FR-009/player-facing active-type list |
| `reports` | `INDEX(status)` (partial, `WHERE status = 'pending'`) | FR-004 admin pending-list query |
| `reports` | `INDEX(reported_user_id)` | Future lookups / audit by target user |
| `trust_scores` | Primary key on `account_id` | 1:1 lookup/update by account |

---

## Concurrency-Safe Mutation Statements

All three statements below are the *only* way `trust_scores` rows are written after creation —
no application-layer read-modify-write (ADR-TRUST-REPORT-002).

### 1. Apply a confirmed-valid report's deduction (FR-007, FR-012, FR-015, FR-017)
```sql
WITH prev AS (
  SELECT score AS old_score FROM trust_report.trust_scores WHERE account_id = $1
)
UPDATE trust_report.trust_scores
SET score = GREATEST(0, score - $2::int),
    game_locked_until = CASE
      WHEN GREATEST(0, score - $2::int) = 0 THEN now() + interval '7 days'
      ELSE game_locked_until
    END
WHERE account_id = $1
RETURNING
  (SELECT old_score FROM prev) AS old_score,
  score AS new_score,
  game_locked_until;
```
The use-case (`review-report.use-case.ts`) reads `old_score`/`new_score` to fire
`notification.trust-score-alert` for each threshold in `{50, 20, 10}` crossed downward (§5 in
research.md), and a separate lockout-notice alert when `new_score = 0`.

### 2. Daily login recovery (FR-018, FR-019)
```sql
UPDATE trust_report.trust_scores
SET score = LEAST(100, score + 1),
    last_recovery_date = CURRENT_DATE
WHERE account_id = $1
  AND game_locked_until IS NOT NULL
  AND game_locked_until <= now()
  AND (last_recovery_date IS NULL OR last_recovery_date < CURRENT_DATE)
RETURNING score;
```
Only applies to accounts that have actually been through a lock (`game_locked_until IS NOT
NULL`) and whose lock has expired — matches "no recovery mechanism other than post-lockout daily
login" (Assumptions). Concurrent same-day calls after the first one match zero rows.

### 3. Initialize on account creation (FR-011)
```sql
INSERT INTO trust_report.trust_scores (account_id, score, game_locked_until, last_recovery_date)
VALUES ($1, 100, NULL, NULL)
ON CONFLICT (account_id) DO NOTHING;
```
`ON CONFLICT DO NOTHING` makes the listener idempotent against duplicate
`account-social.account-created` event delivery.

---

## Migration Outline

**File**: `src/database/migrations/1751200000000-CreateTrustReportSchema.ts`

Operations (in order):
1. `CREATE SCHEMA IF NOT EXISTS trust_report`
2. Create `trust_report.report_types` table + unique index on `name` + partial index on `active`
3. Create `trust_report.reports` table + `CHECK (reporter_id != reported_user_id)` + partial index
   on `status = 'pending'` + index on `reported_user_id`
4. Create `trust_report.trust_scores` table + `CHECK (score BETWEEN 0 AND 100)`
5. Seed a small default set of report types (e.g., "cheating" / 20 pts, "harassment" / 10 pts) so
   User Story 1 is testable without first running User Story 3 — Platform Admin can edit/add more
   afterward.

---

## Domain Event Contracts

### Outgoing: notification.trust-score-alert (existing contract, reused — no notification-side change)
```typescript
// Emitted from src/trust-report/infrastructure/events/event-publisher.adapter.ts
// Event name: 'notification.trust-score-alert'  (defined and consumed by 002-notification)
interface TrustScoreAlertEvent {
  recipientId: string;   // the reported user whose score changed
  content: string;       // e.g., "Your trust score dropped below 50." or
                          // "Your account is locked from game participation for 7 days."
  referenceId?: string;  // the Report.id that caused this alert
}
```
Fired once per crossed threshold (50/20/10) and once when the score reaches/extends a lock at 0.
Never fired for daily-recovery increments (recovery is not an alert-worthy event).

### Outgoing: account-social.account-created (new — requires a small account-social change)
```typescript
// Emitted from account-social's OAuth login/account-creation use-case, first-time only
// Event name: 'account-social.account-created'
interface AccountCreatedEvent {
  readonly accountId: string;
}
```
Consumed by: `AccountCreatedListener` in `trust-report/infrastructure/events/` →
`InitializeTrustScoreUseCase`.

### Outgoing: auth.request-authenticated (new — requires a small shared-auth change)
```typescript
// Emitted from shared-auth's JwtAuthGuard on every successful token validation
// Event name: 'auth.request-authenticated'
interface RequestAuthenticatedEvent {
  readonly accountId: string;
  readonly occurredAt: Date;
}
```
Consumed by: `RequestAuthenticatedListener` in `trust-report/infrastructure/events/` →
`RecordDailyRecoveryUseCase`. Other future modules may also subscribe; this event is
intentionally generic (not trust-report-specific) since it is emitted from a shared module.
Emit MUST be fire-and-forget (no `await` in `JwtAuthGuard`) — the recovery DB call is
asynchronous and must not add latency to the authenticated request.

### Exported service (synchronous, in-process): IAccountExistencePort
```typescript
// src/trust-report/domain/ports/account-existence.port.ts
export interface IAccountExistencePort {
  exists(accountId: string): Promise<boolean>;
}
```
Implemented by `AccountExistenceAdapter`, wrapping account-social's already-exported
`AccountExistenceService` (same pattern as `002-notification`). Used to validate
`reportedUserId` refers to a real account before creating a report.

### Exported service (synchronous, in-process, for future game modules): ITrustStatusPort
```typescript
// src/trust-report/infrastructure/lock-status/trust-status.port.ts
export interface ITrustStatusPort {
  isLocked(accountId: string): Promise<{ locked: boolean; until: Date | null }>;
}
```
Exported by `TrustReportModule` for any future game module to call before allowing a user to
start or join a new game session (FR-015/FR-017; no consumer exists in this codebase yet).
