import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { MATCH_REPOSITORY_PORT, IMatchRepositoryPort } from '../../domain/ports/match.repository.port';
import { PLAYER_PROFILE_REPOSITORY_PORT, IPlayerProfileRepositoryPort } from '../../domain/ports/player-profile.repository.port';
import { QUICK_PAIR_REPOSITORY_PORT, IQuickPairRepositoryPort } from '../../domain/ports/quick-pair.repository.port';
import { GAME_CONFIG_REPOSITORY_PORT, IGameConfigRepositoryPort } from '../../domain/ports/game-config.repository.port';
import { MATCH_TIMER_SERVICE_PORT, IMatchTimerServicePort } from '../../domain/ports/match-timer.service.port';
import { REALTIME_PUSH_PORT, IRealtimePushPort } from '../../../realtime/realtime-push.port';
import {
  GameConfigNotFoundError,
  PlayerAlreadyInActiveStateError,
} from '../../domain/errors';

interface QuickPairInput {
  playerId: string;
  configId: string;
}

interface QuickPairResult {
  status: 'waiting' | 'matched';
  requestId?: string;
  matchId?: string;
}

const START_WINDOW_SECONDS = 30;

@Injectable()
export class QuickPairUseCase {
  constructor(
    @Inject(MATCH_REPOSITORY_PORT) private readonly matchRepo: IMatchRepositoryPort,
    @Inject(QUICK_PAIR_REPOSITORY_PORT) private readonly quickPairRepo: IQuickPairRepositoryPort,
    @Inject(GAME_CONFIG_REPOSITORY_PORT) private readonly configRepo: IGameConfigRepositoryPort,
    @Inject(PLAYER_PROFILE_REPOSITORY_PORT) private readonly profileRepo: IPlayerProfileRepositoryPort,
    @Inject(MATCH_TIMER_SERVICE_PORT) private readonly timerService: IMatchTimerServicePort,
    @Inject(REALTIME_PUSH_PORT) private readonly realtimePush: IRealtimePushPort,
    private readonly dataSource: DataSource,
  ) {}

  async execute(input: QuickPairInput): Promise<QuickPairResult> {
    const [config, activeMatch, activeRequest] = await Promise.all([
      this.configRepo.findById(input.configId),
      this.matchRepo.findActiveByPlayerId(input.playerId),
      this.quickPairRepo.findActiveByPlayerId(input.playerId),
    ]);

    if (!config || !config.active) throw new GameConfigNotFoundError();
    if (activeMatch || activeRequest) throw new PlayerAlreadyInActiveStateError();

    // Ensure player profile
    const profile = await this.profileRepo.findByPlayerId(input.playerId);
    if (!profile) await this.profileRepo.createWithElo1200(input.playerId);

    return this.dataSource.transaction(async () => {
      // Try to match with an existing waiting opponent (FOR UPDATE SKIP LOCKED)
      const opponent = await this.quickPairRepo.findWaitingOpponent(
        config.boardSize,
        config.moveTimeSeconds,
        input.playerId,
      );

      if (!opponent) {
        // No opponent — enter the queue
        const request = await this.quickPairRepo.create({
          playerId: input.playerId,
          configId: input.configId,
          boardSize: config.boardSize,
          moveTimeSeconds: config.moveTimeSeconds,
        });
        return { status: 'waiting' as const, requestId: request.id };
      }

      // Match found: create the match
      const [playerXId, playerOId] =
        Math.random() < 0.5
          ? [input.playerId, opponent.playerId]
          : [opponent.playerId, input.playerId];

      const deadlineAt = new Date(Date.now() + START_WINDOW_SECONDS * 1000);

      const match = await this.matchRepo.save({
        configId: input.configId,
        boardSize: config.boardSize,
        moveTimeSeconds: config.moveTimeSeconds,
        visibility: 'public',
        creatorId: input.playerId,
      });

      const paired = await this.matchRepo.update(match.id, {
        secondPlayerId: opponent.playerId,
        playerXId,
        playerOId,
        status: 'waiting_for_start',
        deadlineAt,
      });

      await this.quickPairRepo.markMatched(opponent.id, match.id);

      // Notify both players
      await Promise.all([
        this.realtimePush.pushToUser(input.playerId, 'quick_pair:matched', {
          matchId: match.id, playerXId, playerOId, deadlineAt,
        }),
        this.realtimePush.pushToUser(opponent.playerId, 'quick_pair:matched', {
          matchId: match.id, playerXId, playerOId, deadlineAt,
        }),
      ]);

      // Auto-cancel if neither starts in time
      this.timerService.scheduleStartWindow(match.id, deadlineAt, async () => {
        const current = await this.matchRepo.findById(match.id);
        if (current && current.status === 'waiting_for_start') {
          await this.matchRepo.update(match.id, { status: 'cancelled', endedAt: new Date() });
          await Promise.all([
            this.realtimePush.pushToUser(input.playerId, 'match:cancelled', { matchId: match.id, reason: 'start_timeout' }),
            this.realtimePush.pushToUser(opponent.playerId, 'match:cancelled', { matchId: match.id, reason: 'start_timeout' }),
          ]);
        }
      });

      return { status: 'matched' as const, matchId: match.id };
    });
  }
}
