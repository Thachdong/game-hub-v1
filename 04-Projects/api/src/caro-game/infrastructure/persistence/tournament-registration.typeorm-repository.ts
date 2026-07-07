import { Injectable } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { TournamentRegistrationOrmEntity } from './typeorm-entities/tournament-registration.orm-entity';
import {
  ITournamentRegistrationRepository,
  CreateRegistrationData,
  FindAllByTournamentOptions,
  FindAllByTournamentResult,
} from '../../domain/ports/tournament-registration.repository.port';
import { TournamentRegistration } from '../../domain/entities/tournament-registration';
import { AlreadyRegisteredError } from '../../domain/errors';

@Injectable()
export class TournamentRegistrationTypeOrmRepository implements ITournamentRegistrationRepository {
  constructor(
    @InjectRepository(TournamentRegistrationOrmEntity)
    private readonly repo: Repository<TournamentRegistrationOrmEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async create(data: CreateRegistrationData): Promise<TournamentRegistration> {
    try {
      const entity = this.repo.create({
        tournamentId: data.tournamentId,
        playerId: data.playerId,
        eloAtRegistration: data.eloAtRegistration,
        tournamentPoints: 0,
        winStreak: 0,
        status: 'idle',
        isPaused: false,
      });
      const saved = await this.repo.save(entity);
      return this.toDomain(saved);
    } catch (err: any) {
      // Unique constraint: uq_caro_tournament_registration
      if (err?.code === '23505') throw new AlreadyRegisteredError();
      throw err;
    }
  }

  async findByTournamentAndPlayer(
    tournamentId: string,
    playerId: string,
  ): Promise<TournamentRegistration | null> {
    const entity = await this.repo.findOne({ where: { tournamentId, playerId } });
    return entity ? this.toDomain(entity) : null;
  }

  async findAllByTournament(
    tournamentId: string,
    options: FindAllByTournamentOptions,
  ): Promise<FindAllByTournamentResult> {
    const [entities, total] = await this.repo.findAndCount({
      where: { tournamentId },
      order: { tournamentPoints: 'DESC', registeredAt: 'ASC' },
      skip: (options.page - 1) * options.pageSize,
      take: options.pageSize,
    });
    return { items: entities.map(e => this.toDomain(e)), total };
  }

  async claimTwoIdlePlayers(
    tournamentId: string,
    presentPlayerIds: string[],
  ): Promise<TournamentRegistration[]> {
    if (presentPlayerIds.length === 0) return [];
    // ADR-CARO-GAME-003: SKIP LOCKED inside a transaction
    const rows = await this.dataSource.query<TournamentRegistrationOrmEntity[]>(
      `SELECT * FROM caro_game.tournament_registrations
       WHERE tournament_id = $1 AND status = 'idle' AND is_paused = false
         AND player_id = ANY($2)
       ORDER BY tournament_points ASC, registered_at ASC
       FOR UPDATE SKIP LOCKED
       LIMIT 2`,
      [tournamentId, presentPlayerIds],
    );
    if (rows.length < 2) return [];
    return rows.map(r => this.toDomainRaw(r));
  }

  async save(registration: TournamentRegistration): Promise<TournamentRegistration> {
    const entity = await this.repo.findOneOrFail({ where: { id: registration.id } });
    entity.status = registration.status;
    entity.tournamentPoints = registration.tournamentPoints;
    entity.winStreak = registration.winStreak;
    const saved = await this.repo.save(entity);
    return this.toDomain(saved);
  }

  async atomicScoreUpdate(
    id: string,
    pointsDelta: number,
    newStreak: number,
  ): Promise<TournamentRegistration> {
    await this.dataSource.query(
      `UPDATE caro_game.tournament_registrations
       SET tournament_points = tournament_points + $1,
           win_streak = $2
       WHERE id = $3`,
      [pointsDelta, newStreak, id],
    );
    const entity = await this.repo.findOneOrFail({ where: { id } });
    return this.toDomain(entity);
  }

  async setPaused(tournamentId: string, playerId: string, paused: boolean): Promise<TournamentRegistration> {
    await this.dataSource.query(
      `UPDATE caro_game.tournament_registrations
       SET is_paused = $1
       WHERE tournament_id = $2 AND player_id = $3`,
      [paused, tournamentId, playerId],
    );
    const entity = await this.repo.findOneOrFail({ where: { tournamentId, playerId } });
    return this.toDomain(entity);
  }

  private toDomain(e: TournamentRegistrationOrmEntity): TournamentRegistration {
    const r = new TournamentRegistration();
    r.id = e.id;
    r.tournamentId = e.tournamentId;
    r.playerId = e.playerId;
    r.eloAtRegistration = e.eloAtRegistration;
    r.tournamentPoints = e.tournamentPoints;
    r.winStreak = e.winStreak;
    r.status = e.status as TournamentRegistration['status'];
    r.isPaused = e.isPaused;
    r.registeredAt = e.registeredAt;
    return r;
  }

  private toDomainRaw(row: any): TournamentRegistration {
    const r = new TournamentRegistration();
    r.id = row.id;
    r.tournamentId = row.tournament_id;
    r.playerId = row.player_id;
    r.eloAtRegistration = row.elo_at_registration;
    r.tournamentPoints = row.tournament_points;
    r.winStreak = row.win_streak;
    r.status = row.status as TournamentRegistration['status'];
    r.isPaused = row.is_paused;
    r.registeredAt = row.registered_at;
    return r;
  }
}
