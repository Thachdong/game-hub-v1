import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountSocialModule } from '../account-social/account-social.module';
import { NotificationOrmEntity } from './infrastructure/persistence/typeorm-entities/notification.orm-entity';
import { NOTIFICATION_REPO } from './domain/ports/notification.repository.port';
import { ACCOUNT_EXISTENCE_PORT } from './domain/ports/account-existence.port';
import { NotificationTypeOrmRepository } from './infrastructure/persistence/notification.typeorm-repository';
import { AccountExistenceAdapter } from './infrastructure/persistence/account-existence.adapter';
import { CreateNotificationUseCase } from './application/commands/create-notification.use-case';
import { GetNotificationsUseCase } from './application/queries/get-notifications.use-case';
import { DomainEventListener } from './infrastructure/events/domain-event.listener';
import { NotificationsController } from './interface/http/notifications.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationOrmEntity]),
    AccountSocialModule,
  ],
  providers: [
    { provide: NOTIFICATION_REPO, useClass: NotificationTypeOrmRepository },
    { provide: ACCOUNT_EXISTENCE_PORT, useClass: AccountExistenceAdapter },
    NotificationTypeOrmRepository,
    AccountExistenceAdapter,
    CreateNotificationUseCase,
    GetNotificationsUseCase,
    DomainEventListener,
  ],
  controllers: [NotificationsController],
})
export class NotificationModule {}
