-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'BROKER', 'MACHINERY_COMPANY');

-- CreateEnum
CREATE TYPE "OnboardingEntityType" AS ENUM ('BROKER', 'MACHINERY_COMPANY');

-- CreateEnum
CREATE TYPE "OnboardingStatus" AS ENUM ('INVITED', 'DOCS_SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'UPLOADED', 'EXTRACTING', 'PENDING_BROKER_REVIEW', 'PENDING_MC_APPROVAL', 'MC_DISPUTED', 'PENDING_UNDERWRITING', 'INFO_REQUESTED', 'REJECTED', 'APPROVED_FOR_FUNDING', 'FUNDED', 'SETTLED', 'CHARGED_BACK', 'WRITTEN_OFF', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReserveHoldReasonCode" AS ENUM ('DISPUTE', 'CREDIT_MEMO', 'OFFSET', 'PRICING_CORRECTION', 'DELIVERY_ISSUE', 'OTHER');

-- CreateEnum
CREATE TYPE "ChargebackReasonCode" AS ENUM ('FRAUD', 'DUPLICATE', 'INVALID_DATA', 'PRICING_ERROR', 'DELIVERY_DISPUTE', 'CREDIT_MEMO', 'OFFSET', 'OTHER');

-- CreateEnum
CREATE TYPE "ChargebackStatus" AS ENUM ('PENDING', 'COMPLETED', 'WRITTEN_OFF');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'RESOLVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNMATCHED', 'PARTIALLY_MATCHED', 'FULLY_MATCHED', 'OVERPAID', 'UNDERPAID', 'DISPUTED');

-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('FUNDING_DISBURSEMENT', 'RESERVE_HOLD', 'FEE_ACCRUAL', 'FEE_INVOICE', 'PAYMENT_RECEIPT', 'RESERVE_RELEASE', 'ADJUSTMENT', 'CHARGEBACK', 'REPURCHASE', 'WRITE_OFF', 'MANUAL_CORRECTION');

-- CreateEnum
CREATE TYPE "CreditLimitChangeReason" AS ENUM ('INVOICE_FUNDED', 'INVOICE_SETTLED', 'CHARGEBACK', 'MANUAL_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "InvoiceDocumentType" AS ENUM ('INVOICE', 'POD', 'DELIVERY_TICKET', 'OTHER');

-- CreateEnum
CREATE TYPE "ExtractionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "AppUser" (
    "id" TEXT NOT NULL,
    "cognitoSub" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "brokerId" TEXT,
    "machineryCompanyId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Broker" (
    "id" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "dba" TEXT,
    "ein" TEXT NOT NULL,
    "address" TEXT,
    "bankAccountRef" TEXT,
    "onboardingStatus" "OnboardingStatus" NOT NULL DEFAULT 'INVITED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Broker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MachineryCompany" (
    "id" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "ein" TEXT NOT NULL,
    "address" TEXT,
    "onboardingStatus" "OnboardingStatus" NOT NULL DEFAULT 'INVITED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MachineryCompany_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KybKycDocument" (
    "id" TEXT NOT NULL,
    "entityType" "OnboardingEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "docType" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "KybKycDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MachineryCompanyCreditLimit" (
    "id" TEXT NOT NULL,
    "machineryCompanyId" TEXT NOT NULL,
    "totalLimit" DECIMAL(14,2) NOT NULL,
    "currentUsed" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MachineryCompanyCreditLimit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditLimitChangeLog" (
    "id" TEXT NOT NULL,
    "machineryCompanyId" TEXT NOT NULL,
    "deltaAmount" DECIMAL(14,2) NOT NULL,
    "reason" "CreditLimitChangeReason" NOT NULL,
    "relatedInvoiceId" TEXT,
    "actorUserId" TEXT,
    "previousUsed" DECIMAL(14,2) NOT NULL,
    "newUsed" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "idempotencyKey" TEXT NOT NULL,

    CONSTRAINT "CreditLimitChangeLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "brokerId" TEXT NOT NULL,
    "machineryCompanyId" TEXT NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "billedAmount" DECIMAL(14,2) NOT NULL,
    "taxAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(14,2) NOT NULL,
    "gallons" DECIMAL(14,3) NOT NULL,
    "deliveryDetails" JSONB,
    "paymentReference" TEXT,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "disputeReasonCode" TEXT,
    "reserveHold" BOOLEAN NOT NULL DEFAULT false,
    "reserveHoldReasonCode" "ReserveHoldReasonCode",
    "advancePctApplied" DECIMAL(5,2),
    "advanceAmount" DECIMAL(14,2),
    "reserveAmount" DECIMAL(14,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "mcApprovedAt" TIMESTAMP(3),
    "fundedAt" TIMESTAMP(3),
    "settledAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceDocument" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "docType" "InvoiceDocumentType" NOT NULL,
    "s3Key" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceStatusHistory" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "fromStatus" "InvoiceStatus" NOT NULL,
    "toStatus" "InvoiceStatus" NOT NULL,
    "reasonCode" TEXT,
    "actorUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "InvoiceStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceExtractionResult" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "rawResponse" JSONB,
    "extractedFields" JSONB,
    "confidenceScores" JSONB,
    "status" "ExtractionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceExtractionResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dispute" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "raisedBy" TEXT NOT NULL,
    "reasonCode" TEXT NOT NULL,
    "description" TEXT,
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "resolutionNotes" TEXT,
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chargeback" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "reasonCode" "ChargebackReasonCode" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "initiatedBy" TEXT NOT NULL,
    "initiatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "ChargebackStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "ledgerEntryId" TEXT,

    CONSTRAINT "Chargeback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReserveHoldEvent" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "reasonCode" "ReserveHoldReasonCode" NOT NULL,
    "notes" TEXT,
    "placedBy" TEXT NOT NULL,
    "placedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedBy" TEXT,
    "releasedAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ReserveHoldEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeTier" (
    "id" TEXT NOT NULL,
    "gallonsFrom" DECIMAL(14,3) NOT NULL,
    "gallonsTo" DECIMAL(14,3),
    "feePct" DECIMAL(5,3) NOT NULL,
    "notes" TEXT,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeeTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgramFeeConfig" (
    "id" TEXT NOT NULL,
    "minimumMonthlyFee" DECIMAL(14,2) NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProgramFeeConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceFeeAccrual" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "brokerId" TEXT NOT NULL,
    "periodMonth" TIMESTAMP(3) NOT NULL,
    "tierIdApplied" TEXT,
    "feePctApplied" DECIMAL(5,3) NOT NULL,
    "baseAmount" DECIMAL(14,2) NOT NULL,
    "feeAmount" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceFeeAccrual_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrokerFeeInvoice" (
    "id" TEXT NOT NULL,
    "brokerId" TEXT NOT NULL,
    "periodMonth" TIMESTAMP(3) NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gallonsVolume" DECIMAL(14,3) NOT NULL,
    "invoiceDollarVolume" DECIMAL(14,2) NOT NULL,
    "applicableTierId" TEXT,
    "calculatedFee" DECIMAL(14,2) NOT NULL,
    "minimumFeeShortfallApplied" BOOLEAN NOT NULL DEFAULT false,
    "totalFeeAmount" DECIMAL(14,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "pdfS3Key" TEXT,

    CONSTRAINT "BrokerFeeInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "machineryCompanyId" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "method" TEXT,
    "externalReference" TEXT,
    "bankReference" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'UNMATCHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reconciledBy" TEXT,
    "reconciledAt" TIMESTAMP(3),

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentInvoiceMatch" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "matchedAmount" DECIMAL(14,2) NOT NULL,
    "matchedBy" TEXT NOT NULL,
    "matchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "PaymentInvoiceMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "entryType" "LedgerEntryType" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "relatedInvoiceId" TEXT,
    "relatedBrokerId" TEXT,
    "relatedMachineryCompanyId" TEXT,
    "actorUserId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorUserId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "reasonCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdempotencyRecord" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "responseSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdempotencyRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "recipientUserId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'EMAIL',
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "relatedEntityType" TEXT,
    "relatedEntityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AppUser_cognitoSub_key" ON "AppUser"("cognitoSub");

-- CreateIndex
CREATE UNIQUE INDEX "AppUser_email_key" ON "AppUser"("email");

-- CreateIndex
CREATE INDEX "KybKycDocument_entityType_entityId_idx" ON "KybKycDocument"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "MachineryCompanyCreditLimit_machineryCompanyId_key" ON "MachineryCompanyCreditLimit"("machineryCompanyId");

-- CreateIndex
CREATE UNIQUE INDEX "CreditLimitChangeLog_idempotencyKey_key" ON "CreditLimitChangeLog"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Invoice_machineryCompanyId_idx" ON "Invoice"("machineryCompanyId");

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_brokerId_invoiceNumber_key" ON "Invoice"("brokerId", "invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceFeeAccrual_invoiceId_periodMonth_key" ON "InvoiceFeeAccrual"("invoiceId", "periodMonth");

-- CreateIndex
CREATE UNIQUE INDEX "BrokerFeeInvoice_brokerId_periodMonth_key" ON "BrokerFeeInvoice"("brokerId", "periodMonth");

-- CreateIndex
CREATE UNIQUE INDEX "LedgerEntry_idempotencyKey_key" ON "LedgerEntry"("idempotencyKey");

-- CreateIndex
CREATE INDEX "LedgerEntry_relatedInvoiceId_idx" ON "LedgerEntry"("relatedInvoiceId");

-- CreateIndex
CREATE INDEX "LedgerEntry_entryType_idx" ON "LedgerEntry"("entryType");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyRecord_key_key" ON "IdempotencyRecord"("key");

-- AddForeignKey
ALTER TABLE "AppUser" ADD CONSTRAINT "AppUser_brokerId_fkey" FOREIGN KEY ("brokerId") REFERENCES "Broker"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppUser" ADD CONSTRAINT "AppUser_machineryCompanyId_fkey" FOREIGN KEY ("machineryCompanyId") REFERENCES "MachineryCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineryCompanyCreditLimit" ADD CONSTRAINT "MachineryCompanyCreditLimit_machineryCompanyId_fkey" FOREIGN KEY ("machineryCompanyId") REFERENCES "MachineryCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditLimitChangeLog" ADD CONSTRAINT "CreditLimitChangeLog_machineryCompanyId_fkey" FOREIGN KEY ("machineryCompanyId") REFERENCES "MachineryCompanyCreditLimit"("machineryCompanyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_brokerId_fkey" FOREIGN KEY ("brokerId") REFERENCES "Broker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_machineryCompanyId_fkey" FOREIGN KEY ("machineryCompanyId") REFERENCES "MachineryCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceDocument" ADD CONSTRAINT "InvoiceDocument_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceStatusHistory" ADD CONSTRAINT "InvoiceStatusHistory_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceExtractionResult" ADD CONSTRAINT "InvoiceExtractionResult_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chargeback" ADD CONSTRAINT "Chargeback_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReserveHoldEvent" ADD CONSTRAINT "ReserveHoldEvent_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceFeeAccrual" ADD CONSTRAINT "InvoiceFeeAccrual_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceFeeAccrual" ADD CONSTRAINT "InvoiceFeeAccrual_brokerId_fkey" FOREIGN KEY ("brokerId") REFERENCES "Broker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrokerFeeInvoice" ADD CONSTRAINT "BrokerFeeInvoice_brokerId_fkey" FOREIGN KEY ("brokerId") REFERENCES "Broker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_machineryCompanyId_fkey" FOREIGN KEY ("machineryCompanyId") REFERENCES "MachineryCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentInvoiceMatch" ADD CONSTRAINT "PaymentInvoiceMatch_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentInvoiceMatch" ADD CONSTRAINT "PaymentInvoiceMatch_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_relatedInvoiceId_fkey" FOREIGN KEY ("relatedInvoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

