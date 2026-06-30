import { Controller, Get, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiDataResponse, ApiErrorResponse } from '@common/decorators/api-response.decorator';
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
  @ApiOperation({ summary: 'List active game configurations available for game creation' })
  @ApiDataResponse(ListGameConfigsResponseDto, { description: 'Active configs ordered by creation time' })
  @ApiErrorResponse(HttpStatus.UNAUTHORIZED, 'Missing or expired JWT')
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
