import { TournamentRegistration } from '../entities/tournament-registration';

export const TOURNAMENT_REGISTRATION_REPOSITORY_PORT = 'TOURNAMENT_REGISTRATION_REPOSITORY_PORT';

export interface CreateRegistrationData {
  tournamentId: string;
  playerId: string;
  eloAtRegistration: number;
}

export interface ITournamentRegistrationRepository {
  create(data: CreateRegistrationData): Promise<TournamentRegistration>;
  findByTournamentAndPlayer(tournamentId: string, playerId: string): Promise<TournamentRegistration | null>;
  findAllByTournament(tournamentId: string): Promise<TournamentRegistration[]>;
  /**
   * SELECT FOR UPDATE SKIP LOCKED LIMIT 2 on idle registrations for the given tournament.
   * Must be called inside a transaction. Returns exactly 0 or 2 rows.
   */
  claimTwoIdlePlayers(tournamentId: string): Promise<TournamentRegistration[]>;
  save(registration: TournamentRegistration): Promise<TournamentRegistration>;
  /**
   * Atomic UPDATE SET tournament_points = tournament_points + pointsDelta, win_streak = newStreak
   * Returns updated registration. Never read-then-write at app layer.
   */
  atomicScoreUpdate(id: string, pointsDelta: number, newStreak: number): Promise<TournamentRegistration>;
}
