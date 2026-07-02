import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../shared-auth/jwt-auth.guard';
import { GetTrustScoreUseCase } from '../../application/queries/get-trust-score.use-case';
import { TrustScoreResponseDto } from '../dto/trust-score.dto';

@ApiTags('Trust Score')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('trust-score')
export class TrustScoreController {
  constructor(private readonly getTrustScore: GetTrustScoreUseCase) {}

  @Get('me')
  @ApiOperation({ summary: 'Get my trust score and lock status' })
  @ApiResponse({ status: 200, description: 'Trust score', type: TrustScoreResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyScore(@Request() req: { user: { sub: string } }): Promise<TrustScoreResponseDto> {
    const { trustScore, gameLocked } = await this.getTrustScore.execute(req.user.sub);

    const response = new TrustScoreResponseDto();
    response.score = trustScore.score;
    response.gameLocked = gameLocked;
    response.gameLockedUntil = trustScore.gameLockedUntil;
    response.lastRecoveryDate = trustScore.lastRecoveryDate;
    response.updatedAt = trustScore.updatedAt;
    return response;
  }
}
