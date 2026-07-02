import { Inject, Injectable } from '@nestjs/common';
import { MATCH_REPOSITORY_PORT, IMatchRepositoryPort } from '../../domain/ports/match.repository.port';
import { MuteRegistryService } from '../../infrastructure/mute-registry.service';
import {
  MatchNotFoundError,
  NotAParticipantError,
  MatchNotInExpectedStatusError,
} from '../../domain/errors';

interface MuteViewerInput {
  matchId: string;
  requesterId: string;
  viewerId: string;
}

@Injectable()
export class MuteViewerUseCase {
  constructor(
    @Inject(MATCH_REPOSITORY_PORT) private readonly matchRepo: IMatchRepositoryPort,
    private readonly muteRegistry: MuteRegistryService,
  ) {}

  async execute(input: MuteViewerInput): Promise<void> {
    const match = await this.matchRepo.findById(input.matchId);
    if (!match) throw new MatchNotFoundError();
    if (match.status !== 'in_progress' && match.status !== 'waiting_for_start') {
      throw new MatchNotInExpectedStatusError('in_progress', match.status);
    }

    const isParticipant =
      match.playerXId === input.requesterId || match.playerOId === input.requesterId;
    if (!isParticipant) throw new NotAParticipantError();

    this.muteRegistry.mute(input.matchId, input.viewerId);
  }
}
