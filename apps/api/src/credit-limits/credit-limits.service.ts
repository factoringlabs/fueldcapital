import { Injectable, NotFoundException } from '@nestjs/common';
import { CreditLimitChangeReason } from '@fueled-capital/shared';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface ApplyCreditDeltaInput {
  machineryCompanyId: string;
  /** Positive increases exposure (funding), negative restores it (settlement/chargeback/write-off). */
  deltaAmount: Prisma.Decimal | number | string;
  reason: CreditLimitChangeReason;
  relatedInvoiceId?: string | null;
  actorUserId?: string | null;
  idempotencyKey: string;
}

/**
 * Machinery Company sub-limit engine. Exposure is tracked by the FULL invoice
 * amount (credit risk), not the advance amount (cash exposure) — see plan.
 * There is intentionally no Broker-level facility limit in this build.
 */
@Injectable()
export class CreditLimitsService {
  constructor(private readonly prisma: PrismaService) {}

  async getUtilization(machineryCompanyId: string) {
    const limit = await this.prisma.machineryCompanyCreditLimit.findUnique({
      where: { machineryCompanyId },
    });
    if (!limit) throw new NotFoundException('Credit limit not configured for this account');
    return {
      totalLimit: limit.totalLimit,
      currentUsed: limit.currentUsed,
      available: limit.totalLimit.sub(limit.currentUsed),
      utilizationPct: limit.totalLimit.isZero()
        ? new Prisma.Decimal(0)
        : limit.currentUsed.div(limit.totalLimit).mul(100),
    };
  }

  /**
   * Applies a signed delta to currentUsed and appends the change log row in
   * the same transaction, so the cached counter and the audit history never
   * drift apart. Idempotent on idempotencyKey — a retried call is a no-op.
   */
  async applyDelta(input: ApplyCreditDeltaInput, tx: Prisma.TransactionClient | PrismaClient) {
    const existing = await tx.creditLimitChangeLog.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });
    if (existing) return existing;

    const limit = await tx.machineryCompanyCreditLimit.findUnique({
      where: { machineryCompanyId: input.machineryCompanyId },
    });
    if (!limit) {
      throw new NotFoundException(
        `No credit limit configured for machinery company ${input.machineryCompanyId}`,
      );
    }

    const delta = new Prisma.Decimal(input.deltaAmount);
    const previousUsed = limit.currentUsed;
    const newUsed = previousUsed.add(delta);

    await tx.machineryCompanyCreditLimit.update({
      where: { machineryCompanyId: input.machineryCompanyId },
      data: { currentUsed: newUsed },
    });

    return tx.creditLimitChangeLog.create({
      data: {
        machineryCompanyId: input.machineryCompanyId,
        deltaAmount: delta,
        reason: input.reason,
        relatedInvoiceId: input.relatedInvoiceId ?? null,
        actorUserId: input.actorUserId ?? null,
        previousUsed,
        newUsed,
        idempotencyKey: input.idempotencyKey,
      },
    });
  }

  /** Would applying `amount` of additional exposure push this account over its cap? */
  async wouldExceed(machineryCompanyId: string, additionalAmount: Prisma.Decimal | number | string) {
    const limit = await this.prisma.machineryCompanyCreditLimit.findUnique({
      where: { machineryCompanyId },
    });
    if (!limit) throw new NotFoundException('Credit limit not configured for this account');
    const projected = limit.currentUsed.add(new Prisma.Decimal(additionalAmount));
    return {
      exceeds: projected.greaterThan(limit.totalLimit),
      projectedUsed: projected,
      totalLimit: limit.totalLimit,
      overBy: projected.greaterThan(limit.totalLimit) ? projected.sub(limit.totalLimit) : new Prisma.Decimal(0),
    };
  }
}
