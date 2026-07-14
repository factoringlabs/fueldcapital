import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { LedgerEntryType, UserRole } from '@fueled-capital/shared';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LedgerService } from '../ledger/ledger.service';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { RecordPaymentDto, MatchPaymentDto } from './dto/record-payment.dto';

/**
 * Minimal payment reconciliation workflow: a Payment can be unmatched,
 * partially matched, fully matched, overpaid, underpaid, or disputed.
 * Settlement (InvoicesService.settle) requires the sum of matches on an
 * invoice to reach its full totalAmount before it will proceed.
 */
@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
  ) {}

  async record(dto: RecordPaymentDto, user: AuthenticatedUser) {
    if (user.role !== UserRole.ADMIN) throw new ForbiddenException('Only Admin records payments');
    const mc = await this.prisma.machineryCompany.findUnique({ where: { id: dto.machineryCompanyId } });
    if (!mc) throw new NotFoundException('Machinery Company not found');

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          machineryCompanyId: dto.machineryCompanyId,
          receivedAt: new Date(dto.receivedAt),
          amount: dto.amount,
          method: dto.method,
          externalReference: dto.externalReference,
          bankReference: dto.bankReference,
          status: 'UNMATCHED',
        },
      });
      await this.ledger.record(
        {
          entryType: LedgerEntryType.PAYMENT_RECEIPT,
          amount: dto.amount,
          relatedMachineryCompanyId: dto.machineryCompanyId,
          actorUserId: user.id,
          idempotencyKey: `payment-receipt:${payment.id}`,
        },
        tx,
      );
      return payment;
    });
  }

  async findAll(user: AuthenticatedUser) {
    if (user.role === UserRole.ADMIN) return this.prisma.payment.findMany({ orderBy: { receivedAt: 'desc' } });
    if (user.role === UserRole.MACHINERY_COMPANY) {
      return this.prisma.payment.findMany({
        where: { machineryCompanyId: user.machineryCompanyId! },
        orderBy: { receivedAt: 'desc' },
      });
    }
    throw new ForbiddenException('Brokers do not have direct visibility into payments');
  }

  async match(paymentId: string, dto: MatchPaymentDto, user: AuthenticatedUser) {
    if (user.role !== UserRole.ADMIN) throw new ForbiddenException('Only Admin reconciles payments');
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Payment not found');
    const invoice = await this.prisma.invoice.findUnique({ where: { id: dto.invoiceId } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.machineryCompanyId !== payment.machineryCompanyId) {
      throw new BadRequestException('Payment and invoice belong to different Machinery Companies');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.paymentInvoiceMatch.create({
        data: {
          paymentId,
          invoiceId: dto.invoiceId,
          matchedAmount: dto.matchedAmount,
          matchedBy: user.id,
          notes: dto.notes,
        },
      });

      const allMatchesForPayment = await tx.paymentInvoiceMatch.findMany({ where: { paymentId } });
      const totalMatched = allMatchesForPayment.reduce(
        (sum, m) => sum.add(m.matchedAmount),
        new Prisma.Decimal(0),
      );
      const status = totalMatched.equals(payment.amount)
        ? 'FULLY_MATCHED'
        : totalMatched.greaterThan(payment.amount)
          ? 'OVERPAID'
          : 'PARTIALLY_MATCHED';

      await tx.payment.update({
        where: { id: paymentId },
        data: { status, reconciledBy: user.id, reconciledAt: new Date() },
      });

      return tx.payment.findUniqueOrThrow({ where: { id: paymentId }, include: { matches: true } });
    });
  }
}
