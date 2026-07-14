import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { calculateFee } from './fee-calculator';
import { CreateFeeTierDto, FeeCalculatorPreviewDto, SetMinimumMonthlyFeeDto } from './dto/fee-tier.dto';

/**
 * Admin-editable gallon-band -> fee % table, plus the configurable minimum
 * monthly program fee. Both are versioned (effectiveFrom/effectiveTo) rather
 * than mutated in place, so a tier change never rewrites the fee already
 * accrued on a prior month's invoices.
 */
@Injectable()
export class FeeTiersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

  listActiveTiers() {
    return this.prisma.feeTier.findMany({ where: { isActive: true }, orderBy: { gallonsFrom: 'asc' } });
  }

  async createTier(dto: CreateFeeTierDto, actorUserId: string) {
    const tier = await this.prisma.feeTier.create({
      data: {
        gallonsFrom: dto.gallonsFrom,
        gallonsTo: dto.gallonsTo ?? null,
        feePct: dto.feePct,
        notes: dto.notes,
        createdBy: actorUserId,
      },
    });
    await this.audit.record({
      entityType: 'FeeTier',
      entityId: tier.id,
      action: 'CREATED',
      actorUserId,
      after: tier,
    });
    return tier;
  }

  /** Retires a band without replacing it — leaves a gap; pair with createTier for a real edit. */
  async deactivateTier(id: string, actorUserId: string) {
    const tier = await this.prisma.feeTier.findUnique({ where: { id } });
    if (!tier) throw new NotFoundException('Fee tier not found');
    const updated = await this.prisma.feeTier.update({
      where: { id },
      data: { isActive: false, effectiveTo: new Date() },
    });
    await this.audit.record({
      entityType: 'FeeTier',
      entityId: id,
      action: 'DEACTIVATED',
      actorUserId,
      before: tier,
      after: updated,
    });
    return updated;
  }

  async getCurrentMinimumMonthlyFee(): Promise<Prisma.Decimal> {
    const current = await this.prisma.programFeeConfig.findFirst({
      where: { effectiveTo: null },
      orderBy: { effectiveFrom: 'desc' },
    });
    return current?.minimumMonthlyFee ?? new Prisma.Decimal(0);
  }

  async setMinimumMonthlyFee(dto: SetMinimumMonthlyFeeDto, actorUserId: string) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.programFeeConfig.findFirst({ where: { effectiveTo: null } });
      if (current) {
        await tx.programFeeConfig.update({ where: { id: current.id }, data: { effectiveTo: new Date() } });
      }
      const created = await tx.programFeeConfig.create({
        data: { minimumMonthlyFee: dto.minimumMonthlyFee, createdBy: actorUserId },
      });
      await this.audit.record(
        {
          entityType: 'ProgramFeeConfig',
          entityId: created.id,
          action: 'MINIMUM_FEE_SET',
          actorUserId,
          before: current,
          after: created,
        },
        tx,
      );
      return created;
    });
  }

  /** Non-persisting preview so Admin can see the effect of a hypothetical month before saving tier changes. */
  async previewCalculator(dto: FeeCalculatorPreviewDto) {
    const [tiers, minimumMonthlyFee] = await Promise.all([
      this.listActiveTiers(),
      this.getCurrentMinimumMonthlyFee(),
    ]);
    return calculateFee({
      gallons: dto.gallons,
      invoiceDollarVolume: dto.invoiceDollarVolume,
      tiers,
      minimumMonthlyFee,
      advancePct: this.config.get<string>('DEFAULT_ADVANCE_PCT') ?? '95',
    });
  }
}
