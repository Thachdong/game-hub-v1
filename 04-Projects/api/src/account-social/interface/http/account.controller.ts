import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ApiDataResponse, ApiErrorResponse } from '@common/decorators/api-response.decorator';
import { JwtAuthGuard } from '@interface/guards/jwt-auth.guard';
import { GetAccountProfileUseCase } from '@application/queries/get-account-profile.use-case';
import { AccountProfileDto } from '@interface/dto/account/account-profile.dto';
import { AccessTokenPayload } from '@domain/ports/token.service.port';

@ApiTags('Account')
@Controller('accounts')
export class AccountController {
  constructor(private readonly getAccountProfile: GetAccountProfileUseCase) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get authenticated account profile' })
  @ApiDataResponse(AccountProfileDto, { status: 200 })
  @ApiErrorResponse(401, 'Unauthorized')
  async getMe(@Req() req: { user: AccessTokenPayload }): Promise<AccountProfileDto> {
    const account = await this.getAccountProfile.execute(req.user.sub);
    return {
      id: account.id,
      email: account.email,
      username: account.username,
      avatarUrl: account.avatarUrl,
    };
  }
}
