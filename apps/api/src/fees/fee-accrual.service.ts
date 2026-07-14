import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LedgerEntryType } from '@fueled-capital/shared';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LedgerService } from '../ledger/ledger.service';
import { FeeTiersService } from './fee-tiers.service';
import { findTierForGallons } from './fee-calculator';
import { nextMonthUtc, startOfMonthUtc } from './period';

const RESOLVED_STATUSES = ['SETTLED', 'CHARGED_BACK', 'WRITTEN_OFF'] as const;

/**
 * Monthly fee run. For each Broker, finds every invoice that was outstanding
 * at any point during the period — newly approved this month, or carried
 * over from an earlier month because its term runs long — and accrues one
 * InvoiceFeeAccrual row per invoice per period (idempotent). A 60-day
 * invoice therefore accrues a fee in both months it spans, per the brief.
 *
 * This is the business logic the future EventBridge-scheduled Lambda will
 * call (Phase 4 infra); for now it's triggered by an Admin action.
 */
@Injectable()
export class FeeAccrualService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly feeTiers: FeeTiersService,
    private readonly config: ConfigService,
  ) {}

  private async getOutstandingInvoicesForPeriod(brokerId: string, periodStart: Date, periodEnd: Date) {
    const approvals = await this.prisma.invoiceStatusHistory.findMany({
      where: { toStatus: 'APPROVED_FOR_FUNDING', createdAt: { lt: periodEnd }, invoice: { brokerId } },
      include: { invoice: true },
    });

    const resolutions = await this.prisma.invoiceStatusHistory.findMany({
      where: { toStatus: { in: [...RESOLVED_STATUSES] }, invoice: { brokerId } },
    });
    const resolvedAtByInvoice = new Map(resolutions.map((r) => [r.invoiceId, r.createdAt]));

    return approvals
      .map((a) => a.invoice)
      .filter((invoice) => {
        const resolvedAt = resolvedAtByInvoice.get(invoice.id);
        return !resolvedAt || resolvedAt >= periodStart;
      });
  }

  async runForBrokerPeriod(brokerId: string, periodMonthInput: Date, actorUserId: string) {
    const periodStart = startOfMonthUtc(periodMonthInput);
    const periodEnd = nextMonthUtc(periodStart);

    const existingFeeInvoice = await this.prisma.brokerFeeInvoice.findUnique({
      where: { brokerId_periodMonth: { brokerId, periodMonth: periodStart } },
    });
    if (existingFeeInvoice && existingFeeInvoice.status !== 'DRAFT') {
      throw new BadRequestException(
        `Fee invoice for this period is already ${existingFeeInvoice.status} and can no longer be recomputed`,
      );
    }

    const invoices = await this.getOutstandingInvoicesForPeriod(brokerId, periodStart, periodEnd);
    const gallons = invoices.reduce((sum, i) => sum.add(i.gallons), new Prisma.Decimal(0));
    const invoiceDollarVolume = invoices.reduce((sum, i) => sum.add(i.totalAmount), new Prisma.Decimal(0));

    const [tiers, minimumMonthlyFee] = await Promise.all([
      this.feeTiers.listActiveTiers(),
      this.feeTiers.getCurrentMinimumMonthlyFee(),
    ]);
    const tier = findTierForGallons(tiers, gallons);
    const feePct = tier?.feePct ?? new Prisma.Decimal(0);

    return this.prisma.$transaction(async (tx) => {
      let calculatedFee = new Prisma.Decimal(0);
      for (const invoice of invoices) {
        const feeAmount = invoice.totalAmount.mul(feePct).div(100);
        const accrual = await tx.invoiceFeeAccrual.upsert({
          where: { invoiceId_periodMonth: { invoiceId: invoice.id, periodMonth: periodStart } },
          create: {
            invoiceId: invoice.id,
            brokerId,
            periodMonth: periodStart,
            tierIdApplied: tier?.id,
            feePctApplied: feePct,
            baseAmount: invoice.totalAmount,
            feeAmount,
          },
          update: {},
        });
        calculatedFee = calculatedFee.add(accrual.feeAmount);
        await this.ledger.record(
          {
            entryType: LedgerEntryType.FEE_ACCRUAL,
            amount: accrual.feeAmount,
            relatedInvoiceId: invoice.id,
            relatedBrokerId: brokerId,
            actorUserId,
            idempotencyKey: `fee-accrual:${invoice.id}:${periodStart.toISOString()}`,
          },
          tx,
        );
      }

      const minimumFeeShortfallApplied = calculatedFee.lessThan(minimumMonthlyFee);
      const totalFeeAmount = minimumFeeShortfallApplied ? minimumMonthlyFee : calculatedFee;

      const feeInvoice = await tx.brokerFeeInvoice.upsert({
        where: { brokerId_periodMonth: { brokerId, periodMonth: periodStart } },
        create: {
          brokerId,
          periodMonth: periodStart,
          gallonsVolume: gallons,
          invoiceDollarVolume,
          applicableTierId: tier?.id,
          calculatedFee,
          minimumFeeShortfallApplied,
          totalFeeAmount,
          status: 'DRAFT',
        },
        update: { gallonsVolume: gallons, invoiceDollarVolume, applicableTierId: tier?.id, calculatedFee, minimumFeeShortfallApplied, totalFeeAmount },
      });

      await this.ledger.record(
        {
          entryType: LedgerEntryType.FEE_INVOICE,
          amount: totalFeeAmount,
          relatedBrokerId: brokerId,
          actorUserId,
          idempotencyKey: `fee-invoice:${brokerId}:${periodStart.toISOString()}`,
        },
        tx,
      );

      return feeInvoice;
    });
  }

  async runForAllBrokers(periodMonthInput: Date, actorUserId: string) {
    const brokers = await this.prisma.broker.findMany({ select: { id: true } });
    const results = [];
    for (const broker of brokers) {
      results.push(await this.runForBrokerPeriod(broker.id, periodMonthInput, actorUserId));
    }
    return results;
  }

  async markIssued(brokerFeeInvoiceId: string) {
    return this.prisma.brokerFeeInvoice.update({
      where: { id: brokerFeeInvoiceId },
      data: { status: 'ISSUED' },
    });
  }
}
