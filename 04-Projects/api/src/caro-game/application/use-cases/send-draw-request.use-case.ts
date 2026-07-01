import { Inject, Injectable } from '@nestjs/common';
import { MATCH_REPOSITORY_PORT, IMatchRepositoryPort } from '../../domain/ports/match.repository.port';
import { REALTIME_ROOM_PORT, IRealtimeRoomPort } from '../../../realtime/realtime-push.port';
import {
  MatchNotFoundError,
  NotAParticipantError,
  MatchNotInExpectedStatusError,
  DrawRequestAlreadyPendingError,
} from '../../domain/errors';

interface SendDrawRequestInput {
  matchId: string;
  playerId: string;
}

@Injectable()
export class SendDrawRequestUseCase {
  constructor(
    @Inject(MATCH_REPOSITORY_PORT) private readonly matchRepo: IMatchRepositoryPort,
    @Inject(REALTIME_ROOM_PORT) private readonly realtimeRoom: IRealtimeRoomPort,
  ) {}

  async execute(input: SendDrawRequestInput): Promise<void> {
    const match = await this.matchRepo.findById(input.matchId);
    if (!match) throw new MatchNotFoundError();
    if (match.status !== 'in_progress') {
      throw new MatchNotInExpectedStatusError('in_progress', match.status);
    }

    const isParticipant = match.playerXId === input.playerId || match.playerOId === input.playerId;
    if (!isParticipant) throw new NotAParticipantError();

    // Any pending draw request (from anyone) blocks a new one
    if (match.pendingDrawRequestFromId !== null && match.pendingDrawRequestFromId !== undefined) {
      throw new DrawRequestAlreadyPendingError();
    }

    await this.matchRepo.update(input.matchId, {
      pendingDrawRequestFromId: input.playerId,
    });

    const opponentId = match.playerXId === input.playerId ? match.playerOId! : match.playerXId!;

    this.realtimeRoom.pushToRoom(`match:${input.matchId}`, 'match:draw_requested', {
      matchId: input.matchId,
      fromPlayerId: input.playerId,
      toPlayerId: opponentId,
    });
  }
}
