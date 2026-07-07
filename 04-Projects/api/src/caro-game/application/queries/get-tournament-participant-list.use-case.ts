import { Inject, Injectable } from '@nestjs/common';
import {
  TOURNAMENT_REGISTRATION_REPOSITORY_PORT,
  ITournamentRegistrationRepository,
  FindAllByTournamentResult,
} from '../../domain/ports/tournament-registration.repository.port';

export interface GetTournamentParticipantListInput {
  tournamentId: string;
  page: number;
  pageSize: number;
}

@Injectable()
export class GetTournamentParticipantListUseCase {
  constructor(
    @Inject(TOURNAMENT_REGISTRATION_REPOSITORY_PORT)
    private readonly registrationRepo: ITournamentRegistrationRepository,
  ) {}

  async execute(input: GetTournamentParticipantListInput): Promise<FindAllByTournamentResult> {
    return this.registrationRepo.findAllByTournament(input.tournamentId, {
      page: input.page,
      pageSize: input.pageSize,
    });
  }
}
