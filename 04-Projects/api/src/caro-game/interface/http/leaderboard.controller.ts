import { Controller, Get, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiDataResponse, ApiErrorResponse } from '@common/decorators/api-response.decorator';
import { JwtAuthGuard } from '../../../shared-auth/jwt-auth.guard';
import { GetLeaderboardUseCase } from '../../application/use-cases/get-leaderboard.use-case';
import { LeaderboardResponseDto, LeaderboardEntryDto } from '../dto/leaderboard.dto';
import { PlayerProfile } from '../../domain/entities/player-profile';

@ApiTags('Caro — Leaderboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('caro/leaderboard')
export class LeaderboardController {
  constructor(private readonly getLeaderboard: GetLeaderboardUseCase) {}

  @Get()
  @ApiOperation({ summary: 'Get top 10 players by ELO' })
  @ApiDataResponse(LeaderboardResponseDto)
  @ApiErrorResponse(HttpStatus.UNAUTHORIZED, 'Missing or expired JWT')
  async top10(): Promise<LeaderboardResponseDto> {
    const profiles = await this.getLeaderboard.execute();
    return {
      entries: profiles.map((p, idx) => this.toDto(p, idx + 1)),
    };
  }

  private toDto(p: PlayerProfile, rank: number): LeaderboardEntryDto {
    const winRate = p.matchesPlayed > 0 ? Math.round((p.wins / p.matchesPlayed) * 100) / 100 : 0;
    return {
      rank,
      playerId: p.playerId,
      elo: p.elo,
      matchesPlayed: p.matchesPlayed,
      wins: p.wins,
      losses: p.losses,
      draws: p.draws,
      winRate,
    };
  }
}
