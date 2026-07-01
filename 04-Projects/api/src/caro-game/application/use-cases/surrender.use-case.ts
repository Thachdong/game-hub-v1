import { Inject, Injectable } from '@nestjs/common';
import { MATCH_REPOSITORY_PORT, IMatchRepositoryPort } from '../../domain/ports/match.repository.port';
import { MATCH_TIMER_SERVICE_PORT, IMatchTimerServicePort } from '../../domain/ports/match-timer.service.port';
import { PLAYER_PROFILE_REPOSITORY_PORT, IPlayerProfileRepositoryPort } from '../../domain/ports/player-profile.repository.port';
import { REALTIME_ROOM_PORT, IRealtimeRoomPort } from '../../../realtime/realtime-push.port';
import {
  MatchNotFoundError,
  NotAParticipantError,
  MatchNotInExpectedStatusError,
} from '../../domain/errors';

interface SurrenderInput {
  matchId: string;
  playerId: string;
}

@Injectable()
export class SurrenderUseCase {
  constructor(
    @Inject(MATCH_REPOSITORY_PORT) private readonly matchRepo: IMatchRepositoryPort,
    @Inject(MATCH_TIMER_SERVICE_PORT) private readonly timerService: IMatchTimerServicePort,
    @Inject(PLAYER_PROFILE_REPOSITORY_PORT) private readonly profileRepo: IPlayerProfileRepositoryPort,
    @Inject(REALTIME_ROOM_PORT) private readonly realtimeRoom: IRealtimeRoomPort,
  ) {}

  async execute(input: SurrenderInput): Promise<void> {
    const match = await this.matchRepo.findById(input.matchId);
    if (!match) throw new MatchNotFoundError();
    if (match.status !== 'in_progress') {
      throw new MatchNotInExpectedStatusError('in_progress', match.status);
    }

    const isX = match.playerXId === input.playerId;
    const isO = match.playerOId === input.playerId;
    if (!isX && !isO) throw new NotAParticipantError();

    this.timerService.cancelTimer(input.matchId);

    const winnerId = isX ? match.playerOId! : match.playerXId!;
    const result = isX ? 'o_wins' : 'x_wins';

    const [profileX, profileO] = await Promise.all([
      this.profileRepo.findByPlayerId(match.playerXId!),
      this.profileRepo.findByPlayerId(match.playerOId!),
    ]);

    const rX = profileX?.elo ?? 1200;
    const rO = profileO?.elo ?? 1200;
    const kX = (profileX?.matchesPlayed ?? 0) < 30 ? 40 : 20;
    const kO = (profileO?.matchesPlayed ?? 0) < 30 ? 40 : 20;
    const eX = 1 / (1 + Math.pow(10, (rO - rX) / 400));
    const sX = isX ? 0 : 1;
    const sO = 1 - sX;
    const xDelta = Math.round(kX * (sX - eX));
    const oDelta = Math.round(kO * (sO - (1 - eX)));

    await Promise.all([
      this.matchRepo.update(input.matchId, {
        status: 'completed',
        result,
        winnerPlayerId: winnerId,
        playerXEloChange: xDelta,
        playerOEloChange: oDelta,
        endedAt: new Date(),
      }),
      this.profileRepo.updateEloAtomic(match.playerXId!, xDelta, isX ? 'loss' : 'win'),
      this.profileRepo.updateEloAtomic(match.playerOId!, oDelta, isO ? 'loss' : 'win'),
    ]);

    this.realtimeRoom.pushToRoom(`match:${input.matchId}`, 'match:ended', {
      matchId: input.matchId,
      result,
      winnerPlayerId: winnerId,
      playerXEloChange: xDelta,
      playerOEloChange: oDelta,
      reason: 'surrender',
    });
  }
}
