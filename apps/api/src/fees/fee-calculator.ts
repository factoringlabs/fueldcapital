import { Prisma } from '@prisma/client';

export interface FeeTierBand {
  id: string;
  gallonsFrom: Prisma.Decimal;
  gallonsTo: Prisma.Decimal | null;
  feePct: Prisma.Decimal;
}

export interface FeeCalculatorInput {
  gallons: Prisma.Decimal | number | string;
  invoiceDollarVolume: Prisma.Decimal | number | string;
  tiers: FeeTierBand[];
  minimumMonthlyFee: Prisma.Decimal | number | string;
  advancePct: Prisma.Decimal | number | string;
}

export interface FeeCalculatorResult {
  tier: FeeTierBand | null;
  feePct: Prisma.Decimal;
  invoiceDollarVolume: Prisma.Decimal;
  calculatedFee: Prisma.Decimal;
  minimumFeeShortfallApplied: boolean;
  estimatedFee: Prisma.Decimal;
  estimatedAdvance: Prisma.Decimal;
  estimatedReserve: Prisma.Decimal;
}

/**
 * Gallons pick the tier; the fee % from that tier is applied to the dollar
 * volume — per the brief, gallon bands and dollar fees are deliberately
 * different axes. Pure function (no DB/DI) so it can be unit-tested directly
 * and reused by both the live preview endpoint and the monthly accrual run.
 */
export function findTierForGallons(tiers: FeeTierBand[], gallons: Prisma.Decimal): FeeTierBand | null {
  return (
    tiers.find(
      (tier) => gallons.greaterThanOrEqualTo(tier.gallonsFrom) && (tier.gallonsTo === null || gallons.lessThan(tier.gallonsTo)),
    ) ?? null
  );
}

export function calculateFee(input: FeeCalculatorInput): FeeCalculatorResult {
  const gallons = new Prisma.Decimal(input.gallons);
  const invoiceDollarVolume = new Prisma.Decimal(input.invoiceDollarVolume);
  const minimumMonthlyFee = new Prisma.Decimal(input.minimumMonthlyFee);
  const advancePct = new Prisma.Decimal(input.advancePct);

  const tier = findTierForGallons(input.tiers, gallons);
  const feePct = tier ? tier.feePct : new Prisma.Decimal(0);
  const calculatedFee = invoiceDollarVolume.mul(feePct).div(100);
  const minimumFeeShortfallApplied = calculatedFee.lessThan(minimumMonthlyFee);
  const estimatedFee = minimumFeeShortfallApplied ? minimumMonthlyFee : calculatedFee;

  const estimatedAdvance = invoiceDollarVolume.mul(advancePct).div(100);
  const estimatedReserve = invoiceDollarVolume.sub(estimatedAdvance);

  return {
    tier,
    feePct,
    invoiceDollarVolume,
    calculatedFee,
    minimumFeeShortfallApplied,
    estimatedFee,
    estimatedAdvance,
    estimatedReserve,
  };
}
