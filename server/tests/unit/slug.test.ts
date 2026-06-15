import { describe, it, expect } from 'vitest';
import { slugify, uniqueSlug } from '../../src/lib/slug';

describe('slugify', () => {
  it('lowercases, trims, and hyphenates', () => {
    expect(slugify('iPhone 15 Pro Max')).toBe('iphone-15-pro-max');
  });

  it('strips punctuation and quotes', () => {
    expect(slugify("Sony's WH-1000XM5!")).toBe('sonys-wh-1000xm5');
  });

  it('collapses repeated separators and trims dashes', () => {
    expect(slugify('  Hello   --  World  ')).toBe('hello-world');
  });

  it('strips diacritics', () => {
    expect(slugify('Crème Brûlée')).toBe('creme-brulee');
  });
});

describe('uniqueSlug', () => {
  it('returns the base slug when free', async () => {
    const out = await uniqueSlug('My Product', async () => null);
    expect(out).toBe('my-product');
  });

  it('appends a numeric suffix when taken', async () => {
    const taken = new Set(['my-product', 'my-product-2']);
    const out = await uniqueSlug('My Product', async (s) => (taken.has(s) ? 'someId' : null));
    expect(out).toBe('my-product-3');
  });

  it('keeps the slug for the same owner on update', async () => {
    const out = await uniqueSlug('My Product', async (s) => (s === 'my-product' ? 'self' : null), 'self');
    expect(out).toBe('my-product');
  });
});
