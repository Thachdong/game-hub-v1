import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessageOrmEntity } from './typeorm-entities/chat-message.orm-entity';
import { ChatMessage, IChatRepositoryPort } from '../../domain/ports/chat.repository.port';

@Injectable()
export class ChatTypeOrmRepository implements IChatRepositoryPort {
  constructor(
    @InjectRepository(ChatMessageOrmEntity)
    private readonly repo: Repository<ChatMessageOrmEntity>,
  ) {}

  async save(data: { matchId: string; senderId: string; content: string }): Promise<ChatMessage> {
    const entity = this.repo.create(data);
    return this.toModel(await this.repo.save(entity));
  }

  async findByMatchId(matchId: string): Promise<ChatMessage[]> {
    const entities = await this.repo.find({
      where: { matchId },
      order: { sentAt: 'ASC' },
    });
    return entities.map(this.toModel);
  }

  private toModel(e: ChatMessageOrmEntity): ChatMessage {
    return { id: e.id, matchId: e.matchId, senderId: e.senderId, content: e.content, sentAt: e.sentAt };
  }
}
