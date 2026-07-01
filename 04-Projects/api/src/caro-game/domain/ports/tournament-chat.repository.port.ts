import { TournamentChatMessage } from '../entities/tournament-chat-message';

export const TOURNAMENT_CHAT_REPOSITORY_PORT = 'TOURNAMENT_CHAT_REPOSITORY_PORT';

export interface CreateTournamentChatMessageData {
  tournamentId: string;
  senderPlayerId: string;
  content: string;
}

export interface ITournamentChatRepository {
  create(data: CreateTournamentChatMessageData): Promise<TournamentChatMessage>;
  findRecentByTournament(tournamentId: string, limit: number): Promise<TournamentChatMessage[]>;
}
