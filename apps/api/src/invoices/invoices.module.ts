import { Module } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { AuditModule } from '../audit/audit.module';
import { LedgerModule } from '../ledger/ledger.module';
import { CreditLimitsModule } from '../credit-limits/credit-limits.module';
import { OnboardingModule } from '../onboarding/onboarding.module';
import { ExtractionModule } from '../extraction/extraction.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AuditModule, LedgerModule, CreditLimitsModule, OnboardingModule, ExtractionModule, NotificationsModule],
  providers: [InvoicesService],
  controllers: [InvoicesController],
  exports: [InvoicesService],
})
export class InvoicesModule {}
