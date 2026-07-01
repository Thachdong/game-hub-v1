import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlayerProfileOrmEntity } from './typeorm-entities/player-profile.orm-entity';
import {
  IPlayerProfileRepositoryPort,
  MatchOutcome,
} from '../../domain/ports/player-profile.repository.port';
import { PlayerProfile } from '../../domain/entities/player-profile';

@Injectable()
export class PlayerProfileTypeOrmRepository implements IPlayerProfileRepositoryPort {
  constructor(
    @InjectRepository(PlayerProfileOrmEntity)
    private readonly repo: Repository<PlayerProfileOrmEntity>,
  ) {}

  async findByPlayerId(playerId: string): Promise<PlayerProfile | null> {
    const entity = await this.repo.findOne({ where: { playerId } });
    return entity ? this.toDomain(entity) : null;
  }

  async createWithElo1200(playerId: string): Promise<PlayerProfile> {
    const entity = this.repo.create({
      playerId,
      elo: 1200,
      matchesPlayed: 0,
      wins: 0,
      losses: 0,
      draws: 0,
    });
    const saved = await this.repo.save(entity);
    return this.toDomain(saved);
  }

  async updateEloAtomic(playerId: string, delta: number, outcome: MatchOutcome): Promise<number> {
    const outcomeCol = outcome === 'win' ? 'wins' : outcome === 'loss' ? 'losses' : 'draws';
    await this.repo
      .createQueryBuilder()
      .update(PlayerProfileOrmEntity)
      .set({
        elo: () => `elo + ${delta}`,
        matchesPlayed: () => 'matches_played + 1',
        [outcomeCol]: () => `${outcomeCol} + 1`,
      })
      .where('player_id = :playerId', { playerId })
      .execute();

    const updated = await this.repo.findOneOrFail({ where: { playerId } });
    return updated.elo;
  }

  async findTopN(n: number): Promise<PlayerProfile[]> {
    const entities = await this.repo.find({
      order: { elo: 'DESC' },
      take: n,
    });
    return entities.map(this.toDomain);
  }

  private toDomain(e: PlayerProfileOrmEntity): PlayerProfile {
    const p = new PlayerProfile();
    p.id = e.id;
    p.playerId = e.playerId;
    p.elo = e.elo;
    p.matchesPlayed = e.matchesPlayed;
    p.wins = e.wins;
    p.losses = e.losses;
    p.draws = e.draws;
    p.createdAt = e.createdAt;
    p.updatedAt = e.updatedAt;
    return p;
  }
}
