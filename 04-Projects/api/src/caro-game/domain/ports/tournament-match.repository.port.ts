import { TournamentMatch } from '../entities/tournament-match';

export const TOURNAMENT_MATCH_REPOSITORY_PORT = 'TOURNAMENT_MATCH_REPOSITORY_PORT';

export interface CreateTournamentMatchData {
  tournamentId: string;
  matchId: string;
  whiteRegistrationId: string;
  blackRegistrationId: string;
}

export interface ITournamentMatchRepository {
  create(data: CreateTournamentMatchData): Promise<TournamentMatch>;
  findByMatchId(matchId: string): Promise<TournamentMatch | null>;
  save(tournamentMatch: TournamentMatch): Promise<TournamentMatch>;
}
