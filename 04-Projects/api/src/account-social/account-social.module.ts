import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';

// Config
import { APP_CONFIG, AppConfig } from '../config/app.config';
import { AuthConfig } from '../config/auth.config';

// ORM Entities
import { AccountOrmEntity } from './infrastructure/persistence/typeorm-entities/account.orm-entity';
import { FriendRequestOrmEntity } from './infrastructure/persistence/typeorm-entities/friend-request.orm-entity';
import { FriendshipOrmEntity } from './infrastructure/persistence/typeorm-entities/friendship.orm-entity';
import { GameAdminRoleOrmEntity } from './infrastructure/persistence/typeorm-entities/game-admin-role.orm-entity';
import { PlayerGameProfileOrmEntity } from './infrastructure/persistence/typeorm-entities/player-game-profile.orm-entity';

// Port Tokens
import { ACCOUNT_REPO } from './domain/ports/account.repository.port';
import { FRIEND_REQUEST_REPO } from './domain/ports/friend-request.repository.port';
import { FRIENDSHIP_REPO } from './domain/ports/friendship.repository.port';
import { GAME_ADMIN_ROLE_REPO } from './domain/ports/game-admin-role.repository.port';
import { PLAYER_GAME_PROFILE_REPO } from './domain/ports/player-game-profile.repository.port';
import { GAME_REGISTRY_PORT } from './domain/ports/game-registry.port';
import { EVENT_PUBLISHER_PORT } from './domain/ports/event-publisher.port';
import { TOKEN_SERVICE } from './domain/ports/token.service.port';

// Infrastructure Adapters
import { AccountTypeOrmRepository } from './infrastructure/persistence/account.typeorm-repository';
import { FriendRequestTypeOrmRepository } from './infrastructure/persistence/friend-request.typeorm-repository';
import { FriendshipTypeOrmRepository } from './infrastructure/persistence/friendship.typeorm-repository';
import { GameAdminRoleTypeOrmRepository } from './infrastructure/persistence/game-admin-role.typeorm-repository';
import { PlayerGameProfileTypeOrmRepository } from './infrastructure/persistence/player-game-profile.typeorm-repository';
import { GameRegistryTypeOrmRepository } from './infrastructure/persistence/game-registry.typeorm-repository';
import { EventPublisherAdapter } from './infrastructure/events/event-publisher.adapter';
import { GameProfileCreatedListener } from './infrastructure/events/game-profile-created.listener';
import { JwtTokenAdapter } from './infrastructure/auth/jwt-token.adapter';
import { JwtStrategy } from './infrastructure/auth/jwt.strategy';
import { GoogleOAuthAdapter } from './infrastructure/google-oauth/google-oauth.adapter';

// Application Commands
import { LoginWithGoogleUseCase } from './application/commands/login-with-google.use-case';
import { RefreshAccessTokenUseCase } from './application/commands/refresh-access-token.use-case';
import { SendFriendRequestUseCase } from './application/commands/send-friend-request.use-case';
import { ResolveFriendRequestUseCase } from './application/commands/resolve-friend-request.use-case';
import { AssignGameAdminUseCase } from './application/commands/assign-game-admin.use-case';
import { RevokeGameAdminUseCase } from './application/commands/revoke-game-admin.use-case';

// Application Queries
import { GetAccountProfileUseCase } from './application/queries/get-account-profile.use-case';
import { GetGameListUseCase } from './application/queries/get-game-list.use-case';
import { GetFriendsUseCase } from './application/queries/get-friends.use-case';
import { GetFriendRequestsUseCase } from './application/queries/get-friend-requests.use-case';

// Interface Layer
import { AuthController } from './interface/http/auth.controller';
import { AccountController } from './interface/http/account.controller';
import { GamesController } from './interface/http/games.controller';
import { FriendsController } from './interface/http/friends.controller';
import { AdminController } from './interface/http/admin.controller';
import { DomainExceptionFilter } from './interface/filters/domain-exception.filter';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AccountOrmEntity,
      FriendRequestOrmEntity,
      FriendshipOrmEntity,
      GameAdminRoleOrmEntity,
      PlayerGameProfileOrmEntity,
    ]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const auth = configService.get<AuthConfig>('auth')!;
        return {
          secret: auth.jwtAccessSecret,
          signOptions: { expiresIn: auth.jwtAccessExpiresIn },
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [
    // Repository adapters bound to port tokens
    { provide: ACCOUNT_REPO, useClass: AccountTypeOrmRepository },
    { provide: FRIEND_REQUEST_REPO, useClass: FriendRequestTypeOrmRepository },
    { provide: FRIENDSHIP_REPO, useClass: FriendshipTypeOrmRepository },
    { provide: GAME_ADMIN_ROLE_REPO, useClass: GameAdminRoleTypeOrmRepository },
    { provide: PLAYER_GAME_PROFILE_REPO, useClass: PlayerGameProfileTypeOrmRepository },
    { provide: GAME_REGISTRY_PORT, useClass: GameRegistryTypeOrmRepository },
    { provide: EVENT_PUBLISHER_PORT, useClass: EventPublisherAdapter },
    { provide: TOKEN_SERVICE, useClass: JwtTokenAdapter },

    // AppConfig typed POJO — use-cases inject this via @Inject(APP_CONFIG), never ConfigService
    {
      provide: APP_CONFIG,
      inject: [ConfigService],
      useFactory: (cs: ConfigService) => cs.get<AppConfig>('app')!,
    },

    // Infrastructure
    GoogleOAuthAdapter,
    JwtStrategy,
    GameProfileCreatedListener,

    // Commands
    LoginWithGoogleUseCase,
    RefreshAccessTokenUseCase,
    SendFriendRequestUseCase,
    ResolveFriendRequestUseCase,
    AssignGameAdminUseCase,
    RevokeGameAdminUseCase,

    // Queries
    GetAccountProfileUseCase,
    GetGameListUseCase,
    GetFriendsUseCase,
    GetFriendRequestsUseCase,

    // Global exception filter registered at module level via APP_FILTER token
    { provide: APP_FILTER, useClass: DomainExceptionFilter },
  ],
  controllers: [
    AuthController,
    AccountController,
    GamesController,
    FriendsController,
    AdminController,
  ],
})
export class AccountSocialModule {}
