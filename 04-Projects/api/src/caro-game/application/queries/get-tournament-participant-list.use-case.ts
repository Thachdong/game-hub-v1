import { Inject, Injectable } from '@nestjs/common';
import {
  TOURNAMENT_REGISTRATION_REPOSITORY_PORT,
  ITournamentRegistrationRepository,
} from '../../domain/ports/tournament-registration.repository.port';
import { TournamentRegistration } from '../../domain/entities/tournament-registration';

@Injectable()
export class GetTournamentParticipantListUseCase {
  constructor(
    @Inject(TOURNAMENT_REGISTRATION_REPOSITORY_PORT)
    private readonly registrationRepo: ITournamentRegistrationRepository,
  ) {}

  async execute(tournamentId: string): Promise<TournamentRegistration[]> {
    return this.registrationRepo.findAllByTournament(tournamentId);
  }
}
