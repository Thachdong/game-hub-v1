export const CHAT_REPOSITORY_PORT = 'CHAT_REPOSITORY_PORT';

export interface ChatMessage {
  id: string;
  matchId: string;
  senderId: string;
  content: string;
  sentAt: Date;
}

export interface IChatRepositoryPort {
  save(data: { matchId: string; senderId: string; content: string }): Promise<ChatMessage>;
  findByMatchId(matchId: string): Promise<ChatMessage[]>;
}
