import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { QuickPairRequestOrmEntity } from './typeorm-entities/quick-pair-request.orm-entity';
import { IQuickPairRepositoryPort, QuickPairRequest } from '../../domain/ports/quick-pair.repository.port';

@Injectable()
export class QuickPairTypeOrmRepository implements IQuickPairRepositoryPort {
  constructor(
    @InjectRepository(QuickPairRequestOrmEntity)
    private readonly repo: Repository<QuickPairRequestOrmEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async create(data: { playerId: string; configId: string; boardSize: string; moveTimeSeconds: number }): Promise<QuickPairRequest> {
    const entity = this.repo.create({
      playerId: data.playerId,
      configId: data.configId,
      boardSize: data.boardSize,
      moveTimeSeconds: data.moveTimeSeconds,
      status: 'waiting',
      matchId: null,
    });
    return this.toModel(await this.repo.save(entity));
  }

  async findWaitingOpponent(
    boardSize: string,
    moveTimeSeconds: number,
    excludePlayerId: string,
  ): Promise<QuickPairRequest | null> {
    // SELECT … FOR UPDATE SKIP LOCKED per ADR-CARO-GAME-003
    const result = await this.dataSource.query<QuickPairRequestOrmEntity[]>(
      `SELECT * FROM caro_game.quick_pair_requests
       WHERE board_size = $1
         AND move_time_seconds = $2
         AND status = 'waiting'
         AND player_id <> $3
       ORDER BY created_at ASC
       LIMIT 1
       FOR UPDATE SKIP LOCKED`,
      [boardSize, moveTimeSeconds, excludePlayerId],
    );
    return result[0] ? this.toModel(result[0]) : null;
  }

  async markMatched(requestId: string, matchId: string): Promise<void> {
    await this.repo.update(requestId, { status: 'matched', matchId });
  }

  async cancel(requestId: string): Promise<void> {
    await this.repo.update(requestId, { status: 'cancelled' });
  }

  async findActiveByPlayerId(playerId: string): Promise<QuickPairRequest | null> {
    const entity = await this.repo.findOne({ where: { playerId, status: 'waiting' } });
    return entity ? this.toModel(entity) : null;
  }

  private toModel(e: QuickPairRequestOrmEntity): QuickPairRequest {
    return {
      id: e.id,
      playerId: e.playerId,
      configId: e.configId,
      boardSize: e.boardSize,
      moveTimeSeconds: e.moveTimeSeconds,
      status: e.status,
      matchId: e.matchId,
      createdAt: e.createdAt,
    };
  }
}
