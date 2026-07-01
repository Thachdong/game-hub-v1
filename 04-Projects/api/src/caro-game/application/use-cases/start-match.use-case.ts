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

interface StartMatchInput {
  matchId: string;
  requesterId: string;
}

@Injectable()
export class StartMatchUseCase {
  constructor(
    @Inject(MATCH_REPOSITORY_PORT) private readonly matchRepo: IMatchRepositoryPort,
    @Inject(MATCH_TIMER_SERVICE_PORT) private readonly timerService: IMatchTimerServicePort,
    @Inject(REALTIME_ROOM_PORT) private readonly realtimeRoom: IRealtimeRoomPort,
  ) {}

  async execute(input: StartMatchInput): Promise<Match> {
    const match = await this.matchRepo.findById(input.matchId);
    if (!match) throw new MatchNotFoundError();
    if (match.creatorId !== input.requesterId) throw new NotMatchCreatorError();
    if (match.status !== 'waiting_for_start') {
      throw new MatchNotInExpectedStatusError('waiting_for_start', match.status);
    }

    this.timerService.cancelTimer(input.matchId);

    const deadlineAt = new Date(Date.now() + match.moveTimeSeconds * 1000);

    const updated = await this.matchRepo.update(input.matchId, {
      status: 'in_progress',
      currentTurnPlayerId: match.playerXId!,
      startedAt: new Date(),
      deadlineAt,
    });

    this.realtimeRoom.pushToRoom(`match:${input.matchId}`, 'match:started', {
      matchId: input.matchId,
      currentTurnPlayerId: match.playerXId,
      deadlineAt,
    });

    // Schedule first move timer
    this.timerService.scheduleMoveTimer(input.matchId, deadlineAt, async () => {
      await this.handleMoveTimeout(input.matchId, match.playerXId!);
    });

    return updated;
  }

  private async handleMoveTimeout(matchId: string, timedOutPlayerId: string): Promise<void> {
    const match = await this.matchRepo.findById(matchId);
    if (!match || match.status !== 'in_progress') return;
    if (match.currentTurnPlayerId !== timedOutPlayerId) return;

    // The player whose turn it is loses by timeout
    const winnerId = match.playerXId === timedOutPlayerId ? match.playerOId! : match.playerXId!;
    const result = winnerId === match.playerXId ? 'x_wins' : 'o_wins';

    await this.matchRepo.update(matchId, {
      status: 'completed',
      result,
      winnerPlayerId: winnerId,
      endedAt: new Date(),
    });

    this.realtimeRoom.pushToRoom(`match:${matchId}`, 'match:ended', {
      matchId,
      result,
      winnerPlayerId: winnerId,
      reason: 'timeout',
    });
  }
}
