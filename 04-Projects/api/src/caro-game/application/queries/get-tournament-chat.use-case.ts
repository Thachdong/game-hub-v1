import { Inject, Injectable } from '@nestjs/common';
import {
  TOURNAMENT_CHAT_REPOSITORY_PORT,
  ITournamentChatRepository,
} from '../../domain/ports/tournament-chat.repository.port';
import {
  TOURNAMENT_REGISTRATION_REPOSITORY_PORT,
  ITournamentRegistrationRepository,
} from '../../domain/ports/tournament-registration.repository.port';
import { NotRegisteredError } from '../../domain/errors';
import { TournamentChatMessage } from '../../domain/entities/tournament-chat-message';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

@Injectable()
export class GetTournamentChatUseCase {
  constructor(
    @Inject(TOURNAMENT_CHAT_REPOSITORY_PORT)
    private readonly chatRepo: ITournamentChatRepository,
    @Inject(TOURNAMENT_REGISTRATION_REPOSITORY_PORT)
    private readonly registrationRepo: ITournamentRegistrationRepository,
  ) {}

  async execute(tournamentId: string, callerId: string, limit?: number): Promise<TournamentChatMessage[]> {
    const registration = await this.registrationRepo.findByTournamentAndPlayer(tournamentId, callerId);
    if (!registration) throw new NotRegisteredError();

    const effectiveLimit = Math.min(limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    return this.chatRepo.findRecentByTournament(tournamentId, effectiveLimit);
  }
}
