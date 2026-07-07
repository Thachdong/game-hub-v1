import { Inject, Injectable } from '@nestjs/common';
import { MATCH_REPOSITORY_PORT, IMatchRepositoryPort } from '../../domain/ports/match.repository.port';
import { MATCH_TIMER_SERVICE_PORT, IMatchTimerServicePort } from '../../domain/ports/match-timer.service.port';
import { PLAYER_PROFILE_REPOSITORY_PORT, IPlayerProfileRepositoryPort } from '../../domain/ports/player-profile.repository.port';
import { REALTIME_ROOM_PORT, IRealtimeRoomPort } from '../../../realtime/realtime-push.port';
import {
  MatchNotFoundError,
  MatchNotInExpectedStatusError,
  MatchPrivateAccessDeniedError,
  PlayerAlreadyInActiveStateError,
} from '../../domain/errors';

interface JoinMatchInput {
  matchId: string;
  joinerId: string;
}

interface JoinMatchResult {
  matchId: string;
  status: string;
}

// Time the creator has to click "Start" after a second player joins (15 s)
const START_WINDOW_SECONDS = 15;

@Injectable()
export class JoinMatchUseCase {
  constructor(
    @Inject(MATCH_REPOSITORY_PORT) private readonly matchRepo: IMatchRepositoryPort,
    @Inject(MATCH_TIMER_SERVICE_PORT) private readonly timerService: IMatchTimerServicePort,
    @Inject(PLAYER_PROFILE_REPOSITORY_PORT) private readonly profileRepo: IPlayerProfileRepositoryPort,
    @Inject(REALTIME_ROOM_PORT) private readonly realtimeRoom: IRealtimeRoomPort,
  ) {}

  async execute(input: JoinMatchInput): Promise<JoinMatchResult> {
    const match = await this.matchRepo.findById(input.matchId);
    if (!match) throw new MatchNotFoundError();
    if (match.status !== 'looking_for_opponent') {
      throw new MatchNotInExpectedStatusError('looking_for_opponent', match.status);
    }
    if (match.visibility === 'private') throw new MatchPrivateAccessDeniedError();
    if (match.creatorId === input.joinerId) {
      throw new MatchNotInExpectedStatusError('looking_for_opponent (different player)', match.status);
    }

    const activeMatch = await this.matchRepo.findActiveByPlayerId(input.joinerId);
    if (activeMatch) throw new PlayerAlreadyInActiveStateError();

    const profile = await this.profileRepo.findByPlayerId(input.joinerId);
    if (!profile) await this.profileRepo.createWithElo1200(input.joinerId);

    const [playerXId, playerOId] =
      Math.random() < 0.5
        ? [match.creatorId, input.joinerId]
        : [input.joinerId, match.creatorId];

    const deadlineAt = new Date(Date.now() + START_WINDOW_SECONDS * 1000);

    const updated = await this.matchRepo.update(input.matchId, {
      secondPlayerId: input.joinerId,
      playerXId,
      playerOId,
      status: 'waiting_for_start',
      deadlineAt,
    });

    this.realtimeRoom.pushToRoom(`match:${input.matchId}`, 'match:player_joined', {
      matchId: input.matchId,
      joinerId: input.joinerId,
      playerXId,
      playerOId,
      deadlineAt,
    });

    // Auto-cancel if creator does not start within the window
    this.timerService.scheduleStartWindow(input.matchId, deadlineAt, async () => {
      const current = await this.matchRepo.findById(input.matchId);
      if (current && current.status === 'waiting_for_start') {
        await this.matchRepo.update(input.matchId, { status: 'cancelled', endedAt: new Date() });
        this.realtimeRoom.pushToRoom(`match:${input.matchId}`, 'match:cancelled', {
          matchId: input.matchId,
          reason: 'start_timeout',
        });
      }
    });

    return { matchId: input.matchId, status: updated.status };
  }
}
