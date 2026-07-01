import { TournamentCreatorRequest, TournamentCreatorRequestStatus } from '../entities/tournament-creator-request';

export const TOURNAMENT_CREATOR_REQUEST_REPOSITORY_PORT = 'TOURNAMENT_CREATOR_REQUEST_REPOSITORY_PORT';

export interface ITournamentCreatorRequestRepository {
  create(playerId: string): Promise<TournamentCreatorRequest>;
  findById(id: string): Promise<TournamentCreatorRequest | null>;
  findPendingByPlayerId(playerId: string): Promise<TournamentCreatorRequest | null>;
  findAll(status?: TournamentCreatorRequestStatus): Promise<TournamentCreatorRequest[]>;
  save(request: TournamentCreatorRequest): Promise<TournamentCreatorRequest>;
}
