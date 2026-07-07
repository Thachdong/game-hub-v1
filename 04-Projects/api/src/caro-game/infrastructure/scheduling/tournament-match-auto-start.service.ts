import { Inject, Injectable } from '@nestjs/common';
import { MATCH_REPOSITORY_PORT, IMatchRepositoryPort } from '../../domain/ports/match.repository.port';
import { MATCH_TIMER_SERVICE_PORT, IMatchTimerServicePort } from '../../domain/ports/match-timer.service.port';
import { REALTIME_ROOM_PORT, IRealtimeRoomPort } from '../../../realtime/realtime-push.port';

/**
 * Transitions a tournament match from `auto_starting` to `in_progress` 5 seconds after creation,
 * with no manual Start click (FR-008). Reuses the existing per-match timer abstraction
 * (`MatchTimerService.scheduleStartWindow`) rather than a bespoke timer (research.md §4).
 */
@Injectable()
export class TournamentMatchAutoStartService {
  constructor(
    @Inject(MATCH_REPOSITORY_PORT)
    private readonly matchRepo: IMatchRepositoryPort,
    @Inject(MATCH_TIMER_SERVICE_PORT)
    private readonly timerService: IMatchTimerServicePort,
    @Inject(REALTIME_ROOM_PORT)
    private readonly realtimeRoom: IRealtimeRoomPort,
  ) {}

  schedule(matchId: string, autoStartDeadlineAt: Date): void {
    this.timerService.scheduleStartWindow(matchId, autoStartDeadlineAt, () => this.transition(matchId));
  }

  /** Also invoked directly by TournamentSchedulerService's sweep for overdue auto_starting matches
   * (research.md §4's restart-safety net) — idempotent via the `auto_starting` status guard below. */
  async transition(matchId: string): Promise<void> {
    const match = await this.matchRepo.findById(matchId);
    if (!match || match.status !== 'auto_starting') return;

    const deadlineAt = new Date(Date.now() + match.moveTimeSeconds * 1000);

    await this.matchRepo.update(matchId, {
      status: 'in_progress',
      currentTurnPlayerId: match.currentTurnPlayerId,
      startedAt: new Date(),
      deadlineAt,
    });

    this.realtimeRoom.pushToRoom(`match:${matchId}`, 'match:started', {
      matchId,
      currentTurnPlayerId: match.currentTurnPlayerId,
      deadlineAt,
    });

    // Mirrors StartMatchUseCase: schedule the first move's timeout (PlaceMoveUseCase reschedules
    // on every subsequent move).
    this.timerService.scheduleMoveTimer(matchId, deadlineAt, async () => {
      await this.handleMoveTimeout(matchId, match.currentTurnPlayerId!, match.playerXId!, match.playerOId!);
    });
  }

  private async handleMoveTimeout(
    matchId: string,
    timedOutPlayerId: string,
    playerXId: string,
    playerOId: string,
  ): Promise<void> {
    const match = await this.matchRepo.findById(matchId);
    if (!match || match.status !== 'in_progress') return;
    if (match.currentTurnPlayerId !== timedOutPlayerId) return;

    const winnerId = playerXId === timedOutPlayerId ? playerOId : playerXId;
    const result = winnerId === playerXId ? 'x_wins' : 'o_wins';

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
