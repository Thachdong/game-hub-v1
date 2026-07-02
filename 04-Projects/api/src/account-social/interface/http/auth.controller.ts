import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ApiDataResponse, ApiErrorResponse } from '@common/decorators/api-response.decorator';
import { LoginWithGoogleUseCase } from '@application/commands/login-with-google.use-case';
import { RefreshAccessTokenUseCase } from '@application/commands/refresh-access-token.use-case';
import { GoogleUserInfo } from '@domain/ports/google-oauth.port';
import { GoogleOAuthUnavailableError, InvalidRefreshTokenError } from '@domain/errors';
import { LoginResponseDto } from '@interface/dto/auth/login-response.dto';
import { RefreshRequestDto } from '@interface/dto/auth/refresh-request.dto';
import { RefreshResponseDto } from '@interface/dto/auth/refresh-response.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly loginWithGoogle: LoginWithGoogleUseCase,
    private readonly refreshAccessToken: RefreshAccessTokenUseCase,
  ) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  @ApiResponse({ status: 302, description: 'Redirect to Google consent page' })
  googleLogin(): void {
    // Passport redirects; this body never executes
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth callback' })
  @ApiDataResponse(LoginResponseDto, { status: 200 })
  @ApiErrorResponse(503, 'Google OAuth unavailable')
  async googleCallback(
    @Req() req: { user: GoogleUserInfo },
  ): Promise<LoginResponseDto> {
    try {
      const result = await this.loginWithGoogle.execute(req.user);
      return {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        account: {
          id: result.account.id,
          email: result.account.email,
          username: result.account.username,
          avatarUrl: result.account.avatarUrl,
        },
      };
    } catch (err) {
      if (err instanceof GoogleOAuthUnavailableError) {
        throw new HttpException(
          { code: err.code, message: err.message },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
      throw err;
    }
  }

  @Post('refresh')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiDataResponse(RefreshResponseDto, { status: 200 })
  @ApiErrorResponse(400, 'Missing refresh token')
  @ApiErrorResponse(401, 'Invalid or expired refresh token')
  async refresh(@Body() dto: RefreshRequestDto): Promise<RefreshResponseDto> {
    try {
      const result = await this.refreshAccessToken.execute(dto.refreshToken);
      return { accessToken: result.accessToken };
    } catch (err) {
      if (err instanceof InvalidRefreshTokenError) {
        throw new HttpException(
          { code: err.code, message: err.message },
          HttpStatus.UNAUTHORIZED,
        );
      }
      throw err;
    }
  }
}
