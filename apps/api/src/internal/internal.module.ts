import { Module } from '@nestjs/common';
import { InternalController } from './internal.controller';
import { InternalService } from './internal.service';
import { InternalApiKeyGuard } from './internal-api-key.guard';
import { InvoicesModule } from '../invoices/invoices.module';
import { FeesModule } from '../fees/fees.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [InvoicesModule, FeesModule, NotificationsModule],
  controllers: [InternalController],
  providers: [InternalService, InternalApiKeyGuard],
})
export class InternalModule {}
