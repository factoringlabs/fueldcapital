import { Prisma } from '@prisma/client';
import { CreditLimitChangeReason } from '@fueled-capital/shared';
import { CreditLimitsService } from './credit-limits.service';

/** Minimal fake of the two Prisma delegates applyDelta touches, backed by an in-memory map. */
function makeFakeTx(initialLimit: { machineryCompanyId: string; totalLimit: number; currentUsed: number }) {
  const limits = new Map([
    [
      initialLimit.machineryCompanyId,
      { ...initialLimit, totalLimit: new Prisma.Decimal(initialLimit.totalLimit), currentUsed: new Prisma.Decimal(initialLimit.currentUsed) },
    ],
  ]);
  const changeLogs = new Map<string, any>();

  return {
    tx: {
      creditLimitChangeLog: {
        findUnique: jest.fn(async ({ where: { idempotencyKey } }: any) => changeLogs.get(idempotencyKey) ?? null),
        create: jest.fn(async ({ data }: any) => {
          const row = { id: `log-${changeLogs.size + 1}`, ...data };
          changeLogs.set(data.idempotencyKey, row);
          return row;
        }),
      },
      machineryCompanyCreditLimit: {
        findUnique: jest.fn(async ({ where: { machineryCompanyId } }: any) => limits.get(machineryCompanyId) ?? null),
        update: jest.fn(async ({ where: { machineryCompanyId }, data }: any) => {
          const existing = limits.get(machineryCompanyId)!;
          const updated = { ...existing, ...data };
          limits.set(machineryCompanyId, updated);
          return updated;
        }),
      },
    } as any,
    limits,
    changeLogs,
  };
}

describe('CreditLimitsService.applyDelta', () => {
  const machineryCompanyId = 'mc-1';

  it('decrements available (increases currentUsed) by the full invoice amount on funding', async () => {
    const { tx, limits } = makeFakeTx({ machineryCompanyId, totalLimit: 100_000, currentUsed: 0 });
    const service = new CreditLimitsService({} as any);

    await service.applyDelta(
      {
        machineryCompanyId,
        deltaAmount: 10_000,
        reason: CreditLimitChangeReason.INVOICE_FUNDED,
        relatedInvoiceId: 'inv-1',
        idempotencyKey: 'fund:inv-1:credit-limit',
      },
      tx,
    );

    expect(limits.get(machineryCompanyId)!.currentUsed.toString()).toBe('10000');
  });

  it('restores available (decreases currentUsed) on settlement', async () => {
    const { tx, limits } = makeFakeTx({ machineryCompanyId, totalLimit: 100_000, currentUsed: 10_000 });
    const service = new CreditLimitsService({} as any);

    await service.applyDelta(
      {
        machineryCompanyId,
        deltaAmount: -10_000,
        reason: CreditLimitChangeReason.INVOICE_SETTLED,
        relatedInvoiceId: 'inv-1',
        idempotencyKey: 'settle:inv-1:credit-limit-restore',
      },
      tx,
    );

    expect(limits.get(machineryCompanyId)!.currentUsed.toString()).toBe('0');
  });

  it('is idempotent: replaying the same idempotencyKey does not double-apply the delta', async () => {
    const { tx, limits } = makeFakeTx({ machineryCompanyId, totalLimit: 100_000, currentUsed: 0 });
    const service = new CreditLimitsService({} as any);
    const input = {
      machineryCompanyId,
      deltaAmount: 10_000,
      reason: CreditLimitChangeReason.INVOICE_FUNDED,
      relatedInvoiceId: 'inv-1',
      idempotencyKey: 'fund:inv-1:credit-limit',
    };

    await service.applyDelta(input, tx);
    await service.applyDelta(input, tx); // simulated retry
    await service.applyDelta(input, tx); // simulated second retry

    expect(limits.get(machineryCompanyId)!.currentUsed.toString()).toBe('10000');
    expect(tx.machineryCompanyCreditLimit.update).toHaveBeenCalledTimes(1);
  });

  it('wouldExceed flags when projected usage crosses the total limit', async () => {
    const service = new CreditLimitsService({
      machineryCompanyCreditLimit: {
        findUnique: jest.fn(async () => ({
          totalLimit: new Prisma.Decimal(100_000),
          currentUsed: new Prisma.Decimal(95_000),
        })),
      },
    } as any);

    const result = await service.wouldExceed(machineryCompanyId, 10_000);
    expect(result.exceeds).toBe(true);
    expect(result.overBy.toString()).toBe('5000');
  });
});
