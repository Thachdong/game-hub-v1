import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedAuthModule } from '../shared-auth/shared-auth.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { AccountSocialModule } from '../account-social/account-social.module';

// ── ORM entities ──────────────────────────────────────────────────────────────
import { GameConfigOrmEntity } from './infrastructure/persistence/typeorm-entities/game-config.orm-entity';
import { MatchOrmEntity } from './infrastructure/persistence/typeorm-entities/match.orm-entity';
import { MatchMoveOrmEntity } from './infrastructure/persistence/typeorm-entities/match-move.orm-entity';
import { QuickPairRequestOrmEntity } from './infrastructure/persistence/typeorm-entities/quick-pair-request.orm-entity';
import { ChatMessageOrmEntity } from './infrastructure/persistence/typeorm-entities/chat-message.orm-entity';
import { PlayerProfileOrmEntity } from './infrastructure/persistence/typeorm-entities/player-profile.orm-entity';

// ── Port tokens ───────────────────────────────────────────────────────────────
import { GAME_CONFIG_REPOSITORY_PORT } from './domain/ports/game-config.repository.port';
import { QUICK_PAIR_REPOSITORY_PORT } from './domain/ports/quick-pair.repository.port';
import { CHAT_REPOSITORY_PORT } from './domain/ports/chat.repository.port';
import { MATCH_REPOSITORY_PORT } from './domain/ports/match.repository.port';
import { PLAYER_PROFILE_REPOSITORY_PORT } from './domain/ports/player-profile.repository.port';
import { MATCH_TIMER_SERVICE_PORT } from './domain/ports/match-timer.service.port';
import { FRIEND_CHECK_PORT } from './domain/ports/friend-check.port';
import { REALTIME_PUSH_PORT, REALTIME_ROOM_PORT } from '../realtime/realtime-push.port';
import { RealtimeService } from '../realtime/realtime.service';

// ── Infrastructure ────────────────────────────────────────────────────────────
import { GameConfigTypeOrmRepository } from './infrastructure/persistence/game-config.typeorm-repository';
import { MatchTypeOrmRepository } from './infrastructure/persistence/match.typeorm-repository';
import { QuickPairTypeOrmRepository } from './infrastructure/persistence/quick-pair.typeorm-repository';
import { ChatTypeOrmRepository } from './infrastructure/persistence/chat.typeorm-repository';
import { PlayerProfileTypeOrmRepository } from './infrastructure/persistence/player-profile.typeorm-repository';
import { MatchTimerService } from './infrastructure/match-timer.service';
import { FriendCheckAdapter } from './infrastructure/friend-check/friend-check.adapter';
import { MuteRegistryService } from './infrastructure/mute-registry.service';
import { MatchInvitationHandler } from './infrastructure/events/match-invitation.handler';

// ── Game-config use-cases ────────────────────────────────────────────────────
import { CreateGameConfigUseCase } from './application/commands/create-game-config.use-case';
import { UpdateGameConfigUseCase } from './application/commands/update-game-config.use-case';
import { DeactivateGameConfigUseCase } from './application/commands/deactivate-game-config.use-case';
import { ReactivateGameConfigUseCase } from './application/commands/reactivate-game-config.use-case';
import { ListAllGameConfigsUseCase } from './application/queries/list-all-game-configs.use-case';
import { ListActiveGameConfigsUseCase } from './application/queries/list-active-game-configs.use-case';

// ── US1 use-cases ─────────────────────────────────────────────────────────────
import { CreateMatchUseCase } from './application/use-cases/create-match.use-case';
import { CancelMatchUseCase } from './application/use-cases/cancel-match.use-case';
import { InvitePlayerUseCase } from './application/use-cases/invite-player.use-case';
import { RespondToInvitationUseCase } from './application/use-cases/respond-to-invitation.use-case';
import { JoinMatchUseCase } from './application/use-cases/join-match.use-case';
import { LeaveMatchBeforeStartUseCase } from './application/use-cases/leave-match-before-start.use-case';
import { GetLobbyUseCase } from './application/use-cases/get-lobby.use-case';
import { GetMatchStateUseCase } from './application/use-cases/get-match-state.use-case';

// ── US2 use-cases ─────────────────────────────────────────────────────────────
import { StartMatchUseCase } from './application/use-cases/start-match.use-case';
import { PlaceMoveUseCase } from './application/use-cases/place-move.use-case';
import { SurrenderUseCase } from './application/use-cases/surrender.use-case';
import { SendDrawRequestUseCase } from './application/use-cases/send-draw-request.use-case';
import { RespondDrawRequestUseCase } from './application/use-cases/respond-draw-request.use-case';

// ── US3 use-cases ─────────────────────────────────────────────────────────────
import { QuickPairUseCase } from './application/use-cases/quick-pair.use-case';
import { CancelQuickPairUseCase } from './application/use-cases/cancel-quick-pair.use-case';

// ── US4 use-cases ─────────────────────────────────────────────────────────────
import { SendChatMessageUseCase } from './application/use-cases/send-chat-message.use-case';
import { GetChatHistoryUseCase } from './application/use-cases/get-chat-history.use-case';
import { MuteViewerUseCase } from './application/use-cases/mute-viewer.use-case';

// ── Controllers / Guards ──────────────────────────────────────────────────────
import { AdminGameConfigsController } from './interface/http/admin/admin-game-configs.controller';
import { GameConfigsController } from './interface/http/game-configs.controller';
import { MatchController } from './interface/http/match.controller';
import { GameplayController } from './interface/http/gameplay.controller';
import { QuickPairController } from './interface/http/quick-pair.controller';
import { ChatController } from './interface/http/chat.controller';
import { GameAdminCaroGuard } from './interface/guards/game-admin-caro.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GameConfigOrmEntity,
      MatchOrmEntity,
      MatchMoveOrmEntity,
      PlayerProfileOrmEntity,
      QuickPairRequestOrmEntity,
      ChatMessageOrmEntity,
    ]),
    SharedAuthModule,
    RealtimeModule,
    AccountSocialModule,
  ],
  providers: [
    // ── Repository adapters ───────────────────────────────────────────────
    { provide: GAME_CONFIG_REPOSITORY_PORT, useClass: GameConfigTypeOrmRepository },
    { provide: MATCH_REPOSITORY_PORT, useClass: MatchTypeOrmRepository },
    { provide: PLAYER_PROFILE_REPOSITORY_PORT, useClass: PlayerProfileTypeOrmRepository },
    { provide: QUICK_PAIR_REPOSITORY_PORT, useClass: QuickPairTypeOrmRepository },
    { provide: CHAT_REPOSITORY_PORT, useClass: ChatTypeOrmRepository },

    // ── Service adapters ──────────────────────────────────────────────────
    MatchTimerService,
    { provide: MATCH_TIMER_SERVICE_PORT, useExisting: MatchTimerService },
    FriendCheckAdapter,
    { provide: FRIEND_CHECK_PORT, useExisting: FriendCheckAdapter },
    MuteRegistryService,

    // ── Realtime port re-exports (from RealtimeModule) ────────────────────
    { provide: REALTIME_PUSH_PORT, useExisting: RealtimeService },
    { provide: REALTIME_ROOM_PORT, useExisting: RealtimeService },

    // ── Event handlers ────────────────────────────────────────────────────
    MatchInvitationHandler,

    // ── Guards ────────────────────────────────────────────────────────────
    GameAdminCaroGuard,

    // ── Game-config use-cases ─────────────────────────────────────────────
    CreateGameConfigUseCase,
    UpdateGameConfigUseCase,
    DeactivateGameConfigUseCase,
    ReactivateGameConfigUseCase,
    ListAllGameConfigsUseCase,
    ListActiveGameConfigsUseCase,

    // ── US1 use-cases ─────────────────────────────────────────────────────
    CreateMatchUseCase,
    CancelMatchUseCase,
    InvitePlayerUseCase,
    RespondToInvitationUseCase,
    JoinMatchUseCase,
    LeaveMatchBeforeStartUseCase,
    GetLobbyUseCase,
    GetMatchStateUseCase,

    // ── US2 use-cases ─────────────────────────────────────────────────────
    StartMatchUseCase,
    PlaceMoveUseCase,
    SurrenderUseCase,
    SendDrawRequestUseCase,
    RespondDrawRequestUseCase,

    // ── US3 use-cases ─────────────────────────────────────────────────────
    QuickPairUseCase,
    CancelQuickPairUseCase,

    // ── US4 use-cases ─────────────────────────────────────────────────────
    SendChatMessageUseCase,
    GetChatHistoryUseCase,
    MuteViewerUseCase,
  ],
  controllers: [AdminGameConfigsController, GameConfigsController, MatchController, GameplayController, QuickPairController, ChatController],
})
export class CaroGameModule {}
