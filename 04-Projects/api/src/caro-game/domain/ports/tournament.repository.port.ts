import { Tournament, TournamentStatus } from '../entities/tournament';

export const TOURNAMENT_REPOSITORY_PORT = 'TOURNAMENT_REPOSITORY_PORT';

export interface CreateTournamentData {
  creatorPlayerId: string;
  gameConfigId: string;
  minElo: number;
  startAt: Date;
  endAt: Date;
}

export interface ITournamentRepository {
  create(data: CreateTournamentData): Promise<Tournament>;
  findById(id: string): Promise<Tournament | null>;
  /** Tournaments in 'waiting' status whose startAt <= now */
  findOverdueWaiting(now: Date): Promise<Tournament[]>;
  /** Tournaments in 'in_progress' status whose endAt <= now */
  findOverdueInProgress(now: Date): Promise<Tournament[]>;
  save(tournament: Tournament): Promise<Tournament>;
  findAll(status?: TournamentStatus, limit?: number, cursor?: string): Promise<{ items: Tournament[]; nextCursor: string | null }>;
  countRegistrants(tournamentId: string): Promise<number>;
}
