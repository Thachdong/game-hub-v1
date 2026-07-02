import { Inject, Injectable } from '@nestjs/common';
import { MATCH_REPOSITORY_PORT, IMatchRepositoryPort } from '../../domain/ports/match.repository.port';
import { Match } from '../../domain/entities/match';

@Injectable()
export class GetLobbyUseCase {
  constructor(
    @Inject(MATCH_REPOSITORY_PORT) private readonly matchRepo: IMatchRepositoryPort,
  ) {}

  async execute(): Promise<Match[]> {
    return this.matchRepo.findLobbyMatches();
  }
}
