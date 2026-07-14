import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { InvoiceStatus, UserRole } from '@fueled-capital/shared';
import { InvoicesService } from './invoices.service';
import { UnderwritingDecision } from './dto/underwrite-invoice.dto';

const ADMIN = { id: 'admin-1', cognitoSub: 'x', email: 'a@x.com', role: UserRole.ADMIN, brokerId: null, machineryCompanyId: null };

function makeInvoiceFixture(status: InvoiceStatus) {
  return {
    id: 'inv-1',
    brokerId: 'broker-1',
    machineryCompanyId: 'mc-1',
    totalAmount: new Prisma.Decimal(10_000),
    status,
    documents: [],
    statusHistory: [],
  };
}

/**
 * These tests cover the funding-decision credit gate specifically: both
 * underwrite(APPROVE) and fund() must refuse to proceed — never partially —
 * when the Machinery Company's credit sub-limit would be exceeded.
 */
describe('InvoicesService credit-limit gate', () => {
  function makeService(invoice: ReturnType<typeof makeInvoiceFixture>, wouldExceedResult: any) {
    const prisma = {
      invoice: {
        findUnique: jest.fn().mockResolvedValue(invoice),
      },
      $transaction: jest.fn(),
    };
    const creditLimits = { wouldExceed: jest.fn().mockResolvedValue(wouldExceedResult) };
    const service = new InvoicesService(
      prisma as any,
      { record: jest.fn().mockResolvedValue(undefined) } as any, // audit
      {} as any, // ledger
      creditLimits as any,
      {} as any, // onboarding
      { get: jest.fn().mockReturnValue('95') } as any, // config
      {} as any, // ocrProvider
      { notifyUsersForBroker: jest.fn(), notifyUsersForMachineryCompany: jest.fn(), notifyAllAdmins: jest.fn() } as any, // notifications
    );
    return { service, prisma, creditLimits };
  }

  it('underwrite(APPROVE) is blocked and never opens a transaction when the sub-limit would be exceeded', async () => {
    const invoice = makeInvoiceFixture(InvoiceStatus.PENDING_UNDERWRITING);
    const { service, prisma, creditLimits } = makeService(invoice, {
      exceeds: true,
      overBy: new Prisma.Decimal(2_000),
      projectedUsed: new Prisma.Decimal(102_000),
      totalLimit: new Prisma.Decimal(100_000),
    });

    await expect(
      service.underwrite('inv-1', { decision: UnderwritingDecision.APPROVE }, ADMIN as any),
    ).rejects.toThrow(BadRequestException);

    expect(creditLimits.wouldExceed).toHaveBeenCalledWith('mc-1', invoice.totalAmount);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('underwrite(APPROVE) proceeds when the sub-limit would not be exceeded', async () => {
    const invoice = makeInvoiceFixture(InvoiceStatus.PENDING_UNDERWRITING);
    const { service, prisma } = makeService(invoice, {
      exceeds: false,
      overBy: new Prisma.Decimal(0),
      projectedUsed: new Prisma.Decimal(50_000),
      totalLimit: new Prisma.Decimal(100_000),
    });
    prisma.$transaction.mockImplementation(async (cb: any) => {
      const tx = {
        invoice: { update: jest.fn(), findUniqueOrThrow: jest.fn().mockResolvedValue(invoice) },
        invoiceStatusHistory: { create: jest.fn() },
      };
      return cb(tx);
    });

    await expect(
      service.underwrite('inv-1', { decision: UnderwritingDecision.APPROVE }, ADMIN as any),
    ).resolves.toBeDefined();
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('fund() is blocked and never opens a transaction when the sub-limit would be exceeded (defense in depth)', async () => {
    const invoice = makeInvoiceFixture(InvoiceStatus.APPROVED_FOR_FUNDING);
    const { service, prisma, creditLimits } = makeService(invoice, {
      exceeds: true,
      overBy: new Prisma.Decimal(500),
      projectedUsed: new Prisma.Decimal(100_500),
      totalLimit: new Prisma.Decimal(100_000),
    });

    await expect(service.fund('inv-1', ADMIN as any, 'fund:inv-1')).rejects.toThrow(BadRequestException);
    expect(creditLimits.wouldExceed).toHaveBeenCalledWith('mc-1', invoice.totalAmount);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
