import { Inject, Injectable } from '@nestjs/common';
import { MATCH_REPOSITORY_PORT, IMatchRepositoryPort } from '../../domain/ports/match.repository.port';
import { MatchNotFoundError } from '../../domain/errors';
import { Match } from '../../domain/entities/match';
import { MatchMove } from '../../domain/entities/match-move';

export interface MatchStateResult {
  match: Match;
  moves: MatchMove[];
}

@Injectable()
export class GetMatchStateUseCase {
  constructor(
    @Inject(MATCH_REPOSITORY_PORT) private readonly matchRepo: IMatchRepositoryPort,
  ) {}

  async execute(matchId: string): Promise<MatchStateResult> {
    const [match, moves] = await Promise.all([
      this.matchRepo.findById(matchId),
      this.matchRepo.findMovesByMatchId(matchId),
    ]);
    if (!match) throw new MatchNotFoundError();
    return { match, moves };
  }
}
