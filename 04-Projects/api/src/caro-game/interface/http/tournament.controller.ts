import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../../../shared-auth/jwt-auth.guard';
import { TournamentCreatorGuard } from '../guards/tournament-creator.guard';
import { RequestTournamentCreatorRoleUseCase } from '../../application/commands/request-tournament-creator-role.use-case';
import { CreateTournamentUseCase } from '../../application/commands/create-tournament.use-case';
import { ListTournamentsUseCase } from '../../application/queries/list-tournaments.use-case';
import { GetTournamentDetailsUseCase } from '../../application/queries/get-tournament-details.use-case';
import { CreateTournamentDto, ListTournamentsQueryDto } from '../dto/tournament.dto';
import { RegisterForTournamentUseCase } from '../../application/commands/register-for-tournament.use-case';
import { GetTournamentParticipantListUseCase } from '../../application/queries/get-tournament-participant-list.use-case';
import { SendTournamentChatMessageUseCase } from '../../application/commands/send-tournament-chat-message.use-case';
import { GetTournamentChatUseCase } from '../../application/queries/get-tournament-chat.use-case';
import { SendTournamentChatDto } from '../dto/tournament-chat.dto';

@ApiTags('tournament')
@Controller('caro')
export class TournamentController {
  constructor(
    private readonly requestRoleUseCase: RequestTournamentCreatorRoleUseCase,
    private readonly createTournamentUseCase: CreateTournamentUseCase,
    private readonly listTournamentsUseCase: ListTournamentsUseCase,
    private readonly getTournamentDetailsUseCase: GetTournamentDetailsUseCase,
    private readonly registerForTournamentUseCase: RegisterForTournamentUseCase,
    private readonly getParticipantListUseCase: GetTournamentParticipantListUseCase,
    private readonly sendChatUseCase: SendTournamentChatMessageUseCase,
    private readonly getChatUseCase: GetTournamentChatUseCase,
  ) {}

  // ── US1: Role request ─────────────────────────────────────────────────────

  @Post('tournament-creator-requests')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Request the Tournament Creator role' })
  async requestCreatorRole(@Req() req: Request & { user: { sub: string } }) {
    const result = await this.requestRoleUseCase.execute(req.user.sub);
    return {
      requestId: result.id,
      status: result.status,
      createdAt: result.createdAt,
    };
  }

  // ── US2: Tournament CRUD ──────────────────────────────────────────────────

  @Post('tournaments')
  @UseGuards(JwtAuthGuard, TournamentCreatorGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new tournament (Tournament Creator only)' })
  async createTournament(
    @Body() dto: CreateTournamentDto,
    @Req() req: Request & { user: { sub: string } },
  ) {
    const tournament = await this.createTournamentUseCase.execute({
      creatorPlayerId: req.user.sub,
      gameConfigId: dto.gameConfigId,
      minElo: dto.minElo,
      startAt: new Date(dto.startAt),
      endAt: new Date(dto.endAt),
    });
    return {
      tournamentId: tournament.id,
      status: tournament.status,
      startAt: tournament.startAt,
      endAt: tournament.endAt,
      minElo: tournament.minElo,
      gameConfigId: tournament.gameConfigId,
      createdAt: tournament.createdAt,
    };
  }

  @Get('tournaments')
  @ApiOperation({ summary: 'List all tournaments (public)' })
  async listTournaments(@Query() query: ListTournamentsQueryDto) {
    const { items, nextCursor } = await this.listTournamentsUseCase.execute({
      status: query.status,
      limit: query.limit,
      cursor: query.cursor,
    });
    return {
      items: items.map(t => ({
        tournamentId: t.id,
        status: t.status,
        startAt: t.startAt,
        endAt: t.endAt,
        minElo: t.minElo,
        createdAt: t.createdAt,
      })),
      nextCursor,
    };
  }

  // ── US3: Registration & participant list ──────────────────────────────────

  @Post('tournaments/:tournamentId/registrations')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register for a tournament (ELO-gated)' })
  async registerForTournament(
    @Param('tournamentId', ParseUUIDPipe) tournamentId: string,
    @Req() req: Request & { user: { sub: string } },
  ) {
    const registration = await this.registerForTournamentUseCase.execute({
      tournamentId,
      playerId: req.user.sub,
    });
    return {
      registrationId: registration.id,
      tournamentId: registration.tournamentId,
      playerId: registration.playerId,
      eloAtRegistration: registration.eloAtRegistration,
      tournamentPoints: registration.tournamentPoints,
      winStreak: registration.winStreak,
      status: registration.status,
      registeredAt: registration.registeredAt,
    };
  }

  @Get('tournaments/:tournamentId/participants')
  @ApiOperation({ summary: 'Get tournament participant list ordered by score (public)' })
  async getParticipants(@Param('tournamentId', ParseUUIDPipe) tournamentId: string) {
    const registrations = await this.getParticipantListUseCase.execute(tournamentId);
    return registrations.map((r, idx) => ({
      rank: idx + 1,
      registrationId: r.id,
      playerId: r.playerId,
      tournamentPoints: r.tournamentPoints,
      winStreak: r.winStreak,
      status: r.status,
      eloAtRegistration: r.eloAtRegistration,
      registeredAt: r.registeredAt,
    }));
  }

  // ── US7: Tournament chat ──────────────────────────────────────────────────

  @Post('tournaments/:tournamentId/chat')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Send a chat message (registered participants only)' })
  async sendChatMessage(
    @Param('tournamentId', ParseUUIDPipe) tournamentId: string,
    @Body() dto: SendTournamentChatDto,
    @Req() req: Request & { user: { sub: string } },
  ) {
    const message = await this.sendChatUseCase.execute({
      tournamentId,
      senderPlayerId: req.user.sub,
      content: dto.content,
    });
    return {
      messageId: message.id,
      senderPlayerId: message.senderPlayerId,
      content: message.content,
      sentAt: message.sentAt,
    };
  }

  @Get('tournaments/:tournamentId/chat')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get recent chat messages (registered participants only)' })
  async getChatMessages(
    @Param('tournamentId', ParseUUIDPipe) tournamentId: string,
    @Query('limit') limit: string | undefined,
    @Req() req: Request & { user: { sub: string } },
  ) {
    const messages = await this.getChatUseCase.execute(
      tournamentId,
      req.user.sub,
      limit ? parseInt(limit, 10) : undefined,
    );
    return messages.map(m => ({
      messageId: m.id,
      senderPlayerId: m.senderPlayerId,
      content: m.content,
      sentAt: m.sentAt,
    }));
  }

  @Get('tournaments/:tournamentId')
  @ApiOperation({ summary: 'Get tournament details (public)' })
  async getTournament(@Param('tournamentId', ParseUUIDPipe) tournamentId: string) {
    const { tournament, gameConfig, registrantCount } = await this.getTournamentDetailsUseCase.execute(tournamentId);
    return {
      tournamentId: tournament.id,
      status: tournament.status,
      startAt: tournament.startAt,
      endAt: tournament.endAt,
      minElo: tournament.minElo,
      gameConfig: gameConfig
        ? { id: gameConfig.id, timeLimitSeconds: gameConfig.moveTimeSeconds }
        : null,
      registrantCount,
      createdAt: tournament.createdAt,
    };
  }
}
