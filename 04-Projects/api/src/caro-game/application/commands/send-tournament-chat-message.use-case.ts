import { Inject, Injectable } from '@nestjs/common';
import {
  TOURNAMENT_CHAT_REPOSITORY_PORT,
  ITournamentChatRepository,
} from '../../domain/ports/tournament-chat.repository.port';
import {
  TOURNAMENT_REGISTRATION_REPOSITORY_PORT,
  ITournamentRegistrationRepository,
} from '../../domain/ports/tournament-registration.repository.port';
import { REALTIME_ROOM_PORT, IRealtimeRoomPort } from '../../../realtime/realtime-push.port';
import { NotRegisteredError } from '../../domain/errors';
import { TournamentChatMessage } from '../../domain/entities/tournament-chat-message';

const MAX_CONTENT_LENGTH = 500;

export interface SendTournamentChatInput {
  tournamentId: string;
  senderPlayerId: string;
  content: string;
}

@Injectable()
export class SendTournamentChatMessageUseCase {
  constructor(
    @Inject(TOURNAMENT_CHAT_REPOSITORY_PORT)
    private readonly chatRepo: ITournamentChatRepository,
    @Inject(TOURNAMENT_REGISTRATION_REPOSITORY_PORT)
    private readonly registrationRepo: ITournamentRegistrationRepository,
    @Inject(REALTIME_ROOM_PORT)
    private readonly realtimeRoom: IRealtimeRoomPort,
  ) {}

  async execute(input: SendTournamentChatInput): Promise<TournamentChatMessage> {
    const registration = await this.registrationRepo.findByTournamentAndPlayer(
      input.tournamentId,
      input.senderPlayerId,
    );
    if (!registration) throw new NotRegisteredError();

    const content = input.content.slice(0, MAX_CONTENT_LENGTH);

    const message = await this.chatRepo.create({
      tournamentId: input.tournamentId,
      senderPlayerId: input.senderPlayerId,
      content,
    });

    await this.realtimeRoom.pushToRoom(
      `tournament:${input.tournamentId}`,
      'tournament:chat-message',
      {
        messageId: message.id,
        senderPlayerId: message.senderPlayerId,
        content: message.content,
        sentAt: message.sentAt,
      },
    );

    return message;
  }
}
