import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { TournamentOrmEntity } from './typeorm-entities/tournament.orm-entity';
import {
  ITournamentRepository,
  CreateTournamentData,
} from '../../domain/ports/tournament.repository.port';
import { Tournament, TournamentStatus } from '../../domain/entities/tournament';

@Injectable()
export class TournamentTypeOrmRepository implements ITournamentRepository {
  constructor(
    @InjectRepository(TournamentOrmEntity)
    private readonly repo: Repository<TournamentOrmEntity>,
  ) {}

  async create(data: CreateTournamentData): Promise<Tournament> {
    const entity = this.repo.create({
      creatorPlayerId: data.creatorPlayerId,
      gameConfigId: data.gameConfigId,
      minElo: data.minElo,
      status: 'waiting',
      startAt: data.startAt,
      endAt: data.endAt,
      startedAt: null,
      endedAt: null,
    });
    const saved = await this.repo.save(entity);
    return this.toDomain(saved);
  }

  async findById(id: string): Promise<Tournament | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  async findOverdueWaiting(now: Date): Promise<Tournament[]> {
    const entities = await this.repo.find({
      where: { status: 'waiting', startAt: LessThanOrEqual(now) },
    });
    return entities.map(e => this.toDomain(e));
  }

  async findOverdueInProgress(now: Date): Promise<Tournament[]> {
    const entities = await this.repo.find({
      where: { status: 'in_progress', endAt: LessThanOrEqual(now) },
    });
    return entities.map(e => this.toDomain(e));
  }

  async save(tournament: Tournament): Promise<Tournament> {
    const entity = await this.repo.findOneOrFail({ where: { id: tournament.id } });
    entity.status = tournament.status;
    entity.startedAt = tournament.startedAt;
    entity.endedAt = tournament.endedAt;
    const saved = await this.repo.save(entity);
    return this.toDomain(saved);
  }

  async findAll(
    status?: TournamentStatus,
    limit = 20,
    cursor?: string,
  ): Promise<{ items: Tournament[]; nextCursor: string | null }> {
    const take = Math.min(limit, 50) + 1;

    const qb = this.repo
      .createQueryBuilder('t')
      .orderBy('t.created_at', 'DESC')
      .addOrderBy('t.id', 'DESC')
      .take(take);

    if (status) qb.where('t.status = :status', { status });

    if (cursor) {
      const { createdAt, id } = JSON.parse(Buffer.from(cursor, 'base64').toString()) as { createdAt: string; id: string };
      qb.andWhere('(t.created_at, t.id) < (:createdAt, :id)', { createdAt, id });
    }

    const rows = await qb.getMany();
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore
      ? Buffer.from(JSON.stringify({ createdAt: items[items.length - 1].createdAt, id: items[items.length - 1].id })).toString('base64')
      : null;

    return { items: items.map(e => this.toDomain(e)), nextCursor };
  }

  async countRegistrants(tournamentId: string): Promise<number> {
    const result = await this.repo.manager.query<{ count: string }[]>(
      `SELECT COUNT(*) AS count FROM caro_game.tournament_registrations WHERE tournament_id = $1`,
      [tournamentId],
    );
    return parseInt(result[0]?.count ?? '0', 10);
  }

  private toDomain(e: TournamentOrmEntity): Tournament {
    const t = new Tournament();
    t.id = e.id;
    t.creatorPlayerId = e.creatorPlayerId;
    t.gameConfigId = e.gameConfigId;
    t.minElo = e.minElo;
    t.status = e.status as Tournament['status'];
    t.startAt = e.startAt;
    t.endAt = e.endAt;
    t.startedAt = e.startedAt;
    t.endedAt = e.endedAt;
    t.createdAt = e.createdAt;
    t.updatedAt = e.updatedAt;
    return t;
  }
}
