import { Inject, Injectable } from '@nestjs/common';
import {
  GAME_ADMIN_ROLE_REPO,
  IGameAdminRoleRepository,
} from '../../domain/ports/game-admin-role.repository.port';
import { GameAdminRoleNotFoundError } from '../../domain/errors';

@Injectable()
export class RevokeGameAdminUseCase {
  constructor(
    @Inject(GAME_ADMIN_ROLE_REPO) private readonly gameAdminRoleRepo: IGameAdminRoleRepository,
  ) {}

  async execute(targetAccountId: string, gameId: string): Promise<void> {
    const exists = await this.gameAdminRoleRepo.existsForPair(targetAccountId, gameId);
    if (!exists) throw new GameAdminRoleNotFoundError();

    await this.gameAdminRoleRepo.delete(targetAccountId, gameId);
  }
}
