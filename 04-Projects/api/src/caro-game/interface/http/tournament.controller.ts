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

@ApiTags('tournament')
@Controller('caro')
export class TournamentController {
  constructor(
    private readonly requestRoleUseCase: RequestTournamentCreatorRoleUseCase,
    private readonly createTournamentUseCase: CreateTournamentUseCase,
    private readonly listTournamentsUseCase: ListTournamentsUseCase,
    private readonly getTournamentDetailsUseCase: GetTournamentDetailsUseCase,
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
