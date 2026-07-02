import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { ApiDataResponse, ApiErrorResponse } from '@common/decorators/api-response.decorator';
import { JwtAuthGuard } from '../../../shared-auth/jwt-auth.guard';
import { QuickPairUseCase } from '../../application/use-cases/quick-pair.use-case';
import { CancelQuickPairUseCase } from '../../application/use-cases/cancel-quick-pair.use-case';
import { QuickPairRequestDto, QuickPairResponseDto } from '../dto/quick-pair.dto';

interface AuthenticatedRequest extends Request {
  user: { sub: string };
}

@ApiTags('Caro — Quick Pair')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('caro/quick-pair')
export class QuickPairController {
  constructor(
    private readonly quickPair: QuickPairUseCase,
    private readonly cancelQuickPair: CancelQuickPairUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Enter the quick pair queue or instantly match with a waiting opponent' })
  @ApiDataResponse(QuickPairResponseDto)
  @ApiErrorResponse(HttpStatus.CONFLICT, 'Player already in active state')
  @ApiErrorResponse(HttpStatus.NOT_FOUND, 'Config not found or inactive')
  async pair(
    @Req() req: AuthenticatedRequest,
    @Body() dto: QuickPairRequestDto,
  ): Promise<QuickPairResponseDto> {
    const result = await this.quickPair.execute({
      playerId: req.user.sub,
      configId: dto.configId,
    });
    return {
      status: result.status,
      requestId: result.requestId ?? null,
      matchId: result.matchId ?? null,
    };
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel an active quick pair request' })
  @ApiErrorResponse(HttpStatus.NOT_FOUND, 'No active quick pair request')
  async cancel(@Req() req: AuthenticatedRequest): Promise<void> {
    await this.cancelQuickPair.execute(req.user.sub);
  }
}
