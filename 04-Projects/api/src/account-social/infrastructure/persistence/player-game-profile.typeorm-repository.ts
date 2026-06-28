import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { IPlayerGameProfileRepository } from '../../domain/ports/player-game-profile.repository.port';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PlayerGameProfileTypeOrmRepository implements IPlayerGameProfileRepository {
  constructor(private readonly dataSource: DataSource) {}

  async upsert(accountId: string, gameId: string): Promise<void> {
    await this.dataSource.query(
      `INSERT INTO account_social.player_game_profiles(id, account_id, game_id, recorded_at)
       VALUES($1, $2, $3, now())
       ON CONFLICT(account_id, game_id) DO NOTHING`,
      [uuidv4(), accountId, gameId],
    );
  }

  async findGameIdsByAccountId(accountId: string): Promise<string[]> {
    const rows: Array<{ game_id: string }> = await this.dataSource.query(
      `SELECT game_id FROM account_social.player_game_profiles WHERE account_id = $1`,
      [accountId],
    );
    return rows.map((r) => r.game_id);
  }
}
