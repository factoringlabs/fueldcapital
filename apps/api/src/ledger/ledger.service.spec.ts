import { LedgerEntryType } from '@fueled-capital/shared';
import { LedgerService } from './ledger.service';

function makeFakeTx() {
  const entries = new Map<string, any>();
  return {
    tx: {
      ledgerEntry: {
        findUnique: jest.fn(async ({ where: { idempotencyKey } }: any) => entries.get(idempotencyKey) ?? null),
        create: jest.fn(async ({ data }: any) => {
          const row = { id: `entry-${entries.size + 1}`, ...data };
          entries.set(data.idempotencyKey, row);
          return row;
        }),
      },
    } as any,
    entries,
  };
}

describe('LedgerService.record', () => {
  it('creates a new immutable entry for a fresh idempotency key', async () => {
    const { tx, entries } = makeFakeTx();
    const service = new LedgerService({} as any);

    const entry = await service.record(
      {
        entryType: LedgerEntryType.FUNDING_DISBURSEMENT,
        amount: 9_500,
        relatedInvoiceId: 'inv-1',
        idempotencyKey: 'fund:inv-1:disbursement',
      },
      tx,
    );

    expect(entry.amount).toBe(9_500);
    expect(entries.size).toBe(1);
  });

  it('is idempotent: a retried call with the same key returns the existing entry and writes nothing new', async () => {
    const { tx } = makeFakeTx();
    const service = new LedgerService({} as any);
    const input = {
      entryType: LedgerEntryType.FUNDING_DISBURSEMENT,
      amount: 9_500,
      relatedInvoiceId: 'inv-1',
      idempotencyKey: 'fund:inv-1:disbursement',
    };

    const first = await service.record(input, tx);
    const second = await service.record(input, tx); // simulated retry after a timeout

    expect(second.id).toBe(first.id);
    expect(tx.ledgerEntry.create).toHaveBeenCalledTimes(1);
  });

  it('treats different idempotency keys as distinct entries, even for the same invoice', async () => {
    const { tx, entries } = makeFakeTx();
    const service = new LedgerService({} as any);

    await service.record(
      { entryType: LedgerEntryType.FUNDING_DISBURSEMENT, amount: 9_500, idempotencyKey: 'fund:inv-1:disbursement' },
      tx,
    );
    await service.record(
      { entryType: LedgerEntryType.RESERVE_HOLD, amount: 500, idempotencyKey: 'fund:inv-1:reserve-hold' },
      tx,
    );

    expect(entries.size).toBe(2);
  });
});
