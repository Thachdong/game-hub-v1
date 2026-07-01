import { Inject, Injectable } from '@nestjs/common';
import {
  TOURNAMENT_REPOSITORY_PORT,
  ITournamentRepository,
} from '../../domain/ports/tournament.repository.port';
import {
  TOURNAMENT_REGISTRATION_REPOSITORY_PORT,
  ITournamentRegistrationRepository,
} from '../../domain/ports/tournament-registration.repository.port';
import {
  PLAYER_PROFILE_REPOSITORY_PORT,
  IPlayerProfileRepositoryPort,
} from '../../domain/ports/player-profile.repository.port';
import { REALTIME_ROOM_PORT, IRealtimeRoomPort } from '../../../realtime/realtime-push.port';
import {
  TournamentNotFoundError,
  TournamentRegistrationClosedError,
  InsufficientEloError,
  AlreadyRegisteredError,
  PlayerProfileNotFoundError,
} from '../../domain/errors';
import { TournamentRegistration } from '../../domain/entities/tournament-registration';
import { PairIdlePlayersUseCase } from './pair-idle-players.use-case';

export interface RegisterForTournamentInput {
  tournamentId: string;
  playerId: string;
}

@Injectable()
export class RegisterForTournamentUseCase {
  constructor(
    @Inject(TOURNAMENT_REPOSITORY_PORT)
    private readonly tournamentRepo: ITournamentRepository,
    @Inject(TOURNAMENT_REGISTRATION_REPOSITORY_PORT)
    private readonly registrationRepo: ITournamentRegistrationRepository,
    @Inject(PLAYER_PROFILE_REPOSITORY_PORT)
    private readonly profileRepo: IPlayerProfileRepositoryPort,
    @Inject(REALTIME_ROOM_PORT)
    private readonly realtimeRoom: IRealtimeRoomPort,
    private readonly pairIdlePlayersUseCase: PairIdlePlayersUseCase,
  ) {}

  async execute(input: RegisterForTournamentInput): Promise<TournamentRegistration> {
    const tournament = await this.tournamentRepo.findById(input.tournamentId);
    if (!tournament) throw new TournamentNotFoundError();

    if (tournament.status !== 'waiting' && tournament.status !== 'in_progress') {
      throw new TournamentRegistrationClosedError();
    }

    const profile = await this.profileRepo.findByPlayerId(input.playerId);
    if (!profile) throw new PlayerProfileNotFoundError();

    if (profile.elo < tournament.minElo) {
      throw new InsufficientEloError(tournament.minElo, profile.elo);
    }

    const registration = await this.registrationRepo.create({
      tournamentId: input.tournamentId,
      playerId: input.playerId,
      eloAtRegistration: profile.elo,
    });

    await this.realtimeRoom.pushToRoom(
      `tournament:${input.tournamentId}`,
      'tournament:participant-updated',
      { tournamentId: input.tournamentId, playerId: input.playerId, action: 'registered' },
    );

    // T057: late registration during in_progress — try to pair immediately
    if (tournament.status === 'in_progress') {
      await this.pairIdlePlayersUseCase.execute(input.tournamentId);
    }

    return registration;
  }
}
