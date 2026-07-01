import {
  Controller,
  Post,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../../../shared-auth/jwt-auth.guard';
import { RequestTournamentCreatorRoleUseCase } from '../../application/commands/request-tournament-creator-role.use-case';

@ApiTags('tournament')
@Controller('caro')
export class TournamentController {
  constructor(
    private readonly requestRoleUseCase: RequestTournamentCreatorRoleUseCase,
  ) {}

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
}
