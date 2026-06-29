import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_FILTER } from '@nestjs/core';
import { authConfig } from '@config/auth.config';
import { googleOAuthConfig } from '@config/google-oauth.config';
import { appConfig, validationSchema } from '@config/app.config';
import { AccountSocialModule } from './account-social/account-social.module';
import { SharedAuthModule } from './shared-auth/shared-auth.module';
import { NotificationModule } from './notification/notification.module';
import { RealtimeModule } from './realtime/realtime.module';
import { DomainExceptionFilter } from './account-social/interface/filters/domain-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [authConfig, googleOAuthConfig, appConfig],
      validationSchema,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>('DATABASE_URL'),
        entities: [__dirname + '/**/*.orm-entity{.ts,.js}'],
        migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
        synchronize: false,
        migrationsRun: false,
        logging: ['error'],
      }),
      inject: [ConfigService],
    }),
    EventEmitterModule.forRoot({ wildcard: false }),
    SharedAuthModule,
    AccountSocialModule,
    RealtimeModule,
    NotificationModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: DomainExceptionFilter },
  ],
})
export class AppModule {}
