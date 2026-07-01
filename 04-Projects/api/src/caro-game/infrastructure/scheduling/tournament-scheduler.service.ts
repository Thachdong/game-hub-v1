import { Injectable, Inject } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  TOURNAMENT_REPOSITORY_PORT,
  ITournamentRepository,
} from '../../domain/ports/tournament.repository.port';
import { StartTournamentUseCase } from '../../application/commands/start-tournament.use-case';
import { EndTournamentUseCase } from '../../application/commands/end-tournament.use-case';

@Injectable()
export class TournamentSchedulerService {
  constructor(
    @Inject(TOURNAMENT_REPOSITORY_PORT)
    private readonly tournamentRepo: ITournamentRepository,
    private readonly startTournamentUseCase: StartTournamentUseCase,
    private readonly endTournamentUseCase: EndTournamentUseCase,
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
}
