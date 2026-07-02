import { Inject, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ACCOUNT_REPO, IAccountRepository } from '@domain/ports/account.repository.port';
import {
  GAME_ADMIN_ROLE_REPO,
  IGameAdminRoleRepository,
} from '@domain/ports/game-admin-role.repository.port';
import { TOKEN_SERVICE, ITokenService } from '@domain/ports/token.service.port';
import { APP_CONFIG, AppConfig } from '@config/app.config';
import { InvalidRefreshTokenError } from '@domain/errors';
import { AccountNotFoundError } from '@domain/errors';

export interface RefreshAccessTokenResult {
  accessToken: string;
}

@Injectable()
export class RefreshAccessTokenUseCase {
  constructor(
    @Inject(TOKEN_SERVICE) private readonly tokenService: ITokenService,
    @Inject(ACCOUNT_REPO) private readonly accountRepo: IAccountRepository,
    @Inject(GAME_ADMIN_ROLE_REPO) private readonly gameAdminRoleRepo: IGameAdminRoleRepository,
    @Inject(APP_CONFIG) private readonly appConfig: AppConfig,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async execute(refreshToken: string): Promise<RefreshAccessTokenResult> {
    let sub: string;
    try {
      const payload = this.tokenService.verifyRefreshToken(refreshToken);
      sub = payload.sub;
    } catch {
      throw new InvalidRefreshTokenError();
    }

    const account = await this.accountRepo.findById(sub);
    if (!account) throw new AccountNotFoundError();

    const gameAdminRoles = await this.gameAdminRoleRepo.findByAccountId(account.id);
    const isPlatformAdmin = this.appConfig.platformAdminEmails.includes(account.email);
    const rows = await this.dataSource.query<{ is_tournament_creator: boolean }[]>(
      `SELECT is_tournament_creator FROM caro_game.player_profiles WHERE player_id = $1 LIMIT 1`,
      [account.id],
    );
    const isTournamentCreator = rows[0]?.is_tournament_creator ?? false;

    const accessToken = this.tokenService.signAccessToken({
      sub: account.id,
      email: account.email,
      isPlatformAdmin,
      gameAdminRoles,
      isTournamentCreator,
      type: 'access',
    });

    return { accessToken };
  }
}
