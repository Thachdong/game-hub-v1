import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError } from 'typeorm';
import { GameConfigOrmEntity } from './typeorm-entities/game-config.orm-entity';
import { IGameConfigRepositoryPort } from '../../domain/ports/game-config.repository.port';
import { GameConfig, BoardSize, MoveTimeSeconds } from '../../domain/entities/game-config';
import { GameConfigDuplicateError } from '../../domain/errors';

@Injectable()
export class GameConfigTypeOrmRepository implements IGameConfigRepositoryPort {
  constructor(
    @InjectRepository(GameConfigOrmEntity)
    private readonly repo: Repository<GameConfigOrmEntity>,
  ) {}

  async findAllActive(): Promise<GameConfig[]> {
    const rows = await this.repo.find({
      where: { active: true },
      order: { createdAt: 'ASC' },
    });
    return rows.map(this.toDomain);
  }

  async findAll(): Promise<GameConfig[]> {
    const rows = await this.repo.find({ order: { createdAt: 'ASC' } });
    return rows.map(this.toDomain);
  }

  async findById(id: string): Promise<GameConfig | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async save(data: {
    boardSize: BoardSize;
    moveTimeSeconds: MoveTimeSeconds;
    createdBy: string;
  }): Promise<GameConfig> {
    try {
      const row = this.repo.create({
        boardSize: data.boardSize,
        moveTimeSeconds: data.moveTimeSeconds,
        createdBy: data.createdBy,
        active: true,
        deactivatedBy: null,
        deactivatedAt: null,
      });
      const saved = await this.repo.save(row);
      return this.toDomain(saved);
    } catch (err) {
      if (err instanceof QueryFailedError && (err as any).driverError?.code === '23505') {
        throw new GameConfigDuplicateError();
      }
      throw err;
    }
  }

  async update(
    id: string,
    fields: { boardSize?: BoardSize; moveTimeSeconds?: MoveTimeSeconds },
  ): Promise<GameConfig> {
    try {
      await this.repo.update({ id }, fields);
    } catch (err) {
      if (err instanceof QueryFailedError && (err as any).driverError?.code === '23505') {
        throw new GameConfigDuplicateError();
      }
      throw err;
    }
    const row = await this.repo.findOne({ where: { id } });
    return this.toDomain(row!);
  }

  async deactivate(id: string, deactivatedBy: string): Promise<GameConfig> {
    await this.repo.update(
      { id },
      { active: false, deactivatedBy, deactivatedAt: new Date() },
    );
    const row = await this.repo.findOne({ where: { id } });
    return this.toDomain(row!);
  }

  async reactivate(id: string): Promise<GameConfig> {
    try {
      await this.repo.update(
        { id },
        { active: true, deactivatedBy: null, deactivatedAt: null },
      );
    } catch (err) {
      if (err instanceof QueryFailedError && (err as any).driverError?.code === '23505') {
        throw new GameConfigDuplicateError();
      }
      throw err;
    }
    const row = await this.repo.findOne({ where: { id } });
    return this.toDomain(row!);
  }

  private toDomain(row: GameConfigOrmEntity): GameConfig {
    const entity = new GameConfig();
    entity.id = row.id;
    entity.boardSize = row.boardSize as BoardSize;
    entity.moveTimeSeconds = row.moveTimeSeconds as MoveTimeSeconds;
    entity.active = row.active;
    entity.createdBy = row.createdBy;
    entity.createdAt = row.createdAt;
    entity.updatedAt = row.updatedAt;
    entity.deactivatedBy = row.deactivatedBy;
    entity.deactivatedAt = row.deactivatedAt;
    return entity;
  }
}
