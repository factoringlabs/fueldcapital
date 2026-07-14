import { Prisma } from '@prisma/client';
import { calculateFee, findTierForGallons, FeeTierBand } from './fee-calculator';

const d = (v: number) => new Prisma.Decimal(v);

const TIERS: FeeTierBand[] = [
  { id: 'tier-1', gallonsFrom: d(0), gallonsTo: d(10_000), feePct: d(2.5) },
  { id: 'tier-2', gallonsFrom: d(10_000), gallonsTo: d(50_000), feePct: d(2.0) },
  { id: 'tier-3', gallonsFrom: d(50_000), gallonsTo: null, feePct: d(1.5) },
];

describe('findTierForGallons', () => {
  it('picks the band whose range contains the gallon volume', () => {
    expect(findTierForGallons(TIERS, d(5_000))!.id).toBe('tier-1');
    expect(findTierForGallons(TIERS, d(10_000))!.id).toBe('tier-2'); // boundary is inclusive-from
    expect(findTierForGallons(TIERS, d(49_999))!.id).toBe('tier-2');
    expect(findTierForGallons(TIERS, d(50_000))!.id).toBe('tier-3');
  });

  it('handles the open-ended top band (gallonsTo = null)', () => {
    expect(findTierForGallons(TIERS, d(1_000_000))!.id).toBe('tier-3');
  });

  it('returns null when no band matches (e.g. negative gallons, misconfigured table)', () => {
    expect(findTierForGallons(TIERS, d(-1))).toBeNull();
  });
});

describe('calculateFee', () => {
  const baseInput = { tiers: TIERS, minimumMonthlyFee: 500, advancePct: 95 };

  it('applies the gallon-selected tier fee % to the dollar volume, not the gallon volume', () => {
    const result = calculateFee({ ...baseInput, gallons: 5_000, invoiceDollarVolume: 100_000 });
    expect(result.tier!.id).toBe('tier-1');
    expect(result.feePct.toString()).toBe('2.5');
    expect(result.calculatedFee.toString()).toBe('2500'); // 100,000 * 2.5%
    expect(result.minimumFeeShortfallApplied).toBe(false);
    expect(result.estimatedFee.toString()).toBe('2500');
  });

  it('applies the configurable minimum monthly fee when the calculated fee falls short', () => {
    const result = calculateFee({ ...baseInput, gallons: 5_000, invoiceDollarVolume: 1_000 });
    expect(result.calculatedFee.toString()).toBe('25'); // 1,000 * 2.5%
    expect(result.minimumFeeShortfallApplied).toBe(true);
    expect(result.estimatedFee.toString()).toBe('500');
  });

  it('computes estimated advance/reserve off the configured advance percentage', () => {
    const result = calculateFee({ ...baseInput, gallons: 5_000, invoiceDollarVolume: 100_000 });
    expect(result.estimatedAdvance.toString()).toBe('95000');
    expect(result.estimatedReserve.toString()).toBe('5000');
  });

  it('a higher gallon tier lowers the fee % even at the same dollar volume', () => {
    const lowTier = calculateFee({ ...baseInput, gallons: 5_000, invoiceDollarVolume: 200_000 });
    const highTier = calculateFee({ ...baseInput, gallons: 60_000, invoiceDollarVolume: 200_000 });
    expect(lowTier.feePct.greaterThan(highTier.feePct)).toBe(true);
    expect(lowTier.calculatedFee.greaterThan(highTier.calculatedFee)).toBe(true);
  });
});
