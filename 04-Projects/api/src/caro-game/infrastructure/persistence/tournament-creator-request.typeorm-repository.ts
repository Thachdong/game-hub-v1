import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TournamentCreatorRequestOrmEntity } from './typeorm-entities/tournament-creator-request.orm-entity';
import {
  ITournamentCreatorRequestRepository,
} from '../../domain/ports/tournament-creator-request.repository.port';
import { TournamentCreatorRequest, TournamentCreatorRequestStatus } from '../../domain/entities/tournament-creator-request';
import { PendingRequestAlreadyExistsError } from '../../domain/errors';

@Injectable()
export class TournamentCreatorRequestTypeOrmRepository implements ITournamentCreatorRequestRepository {
  constructor(
    @InjectRepository(TournamentCreatorRequestOrmEntity)
    private readonly repo: Repository<TournamentCreatorRequestOrmEntity>,
  ) {}

  async create(playerId: string): Promise<TournamentCreatorRequest> {
    try {
      const entity = this.repo.create({ playerId, status: 'pending' });
      const saved = await this.repo.save(entity);
      return this.toDomain(saved);
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('idx_caro_tcr_one_pending_per_player')) {
        throw new PendingRequestAlreadyExistsError();
      }
      throw err;
    }
  }

  async findById(id: string): Promise<TournamentCreatorRequest | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  async findPendingByPlayerId(playerId: string): Promise<TournamentCreatorRequest | null> {
    const entity = await this.repo.findOne({ where: { playerId, status: 'pending' } });
    return entity ? this.toDomain(entity) : null;
  }

  async findAll(status?: TournamentCreatorRequestStatus): Promise<TournamentCreatorRequest[]> {
    const where = status ? { status } : {};
    const entities = await this.repo.find({ where, order: { createdAt: 'DESC' } });
    return entities.map(e => this.toDomain(e));
  }

  async save(request: TournamentCreatorRequest): Promise<TournamentCreatorRequest> {
    const entity = await this.repo.findOneOrFail({ where: { id: request.id } });
    entity.status = request.status;
    entity.reviewedBy = request.reviewedBy;
    entity.reviewedAt = request.reviewedAt;
    const saved = await this.repo.save(entity);
    return this.toDomain(saved);
  }

  private toDomain(e: TournamentCreatorRequestOrmEntity): TournamentCreatorRequest {
    const r = new TournamentCreatorRequest();
    r.id = e.id;
    r.playerId = e.playerId;
    r.status = e.status as TournamentCreatorRequest['status'];
    r.reviewedBy = e.reviewedBy;
    r.reviewedAt = e.reviewedAt;
    r.createdAt = e.createdAt;
    return r;
  }
}
