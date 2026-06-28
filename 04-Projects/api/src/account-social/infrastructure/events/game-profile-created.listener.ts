import { Injectable, Inject } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { GameProfileCreatedEvent } from '../../domain/events/game-profile-created.event';
import {
  PLAYER_GAME_PROFILE_REPO,
  IPlayerGameProfileRepository,
} from '../../domain/ports/player-game-profile.repository.port';

@Injectable()
export class GameProfileCreatedListener {
  constructor(
    @Inject(PLAYER_GAME_PROFILE_REPO)
    private readonly profileRepo: IPlayerGameProfileRepository,
  ) {}

  @OnEvent(GameProfileCreatedEvent.EVENT_NAME)
  async handle(event: GameProfileCreatedEvent): Promise<void> {
    if (!event.accountId || !event.gameId) return;
    await this.profileRepo.upsert(event.accountId, event.gameId);
  }
}
