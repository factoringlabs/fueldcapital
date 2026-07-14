import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { UserRole } from '@fueled-capital/shared';
import { IsNumber, IsPositive } from 'class-validator';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { Roles } from '../auth/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { CreditLimitsService } from './credit-limits.service';
import { AuditService } from '../audit/audit.service';
import { ForbiddenException } from '@nestjs/common';

class SetCreditLimitDto {
  @IsNumber()
  @IsPositive()
  totalLimit!: number;
}

@Controller('machinery-companies/:machineryCompanyId/credit-limit')
export class CreditLimitsController {
  constructor(
    private readonly creditLimits: CreditLimitsService,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Admin sees the full limit; the Machinery Company sees a read-only view of its own counter. */
  @Get()
  async getUtilization(
    @Param('machineryCompanyId') machineryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (user.role === UserRole.MACHINERY_COMPANY && user.machineryCompanyId !== machineryCompanyId) {
      throw new ForbiddenException('Cannot view another account\'s credit limit');
    }
    if (user.role === UserRole.BROKER) {
      throw new ForbiddenException('Brokers do not have visibility into Machinery Company credit limits');
    }
    return this.creditLimits.getUtilization(machineryCompanyId);
  }

  @Patch()
  @Roles(UserRole.ADMIN)
  async setLimit(
    @Param('machineryCompanyId') machineryCompanyId: string,
    @Body() dto: SetCreditLimitDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const before = await this.prisma.machineryCompanyCreditLimit.findUnique({
      where: { machineryCompanyId },
    });
    const updated = await this.prisma.machineryCompanyCreditLimit.upsert({
      where: { machineryCompanyId },
      create: { machineryCompanyId, totalLimit: dto.totalLimit, currentUsed: 0 },
      update: { totalLimit: dto.totalLimit },
    });
    await this.audit.record({
      entityType: 'MachineryCompanyCreditLimit',
      entityId: machineryCompanyId,
      action: 'SET_TOTAL_LIMIT',
      actorUserId: user.id,
      before,
      after: updated,
    });
    return updated;
  }
}
