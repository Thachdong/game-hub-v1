import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../../../shared-auth/jwt-auth.guard';
import { GameAdminCaroGuard } from '../guards/game-admin-caro.guard';
import { ReviewTournamentCreatorRequestUseCase } from '../../application/commands/review-tournament-creator-request.use-case';
import { RevokeTournamentCreatorRoleUseCase } from '../../application/commands/revoke-tournament-creator-role.use-case';
import { ListTournamentCreatorRequestsUseCase } from '../../application/queries/list-tournament-creator-requests.use-case';
import { ReviewRequestDto } from '../dto/tournament-creator-request.dto';
import { TournamentCreatorRequestStatus } from '../../domain/entities/tournament-creator-request';

@ApiTags('tournament-admin')
@Controller('caro/admin')
@UseGuards(JwtAuthGuard, GameAdminCaroGuard)
@ApiBearerAuth()
export class TournamentAdminController {
  constructor(
    private readonly listRequestsUseCase: ListTournamentCreatorRequestsUseCase,
    private readonly reviewRequestUseCase: ReviewTournamentCreatorRequestUseCase,
    private readonly revokeRoleUseCase: RevokeTournamentCreatorRoleUseCase,
  ) {}

  @Get('tournament-creator-requests')
  @ApiOperation({ summary: 'List tournament creator role requests' })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'approved', 'rejected'] })
  async listRequests(@Query('status') status?: TournamentCreatorRequestStatus) {
    const items = await this.listRequestsUseCase.execute(status);
    return {
      items: items.map(r => ({
        requestId: r.id,
        playerId: r.playerId,
        status: r.status,
        createdAt: r.createdAt,
        reviewedAt: r.reviewedAt,
      })),
    };
  }

  @Patch('tournament-creator-requests/:requestId')
  @ApiOperation({ summary: 'Approve or reject a tournament creator role request' })
  async reviewRequest(
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Body() dto: ReviewRequestDto,
    @Req() req: Request & { user: { sub: string } },
  ) {
    const result = await this.reviewRequestUseCase.execute({
      requestId,
      action: dto.action,
      adminPlayerId: req.user.sub,
    });
    return {
      requestId: result.id,
      status: result.status,
      reviewedAt: result.reviewedAt,
    };
  }

  @Delete('tournament-creators/:playerId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke Tournament Creator role from a player' })
  async revokeRole(@Param('playerId', ParseUUIDPipe) playerId: string) {
    await this.revokeRoleUseCase.execute(playerId);
    return { playerId, revokedAt: new Date() };
  }
}
