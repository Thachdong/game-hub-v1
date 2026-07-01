import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TournamentChatMessageOrmEntity } from './typeorm-entities/tournament-chat-message.orm-entity';
import {
  ITournamentChatRepository,
  CreateTournamentChatMessageData,
} from '../../domain/ports/tournament-chat.repository.port';
import { TournamentChatMessage } from '../../domain/entities/tournament-chat-message';

@Injectable()
export class TournamentChatTypeOrmRepository implements ITournamentChatRepository {
  constructor(
    @InjectRepository(TournamentChatMessageOrmEntity)
    private readonly repo: Repository<TournamentChatMessageOrmEntity>,
  ) {}

  async create(data: CreateTournamentChatMessageData): Promise<TournamentChatMessage> {
    const entity = this.repo.create({
      tournamentId: data.tournamentId,
      senderPlayerId: data.senderPlayerId,
      content: data.content,
    });
    const saved = await this.repo.save(entity);
    return this.toDomain(saved);
  }

  async findRecentByTournament(tournamentId: string, limit: number): Promise<TournamentChatMessage[]> {
    const entities = await this.repo.find({
      where: { tournamentId },
      order: { sentAt: 'ASC' },
      take: limit,
    });
    return entities.map(e => this.toDomain(e));
  }

  private toDomain(e: TournamentChatMessageOrmEntity): TournamentChatMessage {
    const m = new TournamentChatMessage();
    m.id = e.id;
    m.tournamentId = e.tournamentId;
    m.senderPlayerId = e.senderPlayerId;
    m.content = e.content;
    m.sentAt = e.sentAt;
    return m;
  }
}
