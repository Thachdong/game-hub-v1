# Data Model: Game Admin Config (Caro)

**Phase**: 1 — Design
**Date**: 2026-06-30
**Research basis**: [research.md](research.md)

---

## Domain Entity

### `GameConfig`

```typescript
// src/caro-game/domain/entities/game-config.ts

export type BoardSize = '18x18' | '25x25' | '40x40';
export type MoveTimeSeconds = 5 | 10 | 15 | 25 | 35 | 45 | 60;

export const VALID_BOARD_SIZES: BoardSize[] = ['18x18', '25x25', '40x40'];
export const VALID_MOVE_TIMES: MoveTimeSeconds[] = [5, 10, 15, 25, 35, 45, 60];

export class GameConfig {
  id: string;                        // UUID
  boardSize: BoardSize;
  moveTimeSeconds: MoveTimeSeconds;
  active: boolean;                   // true = visible to players
  createdBy: string;                 // account ID (JWT sub)
  createdAt: Date;
  updatedAt: Date;
  deactivatedBy: string | null;      // account ID (JWT sub) or null if still active
  deactivatedAt: Date | null;
}
```

---

## Port Interface

### `IGameConfigRepositoryPort`

```typescript
// src/caro-game/domain/ports/game-config.repository.port.ts

import { GameConfig, BoardSize, MoveTimeSeconds } from '../entities/game-config';

export const GAME_CONFIG_REPOSITORY_PORT = 'GAME_CONFIG_REPOSITORY_PORT';

export interface IGameConfigRepositoryPort {
  // Player-facing: active only
  findAllActive(): Promise<GameConfig[]>;

  // Admin-facing: all records (active + inactive)
  findAll(): Promise<GameConfig[]>;

  // Lookup by ID — returns null if not found
  findById(id: string): Promise<GameConfig | null>;

  // Used to check for duplicate active combo before create/reactivate
  findActiveByCombo(boardSize: BoardSize, moveTimeSeconds: MoveTimeSeconds): Promise<GameConfig | null>;

  // Create new config — throws GameConfigDuplicateError on 23505
  save(data: {
    boardSize: BoardSize;
    moveTimeSeconds: MoveTimeSeconds;
    createdBy: string;
  }): Promise<GameConfig>;

  // Update boardSize and/or moveTime — throws GameConfigDuplicateError on 23505
  update(id: string, fields: {
    boardSize?: BoardSize;
    moveTimeSeconds?: MoveTimeSeconds;
  }): Promise<GameConfig>;

  // Soft-delete: set active=false, record deactivatedBy/deactivatedAt atomically
  deactivate(id: string, deactivatedBy: string): Promise<GameConfig>;

  // Restore: set active=true, clear deactivatedBy/deactivatedAt
  reactivate(id: string): Promise<GameConfig>;
}
```

---

## Domain Errors

```typescript
// src/caro-game/domain/errors/index.ts

export class GameConfigNotFoundError extends Error {
  constructor() { super('Game configuration not found'); }
}

export class GameConfigDuplicateError extends Error {
  constructor() { super('An active configuration with this board size and move time already exists'); }
}

export class GameConfigInvalidBoardSizeError extends Error {
  constructor() { super('Board size must be one of: 18x18, 25x25, 40x40'); }
}

export class GameConfigInvalidMoveTimeError extends Error {
  constructor() { super('Move time must be one of: 5, 10, 15, 25, 35, 45, 60 seconds'); }
}
```

---

## TypeORM ORM Entity

```typescript
// src/caro-game/infrastructure/persistence/typeorm-entities/game-config.orm-entity.ts

@Entity({ schema: 'caro_game', name: 'game_configs' })
export class GameConfigOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'board_size', type: 'varchar', length: 10 })
  boardSize: string;

  @Column({ name: 'move_time_seconds', type: 'int' })
  moveTimeSeconds: number;

  @Column({ default: true })
  active: boolean;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'deactivated_by', type: 'uuid', nullable: true })
  deactivatedBy: string | null;

  @Column({ name: 'deactivated_at', type: 'timestamptz', nullable: true })
  deactivatedAt: Date | null;
}
```

---

## Database Schema (Migration)

**File**: `src/database/migrations/1751300000000-CreateCaroGameSchema.ts`

```sql
-- Seed Caro game into platform registry (prerequisite for role assignment)
INSERT INTO platform.games (name, slug)
VALUES ('Caro', 'caro')
ON CONFLICT (slug) DO NOTHING;

-- Create caro_game schema
CREATE SCHEMA IF NOT EXISTS caro_game;

-- Game configurations table
CREATE TABLE caro_game.game_configs (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  board_size       VARCHAR(10) NOT NULL
                               CHECK (board_size IN ('18x18', '25x25', '40x40')),
  move_time_seconds INT        NOT NULL
                               CHECK (move_time_seconds IN (5, 10, 15, 25, 35, 45, 60)),
  active           BOOLEAN     NOT NULL DEFAULT TRUE,
  created_by       UUID        NOT NULL,  -- account_social.accounts.id (no FK — module boundary)
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  deactivated_by   UUID,                  -- account_social.accounts.id (no FK — module boundary)
  deactivated_at   TIMESTAMPTZ
);

-- Partial unique index: only one active config per (boardSize, moveTime) combination
CREATE UNIQUE INDEX uq_game_configs_active_combo
  ON caro_game.game_configs (board_size, move_time_seconds)
  WHERE active = TRUE;

-- Partial index for fast player-facing list queries
CREATE INDEX idx_game_configs_active
  ON caro_game.game_configs (created_at ASC)
  WHERE active = TRUE;
```

**Down migration**:
```sql
DROP TABLE IF EXISTS caro_game.game_configs;
DROP SCHEMA IF EXISTS caro_game;
-- Note: Does NOT remove the 'caro' platform.games row (other features may depend on it)
```

---

## State Transitions

```
           create (POST)
CREATED ──────────────────► ACTIVE
                                │
                     deactivate │ (DELETE)
                                ▼
                           INACTIVE
                                │
                     reactivate │ (POST …/reactivate)
                                │ [blocked if active duplicate exists]
                                ▼
                           ACTIVE
```

| Transition | Operation | Guard | Duplicate Check |
|---|---|---|---|
| → ACTIVE | create | GameAdminCaroGuard | partial unique index (DB) |
| ACTIVE → INACTIVE | deactivate | GameAdminCaroGuard | none |
| ACTIVE → ACTIVE | update | GameAdminCaroGuard | partial unique index (DB) |
| INACTIVE → ACTIVE | reactivate | GameAdminCaroGuard | partial unique index (DB) |

---

## Cross-Cutting Change: `gameAdminRoles` JWT Claim

**Current**: `findByAccountId()` returns `game_id` (UUID array)
**Required**: Returns game `slug` (string array) — e.g. `['caro']`

**Change location**: `src/account-social/infrastructure/persistence/game-admin-role.typeorm-repository.ts`

```typescript
// Before
async findByAccountId(accountId: string): Promise<string[]> {
  const rows = await this.dataSource.query(
    `SELECT game_id FROM account_social.game_admin_roles WHERE account_id = $1`,
    [accountId],
  );
  return rows.map((r) => r.game_id);
}

// After
async findByAccountId(accountId: string): Promise<string[]> {
  const rows = await this.dataSource.query(
    `SELECT g.slug
     FROM account_social.game_admin_roles gar
     JOIN platform.games g ON g.id = gar.game_id
     WHERE gar.account_id = $1`,
    [accountId],
  );
  return rows.map((r) => r.slug);
}
```

**Impact**: Non-breaking (no existing guard reads `gameAdminRoles`). JWT payload type
`AccessTokenPayload.gameAdminRoles: string[]` is unchanged — only values differ.
