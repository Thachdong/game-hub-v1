import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  ITokenService,
  AccessTokenPayload,
  RefreshTokenPayload,
} from '@domain/ports/token.service.port';
import { AuthConfig } from '@config/auth.config';

@Injectable()
export class JwtTokenAdapter implements ITokenService {
  private readonly auth: AuthConfig;

  constructor(
    private readonly jwtService: JwtService,
    configService: ConfigService,
  ) {
    this.auth = configService.get<AuthConfig>('auth')!;
  }

  signAccessToken(payload: AccessTokenPayload): string {
    return this.jwtService.sign(payload, {
      secret: this.auth.jwtAccessSecret,
      expiresIn: this.auth.jwtAccessExpiresIn,
    });
  }

  signRefreshToken(sub: string): string {
    return this.jwtService.sign(
      { sub, type: 'refresh' } satisfies RefreshTokenPayload,
      {
        secret: this.auth.jwtRefreshSecret,
        expiresIn: this.auth.jwtRefreshExpiresIn,
      },
    );
  }

  verifyRefreshToken(token: string): RefreshTokenPayload {
    return this.jwtService.verify<RefreshTokenPayload>(token, {
      secret: this.auth.jwtRefreshSecret,
    });
  }
}
