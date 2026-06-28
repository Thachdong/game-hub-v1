import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { GetAccountProfileUseCase } from '../../application/queries/get-account-profile.use-case';
import { AccountProfileDto } from '../dto/account/account-profile.dto';
import { AccessTokenPayload } from '../../domain/ports/token.service.port';

@ApiTags('Account')
@Controller('accounts')
export class AccountController {
  constructor(private readonly getAccountProfile: GetAccountProfileUseCase) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get authenticated account profile' })
  @ApiResponse({ status: 200, type: AccountProfileDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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
