import { describe, it, expect } from 'vitest';
import {
  tokenize,
  singularize,
  expandQueryTokens,
  relevanceScore,
  rankBySearch,
  likeFragments,
  type SearchDoc,
} from '../../src/lib/search';

// A representative slice of the catalog: laptops are model-named (no "laptop" in the
// title) but live in the "Laptops" category; audio products contain "headphone".
const CATALOG: (SearchDoc & { id: string; reviews: number })[] = [
  { id: 'l1', title: 'Acer Aspire 3', category: 'Laptops', brand: 'Acer', reviews: 120 },
  { id: 'l2', title: 'Lenovo IdeaPad Slim 3', category: 'Laptops', brand: 'Lenovo', reviews: 90 },
  { id: 'l3', title: 'HP Pavilion 14', category: 'Laptops', brand: 'HP', reviews: 60 },
  { id: 'l4', title: 'ASUS ROG Gaming Laptop', category: 'Laptops', brand: 'ASUS', reviews: 200 },
  { id: 'p1', title: 'Nothing Phone 2a', category: 'Smartphones', brand: 'Nothing', reviews: 300 },
  { id: 'p2', title: 'Redmi 13C', category: 'Smartphones', brand: 'Redmi', reviews: 150 },
  { id: 'h1', title: 'boAt Rockerz 255 Headphone', category: 'Earbuds', brand: 'boAt', reviews: 500 },
  { id: 'h2', title: 'Sony WH-1000XM5 Headphones', category: 'Earbuds', brand: 'Sony', reviews: 400 },
];

const rank = (q: string) =>
  rankBySearch(q, CATALOG, (d) => d, (a, b) => b.reviews - a.reviews).map((d) => d.id);

describe('tokenize / singularize', () => {
  it('drops punctuation, stopwords and 1-char noise', () => {
    expect(tokenize('The Best 4K-TV, for the price!')).toEqual(['4k', 'tv', 'price']);
  });
  it('folds simple plurals', () => {
    expect(singularize('laptops')).toBe('laptop');
    expect(singularize('watches')).toBe('watch');
    expect(singularize('batteries')).toBe('battery');
    expect(singularize('glass')).toBe('glass'); // -ss not stripped
  });
  it('expands safe synonyms for recall', () => {
    expect(expandQueryTokens(['phone'])).toEqual(expect.arrayContaining(['phone', 'smartphone']));
    expect(likeFragments('tv')).toEqual(expect.arrayContaining(['tv', 'television']));
  });
});

describe('relevanceScore — word boundaries', () => {
  it('"phone" matches "Nothing Phone" but NOT "Headphone"', () => {
    expect(relevanceScore('phone', { title: 'Nothing Phone 2a', category: 'Smartphones' })).toBeGreaterThan(0);
    expect(relevanceScore('phone', { title: 'boAt Rockerz 255 Headphone', category: 'Earbuds' })).toBe(0);
  });
  it('exact title beats partial/category matches', () => {
    const exact = relevanceScore('Acer Aspire 3', { title: 'Acer Aspire 3', category: 'Laptops' });
    const tokenOnly = relevanceScore('aspire', { title: 'Acer Aspire 3', category: 'Laptops' });
    expect(exact).toBeGreaterThan(tokenOnly);
  });
});

describe('rankBySearch — storefront scenarios', () => {
  it('"laptop" returns ALL laptop products (via category), none from other categories', () => {
    const ids = rank('laptop');
    expect(ids).toEqual(expect.arrayContaining(['l1', 'l2', 'l3', 'l4']));
    expect(ids).not.toContain('p1');
    expect(ids).not.toContain('h1');
    expect(ids.length).toBe(4);
  });

  it('"laptops" (plural) returns the same laptops', () => {
    expect(new Set(rank('laptops'))).toEqual(new Set(['l1', 'l2', 'l3', 'l4']));
  });

  it('"phone" matches smartphones, never headphones', () => {
    const ids = rank('phone');
    expect(ids).toContain('p1'); // Nothing Phone (title word)
    expect(ids).toContain('p2'); // Redmi (Smartphones category via synonym expansion)
    expect(ids).not.toContain('h1');
    expect(ids).not.toContain('h2');
  });

  it('multi-word "gaming laptop" ranks the gaming laptop first', () => {
    const ids = rank('gaming laptop');
    expect(ids[0]).toBe('l4'); // title has both "gaming" + "laptop"
    expect(ids).toEqual(expect.arrayContaining(['l1', 'l2', 'l3', 'l4']));
  });

  it('empty / stopword-only query returns nothing (caller falls back to browse)', () => {
    expect(rank('')).toEqual([]);
    expect(rank('the best')).toEqual([]);
    expect(relevanceScore('   ', { title: 'Acer Aspire 3' })).toBe(0);
  });

  it('does not emit duplicates and preserves input identity', () => {
    const ids = rank('laptop');
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('ties break by the secondary comparator (popularity)', () => {
    // l1..l3 all match "laptop" only via category (equal score) → ordered by reviews desc.
    const ids = rank('laptop').filter((id) => id !== 'l4'); // l4 also matches title token
    expect(ids).toEqual(['l1', 'l2', 'l3']); // 120, 90, 60
  });
});
