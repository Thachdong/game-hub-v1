import { Inject, Injectable } from '@nestjs/common';
import { CHAT_REPOSITORY_PORT, IChatRepositoryPort, ChatMessage } from '../../domain/ports/chat.repository.port';
import { MATCH_REPOSITORY_PORT, IMatchRepositoryPort } from '../../domain/ports/match.repository.port';
import { MatchNotFoundError } from '../../domain/errors';

@Injectable()
export class GetChatHistoryUseCase {
  constructor(
    @Inject(MATCH_REPOSITORY_PORT) private readonly matchRepo: IMatchRepositoryPort,
    @Inject(CHAT_REPOSITORY_PORT) private readonly chatRepo: IChatRepositoryPort,
  ) {}

  async execute(matchId: string): Promise<ChatMessage[]> {
    const match = await this.matchRepo.findById(matchId);
    if (!match) throw new MatchNotFoundError();
    return this.chatRepo.findByMatchId(matchId);
  }
}
