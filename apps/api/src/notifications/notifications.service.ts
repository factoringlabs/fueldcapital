import { Inject, Injectable } from '@nestjs/common';
import { UserRole } from '@fueled-capital/shared';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NOTIFICATION_PROVIDER, NotificationProvider } from './notification-provider.interface';

export interface NotifyInput {
  recipientUserId: string;
  type: string;
  subject: string;
  body: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

/**
 * Writing a notification and sending it are decoupled on purpose: `notify()`
 * only persists a PENDING row (fast, synchronous, called inline from domain
 * services on state changes). Actually delivering email happens later in
 * `processPending()`, which the notification-sender Lambda calls on a
 * schedule — mirroring how this runs once EventBridge is wired up in Phase 4.
 */
@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(NOTIFICATION_PROVIDER) private readonly provider: NotificationProvider,
  ) {}

  async notify(input: NotifyInput, tx?: Prisma.TransactionClient | PrismaClient) {
    const client = tx ?? this.prisma;
    return client.notification.create({
      data: {
        recipientUserId: input.recipientUserId,
        type: input.type,
        subject: input.subject,
        body: input.body,
        relatedEntityType: input.relatedEntityType ?? null,
        relatedEntityId: input.relatedEntityId ?? null,
        status: 'PENDING',
      },
    });
  }

  async notifyUsersForBroker(
    brokerId: string,
    type: string,
    subject: string,
    body: string,
    related?: { entityType: string; entityId: string },
  ) {
    const users = await this.prisma.appUser.findMany({ where: { brokerId, status: 'ACTIVE' } });
    return Promise.all(
      users.map((u) =>
        this.notify({
          recipientUserId: u.id,
          type,
          subject,
          body,
          relatedEntityType: related?.entityType,
          relatedEntityId: related?.entityId,
        }),
      ),
    );
  }

  async notifyUsersForMachineryCompany(
    machineryCompanyId: string,
    type: string,
    subject: string,
    body: string,
    related?: { entityType: string; entityId: string },
  ) {
    const users = await this.prisma.appUser.findMany({ where: { machineryCompanyId, status: 'ACTIVE' } });
    return Promise.all(
      users.map((u) =>
        this.notify({
          recipientUserId: u.id,
          type,
          subject,
          body,
          relatedEntityType: related?.entityType,
          relatedEntityId: related?.entityId,
        }),
      ),
    );
  }

  async notifyAllAdmins(
    type: string,
    subject: string,
    body: string,
    related?: { entityType: string; entityId: string },
  ) {
    const admins = await this.prisma.appUser.findMany({ where: { role: UserRole.ADMIN, status: 'ACTIVE' } });
    return Promise.all(
      admins.map((u) =>
        this.notify({
          recipientUserId: u.id,
          type,
          subject,
          body,
          relatedEntityType: related?.entityType,
          relatedEntityId: related?.entityId,
        }),
      ),
    );
  }

  /** Called by the notification-sender Lambda (or manually via /internal in the meantime). */
  async processPending(limit = 50) {
    const pending = await this.prisma.notification.findMany({
      where: { status: 'PENDING' },
      take: limit,
      orderBy: { createdAt: 'asc' },
    });

    const results = [];
    for (const notification of pending) {
      const recipient = await this.prisma.appUser.findUnique({ where: { id: notification.recipientUserId } });
      if (!recipient) {
        await this.prisma.notification.update({ where: { id: notification.id }, data: { status: 'FAILED' } });
        results.push({ id: notification.id, success: false, error: 'recipient not found' });
        continue;
      }
      const result = await this.provider.send({
        toEmail: recipient.email,
        subject: notification.subject,
        body: notification.body,
      });
      await this.prisma.notification.update({
        where: { id: notification.id },
        data: { status: result.success ? 'SENT' : 'FAILED', sentAt: result.success ? new Date() : null },
      });
      results.push({ id: notification.id, success: result.success });
    }
    return { processed: results.length, results };
  }
}
