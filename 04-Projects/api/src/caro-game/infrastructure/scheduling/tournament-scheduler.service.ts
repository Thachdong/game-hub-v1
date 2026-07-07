import { Injectable, Inject } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  TOURNAMENT_REPOSITORY_PORT,
  ITournamentRepository,
} from '../../domain/ports/tournament.repository.port';
import { MATCH_REPOSITORY_PORT, IMatchRepositoryPort } from '../../domain/ports/match.repository.port';
import { StartTournamentUseCase } from '../../application/commands/start-tournament.use-case';
import { EndTournamentUseCase } from '../../application/commands/end-tournament.use-case';
import { TournamentMatchAutoStartService } from './tournament-match-auto-start.service';

@Injectable()
export class TournamentSchedulerService {
  constructor(
    @Inject(TOURNAMENT_REPOSITORY_PORT)
    private readonly tournamentRepo: ITournamentRepository,
    @Inject(MATCH_REPOSITORY_PORT)
    private readonly matchRepo: IMatchRepositoryPort,
    private readonly startTournamentUseCase: StartTournamentUseCase,
    private readonly endTournamentUseCase: EndTournamentUseCase,
    private readonly autoStartService: TournamentMatchAutoStartService,
  ) {}

  @Cron('*/10 * * * * *')
  async handleTournamentStarts(): Promise<void> {
    const now = new Date();
    const overdue = await this.tournamentRepo.findOverdueWaiting(now);
    for (const tournament of overdue) {
      await this.startTournamentUseCase.execute(tournament.id);
    }
  }

  @Cron('*/10 * * * * *')
  async handleTournamentEnds(): Promise<void> {
    const now = new Date();
    const overdue = await this.tournamentRepo.findOverdueInProgress(now);
    for (const tournament of overdue) {
      await this.endTournamentUseCase.execute(tournament.id);
    }
  }

  /** Restart-safety net: catches any auto_starting match whose in-process timer was dropped by a
   * server restart mid-window (research.md §4). Idempotent — transition() re-checks status. */
  @Cron('*/10 * * * * *')
  async handleOverdueAutoStartingMatches(): Promise<void> {
    const now = new Date();
    const overdue = await this.matchRepo.findOverdueAutoStarting(now);
    for (const match of overdue) {
      await this.autoStartService.transition(match.id);
    }
  }
}
