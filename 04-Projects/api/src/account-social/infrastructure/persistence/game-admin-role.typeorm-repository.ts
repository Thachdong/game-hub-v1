import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { IGameAdminRoleRepository } from '../../domain/ports/game-admin-role.repository.port';
import { GameAdminRole } from '../../domain/entities/game-admin-role';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class GameAdminRoleTypeOrmRepository implements IGameAdminRoleRepository {
  constructor(private readonly dataSource: DataSource) {}

  async upsert(accountId: string, gameId: string): Promise<GameAdminRole> {
    const rows: GameAdminRole[] = await this.dataSource.query(
      `INSERT INTO account_social.game_admin_roles(id, account_id, game_id, granted_at)
       VALUES($1, $2, $3, now())
       ON CONFLICT(account_id, game_id) DO NOTHING
       RETURNING id, account_id AS "accountId", game_id AS "gameId", granted_at AS "grantedAt"`,
      [uuidv4(), accountId, gameId],
    );

    if (rows.length === 0) {
      const existing: GameAdminRole[] = await this.dataSource.query(
        `SELECT id, account_id AS "accountId", game_id AS "gameId", granted_at AS "grantedAt"
         FROM account_social.game_admin_roles
         WHERE account_id = $1 AND game_id = $2`,
        [accountId, gameId],
      );
      return existing[0];
    }

    return rows[0];
  }

  async delete(accountId: string, gameId: string): Promise<void> {
    await this.dataSource.query(
      `DELETE FROM account_social.game_admin_roles
       WHERE account_id = $1 AND game_id = $2`,
      [accountId, gameId],
    );
  }

  async findByAccountId(accountId: string): Promise<string[]> {
    const rows: Array<{ game_id: string }> = await this.dataSource.query(
      `SELECT game_id FROM account_social.game_admin_roles WHERE account_id = $1`,
      [accountId],
    );
    return rows.map((r) => r.game_id);
  }

  async existsForPair(accountId: string, gameId: string): Promise<boolean> {
    const rows: Array<{ exists: boolean }> = await this.dataSource.query(
      `SELECT EXISTS(
         SELECT 1 FROM account_social.game_admin_roles
         WHERE account_id = $1 AND game_id = $2
       ) AS exists`,
      [accountId, gameId],
    );
    return rows[0].exists;
  }
}
