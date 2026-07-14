import { InvoiceStatus, isLegalInvoiceTransition, INVOICE_TRANSITIONS } from '@fueled-capital/shared';

const ALL_STATUSES = Object.values(InvoiceStatus);

describe('invoice lifecycle state machine', () => {
  it('every state referenced in the transition table is a real InvoiceStatus', () => {
    for (const status of Object.keys(INVOICE_TRANSITIONS)) {
      expect(ALL_STATUSES).toContain(status);
    }
  });

  it('exhaustively rejects every pair not explicitly listed as legal', () => {
    for (const from of ALL_STATUSES) {
      for (const to of ALL_STATUSES) {
        const expected = INVOICE_TRANSITIONS[from]?.includes(to) ?? false;
        expect(isLegalInvoiceTransition(from, to)).toBe(expected);
      }
    }
  });

  it('the happy path is fully connected: UPLOADED through SETTLED', () => {
    const happyPath = [
      InvoiceStatus.DRAFT,
      InvoiceStatus.UPLOADED,
      InvoiceStatus.EXTRACTING,
      InvoiceStatus.PENDING_BROKER_REVIEW,
      InvoiceStatus.PENDING_MC_APPROVAL,
      InvoiceStatus.PENDING_UNDERWRITING,
      InvoiceStatus.APPROVED_FOR_FUNDING,
      InvoiceStatus.FUNDED,
      InvoiceStatus.SETTLED,
    ];
    for (let i = 0; i < happyPath.length - 1; i++) {
      expect(isLegalInvoiceTransition(happyPath[i], happyPath[i + 1])).toBe(true);
    }
  });

  it('terminal states have no outgoing transitions, except CHARGED_BACK which may lead to WRITTEN_OFF', () => {
    const terminal = [InvoiceStatus.REJECTED, InvoiceStatus.SETTLED, InvoiceStatus.WRITTEN_OFF, InvoiceStatus.CANCELLED];
    for (const status of terminal) {
      expect(INVOICE_TRANSITIONS[status]).toHaveLength(0);
    }
    expect(INVOICE_TRANSITIONS[InvoiceStatus.CHARGED_BACK]).toEqual([InvoiceStatus.WRITTEN_OFF]);
  });

  it('never allows skipping the mandatory human review step after extraction', () => {
    // Extraction must always land on PENDING_BROKER_REVIEW, never straight to MC approval.
    expect(isLegalInvoiceTransition(InvoiceStatus.EXTRACTING, InvoiceStatus.PENDING_MC_APPROVAL)).toBe(false);
    expect(isLegalInvoiceTransition(InvoiceStatus.EXTRACTING, InvoiceStatus.PENDING_BROKER_REVIEW)).toBe(true);
  });

  it('cannot fund an invoice that has not been approved for funding', () => {
    for (const from of ALL_STATUSES) {
      if (from === InvoiceStatus.APPROVED_FOR_FUNDING) continue;
      expect(isLegalInvoiceTransition(from, InvoiceStatus.FUNDED)).toBe(false);
    }
  });

  it('cannot settle an invoice that is not currently funded', () => {
    for (const from of ALL_STATUSES) {
      if (from === InvoiceStatus.FUNDED) continue;
      expect(isLegalInvoiceTransition(from, InvoiceStatus.SETTLED)).toBe(false);
    }
  });
});
