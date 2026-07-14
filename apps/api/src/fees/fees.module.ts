import { Module } from '@nestjs/common';
import { FeeTiersService } from './fee-tiers.service';
import { FeeTiersController } from './fee-tiers.controller';
import { FeeAccrualService } from './fee-accrual.service';
import { FeeRunsController } from './fee-runs.controller';
import { AuditModule } from '../audit/audit.module';
import { LedgerModule } from '../ledger/ledger.module';

@Module({
  imports: [AuditModule, LedgerModule],
  providers: [FeeTiersService, FeeAccrualService],
  controllers: [FeeTiersController, FeeRunsController],
  exports: [FeeTiersService, FeeAccrualService],
})
export class FeesModule {}
