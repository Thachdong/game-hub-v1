import { Inject, Injectable } from '@nestjs/common';
import { MATCH_REPOSITORY_PORT, IMatchRepositoryPort } from '../../domain/ports/match.repository.port';
import { MATCH_TIMER_SERVICE_PORT, IMatchTimerServicePort } from '../../domain/ports/match-timer.service.port';
import { REALTIME_ROOM_PORT, IRealtimeRoomPort } from '../../../realtime/realtime-push.port';
import {
  MatchNotFoundError,
  NotAParticipantError,
  MatchNotInExpectedStatusError,
} from '../../domain/errors';
import { Match } from '../../domain/entities/match';

interface LeaveMatchInput {
  matchId: string;
  playerId: string;
}

@Injectable()
export class LeaveMatchBeforeStartUseCase {
  constructor(
    @Inject(MATCH_REPOSITORY_PORT) private readonly matchRepo: IMatchRepositoryPort,
    @Inject(MATCH_TIMER_SERVICE_PORT) private readonly timerService: IMatchTimerServicePort,
    @Inject(REALTIME_ROOM_PORT) private readonly realtimeRoom: IRealtimeRoomPort,
  ) {}

  async execute(input: LeaveMatchInput): Promise<Match> {
    const match = await this.matchRepo.findById(input.matchId);
    if (!match) throw new MatchNotFoundError();
    if (match.status !== 'waiting_for_start') {
      throw new MatchNotInExpectedStatusError('waiting_for_start', match.status);
    }

    const isParticipant =
      match.creatorId === input.playerId || match.secondPlayerId === input.playerId;
    if (!isParticipant) throw new NotAParticipantError();

    this.timerService.cancelTimer(input.matchId);

    // Whoever leaves — cancel the match
    const updated = await this.matchRepo.update(input.matchId, {
      status: 'cancelled',
      endedAt: new Date(),
    });

    this.realtimeRoom.pushToRoom(`match:${input.matchId}`, 'match:cancelled', {
      matchId: input.matchId,
      cancelledBy: input.playerId,
      reason: 'player_left_before_start',
    });

    return updated;
  }
}
