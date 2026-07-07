import { TournamentRegistration } from '../entities/tournament-registration';

export const TOURNAMENT_REGISTRATION_REPOSITORY_PORT = 'TOURNAMENT_REGISTRATION_REPOSITORY_PORT';

export interface CreateRegistrationData {
  tournamentId: string;
  playerId: string;
  eloAtRegistration: number;
}

export interface FindAllByTournamentOptions {
  page: number;
  pageSize: number;
}

export interface FindAllByTournamentResult {
  items: TournamentRegistration[];
  total: number;
}

export interface ITournamentRegistrationRepository {
  create(data: CreateRegistrationData): Promise<TournamentRegistration>;
  findByTournamentAndPlayer(tournamentId: string, playerId: string): Promise<TournamentRegistration | null>;
  /**
   * Ordered `tournament_points DESC, registered_at ASC` (FR-002's tie-break). `total` is the
   * unpaginated count, so callers can compute `rank` against the full ordering (research.md §5).
   */
  findAllByTournament(
    tournamentId: string,
    options: FindAllByTournamentOptions,
  ): Promise<FindAllByTournamentResult>;
  /**
   * SELECT FOR UPDATE SKIP LOCKED LIMIT 2 on idle, unpaused, present registrations for the given
   * tournament. Must be called inside a transaction. Returns exactly 0 or 2 rows.
   */
  claimTwoIdlePlayers(tournamentId: string, presentPlayerIds: string[]): Promise<TournamentRegistration[]>;
  save(registration: TournamentRegistration): Promise<TournamentRegistration>;
  /**
   * Atomic UPDATE SET tournament_points = tournament_points + pointsDelta, win_streak = newStreak
   * Returns updated registration. Never read-then-write at app layer.
   */
  atomicScoreUpdate(id: string, pointsDelta: number, newStreak: number): Promise<TournamentRegistration>;
  /** Atomic UPDATE SET is_paused = paused (FR-004/FR-005a). */
  setPaused(tournamentId: string, playerId: string, paused: boolean): Promise<TournamentRegistration>;
}
