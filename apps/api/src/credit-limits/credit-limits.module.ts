import { Module } from '@nestjs/common';
import { CreditLimitsService } from './credit-limits.service';
import { CreditLimitsController } from './credit-limits.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  providers: [CreditLimitsService],
  controllers: [CreditLimitsController],
  exports: [CreditLimitsService],
})
export class CreditLimitsModule {}
