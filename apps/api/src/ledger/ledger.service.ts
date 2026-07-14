import { Injectable } from '@nestjs/common';
import { LedgerEntryType } from '@fueled-capital/shared';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface LedgerEntryInput {
  entryType: LedgerEntryType;
  amount: Prisma.Decimal | number | string;
  currency?: string;
  relatedInvoiceId?: string | null;
  relatedBrokerId?: string | null;
  relatedMachineryCompanyId?: string | null;
  actorUserId?: string | null;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
}

/**
 * Every funding, reserve hold, fee accrual/invoice, payment receipt, reserve
 * release, adjustment, chargeback, repurchase, write-off, and manual
 * correction is recorded here as an immutable, idempotent entry. This is the
 * financial system of record — never updated or deleted, only appended to.
 */
@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Writes an entry if idempotencyKey hasn't been used before; otherwise
   * returns the existing entry untouched. Must be called within the same
   * transaction as any counter mutations it accompanies (e.g. credit limit
   * decrement) so a retry can never double-fund or double-release.
   */
  async record(input: LedgerEntryInput, tx?: Prisma.TransactionClient | PrismaClient) {
    const client = tx ?? this.prisma;
    const existing = await client.ledgerEntry.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });
    if (existing) return existing;

    return client.ledgerEntry.create({
      data: {
        entryType: input.entryType,
        amount: input.amount,
        currency: input.currency ?? 'USD',
        relatedInvoiceId: input.relatedInvoiceId ?? null,
        relatedBrokerId: input.relatedBrokerId ?? null,
        relatedMachineryCompanyId: input.relatedMachineryCompanyId ?? null,
        actorUserId: input.actorUserId ?? null,
        idempotencyKey: input.idempotencyKey,
        metadata: (input.metadata as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      },
    });
  }
}
