import { Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditEntryInput {
  entityType: string;
  entityId: string;
  action: string;
  actorUserId?: string | null;
  before?: unknown;
  after?: unknown;
  reasonCode?: string | null;
}

/**
 * Single write path for the Admin audit log viewer. Every state change that
 * isn't already captured by the immutable ledger (onboarding transitions,
 * fee tier edits, credit limit edits, invoice status changes) goes through here.
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntryInput, tx?: Prisma.TransactionClient | PrismaClient) {
    const client = tx ?? this.prisma;
    return client.auditLog.create({
      data: {
        entityType: entry.entityType,
        entityId: entry.entityId,
        action: entry.action,
        actorUserId: entry.actorUserId ?? null,
        before: entry.before === undefined ? Prisma.JsonNull : (entry.before as Prisma.InputJsonValue),
        after: entry.after === undefined ? Prisma.JsonNull : (entry.after as Prisma.InputJsonValue),
        reasonCode: entry.reasonCode ?? null,
      },
    });
  }
}
