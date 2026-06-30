import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedAuthModule } from '../shared-auth/shared-auth.module';

import { GameConfigOrmEntity } from './infrastructure/persistence/typeorm-entities/game-config.orm-entity';
import { GameConfigTypeOrmRepository } from './infrastructure/persistence/game-config.typeorm-repository';

import { GAME_CONFIG_REPOSITORY_PORT } from './domain/ports/game-config.repository.port';

import { CreateGameConfigUseCase } from './application/commands/create-game-config.use-case';
import { UpdateGameConfigUseCase } from './application/commands/update-game-config.use-case';
import { DeactivateGameConfigUseCase } from './application/commands/deactivate-game-config.use-case';
import { ReactivateGameConfigUseCase } from './application/commands/reactivate-game-config.use-case';
import { ListAllGameConfigsUseCase } from './application/queries/list-all-game-configs.use-case';
import { ListActiveGameConfigsUseCase } from './application/queries/list-active-game-configs.use-case';

import { AdminGameConfigsController } from './interface/http/admin/admin-game-configs.controller';
import { GameConfigsController } from './interface/http/game-configs.controller';
import { GameAdminCaroGuard } from './interface/guards/game-admin-caro.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([GameConfigOrmEntity]),
    SharedAuthModule,
  ],
  providers: [
    { provide: GAME_CONFIG_REPOSITORY_PORT, useClass: GameConfigTypeOrmRepository },
    GameAdminCaroGuard,
    CreateGameConfigUseCase,
    UpdateGameConfigUseCase,
    DeactivateGameConfigUseCase,
    ReactivateGameConfigUseCase,
    ListAllGameConfigsUseCase,
    ListActiveGameConfigsUseCase,
  ],
  controllers: [AdminGameConfigsController, GameConfigsController],
})
export class CaroGameModule {}
