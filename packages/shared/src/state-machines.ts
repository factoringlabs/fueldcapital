import { InvoiceStatus, OnboardingStatus } from './enums';

/**
 * Legal transitions for the invoice lifecycle. Both apps/api (enforcement)
 * and apps/web (disabling illegal UI actions) import this single source of truth.
 * See docs/state-machines.md for the diagram this encodes.
 */
export const INVOICE_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  [InvoiceStatus.DRAFT]: [InvoiceStatus.UPLOADED, InvoiceStatus.CANCELLED],
  [InvoiceStatus.UPLOADED]: [InvoiceStatus.EXTRACTING, InvoiceStatus.CANCELLED],
  [InvoiceStatus.EXTRACTING]: [InvoiceStatus.PENDING_BROKER_REVIEW],
  [InvoiceStatus.PENDING_BROKER_REVIEW]: [
    InvoiceStatus.PENDING_MC_APPROVAL,
    InvoiceStatus.CANCELLED,
  ],
  [InvoiceStatus.PENDING_MC_APPROVAL]: [
    InvoiceStatus.MC_DISPUTED,
    InvoiceStatus.PENDING_UNDERWRITING,
    InvoiceStatus.CANCELLED,
  ],
  [InvoiceStatus.MC_DISPUTED]: [
    InvoiceStatus.PENDING_MC_APPROVAL,
    InvoiceStatus.CANCELLED,
  ],
  [InvoiceStatus.PENDING_UNDERWRITING]: [
    InvoiceStatus.APPROVED_FOR_FUNDING,
    InvoiceStatus.REJECTED,
    InvoiceStatus.INFO_REQUESTED,
  ],
  [InvoiceStatus.INFO_REQUESTED]: [InvoiceStatus.PENDING_UNDERWRITING],
  [InvoiceStatus.APPROVED_FOR_FUNDING]: [InvoiceStatus.FUNDED],
  [InvoiceStatus.FUNDED]: [InvoiceStatus.SETTLED, InvoiceStatus.CHARGED_BACK],
  [InvoiceStatus.CHARGED_BACK]: [InvoiceStatus.WRITTEN_OFF],
  [InvoiceStatus.REJECTED]: [],
  [InvoiceStatus.SETTLED]: [],
  [InvoiceStatus.WRITTEN_OFF]: [],
  [InvoiceStatus.CANCELLED]: [],
};

export function isLegalInvoiceTransition(
  from: InvoiceStatus,
  to: InvoiceStatus,
): boolean {
  return INVOICE_TRANSITIONS[from]?.includes(to) ?? false;
}

/** States prior to FUNDED where an invoice can still be withdrawn/cancelled. */
export const PRE_FUNDING_INVOICE_STATUSES: InvoiceStatus[] = [
  InvoiceStatus.DRAFT,
  InvoiceStatus.UPLOADED,
  InvoiceStatus.EXTRACTING,
  InvoiceStatus.PENDING_BROKER_REVIEW,
  InvoiceStatus.PENDING_MC_APPROVAL,
  InvoiceStatus.MC_DISPUTED,
  InvoiceStatus.PENDING_UNDERWRITING,
  InvoiceStatus.INFO_REQUESTED,
];

/** Invoice is exposed against the Machinery Company credit sub-limit while in these statuses. */
export const CREDIT_EXPOSED_INVOICE_STATUSES: InvoiceStatus[] = [
  InvoiceStatus.FUNDED,
];

export const ONBOARDING_TRANSITIONS: Record<OnboardingStatus, OnboardingStatus[]> = {
  [OnboardingStatus.INVITED]: [OnboardingStatus.DOCS_SUBMITTED],
  [OnboardingStatus.DOCS_SUBMITTED]: [OnboardingStatus.UNDER_REVIEW],
  [OnboardingStatus.UNDER_REVIEW]: [
    OnboardingStatus.APPROVED,
    OnboardingStatus.REJECTED,
    OnboardingStatus.DOCS_SUBMITTED,
  ],
  [OnboardingStatus.APPROVED]: [OnboardingStatus.SUSPENDED],
  [OnboardingStatus.SUSPENDED]: [OnboardingStatus.APPROVED],
  [OnboardingStatus.REJECTED]: [OnboardingStatus.DOCS_SUBMITTED],
};

export function isLegalOnboardingTransition(
  from: OnboardingStatus,
  to: OnboardingStatus,
): boolean {
  return ONBOARDING_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Entities in this status may transact (Broker upload / Machinery Company approval). */
export const TRANSACTABLE_ONBOARDING_STATUS = OnboardingStatus.APPROVED;
