import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { UserRole } from '@fueled-capital/shared';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { FeeAccrualService } from './fee-accrual.service';
import { RunFeeAccrualDto } from './dto/fee-run.dto';

@Controller('admin/fee-runs')
@Roles(UserRole.ADMIN)
export class FeeRunsController {
  constructor(
    private readonly feeAccrual: FeeAccrualService,
    private readonly prisma: PrismaService,
  ) {}

  /** Stand-in for the Phase 4 EventBridge-scheduled Lambda that runs at the start of each month. */
  @Post()
  run(@Body() dto: RunFeeAccrualDto, @CurrentUser() user: AuthenticatedUser) {
    const periodMonth = new Date(dto.periodMonth);
    if (dto.brokerId) {
      return this.feeAccrual.runForBrokerPeriod(dto.brokerId, periodMonth, user.id);
    }
    return this.feeAccrual.runForAllBrokers(periodMonth, user.id);
  }

  @Get('broker-fee-invoices')
  listFeeInvoices(@Query('brokerId') brokerId?: string) {
    return this.prisma.brokerFeeInvoice.findMany({
      where: brokerId ? { brokerId } : undefined,
      orderBy: { periodMonth: 'desc' },
    });
  }

  @Patch('broker-fee-invoices/:id/issue')
  issue(@Param('id') id: string) {
    return this.feeAccrual.markIssued(id);
  }
}
