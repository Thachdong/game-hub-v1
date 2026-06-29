import { Inject, Injectable } from '@nestjs/common';
import {
  GAME_ADMIN_ROLE_REPO,
  IGameAdminRoleRepository,
} from '@domain/ports/game-admin-role.repository.port';
import {
  GAME_REGISTRY_PORT,
  IGameRegistryPort,
} from '@domain/ports/game-registry.port';
import { ACCOUNT_REPO, IAccountRepository } from '@domain/ports/account.repository.port';
import { GameAdminRole } from '@domain/entities/game-admin-role';
import { AccountNotFoundError, GameNotFoundError } from '@domain/errors';

@Injectable()
export class AssignGameAdminUseCase {
  constructor(
    @Inject(GAME_ADMIN_ROLE_REPO) private readonly gameAdminRoleRepo: IGameAdminRoleRepository,
    @Inject(GAME_REGISTRY_PORT) private readonly gameRegistry: IGameRegistryPort,
    @Inject(ACCOUNT_REPO) private readonly accountRepo: IAccountRepository,
  ) {}

  async execute(targetAccountId: string, gameId: string): Promise<GameAdminRole> {
    const account = await this.accountRepo.findById(targetAccountId);
    if (!account) throw new AccountNotFoundError();

    const gameExists = await this.gameRegistry.exists(gameId);
    if (!gameExists) throw new GameNotFoundError();

    return this.gameAdminRoleRepo.upsert(targetAccountId, gameId);
  }
}
