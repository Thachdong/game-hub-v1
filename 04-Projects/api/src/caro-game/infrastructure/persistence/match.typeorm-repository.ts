import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { MatchOrmEntity } from './typeorm-entities/match.orm-entity';
import { MatchMoveOrmEntity } from './typeorm-entities/match-move.orm-entity';
import {
  IMatchRepositoryPort,
  CreateMatchData,
  UpdateMatchData,
  MatchHistoryCursor,
  MatchHistoryPage,
  CreateTournamentMatchData,
} from '../../domain/ports/match.repository.port';
import { Match } from '../../domain/entities/match';
import { MatchMove } from '../../domain/entities/match-move';

@Injectable()
export class MatchTypeOrmRepository implements IMatchRepositoryPort {
  constructor(
    @InjectRepository(MatchOrmEntity)
    private readonly matchRepo: Repository<MatchOrmEntity>,
    @InjectRepository(MatchMoveOrmEntity)
    private readonly moveRepo: Repository<MatchMoveOrmEntity>,
  ) {}

  async findById(id: string): Promise<Match | null> {
    const entity = await this.matchRepo.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  async findActiveByPlayerId(playerId: string): Promise<Match | null> {
    const entity = await this.matchRepo
      .createQueryBuilder('m')
      .where('m.status IN (:...statuses)', { statuses: ['looking_for_opponent', 'waiting_for_start', 'in_progress'] })
      .andWhere(
        '(m.creator_id = :pid OR m.second_player_id = :pid OR m.player_x_id = :pid OR m.player_o_id = :pid)',
        { pid: playerId },
      )
      .getOne();
    return entity ? this.toDomain(entity) : null;
  }

  async findLobbyMatches(): Promise<Match[]> {
    const entities = await this.matchRepo.find({
      where: [
        { visibility: 'public', status: 'looking_for_opponent' },
        { visibility: 'public', status: 'in_progress' },
      ],
      order: { createdAt: 'DESC' },
    });
    return entities.map(this.toDomain);
  }

  async findByPlayerIdHistory(
    playerId: string,
    limit: number,
    cursor?: MatchHistoryCursor,
  ): Promise<MatchHistoryPage> {
    const qb = this.matchRepo
      .createQueryBuilder('m')
      .where('m.status = :status', { status: 'completed' })
      .andWhere(
        '(m.player_x_id = :pid OR m.player_o_id = :pid)',
        { pid: playerId },
      )
      .orderBy('m.ended_at', 'DESC')
      .addOrderBy('m.id', 'DESC')
      .take(limit + 1);

    if (cursor) {
      qb.andWhere(
        '(m.ended_at < :ea OR (m.ended_at = :ea AND m.id < :cid))',
        { ea: cursor.endedAt, cid: cursor.id },
      );
    }

    const rows = await qb.getMany();
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    let nextCursor: string | null = null;
    if (hasMore && items.length > 0) {
      const last = items[items.length - 1];
      const cursorData: MatchHistoryCursor = { endedAt: last.endedAt!, id: last.id };
      nextCursor = Buffer.from(JSON.stringify(cursorData)).toString('base64');
    }

    return { matches: items.map(this.toDomain), nextCursor };
  }

  async save(data: CreateMatchData): Promise<Match> {
    const entity = this.matchRepo.create({
      configId: data.configId,
      boardSize: data.boardSize,
      moveTimeSeconds: data.moveTimeSeconds,
      visibility: data.visibility,
      status: 'looking_for_opponent',
      creatorId: data.creatorId,
      secondPlayerId: null,
      playerXId: null,
      playerOId: null,
      currentTurnPlayerId: null,
      pendingDrawRequestFromId: null,
      result: null,
      winnerPlayerId: null,
      playerXEloChange: null,
      playerOEloChange: null,
      deadlineAt: null,
      startedAt: null,
      endedAt: null,
    });
    const saved = await this.matchRepo.save(entity);
    return this.toDomain(saved);
  }

  async update(id: string, data: UpdateMatchData): Promise<Match> {
    await this.matchRepo.update(id, {
      ...(data.status !== undefined && { status: data.status }),
      ...(data.secondPlayerId !== undefined && { secondPlayerId: data.secondPlayerId }),
      ...(data.playerXId !== undefined && { playerXId: data.playerXId }),
      ...(data.playerOId !== undefined && { playerOId: data.playerOId }),
      ...(data.currentTurnPlayerId !== undefined && { currentTurnPlayerId: data.currentTurnPlayerId }),
      ...(data.pendingDrawRequestFromId !== undefined && { pendingDrawRequestFromId: data.pendingDrawRequestFromId }),
      ...(data.result !== undefined && { result: data.result }),
      ...(data.winnerPlayerId !== undefined && { winnerPlayerId: data.winnerPlayerId }),
      ...(data.playerXEloChange !== undefined && { playerXEloChange: data.playerXEloChange }),
      ...(data.playerOEloChange !== undefined && { playerOEloChange: data.playerOEloChange }),
      ...(data.deadlineAt !== undefined && { deadlineAt: data.deadlineAt }),
      ...(data.startedAt !== undefined && { startedAt: data.startedAt }),
      ...(data.endedAt !== undefined && { endedAt: data.endedAt }),
    });
    const updated = await this.matchRepo.findOneOrFail({ where: { id } });
    return this.toDomain(updated);
  }

  async saveMove(data: { matchId: string; playerId: string; row: number; col: number; sequenceNumber: number }): Promise<MatchMove> {
    const entity = this.moveRepo.create({
      matchId: data.matchId,
      playerId: data.playerId,
      row: data.row,
      col: data.col,
      sequenceNumber: data.sequenceNumber,
      placedAt: new Date(),
    });
    const saved = await this.moveRepo.save(entity);
    return this.moveToDomain(saved);
  }

  async findMovesByMatchId(matchId: string): Promise<MatchMove[]> {
    const entities = await this.moveRepo.find({
      where: { matchId },
      order: { sequenceNumber: 'ASC' },
    });
    return entities.map(this.moveToDomain);
  }

  async findNextSequenceNumber(matchId: string): Promise<number> {
    const result = await this.moveRepo
      .createQueryBuilder('m')
      .select('MAX(m.sequence_number)', 'max')
      .where('m.match_id = :matchId', { matchId })
      .getRawOne<{ max: number | null }>();
    return (result?.max ?? 0) + 1;
  }

  async createTournamentMatch(data: CreateTournamentMatchData): Promise<Match> {
    const [playerXId, playerOId] =
      Math.random() < 0.5
        ? [data.whitePlayerId, data.blackPlayerId]
        : [data.blackPlayerId, data.whitePlayerId];

    const now = new Date();
    const deadline = new Date(now.getTime() + 5 * 1000);

    const entity = this.matchRepo.create({
      configId: data.gameConfigId,
      boardSize: '18x18',
      moveTimeSeconds: 30,
      visibility: 'public',
      status: 'auto_starting',
      creatorId: data.whitePlayerId,
      secondPlayerId: data.blackPlayerId,
      playerXId,
      playerOId,
      currentTurnPlayerId: playerXId,
      pendingDrawRequestFromId: null,
      result: null,
      winnerPlayerId: null,
      playerXEloChange: null,
      playerOEloChange: null,
      deadlineAt: deadline,
      startedAt: now,
      endedAt: null,
      tournamentId: data.tournamentId,
    });
    const saved = await this.matchRepo.save(entity);
    return this.toDomain(saved);
  }

  async findOverdueAutoStarting(now: Date): Promise<Match[]> {
    const entities = await this.matchRepo.find({
      where: { status: 'auto_starting' as Match['status'], deadlineAt: LessThan(now) },
    });
    return entities.map(this.toDomain);
  }

  private toDomain(e: MatchOrmEntity): Match {
    const m = new Match();
    m.id = e.id;
    m.configId = e.configId;
    m.boardSize = e.boardSize as Match['boardSize'];
    m.moveTimeSeconds = e.moveTimeSeconds as Match['moveTimeSeconds'];
    m.visibility = e.visibility as Match['visibility'];
    m.status = e.status as Match['status'];
    m.creatorId = e.creatorId;
    m.secondPlayerId = e.secondPlayerId;
    m.playerXId = e.playerXId;
    m.playerOId = e.playerOId;
    m.currentTurnPlayerId = e.currentTurnPlayerId;
    m.pendingDrawRequestFromId = e.pendingDrawRequestFromId;
    m.result = e.result as Match['result'];
    m.winnerPlayerId = e.winnerPlayerId;
    m.playerXEloChange = e.playerXEloChange;
    m.playerOEloChange = e.playerOEloChange;
    m.deadlineAt = e.deadlineAt;
    m.startedAt = e.startedAt;
    m.endedAt = e.endedAt;
    m.tournamentId = e.tournamentId ?? null;
    m.createdAt = e.createdAt;
    m.updatedAt = e.updatedAt;
    return m;
  }

  private moveToDomain(e: MatchMoveOrmEntity): MatchMove {
    const mv = new MatchMove();
    mv.id = e.id;
    mv.matchId = e.matchId;
    mv.playerId = e.playerId;
    mv.row = e.row;
    mv.col = e.col;
    mv.sequenceNumber = e.sequenceNumber;
    mv.placedAt = e.placedAt;
    return mv;
  }
}
