import { describe, it, expect } from 'vitest';
import { presentComparison, type ComparisonRow } from '../../src/services/content/presenters';

const baseComparison = {
  id: 'c1', slug: 'x-vs-y', title: 'X vs Y', excerpt: null, summary: null, prosCons: null,
  productAId: 'a', productBId: 'b', productA: null, productB: null,
  verdict: null, winner: null, seoTitle: null, metaDescription: null,
  status: 'published', publishedAt: null, createdAt: new Date(), updatedAt: new Date(),
  editorSummary: null, whoShouldBuyA: null, whoShouldBuyB: null, bestFor: null,
  bestAlternativeIds: null, faq: null, comparisonNotes: null, lastReviewedBy: null,
  reviewStatus: 'draft', featured: false, stickyCta: true, comparisonScoreA: null, comparisonScoreB: null,
};

const spec = (o: Record<string, unknown>) => ({
  id: 's', comparisonId: 'c1', specName: '', productAValue: null, productBValue: null,
  winner: null, details: null, position: 0, specGroup: null, subgroup: null,
  displayType: 'text', valueType: 'string', winnerMode: 'manual', unit: null,
  numberValueA: null, numberValueB: null, booleanValueA: null, booleanValueB: null,
  jsonValueA: null, jsonValueB: null, ...o,
});

const row = (specs: Record<string, unknown>[]): ComparisonRow =>
  ({ ...baseComparison, specs: specs.map(spec) }) as unknown as ComparisonRow;

describe('presentComparison — typed values, winner engine, grouping', () => {
  it('resolves numeric winners via the engine (higher/lower better)', () => {
    const c = presentComparison(row([
      { specName: 'Battery', specGroup: 'Battery', winnerMode: 'higher_better', numberValueA: 5000, numberValueB: 4000, position: 0 },
      { specName: 'Weight', specGroup: 'Build', winnerMode: 'lower_better', numberValueA: 180, numberValueB: 200, position: 1 },
    ]));
    expect(c.categories[0].winner).toBe('A'); // bigger battery
    expect(c.categories[1].winner).toBe('A'); // lighter weight
    expect(c.insights.specWins.a).toBe(2);
  });

  it('groups specs by group in canonical order and defaults missing group to General', () => {
    const c = presentComparison(row([
      { specName: 'OS', winnerMode: 'manual', position: 0 }, // no group → General
      { specName: 'Battery', specGroup: 'Battery', position: 1 },
      { specName: 'Weight', specGroup: 'Build', position: 2 },
    ]));
    expect(c.specGroups.map((g) => g.group)).toEqual(['General', 'Battery', 'Build']);
    expect(c.categories.length).toBe(3);
  });

  it('exposes typed fields + rich content defaults without inventing data', () => {
    const c = presentComparison(row([
      { specName: '5G', displayType: 'boolean', valueType: 'boolean', booleanValueA: true, booleanValueB: false, position: 0 },
    ]));
    expect(c.categories[0].displayType).toBe('boolean');
    expect(c.categories[0].booleanValueA).toBe(true);
    expect(c.faq).toEqual([]);
    expect(c.featured).toBe(false);
    expect(c.reviewStatus).toBe('draft');
    expect(c.stickyCta).toBe(true);
    expect(c.bestAlternativeIds).toEqual([]);
  });
});
