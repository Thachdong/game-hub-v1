import { Global, Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthConfig } from '@config/auth.config';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { OptionalJwtGuard } from './optional-jwt.guard';
import { PlatformAdminGuard } from './platform-admin.guard';

@Global()
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const auth = configService.get<AuthConfig>('auth')!;
        return {
          secret: auth.jwtAccessSecret,
          signOptions: { expiresIn: auth.jwtAccessExpiresIn },
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [JwtStrategy, JwtAuthGuard, OptionalJwtGuard, PlatformAdminGuard],
  exports: [PassportModule, JwtModule, JwtStrategy, JwtAuthGuard, OptionalJwtGuard, PlatformAdminGuard],
})
export class SharedAuthModule {}
