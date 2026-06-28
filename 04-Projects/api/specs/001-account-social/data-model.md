# Data Model: Account & Social API

**Feature**: `001-account-social` | **Date**: 2026-06-28
**Schema**: `account_social` (PostgreSQL — created by first migration)

---

## Domain Entities (pure TypeScript, no ORM imports)

### Account
```typescript
// src/account-social/domain/entities/account.ts
export class Account {
  id: string;           // UUID v4
  email: string;        // immutable, sourced from Google
  username: string;     // display name from Google at first login
  avatarUrl: string;    // Google profile picture URL
  createdAt: Date;
}
```

### FriendRequest
```typescript
// src/account-social/domain/entities/friend-request.ts
export enum FriendRequestStatus {
  PENDING   = 'pending',
  ACCEPTED  = 'accepted',
  REJECTED  = 'rejected',
}

export class FriendRequest {
  id: string;
  senderId: string;      // Account.id
  receiverId: string;    // Account.id
  status: FriendRequestStatus;
  createdAt: Date;
  resolvedAt: Date | null;   // set on accept OR reject
}
```

**State transitions**:
```
[none]    → pending   : sendFriendRequest (creates or replaces a rejected record)
pending   → accepted  : resolveFriendRequest(ACCEPTED) — also creates Friendship row
pending   → rejected  : resolveFriendRequest(REJECTED)
rejected  → pending   : sendFriendRequest again (upsert replaces old record — FR-020)
accepted  → [terminal]: no further transitions; record stays as historical log
```

### Friendship
```typescript
// src/account-social/domain/entities/friendship.ts
export class Friendship {
  id: string;
  accountId1: string;   // always the lexicographically smaller UUID
  accountId2: string;   // always the lexicographically larger UUID
  createdAt: Date;
}
// Invariant: accountId1 < accountId2 (enforced in use-case before insert)
// This prevents duplicate (A,B) and (B,A) rows.
```

### GameAdminRole
```typescript
// src/account-social/domain/entities/game-admin-role.ts
export class GameAdminRole {
  id: string;
  accountId: string;   // Account.id
  gameId: string;      // platform game UUID (no FK to games table — cross-module)
  grantedAt: Date;
}
```

### PlayerGameProfile
```typescript
// src/account-social/domain/entities/player-game-profile.ts
export class PlayerGameProfile {
  id: string;
  accountId: string;   // Account.id
  gameId: string;      // platform game UUID
  recordedAt: Date;    // timestamp when the profile-created event was received
}
```

### GameRef (value object — not persisted in this module)
```typescript
// src/account-social/domain/ports/game-registry.port.ts
export interface GameRef {
  id: string;
  name: string;
  slug: string;
}

export interface IGameRegistryPort {
  findAll(): Promise<GameRef[]>;
  exists(gameId: string): Promise<boolean>;
}
```

---

## TypeORM Entities (infrastructure layer only)

### AccountOrmEntity
```typescript
// schema: 'account_social', table: 'accounts'
@Entity({ schema: 'account_social', name: 'accounts' })
export class AccountOrmEntity {
  @PrimaryGeneratedColumn('uuid')      id: string;
  @Column({ unique: true })            email: string;
  @Column()                            username: string;
  @Column({ name: 'avatar_url' })      avatarUrl: string;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}
```

### FriendRequestOrmEntity
```typescript
// schema: 'account_social', table: 'friend_requests'
@Entity({ schema: 'account_social', name: 'friend_requests' })
@Unique(['senderId', 'receiverId'])
export class FriendRequestOrmEntity {
  @PrimaryGeneratedColumn('uuid')  id: string;
  @Column({ name: 'sender_id' })   senderId: string;
  @Column({ name: 'receiver_id' }) receiverId: string;
  @Column({ type: 'enum', enum: FriendRequestStatus }) status: FriendRequestStatus;
  @CreateDateColumn({ name: 'created_at' })  createdAt: Date;
  @Column({ name: 'resolved_at', nullable: true }) resolvedAt: Date | null;
}
// UNIQUE(sender_id, receiver_id) — enforced at DB level
// INSERT … ON CONFLICT (sender_id, receiver_id) DO UPDATE SET status='pending', resolved_at=NULL
// used for FR-020 (retry after rejection)
```

### FriendshipOrmEntity
```typescript
// schema: 'account_social', table: 'friendships'
@Entity({ schema: 'account_social', name: 'friendships' })
@Unique(['accountId1', 'accountId2'])
export class FriendshipOrmEntity {
  @PrimaryGeneratedColumn('uuid')    id: string;
  @Column({ name: 'account_id_1' }) accountId1: string;   // always < accountId2
  @Column({ name: 'account_id_2' }) accountId2: string;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}
// UNIQUE(account_id_1, account_id_2) prevents duplicate friendships
```

### GameAdminRoleOrmEntity
```typescript
// schema: 'account_social', table: 'game_admin_roles'
@Entity({ schema: 'account_social', name: 'game_admin_roles' })
@Unique(['accountId', 'gameId'])
export class GameAdminRoleOrmEntity {
  @PrimaryGeneratedColumn('uuid')  id: string;
  @Column({ name: 'account_id' }) accountId: string;
  @Column({ name: 'game_id', type: 'uuid' }) gameId: string;
  @CreateDateColumn({ name: 'granted_at' }) grantedAt: Date;
}
// UNIQUE(account_id, game_id) — idempotent assign via INSERT OR IGNORE (FR-014)
```

### PlayerGameProfileOrmEntity
```typescript
// schema: 'account_social', table: 'player_game_profiles'
@Entity({ schema: 'account_social', name: 'player_game_profiles' })
@Unique(['accountId', 'gameId'])
export class PlayerGameProfileOrmEntity {
  @PrimaryGeneratedColumn('uuid')  id: string;
  @Column({ name: 'account_id' }) accountId: string;
  @Column({ name: 'game_id', type: 'uuid' }) gameId: string;
  @CreateDateColumn({ name: 'recorded_at' }) recordedAt: Date;
}
// UNIQUE(account_id, game_id) — idempotent upsert for duplicate events (FR-021)
```

---

## Database Indexes

| Table | Index | Reason |
|-------|-------|--------|
| `accounts` | `UNIQUE(email)` | FR-002 lookup by email on login |
| `friend_requests` | `UNIQUE(sender_id, receiver_id)` | duplicate prevention + upsert target |
| `friend_requests` | `INDEX(receiver_id, status)` | FR-013 incoming requests query |
| `friend_requests` | `INDEX(sender_id, status)` | FR-013 outgoing requests query |
| `friendships` | `UNIQUE(account_id_1, account_id_2)` | duplicate prevention |
| `friendships` | `INDEX(account_id_1)` + `INDEX(account_id_2)` | FR-012 friends list query |
| `game_admin_roles` | `UNIQUE(account_id, game_id)` | idempotent assign |
| `game_admin_roles` | `INDEX(account_id)` | token role loading at login/refresh |
| `player_game_profiles` | `UNIQUE(account_id, game_id)` | idempotent event write |
| `player_game_profiles` | `INDEX(account_id)` | FR-005 hasProfile join |

---

## Migration Outline

**File**: `src/database/migrations/1751000000000-CreateAccountSocialSchema.ts`

Operations (in order):
1. `CREATE SCHEMA IF NOT EXISTS account_social`
2. Create `account_social.accounts` table + unique index on `email`
3. Create `account_social.friend_requests` table + unique index + status indexes
4. Create `account_social.friendships` table + unique index + account indexes
5. Create `account_social.game_admin_roles` table + unique index + account index
6. Create `account_social.player_game_profiles` table + unique index + account index

**Note**: The `platform.games` table is owned by the platform-core module (or seeded via
a separate migration). This module does not create it; the `GameRegistryPort` adapter
reads it via a cross-schema SELECT within the same PostgreSQL connection.

---

## Domain Event Contracts

### Outgoing: FriendRequestResolvedEvent
```typescript
// src/account-social/domain/events/friend-request-resolved.event.ts
// Event name: 'friend-request.resolved'
export class FriendRequestResolvedEvent {
  readonly requestId: string;
  readonly senderId: string;        // account who sent the original request
  readonly receiverId: string;      // account who resolved it
  readonly resolution: 'accepted' | 'rejected';
  readonly resolvedAt: Date;
}
```
Consumed by: notification domain (`@OnEvent('friend-request.resolved')`)

### Incoming: GameProfileCreatedEvent
```typescript
// src/account-social/domain/events/game-profile-created.event.ts
// Event name: 'game.profile.created'  — emitted BY game modules
export class GameProfileCreatedEvent {
  readonly accountId: string;   // platform Account UUID
  readonly gameId: string;      // platform Game UUID
}
```
Consumed by: `GameProfileCreatedListener` in this module's infrastructure layer.
Processing is idempotent — duplicate events produce no error (INSERT ON CONFLICT DO NOTHING).

---

## JWT Payload Shapes

### Access Token
```typescript
interface AccessTokenPayload {
  sub: string;                  // Account.id (UUID)
  email: string;
  isPlatformAdmin: boolean;     // derived from AppConfig.platformAdminEmails at issue time
  gameAdminRoles: string[];     // array of game UUIDs where this account is Game Admin
  type: 'access';
  iat: number;
  exp: number;                  // iat + 15–30 min
}
```

### Refresh Token
```typescript
interface RefreshTokenPayload {
  sub: string;     // Account.id
  type: 'refresh';
  iat: number;
  exp: number;     // iat + 30 days
}
```
