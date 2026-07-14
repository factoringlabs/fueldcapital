import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

/**
 * Read-only "is anything ready?" check for reserve release. Deliberately
 * does NOT auto-settle — settlement moves money, so it stays a deliberate
 * Admin action (see InvoicesService.settle). This just surfaces the work via
 * a notification, the way the Phase 4 scheduled Lambda will.
 */
@Injectable()
export class InternalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async checkReserveReleaseCandidates() {
    const funded = await this.prisma.invoice.findMany({
      where: { status: 'FUNDED', reserveHold: false },
      include: { paymentMatches: true },
    });

    const ready = funded.filter((invoice) => {
      const matchedTotal = invoice.paymentMatches.reduce(
        (sum, m) => sum.add(m.matchedAmount),
        new Prisma.Decimal(0),
      );
      return matchedTotal.greaterThanOrEqualTo(invoice.totalAmount);
    });

    if (ready.length > 0) {
      await this.notifications.notifyAllAdmins(
        'RESERVE_RELEASE_CANDIDATES',
        `${ready.length} invoice(s) ready for settlement`,
        `The following invoices are fully reconciled with no active reserve hold and are ready to settle: ${ready
          .map((i) => i.invoiceNumber)
          .join(', ')}.`,
      );
    }

    return { readyCount: ready.length, invoiceIds: ready.map((i) => i.id) };
  }
}
