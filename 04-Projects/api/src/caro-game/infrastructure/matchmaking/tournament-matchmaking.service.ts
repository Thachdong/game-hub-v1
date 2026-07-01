import { Injectable, Inject } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  TOURNAMENT_REGISTRATION_REPOSITORY_PORT,
  ITournamentRegistrationRepository,
} from '../../domain/ports/tournament-registration.repository.port';
import {
  TOURNAMENT_MATCH_REPOSITORY_PORT,
  ITournamentMatchRepository,
} from '../../domain/ports/tournament-match.repository.port';
import {
  MATCH_REPOSITORY_PORT,
  IMatchRepositoryPort,
} from '../../domain/ports/match.repository.port';
import {
  TOURNAMENT_REPOSITORY_PORT,
  ITournamentRepository,
} from '../../domain/ports/tournament.repository.port';
import { TournamentMatch } from '../../domain/entities/tournament-match';
import { Match } from '../../domain/entities/match';

export interface PairResult {
  match: Match;
  tournamentMatch: TournamentMatch;
}

@Injectable()
export class TournamentMatchmakingService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @Inject(TOURNAMENT_REGISTRATION_REPOSITORY_PORT)
    private readonly registrationRepo: ITournamentRegistrationRepository,
    @Inject(TOURNAMENT_MATCH_REPOSITORY_PORT)
    private readonly tournamentMatchRepo: ITournamentMatchRepository,
    @Inject(MATCH_REPOSITORY_PORT)
    private readonly matchRepo: IMatchRepositoryPort,
    @Inject(TOURNAMENT_REPOSITORY_PORT)
    private readonly tournamentRepo: ITournamentRepository,
  ) {}

  /**
   * Claims two idle players via SKIP LOCKED, creates a match, and links them.
   * Returns null if fewer than 2 idle players are available.
   * The SKIP LOCKED claim and match creation happen inside a single transaction (C1 fix).
   */
  async pairNextTwo(tournamentId: string): Promise<PairResult | null> {
    return this.dataSource.transaction(async () => {
      // ADR-CARO-GAME-003: SKIP LOCKED inside transaction
      const claimed = await this.registrationRepo.claimTwoIdlePlayers(tournamentId);
      if (claimed.length < 2) return null;

      const [white, black] = claimed;

      const tournament = await this.tournamentRepo.findById(tournamentId);

      // Create the underlying caro match (auto-started, no lobby)
      const match = await this.matchRepo.createTournamentMatch({
        whitePlayerId: white.playerId,
        blackPlayerId: black.playerId,
        gameConfigId: tournament!.gameConfigId,
        tournamentId,
      });

      // Record the tournament match link
      const tournamentMatch = await this.tournamentMatchRepo.create({
        tournamentId,
        matchId: match.id,
        whiteRegistrationId: white.id,
        blackRegistrationId: black.id,
      });

      // Mark both registrations as in_match
      white.status = 'in_match';
      black.status = 'in_match';
      await this.registrationRepo.save(white);
      await this.registrationRepo.save(black);

      return { match, tournamentMatch };
    });
  }
}
