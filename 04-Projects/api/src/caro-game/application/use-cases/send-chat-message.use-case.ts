import { Inject, Injectable } from '@nestjs/common';
import { MATCH_REPOSITORY_PORT, IMatchRepositoryPort } from '../../domain/ports/match.repository.port';
import { CHAT_REPOSITORY_PORT, IChatRepositoryPort, ChatMessage } from '../../domain/ports/chat.repository.port';
import { REALTIME_ROOM_PORT, IRealtimeRoomPort } from '../../../realtime/realtime-push.port';
import { MuteRegistryService } from '../../infrastructure/mute-registry.service';
import {
  MatchNotFoundError,
  MatchNotInExpectedStatusError,
  ViewerMutedError,
} from '../../domain/errors';

interface SendChatInput {
  matchId: string;
  senderId: string;
  content: string;
}

@Injectable()
export class SendChatMessageUseCase {
  constructor(
    @Inject(MATCH_REPOSITORY_PORT) private readonly matchRepo: IMatchRepositoryPort,
    @Inject(CHAT_REPOSITORY_PORT) private readonly chatRepo: IChatRepositoryPort,
    @Inject(REALTIME_ROOM_PORT) private readonly realtimeRoom: IRealtimeRoomPort,
    private readonly muteRegistry: MuteRegistryService,
  ) {}

  async execute(input: SendChatInput): Promise<ChatMessage> {
    const match = await this.matchRepo.findById(input.matchId);
    if (!match) throw new MatchNotFoundError();
    if (match.status === 'cancelled') {
      throw new MatchNotInExpectedStatusError('active', match.status);
    }

    // Only viewers (non-participants) can be muted
    const isParticipant = match.playerXId === input.senderId || match.playerOId === input.senderId;
    if (!isParticipant && this.muteRegistry.isMuted(input.matchId, input.senderId)) {
      throw new ViewerMutedError();
    }

    const msg = await this.chatRepo.save({
      matchId: input.matchId,
      senderId: input.senderId,
      content: input.content.trim(),
    });

    this.realtimeRoom.pushToRoom(`match:${input.matchId}`, 'match:chat', {
      id: msg.id,
      matchId: input.matchId,
      senderId: input.senderId,
      content: msg.content,
      sentAt: msg.sentAt,
    });

    return msg;
  }
}
