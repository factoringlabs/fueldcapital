import {
  OnboardingStatus,
  ONBOARDING_TRANSITIONS,
  isLegalOnboardingTransition,
  TRANSACTABLE_ONBOARDING_STATUS,
} from '@fueled-capital/shared';

const ALL_STATUSES = Object.values(OnboardingStatus);

describe('onboarding state machine', () => {
  it('exhaustively rejects every pair not explicitly listed as legal', () => {
    for (const from of ALL_STATUSES) {
      for (const to of ALL_STATUSES) {
        const expected = ONBOARDING_TRANSITIONS[from]?.includes(to) ?? false;
        expect(isLegalOnboardingTransition(from, to)).toBe(expected);
      }
    }
  });

  it('the standard path is fully connected: invited through approved', () => {
    expect(isLegalOnboardingTransition(OnboardingStatus.INVITED, OnboardingStatus.DOCS_SUBMITTED)).toBe(true);
    expect(isLegalOnboardingTransition(OnboardingStatus.DOCS_SUBMITTED, OnboardingStatus.UNDER_REVIEW)).toBe(true);
    expect(isLegalOnboardingTransition(OnboardingStatus.UNDER_REVIEW, OnboardingStatus.APPROVED)).toBe(true);
  });

  it('supports the request-more-info loop and rejection-then-resubmit loop', () => {
    expect(isLegalOnboardingTransition(OnboardingStatus.UNDER_REVIEW, OnboardingStatus.DOCS_SUBMITTED)).toBe(true);
    expect(isLegalOnboardingTransition(OnboardingStatus.REJECTED, OnboardingStatus.DOCS_SUBMITTED)).toBe(true);
  });

  it('supports suspending and reinstating an approved account', () => {
    expect(isLegalOnboardingTransition(OnboardingStatus.APPROVED, OnboardingStatus.SUSPENDED)).toBe(true);
    expect(isLegalOnboardingTransition(OnboardingStatus.SUSPENDED, OnboardingStatus.APPROVED)).toBe(true);
  });

  it('cannot jump straight from invited to approved, skipping review', () => {
    expect(isLegalOnboardingTransition(OnboardingStatus.INVITED, OnboardingStatus.APPROVED)).toBe(false);
  });

  it('only APPROVED is transactable', () => {
    expect(TRANSACTABLE_ONBOARDING_STATUS).toBe(OnboardingStatus.APPROVED);
  });
});
