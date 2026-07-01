import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { ApiDataResponse, ApiErrorResponse } from '@common/decorators/api-response.decorator';
import { JwtAuthGuard } from '../../../shared-auth/jwt-auth.guard';
import { StartMatchUseCase } from '../../application/use-cases/start-match.use-case';
import { PlaceMoveUseCase } from '../../application/use-cases/place-move.use-case';
import { SurrenderUseCase } from '../../application/use-cases/surrender.use-case';
import { SendDrawRequestUseCase } from '../../application/use-cases/send-draw-request.use-case';
import { RespondDrawRequestUseCase } from '../../application/use-cases/respond-draw-request.use-case';
import { PlaceMoveDto, RespondDrawDto, PlaceMoveResponseDto } from '../dto/gameplay.dto';
import { CreateMatchResponseDto } from '../dto/match.dto';
import { Match } from '../../domain/entities/match';

interface AuthenticatedRequest extends Request {
  user: { sub: string };
}

@ApiTags('Caro — Gameplay')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('caro/matches')
export class GameplayController {
  constructor(
    private readonly startMatch: StartMatchUseCase,
    private readonly placeMove: PlaceMoveUseCase,
    private readonly surrender: SurrenderUseCase,
    private readonly sendDraw: SendDrawRequestUseCase,
    private readonly respondDraw: RespondDrawRequestUseCase,
  ) {}

  @Post(':id/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start a match (creator only)' })
  @ApiDataResponse(CreateMatchResponseDto)
  @ApiErrorResponse(HttpStatus.FORBIDDEN, 'Not the match creator')
  @ApiErrorResponse(HttpStatus.CONFLICT, 'Match not in waiting_for_start status')
  async start(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ id: string; status: string }> {
    const match = await this.startMatch.execute({ matchId: id, requesterId: req.user.sub });
    return { id: match.id, status: match.status };
  }

  @Post(':id/moves')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Place a move on the board' })
  @ApiDataResponse(PlaceMoveResponseDto)
  @ApiErrorResponse(HttpStatus.FORBIDDEN, 'Not your turn or not a participant')
  @ApiErrorResponse(HttpStatus.CONFLICT, 'Cell occupied or deadline expired')
  async move(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PlaceMoveDto,
  ): Promise<PlaceMoveResponseDto> {
    const result = await this.placeMove.execute({
      matchId: id,
      playerId: req.user.sub,
      row: dto.row,
      col: dto.col,
    });
    return {
      playerId: result.move.playerId,
      row: result.move.row,
      col: result.move.col,
      sequenceNumber: result.move.sequenceNumber,
      placedAt: result.move.placedAt,
      isGameOver: result.isGameOver,
      result: result.result ?? null,
      winnerPlayerId: result.winnerId ?? null,
    };
  }

  @Post(':id/surrender')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Surrender the match' })
  @ApiErrorResponse(HttpStatus.FORBIDDEN, 'Not a participant')
  @ApiErrorResponse(HttpStatus.CONFLICT, 'Match not in progress')
  async surrenderMatch(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.surrender.execute({ matchId: id, playerId: req.user.sub });
  }

  @Post(':id/draw-request')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Send a draw request to the opponent' })
  @ApiErrorResponse(HttpStatus.CONFLICT, 'Draw request already pending')
  @ApiErrorResponse(HttpStatus.FORBIDDEN, 'Not a participant')
  async sendDrawRequest(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.sendDraw.execute({ matchId: id, playerId: req.user.sub });
  }

  @Put(':id/draw-request/respond')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Accept or decline a draw request' })
  @ApiErrorResponse(HttpStatus.NOT_FOUND, 'No pending draw request')
  @ApiErrorResponse(HttpStatus.FORBIDDEN, 'Not a participant')
  async respondToDrawRequest(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RespondDrawDto,
  ): Promise<void> {
    await this.respondDraw.execute({ matchId: id, playerId: req.user.sub, action: dto.action });
  }
}
