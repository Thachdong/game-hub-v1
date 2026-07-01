import {
  Body,
  Controller,
  Delete,
  Get,
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
import { CreateMatchUseCase } from '../../application/use-cases/create-match.use-case';
import { CancelMatchUseCase } from '../../application/use-cases/cancel-match.use-case';
import { InvitePlayerUseCase } from '../../application/use-cases/invite-player.use-case';
import { RespondToInvitationUseCase } from '../../application/use-cases/respond-to-invitation.use-case';
import { JoinMatchUseCase } from '../../application/use-cases/join-match.use-case';
import { LeaveMatchBeforeStartUseCase } from '../../application/use-cases/leave-match-before-start.use-case';
import { GetLobbyUseCase } from '../../application/use-cases/get-lobby.use-case';
import { GetMatchStateUseCase } from '../../application/use-cases/get-match-state.use-case';
import {
  CreateMatchDto,
  InvitePlayerDto,
  RespondInvitationDto,
  CreateMatchResponseDto,
  JoinMatchResponseDto,
  CancelOrLeaveResponseDto,
  InviteResponseDto,
  InvitationRespondResponseDto,
  LobbyMatchDto,
  MatchStateDto,
  MoveDto,
} from '../dto/match.dto';
import { Match } from '../../domain/entities/match';
import { MatchMove } from '../../domain/entities/match-move';

interface AuthenticatedRequest extends Request {
  user: { sub: string };
}

@ApiTags('Caro — Matches')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('caro/matches')
export class MatchController {
  constructor(
    private readonly createMatch: CreateMatchUseCase,
    private readonly cancelMatch: CancelMatchUseCase,
    private readonly invitePlayer: InvitePlayerUseCase,
    private readonly respondInvitation: RespondToInvitationUseCase,
    private readonly joinMatch: JoinMatchUseCase,
    private readonly leaveMatch: LeaveMatchBeforeStartUseCase,
    private readonly getLobby: GetLobbyUseCase,
    private readonly getMatchState: GetMatchStateUseCase,
  ) {}

  // ── Lobby ─────────────────────────────────────────────────────────────────

  @Get('lobby')
  @ApiOperation({ summary: 'List open public matches in the lobby' })
  @ApiDataResponse(LobbyMatchDto, { isArray: true })
  @ApiErrorResponse(HttpStatus.UNAUTHORIZED, 'Missing or expired JWT')
  async lobby(): Promise<LobbyMatchDto[]> {
    const matches = await this.getLobby.execute();
    return matches.map(this.toLobbyDto);
  }

  // ── Create / join ─────────────────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Create a new match' })
  @ApiDataResponse(CreateMatchResponseDto)
  @ApiErrorResponse(HttpStatus.CONFLICT, 'Player already in active match')
  @ApiErrorResponse(HttpStatus.NOT_FOUND, 'Config not found')
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateMatchDto,
  ): Promise<CreateMatchResponseDto> {
    const match = await this.createMatch.execute({
      configId: dto.configId,
      visibility: dto.visibility,
      creatorId: req.user.sub,
    });
    return this.toCreateDto(match);
  }

  @Post(':id/join')
  @ApiOperation({ summary: 'Join a public lobby match' })
  @ApiDataResponse(JoinMatchResponseDto)
  @ApiErrorResponse(HttpStatus.CONFLICT, 'Match not open or player already active')
  @ApiErrorResponse(HttpStatus.NOT_FOUND, 'Match not found')
  async join(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<JoinMatchResponseDto> {
    return this.joinMatch.execute({ matchId: id, joinerId: req.user.sub });
  }

  // ── Cancel / leave ────────────────────────────────────────────────────────

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel a match (creator only, before it starts)' })
  @ApiDataResponse(CancelOrLeaveResponseDto)
  @ApiErrorResponse(HttpStatus.FORBIDDEN, 'Not the match creator')
  @ApiErrorResponse(HttpStatus.CONFLICT, 'Match cannot be cancelled in current status')
  async cancel(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CancelOrLeaveResponseDto> {
    const match = await this.cancelMatch.execute({ matchId: id, requesterId: req.user.sub });
    return { id: match.id, status: match.status };
  }

  @Post(':id/leave')
  @ApiOperation({ summary: 'Leave a match before it starts (second player)' })
  @ApiDataResponse(CancelOrLeaveResponseDto)
  @ApiErrorResponse(HttpStatus.FORBIDDEN, 'Not a participant')
  @ApiErrorResponse(HttpStatus.CONFLICT, 'Match not in waiting_for_start status')
  async leave(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CancelOrLeaveResponseDto> {
    const match = await this.leaveMatch.execute({ matchId: id, playerId: req.user.sub });
    return { id: match.id, status: match.status };
  }

  // ── Invite ────────────────────────────────────────────────────────────────

  @Post(':id/invite')
  @ApiOperation({ summary: 'Invite a friend to a private match' })
  @ApiDataResponse(InviteResponseDto)
  @ApiErrorResponse(HttpStatus.UNPROCESSABLE_ENTITY, 'Not friends with target player')
  @ApiErrorResponse(HttpStatus.FORBIDDEN, 'Not the match creator')
  async invite(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: InvitePlayerDto,
  ): Promise<InviteResponseDto> {
    return this.invitePlayer.execute({
      matchId: id,
      requesterId: req.user.sub,
      friendId: dto.friendId,
    });
  }

  @Put(':id/invitation/respond')
  @ApiOperation({ summary: 'Accept or decline a match invitation' })
  @ApiDataResponse(InvitationRespondResponseDto)
  @ApiErrorResponse(HttpStatus.CONFLICT, 'Player already in active match')
  @ApiErrorResponse(HttpStatus.NOT_FOUND, 'Match not found')
  async respondToInvitation(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RespondInvitationDto,
  ): Promise<InvitationRespondResponseDto> {
    return this.respondInvitation.execute({
      matchId: id,
      responderId: req.user.sub,
      action: dto.action,
    });
  }

  // ── State / moves ─────────────────────────────────────────────────────────

  @Get(':id')
  @ApiOperation({ summary: 'Get full match state including moves' })
  @ApiDataResponse(MatchStateDto)
  @ApiErrorResponse(HttpStatus.NOT_FOUND, 'Match not found')
  async getState(@Param('id', ParseUUIDPipe) id: string): Promise<MatchStateDto> {
    const { match, moves } = await this.getMatchState.execute(id);
    return this.toMatchStateDto(match, moves);
  }

  @Get(':id/moves')
  @ApiOperation({ summary: 'Get all moves for a match' })
  @ApiDataResponse(MoveDto, { isArray: true })
  @ApiErrorResponse(HttpStatus.NOT_FOUND, 'Match not found')
  async getMoves(@Param('id', ParseUUIDPipe) id: string): Promise<MoveDto[]> {
    const { moves } = await this.getMatchState.execute(id);
    return moves.map(this.toMoveDto);
  }

  // ── Mappers ───────────────────────────────────────────────────────────────

  private toLobbyDto(match: Match): LobbyMatchDto {
    return {
      id: match.id,
      boardSize: match.boardSize,
      moveTimeSeconds: match.moveTimeSeconds,
      status: match.status,
      creatorUsername: match.creatorId,
      secondPlayerUsername: match.secondPlayerId ?? null,
      createdAt: match.createdAt,
    };
  }

  private toCreateDto(match: Match): CreateMatchResponseDto {
    return {
      id: match.id,
      configId: match.configId,
      boardSize: match.boardSize,
      moveTimeSeconds: match.moveTimeSeconds,
      visibility: match.visibility,
      status: match.status,
      creatorId: match.creatorId,
      createdAt: match.createdAt,
    };
  }

  private toMatchStateDto(match: Match, moves: MatchMove[]): MatchStateDto {
    return {
      id: match.id,
      boardSize: match.boardSize,
      moveTimeSeconds: match.moveTimeSeconds,
      visibility: match.visibility,
      status: match.status,
      creatorId: match.creatorId,
      playerX: match.playerXId ? { id: match.playerXId, username: match.playerXId, elo: 0, winRate: 0 } : null,
      playerO: match.playerOId ? { id: match.playerOId, username: match.playerOId, elo: 0, winRate: 0 } : null,
      currentTurnPlayerId: match.currentTurnPlayerId ?? null,
      deadlineAt: match.deadlineAt ?? null,
      moves: moves.map(this.toMoveDto),
      viewers: [],
      pendingDrawRequestFromId: match.pendingDrawRequestFromId ?? null,
      result: match.result ?? null,
      winnerPlayerId: match.winnerPlayerId ?? null,
      startedAt: match.startedAt ?? null,
      endedAt: match.endedAt ?? null,
      createdAt: match.createdAt,
    };
  }

  private toMoveDto(move: MatchMove): MoveDto {
    return {
      playerId: move.playerId,
      row: move.row,
      col: move.col,
      sequenceNumber: move.sequenceNumber,
      placedAt: move.placedAt,
    };
  }
}
