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
import { TournamentCreatorRequestOrmEntity } from './infrastructure/persistence/typeorm-entities/tournament-creator-request.orm-entity';
import { TournamentOrmEntity } from './infrastructure/persistence/typeorm-entities/tournament.orm-entity';
import { TournamentRegistrationOrmEntity } from './infrastructure/persistence/typeorm-entities/tournament-registration.orm-entity';

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
import { TOURNAMENT_CREATOR_REQUEST_REPOSITORY_PORT } from './domain/ports/tournament-creator-request.repository.port';
import { TOURNAMENT_REPOSITORY_PORT } from './domain/ports/tournament.repository.port';
import { TOURNAMENT_REGISTRATION_REPOSITORY_PORT } from './domain/ports/tournament-registration.repository.port';
import { TOURNAMENT_MATCH_REPOSITORY_PORT } from './domain/ports/tournament-match.repository.port';
import { TOURNAMENT_CHAT_REPOSITORY_PORT } from './domain/ports/tournament-chat.repository.port';

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
import { TournamentCreatorRequestTypeOrmRepository } from './infrastructure/persistence/tournament-creator-request.typeorm-repository';
import { TournamentTypeOrmRepository } from './infrastructure/persistence/tournament.typeorm-repository';
import { TournamentRegistrationTypeOrmRepository } from './infrastructure/persistence/tournament-registration.typeorm-repository';
import { TournamentRoleHandler } from './infrastructure/events/tournament-role.handler';

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

// ── US5 use-cases ─────────────────────────────────────────────────────────────
import { GetLeaderboardUseCase } from './application/use-cases/get-leaderboard.use-case';

// ── US6 use-cases ─────────────────────────────────────────────────────────────
import { GetPlayerProfileUseCase } from './application/use-cases/get-player-profile.use-case';
import { GetMatchHistoryUseCase } from './application/use-cases/get-match-history.use-case';

// ── US2 tournament use-cases ──────────────────────────────────────────────────
import { CreateTournamentUseCase } from './application/commands/create-tournament.use-case';
import { ListTournamentsUseCase } from './application/queries/list-tournaments.use-case';
import { GetTournamentDetailsUseCase } from './application/queries/get-tournament-details.use-case';

// ── US3 registration use-cases ────────────────────────────────────────────────
import { RegisterForTournamentUseCase } from './application/commands/register-for-tournament.use-case';
import { GetTournamentParticipantListUseCase } from './application/queries/get-tournament-participant-list.use-case';

// ── US4 lifecycle use-cases ───────────────────────────────────────────────────
import { StartTournamentUseCase } from './application/commands/start-tournament.use-case';
import { CancelTournamentUseCase } from './application/commands/cancel-tournament.use-case';
import { EndTournamentUseCase } from './application/commands/end-tournament.use-case';
import { TournamentSchedulerService } from './infrastructure/scheduling/tournament-scheduler.service';
import { TournamentMatchAutoStartService } from './infrastructure/scheduling/tournament-match-auto-start.service';
import { TournamentCancelledHandler } from './infrastructure/events/tournament-cancelled.handler';

// ── US5 matchmaking ───────────────────────────────────────────────────────────
import { TournamentMatchOrmEntity } from './infrastructure/persistence/typeorm-entities/tournament-match.orm-entity';
import { TournamentMatchTypeOrmRepository } from './infrastructure/persistence/tournament-match.typeorm-repository';
import { TournamentMatchmakingService } from './infrastructure/matchmaking/tournament-matchmaking.service';
import { PairIdlePlayersUseCase } from './application/commands/pair-idle-players.use-case';

// ── US6 arena scoring ─────────────────────────────────────────────────────────
import { RecordTournamentMatchResultUseCase } from './application/commands/record-tournament-match-result.use-case';
import { TournamentMatchCompletedHandler } from './infrastructure/events/tournament-match-completed.handler';

// ── US7 chat ──────────────────────────────────────────────────────────────────
import { TournamentChatMessageOrmEntity } from './infrastructure/persistence/typeorm-entities/tournament-chat-message.orm-entity';
import { TournamentChatTypeOrmRepository } from './infrastructure/persistence/tournament-chat.typeorm-repository';
import { SendTournamentChatMessageUseCase } from './application/commands/send-tournament-chat-message.use-case';
import { GetTournamentChatUseCase } from './application/queries/get-tournament-chat.use-case';

// ── US1 use-cases (tournament creator role) ───────────────────────────────────
import { RequestTournamentCreatorRoleUseCase } from './application/commands/request-tournament-creator-role.use-case';
import { ReviewTournamentCreatorRequestUseCase } from './application/commands/review-tournament-creator-request.use-case';
import { RevokeTournamentCreatorRoleUseCase } from './application/commands/revoke-tournament-creator-role.use-case';
import { ListTournamentCreatorRequestsUseCase } from './application/queries/list-tournament-creator-requests.use-case';

// ── Controllers / Guards ──────────────────────────────────────────────────────
import { AdminGameConfigsController } from './interface/http/admin/admin-game-configs.controller';
import { GameConfigsController } from './interface/http/game-configs.controller';
import { MatchController } from './interface/http/match.controller';
import { GameplayController } from './interface/http/gameplay.controller';
import { QuickPairController } from './interface/http/quick-pair.controller';
import { ChatController } from './interface/http/chat.controller';
import { LeaderboardController } from './interface/http/leaderboard.controller';
import { PlayerProfileController } from './interface/http/player-profile.controller';
import { GameAdminCaroGuard } from './interface/guards/game-admin-caro.guard';
import { TournamentCreatorGuard } from './interface/guards/tournament-creator.guard';
import { TournamentController } from './interface/http/tournament.controller';
import { TournamentAdminController } from './interface/http/tournament-admin.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GameConfigOrmEntity,
      MatchOrmEntity,
      MatchMoveOrmEntity,
      PlayerProfileOrmEntity,
      QuickPairRequestOrmEntity,
      ChatMessageOrmEntity,
      TournamentCreatorRequestOrmEntity,
      TournamentOrmEntity,
      TournamentRegistrationOrmEntity,
      TournamentMatchOrmEntity,
      TournamentChatMessageOrmEntity,
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
    TournamentRoleHandler,

    // ── Guards ────────────────────────────────────────────────────────────
    GameAdminCaroGuard,
    TournamentCreatorGuard,

    // ── Tournament repositories ───────────────────────────────────────────
    { provide: TOURNAMENT_CREATOR_REQUEST_REPOSITORY_PORT, useClass: TournamentCreatorRequestTypeOrmRepository },
    { provide: TOURNAMENT_REPOSITORY_PORT, useClass: TournamentTypeOrmRepository },
    { provide: TOURNAMENT_REGISTRATION_REPOSITORY_PORT, useClass: TournamentRegistrationTypeOrmRepository },

    // ── US2 tournament use-cases ──────────────────────────────────────────
    CreateTournamentUseCase,
    ListTournamentsUseCase,
    GetTournamentDetailsUseCase,

    // ── US3 registration use-cases ────────────────────────────────────────
    RegisterForTournamentUseCase,
    GetTournamentParticipantListUseCase,

    // ── US4 lifecycle use-cases ───────────────────────────────────────────
    StartTournamentUseCase,
    CancelTournamentUseCase,
    EndTournamentUseCase,
    TournamentSchedulerService,
    TournamentMatchAutoStartService,
    TournamentCancelledHandler,

    // ── US5 matchmaking ───────────────────────────────────────────────────
    { provide: TOURNAMENT_MATCH_REPOSITORY_PORT, useClass: TournamentMatchTypeOrmRepository },
    TournamentMatchmakingService,
    PairIdlePlayersUseCase,

    // ── US6 arena scoring ─────────────────────────────────────────────────
    RecordTournamentMatchResultUseCase,
    TournamentMatchCompletedHandler,

    // ── US7 chat ──────────────────────────────────────────────────────────
    { provide: TOURNAMENT_CHAT_REPOSITORY_PORT, useClass: TournamentChatTypeOrmRepository },
    SendTournamentChatMessageUseCase,
    GetTournamentChatUseCase,

    // ── US1 use-cases (tournament creator role) ───────────────────────────
    RequestTournamentCreatorRoleUseCase,
    ReviewTournamentCreatorRequestUseCase,
    RevokeTournamentCreatorRoleUseCase,
    ListTournamentCreatorRequestsUseCase,

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

    // ── US5 use-cases ─────────────────────────────────────────────────────
    GetLeaderboardUseCase,

    // ── US6 use-cases ─────────────────────────────────────────────────────
    GetPlayerProfileUseCase,
    GetMatchHistoryUseCase,
  ],
  controllers: [
    AdminGameConfigsController,
    GameConfigsController,
    MatchController,
    GameplayController,
    QuickPairController,
    ChatController,
    LeaderboardController,
    PlayerProfileController,
    TournamentController,
    TournamentAdminController,
  ],
})
export class CaroGameModule {}
