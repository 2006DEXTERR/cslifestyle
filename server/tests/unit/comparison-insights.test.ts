import { describe, it, expect } from 'vitest';
import { computeComparisonInsights, type ComparisonRow } from '../../src/services/content/presenters';

// Build a minimal ComparisonRow — computeComparisonInsights only reads product
// price/rating/reviewCount and each spec's `winner`.
const row = (
  a: { currentPrice?: number | null; rating?: number | null; reviewCount?: number | null } | null,
  b: { currentPrice?: number | null; rating?: number | null; reviewCount?: number | null } | null,
  winners: string[] = [],
): ComparisonRow =>
  ({
    productA: a,
    productB: b,
    specs: winners.map((w, i) => ({ winner: w, position: i })),
  }) as unknown as ComparisonRow;

describe('computeComparisonInsights (real fields only)', () => {
  it('bestPrice picks the lower current price, null when equal or missing', () => {
    expect(computeComparisonInsights(row({ currentPrice: 100 }, { currentPrice: 200 })).bestPrice).toBe('A');
    expect(computeComparisonInsights(row({ currentPrice: 300 }, { currentPrice: 200 })).bestPrice).toBe('B');
    expect(computeComparisonInsights(row({ currentPrice: 200 }, { currentPrice: 200 })).bestPrice).toBeNull();
    expect(computeComparisonInsights(row({ currentPrice: null }, { currentPrice: 200 })).bestPrice).toBeNull();
  });

  it('higherRated / moreReviewed pick the larger value', () => {
    const r = computeComparisonInsights(row({ rating: 4.5, reviewCount: 100 }, { rating: 4.0, reviewCount: 500 }));
    expect(r.higherRated).toBe('A');
    expect(r.moreReviewed).toBe('B');
  });

  it('never invents a winner when a field is missing', () => {
    const r = computeComparisonInsights(row({ rating: null }, { rating: 4.2 }));
    expect(r.higherRated).toBeNull();
  });

  it('tallies per-spec winners', () => {
    const r = computeComparisonInsights(row({}, {}, ['A', 'A', 'B', 'tie', 'A']));
    expect(r.specWins).toEqual({ a: 3, b: 1, tie: 1 });
  });

  it('computes absolute price difference (null when a price is missing)', () => {
    expect(computeComparisonInsights(row({ currentPrice: 250 }, { currentPrice: 100 })).priceDiff).toBe(150);
    expect(computeComparisonInsights(row({ currentPrice: null }, { currentPrice: 100 })).priceDiff).toBeNull();
  });
});
