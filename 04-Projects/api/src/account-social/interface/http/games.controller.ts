import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ApiDataResponse } from '@common/decorators/api-response.decorator';
import { OptionalJwtGuard } from '@interface/guards/optional-jwt.guard';
import { GetGameListUseCase } from '@application/queries/get-game-list.use-case';
import { GameListResponseDto } from '@interface/dto/games/game-list-response.dto';
import { AccessTokenPayload } from '@domain/ports/token.service.port';

@ApiTags('Games')
@Controller('games')
export class GamesController {
  constructor(private readonly getGameList: GetGameListUseCase) {}

  @Get()
  @UseGuards(OptionalJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all games, with hasProfile flag when authenticated' })
  @ApiDataResponse(GameListResponseDto, { status: 200 })
  async list(
    @Req() req: { user?: AccessTokenPayload | null },
  ): Promise<GameListResponseDto> {
    const games = await this.getGameList.execute(req.user?.sub);
    return { games };
  }
}
