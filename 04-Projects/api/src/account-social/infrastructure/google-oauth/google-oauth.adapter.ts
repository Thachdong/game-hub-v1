import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { GoogleOAuthConfig } from '../../../config/google-oauth.config';
import { GoogleUserInfo } from '../../domain/ports/google-oauth.port';

@Injectable()
export class GoogleOAuthAdapter extends PassportStrategy(Strategy, 'google') {
  constructor(configService: ConfigService) {
    const cfg = configService.get<GoogleOAuthConfig>('googleOAuth')!;
    super({
      clientID: cfg.clientId,
      clientSecret: cfg.clientSecret,
      callbackURL: cfg.callbackUrl,
      scope: ['email', 'profile'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
  ): GoogleUserInfo {
    return {
      email: profile.emails![0].value,
      name: profile.displayName,
      avatarUrl: profile.photos?.[0]?.value ?? '',
    };
  }
}
