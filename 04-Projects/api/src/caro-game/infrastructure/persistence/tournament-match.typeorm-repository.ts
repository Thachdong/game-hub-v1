import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TournamentMatchOrmEntity } from './typeorm-entities/tournament-match.orm-entity';
import {
  ITournamentMatchRepository,
  CreateTournamentMatchData,
} from '../../domain/ports/tournament-match.repository.port';
import { TournamentMatch } from '../../domain/entities/tournament-match';

@Injectable()
export class TournamentMatchTypeOrmRepository implements ITournamentMatchRepository {
  constructor(
    @InjectRepository(TournamentMatchOrmEntity)
    private readonly repo: Repository<TournamentMatchOrmEntity>,
  ) {}

  async create(data: CreateTournamentMatchData): Promise<TournamentMatch> {
    const entity = this.repo.create({
      tournamentId: data.tournamentId,
      matchId: data.matchId,
      whiteRegistrationId: data.whiteRegistrationId,
      blackRegistrationId: data.blackRegistrationId,
      whitePointsAwarded: null,
      blackPointsAwarded: null,
      completedAt: null,
    });
    const saved = await this.repo.save(entity);
    return this.toDomain(saved);
  }

  async findByMatchId(matchId: string): Promise<TournamentMatch | null> {
    const entity = await this.repo.findOne({ where: { matchId } });
    return entity ? this.toDomain(entity) : null;
  }

  async save(tournamentMatch: TournamentMatch): Promise<TournamentMatch> {
    const entity = await this.repo.findOneOrFail({ where: { id: tournamentMatch.id } });
    entity.whitePointsAwarded = tournamentMatch.whitePointsAwarded;
    entity.blackPointsAwarded = tournamentMatch.blackPointsAwarded;
    entity.completedAt = tournamentMatch.completedAt;
    const saved = await this.repo.save(entity);
    return this.toDomain(saved);
  }

  private toDomain(e: TournamentMatchOrmEntity): TournamentMatch {
    const m = new TournamentMatch();
    m.id = e.id;
    m.tournamentId = e.tournamentId;
    m.matchId = e.matchId;
    m.whiteRegistrationId = e.whiteRegistrationId;
    m.blackRegistrationId = e.blackRegistrationId;
    m.whitePointsAwarded = e.whitePointsAwarded;
    m.blackPointsAwarded = e.blackPointsAwarded;
    m.createdAt = e.createdAt;
    m.completedAt = e.completedAt;
    return m;
  }
}
