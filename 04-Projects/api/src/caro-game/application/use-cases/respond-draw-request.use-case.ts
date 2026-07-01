import { Inject, Injectable } from '@nestjs/common';
import { MATCH_REPOSITORY_PORT, IMatchRepositoryPort } from '../../domain/ports/match.repository.port';
import { MATCH_TIMER_SERVICE_PORT, IMatchTimerServicePort } from '../../domain/ports/match-timer.service.port';
import { PLAYER_PROFILE_REPOSITORY_PORT, IPlayerProfileRepositoryPort } from '../../domain/ports/player-profile.repository.port';
import { REALTIME_ROOM_PORT, IRealtimeRoomPort } from '../../../realtime/realtime-push.port';
import {
  MatchNotFoundError,
  NotAParticipantError,
  MatchNotInExpectedStatusError,
  NoDrawRequestPendingError,
} from '../../domain/errors';

interface RespondDrawRequestInput {
  matchId: string;
  playerId: string;
  action: 'accept' | 'decline';
}

@Injectable()
export class RespondDrawRequestUseCase {
  constructor(
    @Inject(MATCH_REPOSITORY_PORT) private readonly matchRepo: IMatchRepositoryPort,
    @Inject(MATCH_TIMER_SERVICE_PORT) private readonly timerService: IMatchTimerServicePort,
    @Inject(PLAYER_PROFILE_REPOSITORY_PORT) private readonly profileRepo: IPlayerProfileRepositoryPort,
    @Inject(REALTIME_ROOM_PORT) private readonly realtimeRoom: IRealtimeRoomPort,
  ) {}

  async execute(input: RespondDrawRequestInput): Promise<void> {
    const match = await this.matchRepo.findById(input.matchId);
    if (!match) throw new MatchNotFoundError();
    if (match.status !== 'in_progress') {
      throw new MatchNotInExpectedStatusError('in_progress', match.status);
    }

    const isParticipant = match.playerXId === input.playerId || match.playerOId === input.playerId;
    if (!isParticipant) throw new NotAParticipantError();

    if (!match.pendingDrawRequestFromId) throw new NoDrawRequestPendingError();

    if (input.action === 'decline') {
      await this.matchRepo.update(input.matchId, { pendingDrawRequestFromId: null });
      this.realtimeRoom.pushToRoom(`match:${input.matchId}`, 'match:draw_declined', {
        matchId: input.matchId,
        declinedBy: input.playerId,
      });
      return;
    }

    // Accept: end match as draw
    this.timerService.cancelTimer(input.matchId);

    const [profileX, profileO] = await Promise.all([
      this.profileRepo.findByPlayerId(match.playerXId!),
      this.profileRepo.findByPlayerId(match.playerOId!),
    ]);

    const rX = profileX?.elo ?? 1200;
    const rO = profileO?.elo ?? 1200;
    const kX = (profileX?.matchesPlayed ?? 0) < 30 ? 40 : 20;
    const kO = (profileO?.matchesPlayed ?? 0) < 30 ? 40 : 20;
    const eX = 1 / (1 + Math.pow(10, (rO - rX) / 400));
    const xDelta = Math.round(kX * (0.5 - eX));
    const oDelta = Math.round(kO * (0.5 - (1 - eX)));

    await Promise.all([
      this.matchRepo.update(input.matchId, {
        status: 'completed',
        result: 'draw',
        winnerPlayerId: null,
        playerXEloChange: xDelta,
        playerOEloChange: oDelta,
        pendingDrawRequestFromId: null,
        endedAt: new Date(),
      }),
      this.profileRepo.updateEloAtomic(match.playerXId!, xDelta, 'draw'),
      this.profileRepo.updateEloAtomic(match.playerOId!, oDelta, 'draw'),
    ]);

    this.realtimeRoom.pushToRoom(`match:${input.matchId}`, 'match:ended', {
      matchId: input.matchId,
      result: 'draw',
      winnerPlayerId: null,
      playerXEloChange: xDelta,
      playerOEloChange: oDelta,
    });
  }
}
