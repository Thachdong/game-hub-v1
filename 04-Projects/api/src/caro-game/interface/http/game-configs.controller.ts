import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../shared-auth/jwt-auth.guard';
import { ListActiveGameConfigsUseCase } from '../../application/queries/list-active-game-configs.use-case';
import { GameConfigDto, ListGameConfigsResponseDto } from '../dto/game-config.dto';
import { GameConfig } from '../../domain/entities/game-config';

@ApiTags('Caro — Game Configs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('caro/game-configs')
export class GameConfigsController {
  constructor(private readonly listActiveUseCase: ListActiveGameConfigsUseCase) {}

  @Get()
  @ApiOperation({ summary: 'List active game configurations (player-facing)' })
  @ApiResponse({ status: 200, description: 'Active configs', type: ListGameConfigsResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async list(): Promise<ListGameConfigsResponseDto> {
    const configs = await this.listActiveUseCase.execute();
    return { items: configs.map(this.toDto) };
  }

  private toDto(config: GameConfig): GameConfigDto {
    const dto = new GameConfigDto();
    dto.id = config.id;
    dto.boardSize = config.boardSize;
    dto.moveTimeSeconds = config.moveTimeSeconds;
    dto.createdAt = config.createdAt;
    return dto;
  }
}
