import { Inject, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ACCOUNT_REPO, IAccountRepository } from '@domain/ports/account.repository.port';
import {
  GAME_ADMIN_ROLE_REPO,
  IGameAdminRoleRepository,
} from '@domain/ports/game-admin-role.repository.port';
import { TOKEN_SERVICE, ITokenService } from '@domain/ports/token.service.port';
import { APP_CONFIG, AppConfig } from '@config/app.config';
import { GoogleUserInfo } from '@domain/ports/google-oauth.port';
import { Account } from '@domain/entities/account';

export interface LoginWithGoogleResult {
  accessToken: string;
  refreshToken: string;
  account: Account;
}

@Injectable()
export class LoginWithGoogleUseCase {
  constructor(
    @Inject(ACCOUNT_REPO) private readonly accountRepo: IAccountRepository,
    @Inject(GAME_ADMIN_ROLE_REPO) private readonly gameAdminRoleRepo: IGameAdminRoleRepository,
    @Inject(TOKEN_SERVICE) private readonly tokenService: ITokenService,
    @Inject(APP_CONFIG) private readonly appConfig: AppConfig,
    private readonly eventEmitter: EventEmitter2,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async execute(googleUser: GoogleUserInfo): Promise<LoginWithGoogleResult> {
    let account = await this.accountRepo.findByEmail(googleUser.email);
    if (!account) {
      account = await this.accountRepo.save({
        email: googleUser.email,
        username: googleUser.name,
        avatarUrl: googleUser.avatarUrl,
      });
      this.eventEmitter.emit('account-social.account-created', { accountId: account.id });
    }

    const gameAdminRoles = await this.gameAdminRoleRepo.findByAccountId(account.id);
    const isPlatformAdmin = this.appConfig.platformAdminEmails.includes(account.email);
    const isTournamentCreator = await this.lookupTournamentCreatorFlag(account.id);

    const accessToken = this.tokenService.signAccessToken({
      sub: account.id,
      email: account.email,
      isPlatformAdmin,
      gameAdminRoles,
      isTournamentCreator,
      type: 'access',
    });
    const refreshToken = this.tokenService.signRefreshToken(account.id);

    return { accessToken, refreshToken, account };
  }

  private async lookupTournamentCreatorFlag(playerId: string): Promise<boolean> {
    const rows = await this.dataSource.query<{ is_tournament_creator: boolean }[]>(
      `SELECT is_tournament_creator FROM caro_game.player_profiles WHERE player_id = $1 LIMIT 1`,
      [playerId],
    );
    return rows[0]?.is_tournament_creator ?? false;
  }
}
