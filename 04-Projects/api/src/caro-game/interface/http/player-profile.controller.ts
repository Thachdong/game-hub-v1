import {
  Controller,
  Get,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { ApiDataResponse, ApiErrorResponse } from '@common/decorators/api-response.decorator';
import { JwtAuthGuard } from '../../../shared-auth/jwt-auth.guard';
import { GetPlayerProfileUseCase } from '../../application/use-cases/get-player-profile.use-case';
import { GetMatchHistoryUseCase } from '../../application/use-cases/get-match-history.use-case';
import {
  PlayerProfileResponseDto,
  MatchHistoryResponseDto,
  MatchHistoryItemDto,
  MatchHistoryQueryDto,
} from '../dto/player-profile.dto';
import { PlayerProfile } from '../../domain/entities/player-profile';
import { Match } from '../../domain/entities/match';

interface AuthenticatedRequest extends Request {
  user: { sub: string };
}

@ApiTags('Caro — Player Profiles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('caro/players')
export class PlayerProfileController {
  constructor(
    private readonly getProfile: GetPlayerProfileUseCase,
    private readonly getHistory: GetMatchHistoryUseCase,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Get own Caro player profile' })
  @ApiDataResponse(PlayerProfileResponseDto)
  @ApiErrorResponse(HttpStatus.NOT_FOUND, 'Profile not yet created (play your first match)')
  async myProfile(@Req() req: AuthenticatedRequest): Promise<PlayerProfileResponseDto> {
    const profile = await this.getProfile.execute(req.user.sub);
    if (!profile) throw new NotFoundException('Profile not found — play your first match');
    return this.toProfileDto(profile);
  }

  @Get(':playerId')
  @ApiOperation({ summary: 'Get Caro player profile by player ID' })
  @ApiDataResponse(PlayerProfileResponseDto)
  @ApiErrorResponse(HttpStatus.NOT_FOUND, 'Profile not found')
  async profile(
    @Param('playerId', ParseUUIDPipe) playerId: string,
  ): Promise<PlayerProfileResponseDto> {
    const profile = await this.getProfile.execute(playerId);
    if (!profile) throw new NotFoundException('Profile not found');
    return this.toProfileDto(profile);
  }

  @Get('me/history')
  @ApiOperation({ summary: 'Get own match history (cursor-paginated)' })
  @ApiDataResponse(MatchHistoryResponseDto)
  async myHistory(
    @Req() req: AuthenticatedRequest,
    @Query() query: MatchHistoryQueryDto,
  ): Promise<MatchHistoryResponseDto> {
    const { matches, nextCursor } = await this.getHistory.execute({
      playerId: req.user.sub,
      limit: query.limit ?? 20,
      cursor: query.cursor,
    });
    return { items: matches.map(this.toHistoryItemDto), nextCursor };
  }

  @Get(':playerId/history')
  @ApiOperation({ summary: 'Get match history for a player (cursor-paginated)' })
  @ApiDataResponse(MatchHistoryResponseDto)
  async playerHistory(
    @Param('playerId', ParseUUIDPipe) playerId: string,
    @Query() query: MatchHistoryQueryDto,
  ): Promise<MatchHistoryResponseDto> {
    const { matches, nextCursor } = await this.getHistory.execute({
      playerId,
      limit: query.limit ?? 20,
      cursor: query.cursor,
    });
    return { items: matches.map(this.toHistoryItemDto), nextCursor };
  }

  private toProfileDto(p: PlayerProfile): PlayerProfileResponseDto {
    const winRate = p.matchesPlayed > 0 ? Math.round((p.wins / p.matchesPlayed) * 100) / 100 : 0;
    return {
      playerId: p.playerId,
      elo: p.elo,
      matchesPlayed: p.matchesPlayed,
      wins: p.wins,
      losses: p.losses,
      draws: p.draws,
      winRate,
      createdAt: p.createdAt,
    };
  }

  private toHistoryItemDto(m: Match): MatchHistoryItemDto {
    return {
      id: m.id,
      boardSize: m.boardSize,
      moveTimeSeconds: m.moveTimeSeconds,
      result: m.result ?? null,
      winnerPlayerId: m.winnerPlayerId ?? null,
      playerXEloChange: m.playerXEloChange ?? null,
      playerOEloChange: m.playerOEloChange ?? null,
      startedAt: m.startedAt ?? null,
      endedAt: m.endedAt ?? null,
    };
  }
}
