import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NOTIFICATION_PROVIDER } from './notification-provider.interface';
import { StubNotificationProvider } from './stub-notification.provider';

@Module({
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    { provide: NOTIFICATION_PROVIDER, useClass: StubNotificationProvider },
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
