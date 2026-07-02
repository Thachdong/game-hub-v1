import { Inject, Injectable } from '@nestjs/common';
import { MATCH_REPOSITORY_PORT, IMatchRepositoryPort, MatchHistoryCursor, MatchHistoryPage } from '../../domain/ports/match.repository.port';

interface GetMatchHistoryInput {
  playerId: string;
  limit: number;
  cursor?: string;
}

@Injectable()
export class GetMatchHistoryUseCase {
  constructor(
    @Inject(MATCH_REPOSITORY_PORT) private readonly matchRepo: IMatchRepositoryPort,
  ) {}

  async execute(input: GetMatchHistoryInput): Promise<MatchHistoryPage> {
    let cursor: MatchHistoryCursor | undefined;
    if (input.cursor) {
      try {
        cursor = JSON.parse(Buffer.from(input.cursor, 'base64').toString('utf8')) as MatchHistoryCursor;
      } catch {
        cursor = undefined;
      }
    }
    return this.matchRepo.findByPlayerIdHistory(input.playerId, input.limit, cursor);
  }
}
