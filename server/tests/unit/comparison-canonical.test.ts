import { describe, it, expect } from 'vitest';
import { deriveComparisonTitle, replaceProductNames } from '../../src/lib/comparison-canonical';

describe('deriveComparisonTitle', () => {
  it('rebuilds "A vs B" from canonical names, dropping stale names', () => {
    expect(deriveComparisonTitle('iPhone 15 Pro Max vs Samsung Galaxy S24 Ultra', 'iPhone 17 Pro Max', 'Samsung Galaxy S26 Ultra'))
      .toBe('iPhone 17 Pro Max vs Samsung Galaxy S26 Ultra');
  });
  it('preserves an editorial ": tagline"', () => {
    expect(deriveComparisonTitle('MacBook Pro 14" vs Dell XPS 15: Which Pro Laptop Wins?', 'MacBook Pro', 'Dell Vostro 3530'))
      .toBe('MacBook Pro vs Dell Vostro 3530: Which Pro Laptop Wins?');
  });
});

describe('replaceProductNames', () => {
  it('swaps exact old full names only, longest-first', () => {
    const pairs: Array<[string, string]> = [['iPhone 15 Pro Max', 'iPhone 17 Pro Max']];
    expect(replaceProductNames('the iPhone 15 Pro Max is great', pairs)).toBe('the iPhone 17 Pro Max is great');
  });
  it('never touches short forms (avoids inventing editorial claims)', () => {
    const pairs: Array<[string, string]> = [['Samsung Galaxy S24 Ultra', 'Samsung Galaxy S26 Ultra']];
    // "S24 Ultra" is a short form, not the full name — left untouched.
    expect(replaceProductNames('go with the S24 Ultra', pairs)).toBe('go with the S24 Ultra');
  });
  it('returns null for null input and ignores no-op pairs', () => {
    expect(replaceProductNames(null, [['a', 'b']])).toBeNull();
    expect(replaceProductNames('unchanged', [['x', 'x']])).toBe('unchanged');
  });
});
