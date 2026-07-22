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

  /**
   * Read side for the ledger viewer (Admin's full ledger, and the Broker /
   * Machinery Company "statement of account" screens). Entry amounts are
   * always stored positive — direction/meaning comes from entryType, not
   * sign — so this returns totals grouped by entryType rather than inventing
   * a net cash-position figure the underlying settlement rules don't yet
   * define (see the open settlement-waterfall question from the design doc).
   */
  async find(filters: {
    brokerId?: string;
    machineryCompanyId?: string;
    invoiceId?: string;
    entryType?: LedgerEntryType;
    from?: Date;
    to?: Date;
    take?: number;
  }) {
    const where: Prisma.LedgerEntryWhereInput = {
      relatedBrokerId: filters.brokerId,
      relatedMachineryCompanyId: filters.machineryCompanyId,
      relatedInvoiceId: filters.invoiceId,
      entryType: filters.entryType,
      createdAt: filters.from || filters.to ? { gte: filters.from, lte: filters.to } : undefined,
    };

    const entries = await this.prisma.ledgerEntry.findMany({
      where,
      include: { relatedInvoice: { select: { invoiceNumber: true } } },
      orderBy: { createdAt: 'desc' },
      take: Math.min(filters.take ?? 100, 500),
    });

    const brokerIds = [...new Set(entries.map((e) => e.relatedBrokerId).filter((id): id is string => !!id))];
    const mcIds = [
      ...new Set(entries.map((e) => e.relatedMachineryCompanyId).filter((id): id is string => !!id)),
    ];
    const [brokers, machineryCompanies] = await Promise.all([
      brokerIds.length
        ? this.prisma.broker.findMany({ where: { id: { in: brokerIds } }, select: { id: true, legalName: true } })
        : [],
      mcIds.length
        ? this.prisma.machineryCompany.findMany({
            where: { id: { in: mcIds } },
            select: { id: true, legalName: true },
          })
        : [],
    ]);
    const brokerNames = new Map(brokers.map((b) => [b.id, b.legalName]));
    const machineryCompanyNames = new Map(machineryCompanies.map((m) => [m.id, m.legalName]));

    const totalsByType: Partial<Record<LedgerEntryType, string>> = {};
    for (const e of entries) {
      const running = new Prisma.Decimal(totalsByType[e.entryType] ?? 0);
      totalsByType[e.entryType] = running.add(e.amount).toString();
    }

    return {
      entries: entries.map((e) => ({
        id: e.id,
        entryType: e.entryType,
        amount: e.amount.toString(),
        currency: e.currency,
        createdAt: e.createdAt,
        invoiceNumber: e.relatedInvoice?.invoiceNumber ?? null,
        brokerName: e.relatedBrokerId ? (brokerNames.get(e.relatedBrokerId) ?? null) : null,
        machineryCompanyName: e.relatedMachineryCompanyId
          ? (machineryCompanyNames.get(e.relatedMachineryCompanyId) ?? null)
          : null,
      })),
      totalsByType,
    };
  }
}
