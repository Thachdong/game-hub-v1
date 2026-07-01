import { Inject, Injectable } from '@nestjs/common';
import {
  TOURNAMENT_REPOSITORY_PORT,
  ITournamentRepository,
} from '../../domain/ports/tournament.repository.port';
import { Tournament, TournamentStatus } from '../../domain/entities/tournament';

export interface ListTournamentsInput {
  status?: TournamentStatus;
  limit?: number;
  cursor?: string;
}

export interface ListTournamentsResult {
  items: Tournament[];
  nextCursor: string | null;
}

@Injectable()
export class ListTournamentsUseCase {
  constructor(
    @Inject(TOURNAMENT_REPOSITORY_PORT)
    private readonly tournamentRepo: ITournamentRepository,
  ) {}

  async execute(input: ListTournamentsInput): Promise<ListTournamentsResult> {
    return this.tournamentRepo.findAll(input.status, input.limit ?? 20, input.cursor);
  }
}
