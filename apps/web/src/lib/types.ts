import { InvoiceStatus, UserRole } from '@fueled-capital/shared';

// Response shape of GET /me.
export interface AuthenticatedUserDto {
  id: string;
  cognitoSub: string;
  email: string;
  role: UserRole;
  brokerId: string | null;
  machineryCompanyId: string | null;
}

// Decimal fields arrive as strings over JSON (Prisma.Decimal#toJSON).
export interface InvoiceDto {
  id: string;
  invoiceNumber: string;
  brokerId: string;
  machineryCompanyId: string;
  invoiceDate: string;
  dueDate: string;
  billedAmount: string;
  taxAmount: string;
  totalAmount: string;
  gallons: string;
  status: InvoiceStatus;
  disputeReasonCode: string | null;
  reserveHold: boolean;
  reserveHoldReasonCode: string | null;
  advancePctApplied: string | null;
  advanceAmount: string | null;
  reserveAmount: string | null;
  createdAt: string;
  submittedAt: string | null;
  mcApprovedAt: string | null;
  fundedAt: string | null;
  settledAt: string | null;
  cancelledAt: string | null;
  documents?: { id: string; docType: string; s3Key: string }[];
  statusHistory?: { fromStatus: string; toStatus: string; reasonCode: string | null; createdAt: string }[];
}

export interface BrokerDto {
  id: string;
  legalName: string;
  dba: string | null;
  ein: string;
  onboardingStatus: string;
}

export interface MachineryCompanyDto {
  id: string;
  legalName: string;
  ein: string;
  onboardingStatus: string;
}

export interface CreditLimitDto {
  totalLimit: string;
  currentUsed: string;
  available: string;
  utilizationPct: string;
}

export function formatMoney(value: string | number): string {
  return `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
