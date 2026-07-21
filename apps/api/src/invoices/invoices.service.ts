import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CreditLimitChangeReason,
  InvoiceStatus,
  LedgerEntryType,
  OnboardingEntityType,
  UserRole,
  isLegalInvoiceTransition,
} from '@fueled-capital/shared';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { LedgerService } from '../ledger/ledger.service';
import { CreditLimitsService } from '../credit-limits/credit-limits.service';
import { OnboardingService } from '../onboarding/onboarding.service';
import { OCR_PROVIDER, OcrProvider } from '../extraction/ocr-provider.interface';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UnderwriteInvoiceDto, UnderwritingDecision } from './dto/underwrite-invoice.dto';
import { DisputeInvoiceDto, ResolveDisputeDto } from './dto/dispute-invoice.dto';
import { PlaceReserveHoldDto } from './dto/reserve-hold.dto';
import { ChargebackInvoiceDto } from './dto/chargeback.dto';

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly ledger: LedgerService,
    private readonly creditLimits: CreditLimitsService,
    private readonly onboarding: OnboardingService,
    private readonly config: ConfigService,
    @Inject(OCR_PROVIDER) private readonly ocrProvider: OcrProvider,
    private readonly notifications: NotificationsService,
  ) {}

  // --- Ownership / access ---

  assertAccess(user: AuthenticatedUser, invoice: { brokerId: string; machineryCompanyId: string }) {
    if (user.role === UserRole.ADMIN) return;
    if (user.role === UserRole.BROKER && user.brokerId === invoice.brokerId) return;
    if (user.role === UserRole.MACHINERY_COMPANY && user.machineryCompanyId === invoice.machineryCompanyId) return;
    throw new ForbiddenException('You do not have access to this invoice');
  }

  /**
   * Blocks funding outright (never partial) if the Machinery Company's
   * credit sub-limit would be exceeded by this invoice's full amount.
   */
  private async assertWithinCreditLimit(machineryCompanyId: string, invoiceTotalAmount: Prisma.Decimal) {
    const check = await this.creditLimits.wouldExceed(machineryCompanyId, invoiceTotalAmount);
    if (check.exceeds) {
      throw new BadRequestException(
        `Blocked: funding this invoice would exceed the Machinery Company credit sub-limit by ${check.overBy.toFixed(2)} ` +
          `(projected used ${check.projectedUsed.toFixed(2)} of ${check.totalLimit.toFixed(2)})`,
      );
    }
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: { documents: true, statusHistory: { orderBy: { createdAt: 'asc' } } },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    this.assertAccess(user, invoice);
    return invoice;
  }

  async findAllForUser(user: AuthenticatedUser) {
    if (user.role === UserRole.ADMIN) return this.prisma.invoice.findMany({ orderBy: { createdAt: 'desc' } });
    if (user.role === UserRole.BROKER) {
      return this.prisma.invoice.findMany({ where: { brokerId: user.brokerId! }, orderBy: { createdAt: 'desc' } });
    }
    return this.prisma.invoice.findMany({
      where: { machineryCompanyId: user.machineryCompanyId! },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async writeStatusChange(
    tx: Prisma.TransactionClient,
    invoiceId: string,
    from: InvoiceStatus,
    to: InvoiceStatus,
    actorUserId: string | null,
    reasonCode?: string | null,
    extraData: Record<string, unknown> = {},
  ) {
    if (!isLegalInvoiceTransition(from, to)) {
      throw new BadRequestException(`Illegal invoice transition: ${from} -> ${to}`);
    }
    await tx.invoice.update({ where: { id: invoiceId }, data: { status: to, ...extraData } });
    await tx.invoiceStatusHistory.create({
      data: { invoiceId, fromStatus: from, toStatus: to, reasonCode: reasonCode ?? null, actorUserId },
    });
    await this.audit.record(
      {
        entityType: 'Invoice',
        entityId: invoiceId,
        action: `${from}_TO_${to}`,
        actorUserId,
        reasonCode: reasonCode ?? null,
      },
      tx,
    );
  }

  // --- Broker: upload ---

  async create(dto: CreateInvoiceDto, user: AuthenticatedUser) {
    if (user.role !== UserRole.BROKER || !user.brokerId) {
      throw new ForbiddenException('Only Brokers can upload invoices');
    }
    const brokerTransactable = await this.onboarding.isTransactable(OnboardingEntityType.BROKER, user.brokerId);
    if (!brokerTransactable) {
      throw new ForbiddenException('Broker onboarding is not approved — cannot upload invoices');
    }
    const mc = await this.prisma.machineryCompany.findUnique({ where: { id: dto.machineryCompanyId } });
    if (!mc) throw new NotFoundException('Machinery Company not found');
    if (mc.onboardingStatus !== 'APPROVED') {
      throw new ForbiddenException('Machinery Company is not onboarded/approved yet');
    }

    const totalAmount = dto.billedAmount + (dto.taxAmount ?? 0);

    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber: dto.invoiceNumber,
          brokerId: user.brokerId!,
          machineryCompanyId: dto.machineryCompanyId,
          invoiceDate: new Date(dto.invoiceDate),
          dueDate: new Date(dto.dueDate),
          billedAmount: dto.billedAmount,
          taxAmount: dto.taxAmount ?? 0,
          totalAmount,
          gallons: dto.gallons,
          deliveryDetails: (dto.deliveryDetails as Prisma.InputJsonValue) ?? Prisma.JsonNull,
          paymentReference: dto.paymentReference,
          status: InvoiceStatus.DRAFT,
        },
      });
      await this.writeStatusChange(tx, invoice.id, InvoiceStatus.DRAFT, InvoiceStatus.UPLOADED, user.id, null, {
        submittedAt: new Date(),
      });
      return tx.invoice.findUniqueOrThrow({ where: { id: invoice.id } });
    });
  }

  /**
   * Runs extraction on a document the Broker just uploaded, before any invoice
   * exists yet — lets the "upload invoice" form pre-fill from the document
   * instead of starting blank. Read-only: no DB writes. The formal extraction
   * record (used to drive PENDING_BROKER_REVIEW) is still created afterward by
   * runExtractionCore once the invoice + document actually exist.
   */
  async previewExtraction(s3Key: string, user: AuthenticatedUser) {
    if (user.role !== UserRole.BROKER) {
      throw new ForbiddenException('Only Brokers can preview invoice extraction');
    }
    return this.ocrProvider.extract(s3Key);
  }

  /** Attach a supporting document (invoice image, PoD, delivery ticket) after it has been uploaded to storage. */
  async attachDocument(
    invoiceId: string,
    input: { docType: string; s3Key: string },
    user: AuthenticatedUser,
  ) {
    const invoice = await this.findOne(invoiceId, user);
    if (user.role !== UserRole.BROKER || invoice.brokerId !== user.brokerId) {
      throw new ForbiddenException('Only the owning Broker can attach documents');
    }
    return this.prisma.invoiceDocument.create({
      data: { invoiceId, docType: input.docType as any, s3Key: input.s3Key, uploadedBy: user.id },
    });
  }

  /**
   * Triggers extraction. In production this runs async (S3 upload event ->
   * Lambda -> OCR provider); here it runs inline since the provider is
   * stubbed and synchronous. Always lands on PENDING_BROKER_REVIEW — a human
   * must confirm/correct extracted fields before the invoice can move on.
   */
  async runExtraction(invoiceId: string, user: AuthenticatedUser) {
    const invoice = await this.findOne(invoiceId, user);
    if (user.role !== UserRole.BROKER || invoice.brokerId !== user.brokerId) {
      throw new ForbiddenException('Only the owning Broker can submit for extraction');
    }
    return this.runExtractionCore(invoiceId, user.id);
  }

  /**
   * System-triggered variant with no owning user — this is what the S3
   * document-uploaded Lambda calls (via /internal) once wired up in Phase 4,
   * so extraction can kick off automatically instead of waiting for the
   * Broker to click "submit for extraction".
   */
  async runExtractionAsSystem(invoiceId: string) {
    return this.runExtractionCore(invoiceId, null);
  }

  private async runExtractionCore(invoiceId: string, actorUserId: string | null) {
    const primaryDoc = await this.prisma.invoiceDocument.findFirst({ where: { invoiceId } });
    if (!primaryDoc) throw new BadRequestException('Attach at least one document before extraction');

    return this.prisma.$transaction(async (tx) => {
      await this.writeStatusChange(tx, invoiceId, InvoiceStatus.UPLOADED, InvoiceStatus.EXTRACTING, actorUserId);
      const result = await this.ocrProvider.extract(primaryDoc.s3Key);
      await tx.invoiceExtractionResult.create({
        data: {
          invoiceId,
          provider: this.config.get<string>('OCR_PROVIDER') ?? 'stub',
          rawResponse: result.rawResponse as Prisma.InputJsonValue,
          extractedFields: result.extractedFields as Prisma.InputJsonValue,
          confidenceScores: result.confidenceScores as Prisma.InputJsonValue,
          status: 'COMPLETED',
        },
      });
      await this.writeStatusChange(
        tx,
        invoiceId,
        InvoiceStatus.EXTRACTING,
        InvoiceStatus.PENDING_BROKER_REVIEW,
        actorUserId,
      );
      return tx.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
    });
  }

  /** Broker confirms/corrects the extracted fields and submits to the Machinery Company for approval. */
  async submitForApproval(invoiceId: string, user: AuthenticatedUser) {
    const invoice = await this.findOne(invoiceId, user);
    if (user.role !== UserRole.BROKER || invoice.brokerId !== user.brokerId) {
      throw new ForbiddenException('Only the owning Broker can submit for MC approval');
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      await this.writeStatusChange(
        tx,
        invoiceId,
        InvoiceStatus.PENDING_BROKER_REVIEW,
        InvoiceStatus.PENDING_MC_APPROVAL,
        user.id,
      );
      return tx.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
    });
    await this.notifications.notifyUsersForMachineryCompany(
      invoice.machineryCompanyId,
      'INVOICE_AWAITING_APPROVAL',
      `Invoice ${invoice.invoiceNumber} awaiting your approval`,
      `Invoice ${invoice.invoiceNumber} for ${invoice.totalAmount} is ready for your review and approval.`,
      { entityType: 'Invoice', entityId: invoiceId },
    );
    return updated;
  }

  // --- Machinery Company: approve / dispute ---

  async mcApprove(invoiceId: string, user: AuthenticatedUser) {
    const invoice = await this.findOne(invoiceId, user);
    if (user.role !== UserRole.MACHINERY_COMPANY || invoice.machineryCompanyId !== user.machineryCompanyId) {
      throw new ForbiddenException('Only the debtor Machinery Company can approve this invoice');
    }
    const transactable = await this.onboarding.isTransactable(
      OnboardingEntityType.MACHINERY_COMPANY,
      user.machineryCompanyId!,
    );
    if (!transactable) throw new ForbiddenException('Machinery Company onboarding is not approved');

    return this.prisma.$transaction(async (tx) => {
      await this.writeStatusChange(
        tx,
        invoiceId,
        InvoiceStatus.PENDING_MC_APPROVAL,
        InvoiceStatus.PENDING_UNDERWRITING,
        user.id,
        null,
        { mcApprovedAt: new Date() },
      );
      return tx.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
    });
  }

  async mcDispute(invoiceId: string, dto: DisputeInvoiceDto, user: AuthenticatedUser) {
    const invoice = await this.findOne(invoiceId, user);
    if (user.role !== UserRole.MACHINERY_COMPANY || invoice.machineryCompanyId !== user.machineryCompanyId) {
      throw new ForbiddenException('Only the debtor Machinery Company can dispute this invoice');
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.dispute.create({
        data: { invoiceId, raisedBy: user.id, reasonCode: dto.reasonCode, description: dto.description },
      });
      await this.writeStatusChange(
        tx,
        invoiceId,
        InvoiceStatus.PENDING_MC_APPROVAL,
        InvoiceStatus.MC_DISPUTED,
        user.id,
        dto.reasonCode,
        { disputeReasonCode: dto.reasonCode },
      );
      return tx.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
    });
    await this.notifications.notifyAllAdmins(
      'INVOICE_DISPUTED',
      `Invoice ${invoice.invoiceNumber} disputed`,
      `Machinery Company disputed invoice ${invoice.invoiceNumber}: ${dto.reasonCode}.`,
      { entityType: 'Invoice', entityId: invoiceId },
    );
    return updated;
  }

  async resolveDispute(invoiceId: string, dto: ResolveDisputeDto, user: AuthenticatedUser) {
    if (user.role !== UserRole.ADMIN) throw new ForbiddenException('Only Admin resolves disputes');
    const invoice = await this.findOne(invoiceId, user);
    const toStatus = dto.resolution === 'REINSTATE' ? InvoiceStatus.PENDING_MC_APPROVAL : InvoiceStatus.CANCELLED;

    return this.prisma.$transaction(async (tx) => {
      const openDispute = await tx.dispute.findFirst({ where: { invoiceId, status: 'OPEN' } });
      if (openDispute) {
        await tx.dispute.update({
          where: { id: openDispute.id },
          data: { status: 'RESOLVED', resolutionNotes: dto.notes, resolvedBy: user.id, resolvedAt: new Date() },
        });
      }
      await this.writeStatusChange(tx, invoiceId, InvoiceStatus.MC_DISPUTED, toStatus, user.id, null, {
        disputeReasonCode: null,
        ...(toStatus === InvoiceStatus.CANCELLED ? { cancelledAt: new Date() } : {}),
      });
      return tx.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
    });
  }

  // --- Admin: underwriting decision ---

  async underwrite(invoiceId: string, dto: UnderwriteInvoiceDto, user: AuthenticatedUser) {
    if (user.role !== UserRole.ADMIN) throw new ForbiddenException('Only Admin makes funding decisions');
    const invoice = await this.findOne(invoiceId, user);

    const toStatus =
      dto.decision === UnderwritingDecision.APPROVE
        ? InvoiceStatus.APPROVED_FOR_FUNDING
        : dto.decision === UnderwritingDecision.REJECT
          ? InvoiceStatus.REJECTED
          : InvoiceStatus.INFO_REQUESTED;

    if (dto.decision === UnderwritingDecision.APPROVE) {
      await this.assertWithinCreditLimit(invoice.machineryCompanyId, invoice.totalAmount);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await this.writeStatusChange(
        tx,
        invoiceId,
        InvoiceStatus.PENDING_UNDERWRITING,
        toStatus,
        user.id,
        dto.reasonCode,
      );
      return tx.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
    });

    if (dto.decision !== UnderwritingDecision.APPROVE) {
      const subject =
        dto.decision === UnderwritingDecision.REJECT
          ? `Invoice ${invoice.invoiceNumber} rejected`
          : `More information requested on invoice ${invoice.invoiceNumber}`;
      await this.notifications.notifyUsersForBroker(invoice.brokerId, `UNDERWRITING_${dto.decision}`, subject, `${subject}${dto.reasonCode ? `: ${dto.reasonCode}` : ''}`, {
        entityType: 'Invoice',
        entityId: invoiceId,
      });
    }
    return updated;
  }

  async respondToInfoRequest(invoiceId: string, user: AuthenticatedUser) {
    const invoice = await this.findOne(invoiceId, user);
    if (user.role !== UserRole.BROKER || invoice.brokerId !== user.brokerId) {
      throw new ForbiddenException('Only the owning Broker can respond to an info request');
    }
    return this.prisma.$transaction(async (tx) => {
      await this.writeStatusChange(
        tx,
        invoiceId,
        InvoiceStatus.INFO_REQUESTED,
        InvoiceStatus.PENDING_UNDERWRITING,
        user.id,
      );
      return tx.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
    });
  }

  // --- Admin: funding (idempotent, moves money) ---

  async fund(invoiceId: string, user: AuthenticatedUser, idempotencyKey: string) {
    if (user.role !== UserRole.ADMIN) throw new ForbiddenException('Only Admin can fund an invoice');
    const invoice = await this.findOne(invoiceId, user);
    if (invoice.status !== InvoiceStatus.APPROVED_FOR_FUNDING) {
      throw new BadRequestException(`Invoice is not approved for funding (status: ${invoice.status})`);
    }
    // Re-checked here, not just at underwrite-approve time: the limit itself could have
    // been lowered, or other invoices funded, in the time between approval and this call.
    await this.assertWithinCreditLimit(invoice.machineryCompanyId, invoice.totalAmount);

    const advancePct = new Prisma.Decimal(this.config.get<string>('DEFAULT_ADVANCE_PCT') ?? '95');
    const advanceAmount = invoice.totalAmount.mul(advancePct).div(100);
    const reserveAmount = invoice.totalAmount.sub(advanceAmount);

    const result = await this.prisma.$transaction(async (tx) => {
      await this.writeStatusChange(
        tx,
        invoiceId,
        InvoiceStatus.APPROVED_FOR_FUNDING,
        InvoiceStatus.FUNDED,
        user.id,
        null,
        {
          fundedAt: new Date(),
          advancePctApplied: advancePct,
          advanceAmount,
          reserveAmount,
        },
      );

      await this.ledger.record(
        {
          entryType: LedgerEntryType.FUNDING_DISBURSEMENT,
          amount: advanceAmount,
          relatedInvoiceId: invoiceId,
          relatedBrokerId: invoice.brokerId,
          relatedMachineryCompanyId: invoice.machineryCompanyId,
          actorUserId: user.id,
          idempotencyKey: `${idempotencyKey}:disbursement`,
        },
        tx,
      );
      await this.ledger.record(
        {
          entryType: LedgerEntryType.RESERVE_HOLD,
          amount: reserveAmount,
          relatedInvoiceId: invoiceId,
          relatedBrokerId: invoice.brokerId,
          relatedMachineryCompanyId: invoice.machineryCompanyId,
          actorUserId: user.id,
          idempotencyKey: `${idempotencyKey}:reserve-hold`,
        },
        tx,
      );

      // Credit exposure convention: full invoice amount, not advance amount (see plan/README).
      await this.creditLimits.applyDelta(
        {
          machineryCompanyId: invoice.machineryCompanyId,
          deltaAmount: invoice.totalAmount,
          reason: CreditLimitChangeReason.INVOICE_FUNDED,
          relatedInvoiceId: invoiceId,
          actorUserId: user.id,
          idempotencyKey: `${idempotencyKey}:credit-limit`,
        },
        tx,
      );

      return tx.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
    });

    await this.notifications.notifyUsersForBroker(
      invoice.brokerId,
      'INVOICE_FUNDED',
      `Invoice ${invoice.invoiceNumber} funded`,
      `Advance of ${advanceAmount.toFixed(2)} disbursed for invoice ${invoice.invoiceNumber}. Reserve of ${reserveAmount.toFixed(2)} held.`,
      { entityType: 'Invoice', entityId: invoiceId },
    );
    return result;
  }

  // --- Admin: settlement (idempotent, releases reserve) ---

  async settle(invoiceId: string, user: AuthenticatedUser, idempotencyKey: string) {
    if (user.role !== UserRole.ADMIN) throw new ForbiddenException('Only Admin can settle an invoice');
    const invoice = await this.findOne(invoiceId, user);
    if (invoice.status !== InvoiceStatus.FUNDED) {
      throw new BadRequestException(`Invoice is not in FUNDED status (status: ${invoice.status})`);
    }
    if (invoice.reserveHold) {
      throw new BadRequestException(
        `Settlement blocked: reserve hold active (${invoice.reserveHoldReasonCode ?? 'reason not set'})`,
      );
    }

    const matches = await this.prisma.paymentInvoiceMatch.findMany({ where: { invoiceId } });
    const matchedTotal = matches.reduce((sum, m) => sum.add(m.matchedAmount), new Prisma.Decimal(0));
    if (matchedTotal.lessThan(invoice.totalAmount)) {
      throw new BadRequestException(
        `Cannot settle: payment reconciliation incomplete (matched ${matchedTotal.toFixed(2)} of ${invoice.totalAmount.toFixed(2)})`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await this.writeStatusChange(tx, invoiceId, InvoiceStatus.FUNDED, InvoiceStatus.SETTLED, user.id, null, {
        settledAt: new Date(),
      });

      await this.ledger.record(
        {
          entryType: LedgerEntryType.RESERVE_RELEASE,
          amount: invoice.reserveAmount ?? new Prisma.Decimal(0),
          relatedInvoiceId: invoiceId,
          relatedBrokerId: invoice.brokerId,
          relatedMachineryCompanyId: invoice.machineryCompanyId,
          actorUserId: user.id,
          idempotencyKey: `${idempotencyKey}:reserve-release`,
        },
        tx,
      );

      await this.creditLimits.applyDelta(
        {
          machineryCompanyId: invoice.machineryCompanyId,
          deltaAmount: invoice.totalAmount.negated(),
          reason: CreditLimitChangeReason.INVOICE_SETTLED,
          relatedInvoiceId: invoiceId,
          actorUserId: user.id,
          idempotencyKey: `${idempotencyKey}:credit-limit-restore`,
        },
        tx,
      );

      return tx.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
    });
  }

  // --- Cancellation (any pre-funding state) ---

  async cancel(invoiceId: string, user: AuthenticatedUser) {
    const invoice = await this.findOne(invoiceId, user);
    if (user.role === UserRole.BROKER && invoice.brokerId !== user.brokerId) {
      throw new ForbiddenException('Only the owning Broker or Admin can cancel this invoice');
    }
    if (user.role === UserRole.MACHINERY_COMPANY) {
      throw new ForbiddenException('Machinery Companies cannot cancel invoices — dispute instead');
    }
    return this.prisma.$transaction(async (tx) => {
      await this.writeStatusChange(tx, invoiceId, invoice.status as InvoiceStatus, InvoiceStatus.CANCELLED, user.id, null, {
        cancelledAt: new Date(),
      });
      return tx.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
    });
  }

  // --- Admin: reserve hold (pauses settlement without silently skipping it) ---

  async placeReserveHold(invoiceId: string, dto: PlaceReserveHoldDto, user: AuthenticatedUser) {
    if (user.role !== UserRole.ADMIN) throw new ForbiddenException('Only Admin places reserve holds');
    const invoice = await this.findOne(invoiceId, user);
    if (invoice.status !== InvoiceStatus.FUNDED) {
      throw new BadRequestException(`Reserve holds only apply to FUNDED invoices (status: ${invoice.status})`);
    }
    if (invoice.reserveHold) {
      throw new BadRequestException('A reserve hold is already active on this invoice');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.reserveHoldEvent.create({
        data: { invoiceId, reasonCode: dto.reasonCode, notes: dto.notes, placedBy: user.id },
      });
      await tx.invoice.update({
        where: { id: invoiceId },
        data: { reserveHold: true, reserveHoldReasonCode: dto.reasonCode },
      });
      await this.audit.record(
        {
          entityType: 'Invoice',
          entityId: invoiceId,
          action: 'RESERVE_HOLD_PLACED',
          actorUserId: user.id,
          reasonCode: dto.reasonCode,
        },
        tx,
      );
      return tx.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
    });
  }

  async releaseReserveHold(invoiceId: string, user: AuthenticatedUser) {
    if (user.role !== UserRole.ADMIN) throw new ForbiddenException('Only Admin releases reserve holds');
    const invoice = await this.findOne(invoiceId, user);
    if (!invoice.reserveHold) {
      throw new BadRequestException('No active reserve hold on this invoice');
    }

    return this.prisma.$transaction(async (tx) => {
      const activeHold = await tx.reserveHoldEvent.findFirst({ where: { invoiceId, active: true } });
      if (activeHold) {
        await tx.reserveHoldEvent.update({
          where: { id: activeHold.id },
          data: { active: false, releasedBy: user.id, releasedAt: new Date() },
        });
      }
      await tx.invoice.update({
        where: { id: invoiceId },
        data: { reserveHold: false, reserveHoldReasonCode: null },
      });
      await this.audit.record(
        { entityType: 'Invoice', entityId: invoiceId, action: 'RESERVE_HOLD_RELEASED', actorUserId: user.id },
        tx,
      );
      return tx.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
    });
  }

  // --- Admin: chargeback / repurchase (recourse to Broker) and write-off ---

  /**
   * Recourse to the Broker for fraud, duplicate/invalid invoices, pricing
   * errors, delivery disputes, credit memos, or offsets — distinct from a
   * normal settlement. Restores the Machinery Company's credit exposure
   * immediately (the debtor relationship's risk is resolved via the Broker).
   */
  async chargeback(invoiceId: string, dto: ChargebackInvoiceDto, user: AuthenticatedUser, idempotencyKey: string) {
    if (user.role !== UserRole.ADMIN) throw new ForbiddenException('Only Admin initiates a chargeback');
    const invoice = await this.findOne(invoiceId, user);
    if (invoice.status !== InvoiceStatus.FUNDED) {
      throw new BadRequestException(`Can only charge back a FUNDED invoice (status: ${invoice.status})`);
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const chargebackRecord = await tx.chargeback.create({
        data: {
          invoiceId,
          reasonCode: dto.reasonCode,
          amount: dto.amount,
          initiatedBy: user.id,
          notes: dto.notes,
          status: 'COMPLETED',
        },
      });

      await this.writeStatusChange(
        tx,
        invoiceId,
        InvoiceStatus.FUNDED,
        InvoiceStatus.CHARGED_BACK,
        user.id,
        dto.reasonCode,
      );

      const ledgerEntry = await this.ledger.record(
        {
          entryType: LedgerEntryType.CHARGEBACK,
          amount: dto.amount,
          relatedInvoiceId: invoiceId,
          relatedBrokerId: invoice.brokerId,
          relatedMachineryCompanyId: invoice.machineryCompanyId,
          actorUserId: user.id,
          idempotencyKey: `${idempotencyKey}:chargeback`,
          metadata: { reasonCode: dto.reasonCode },
        },
        tx,
      );
      await tx.chargeback.update({ where: { id: chargebackRecord.id }, data: { ledgerEntryId: ledgerEntry.id } });

      // Credit exposure convention: restore by the full invoice amount, same as a normal settlement.
      await this.creditLimits.applyDelta(
        {
          machineryCompanyId: invoice.machineryCompanyId,
          deltaAmount: invoice.totalAmount.negated(),
          reason: CreditLimitChangeReason.CHARGEBACK,
          relatedInvoiceId: invoiceId,
          actorUserId: user.id,
          idempotencyKey: `${idempotencyKey}:credit-limit-restore`,
        },
        tx,
      );

      return tx.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
    });

    await this.notifications.notifyUsersForBroker(
      invoice.brokerId,
      'INVOICE_CHARGED_BACK',
      `Invoice ${invoice.invoiceNumber} charged back`,
      `Invoice ${invoice.invoiceNumber} was charged back: ${dto.reasonCode}. Amount: ${dto.amount}.`,
      { entityType: 'Invoice', entityId: invoiceId },
    );
    return result;
  }

  async writeOff(invoiceId: string, user: AuthenticatedUser, idempotencyKey: string) {
    if (user.role !== UserRole.ADMIN) throw new ForbiddenException('Only Admin can write off an invoice');
    const invoice = await this.findOne(invoiceId, user);
    if (invoice.status !== InvoiceStatus.CHARGED_BACK) {
      throw new BadRequestException(`Can only write off a CHARGED_BACK invoice (status: ${invoice.status})`);
    }
    const chargebackRecord = await this.prisma.chargeback.findFirst({ where: { invoiceId } });

    return this.prisma.$transaction(async (tx) => {
      await this.writeStatusChange(tx, invoiceId, InvoiceStatus.CHARGED_BACK, InvoiceStatus.WRITTEN_OFF, user.id);
      if (chargebackRecord) {
        await tx.chargeback.update({ where: { id: chargebackRecord.id }, data: { status: 'WRITTEN_OFF' } });
      }
      await this.ledger.record(
        {
          entryType: LedgerEntryType.WRITE_OFF,
          amount: chargebackRecord?.amount ?? invoice.totalAmount,
          relatedInvoiceId: invoiceId,
          relatedBrokerId: invoice.brokerId,
          relatedMachineryCompanyId: invoice.machineryCompanyId,
          actorUserId: user.id,
          idempotencyKey: `${idempotencyKey}:write-off`,
        },
        tx,
      );
      return tx.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
    });
  }
}
