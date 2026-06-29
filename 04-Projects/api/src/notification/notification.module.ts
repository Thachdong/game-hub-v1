import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountSocialModule } from '../account-social/account-social.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { NotificationOrmEntity } from './infrastructure/persistence/typeorm-entities/notification.orm-entity';
import { NOTIFICATION_REPO } from './domain/ports/notification.repository.port';
import { ACCOUNT_EXISTENCE_PORT } from './domain/ports/account-existence.port';
import { REALTIME_PUSH_PORT } from '../realtime/realtime-push.port';
import { NotificationTypeOrmRepository } from './infrastructure/persistence/notification.typeorm-repository';
import { AccountExistenceAdapter } from './infrastructure/persistence/account-existence.adapter';
import { RealtimePushAdapter } from './infrastructure/realtime/realtime-push.adapter';
import { CreateNotificationUseCase } from './application/commands/create-notification.use-case';
import { MarkNotificationReadUseCase } from './application/commands/mark-notification-read.use-case';
import { GetNotificationsUseCase } from './application/queries/get-notifications.use-case';
import { DomainEventListener } from './infrastructure/events/domain-event.listener';
import { NotificationsController } from './interface/http/notifications.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationOrmEntity]),
    AccountSocialModule,
    RealtimeModule,
  ],
  providers: [
    { provide: NOTIFICATION_REPO, useClass: NotificationTypeOrmRepository },
    { provide: ACCOUNT_EXISTENCE_PORT, useClass: AccountExistenceAdapter },
    { provide: REALTIME_PUSH_PORT, useClass: RealtimePushAdapter },
    NotificationTypeOrmRepository,
    AccountExistenceAdapter,
    RealtimePushAdapter,
    CreateNotificationUseCase,
    MarkNotificationReadUseCase,
    GetNotificationsUseCase,
    DomainEventListener,
  ],
  controllers: [NotificationsController],
})
export class NotificationModule {}
