import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { MatchCompletedEvent } from '../../domain/events/tournament.events';
import { RecordTournamentMatchResultUseCase } from '../../application/commands/record-tournament-match-result.use-case';
import { PairIdlePlayersUseCase } from '../../application/commands/pair-idle-players.use-case';

@Injectable()
export class TournamentMatchCompletedHandler {
  constructor(
    private readonly recordResultUseCase: RecordTournamentMatchResultUseCase,
    private readonly pairIdlePlayersUseCase: PairIdlePlayersUseCase,
  ) {}

  @OnEvent('match.completed')
  async handle(event: MatchCompletedEvent): Promise<void> {
    if (!event.tournamentId) return;

    await this.recordResultUseCase.execute({
      matchId: event.matchId,
      winnerId: event.winnerPlayerId,
      isDraw: event.isDraw,
      playerXId: event.playerXId,
      playerOId: event.playerOId,
    });

    // Re-pair both players immediately after scoring (if a partner is available)
    await this.pairIdlePlayersUseCase.execute(event.tournamentId);
  }
}
