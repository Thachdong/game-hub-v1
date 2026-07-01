import { Inject, Injectable } from '@nestjs/common';
import { MATCH_REPOSITORY_PORT, IMatchRepositoryPort } from '../../domain/ports/match.repository.port';
import { MATCH_TIMER_SERVICE_PORT, IMatchTimerServicePort } from '../../domain/ports/match-timer.service.port';
import { REALTIME_ROOM_PORT, IRealtimeRoomPort } from '../../../realtime/realtime-push.port';
import {
  MatchNotFoundError,
  NotMatchCreatorError,
  MatchNotInExpectedStatusError,
} from '../../domain/errors';
import { Match } from '../../domain/entities/match';

interface CancelMatchInput {
  matchId: string;
  requesterId: string;
}

@Injectable()
export class CancelMatchUseCase {
  constructor(
    @Inject(MATCH_REPOSITORY_PORT) private readonly matchRepo: IMatchRepositoryPort,
    @Inject(MATCH_TIMER_SERVICE_PORT) private readonly timerService: IMatchTimerServicePort,
    @Inject(REALTIME_ROOM_PORT) private readonly realtimeRoom: IRealtimeRoomPort,
  ) {}

  async execute(input: CancelMatchInput): Promise<Match> {
    const match = await this.matchRepo.findById(input.matchId);
    if (!match) throw new MatchNotFoundError();
    if (match.creatorId !== input.requesterId) throw new NotMatchCreatorError();
    if (!['looking_for_opponent', 'waiting_for_start'].includes(match.status)) {
      throw new MatchNotInExpectedStatusError('looking_for_opponent|waiting_for_start', match.status);
    }

    this.timerService.cancelTimer(input.matchId);

    const updated = await this.matchRepo.update(input.matchId, {
      status: 'cancelled',
      endedAt: new Date(),
    });

    this.realtimeRoom.pushToRoom(`match:${input.matchId}`, 'match:cancelled', {
      matchId: input.matchId,
      cancelledBy: input.requesterId,
    });

    return updated;
  }
}
