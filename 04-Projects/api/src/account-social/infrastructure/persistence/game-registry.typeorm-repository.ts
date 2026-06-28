import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { IGameRegistryPort, GameRef } from '../../domain/ports/game-registry.port';

@Injectable()
export class GameRegistryTypeOrmRepository implements IGameRegistryPort {
  constructor(private readonly dataSource: DataSource) {}

  async findAll(): Promise<GameRef[]> {
    const rows: Array<{ id: string; name: string; slug: string }> = await this.dataSource.query(
      `SELECT id, name, slug FROM platform.games ORDER BY name`,
    );
    return rows.map((r) => ({ id: r.id, name: r.name, slug: r.slug }));
  }

  async exists(gameId: string): Promise<boolean> {
    const rows: Array<{ count: string }> = await this.dataSource.query(
      `SELECT COUNT(1) AS count FROM platform.games WHERE id = $1`,
      [gameId],
    );
    return parseInt(rows[0].count, 10) > 0;
  }
}
