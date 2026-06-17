import { describe, it, expect } from 'vitest';
import {
  isValidAsin,
  isFakeAsin,
  isRealAsin,
  isPlaceholderAffiliateUrl,
  isPlaceholderImage,
  resolveAffiliateUrl,
  productDataWarnings,
} from '../../src/lib/affiliate';

/** Phase 13 data-integrity helpers: fake-ASIN / placeholder detection + affiliate URL generation. */
describe('affiliate data validators', () => {
  it('flags seed/placeholder ASINs that pass the shape check', () => {
    expect(isValidAsin('B0SEED0001')).toBe(true); // right shape…
    expect(isFakeAsin('B0SEED0001')).toBe(true); // …but fake
    expect(isRealAsin('B0SEED0001')).toBe(false);
    expect(isFakeAsin('B0CHX1W1XY')).toBe(false);
    expect(isRealAsin('B0CHX1W1XY')).toBe(true);
  });

  it('treats malformed/empty ASINs as fake', () => {
    expect(isFakeAsin('')).toBe(true);
    expect(isFakeAsin('short')).toBe(true);
    expect(isFakeAsin('b0chx1w1xy')).toBe(false); // normalised to upper
  });

  it('detects placeholder affiliate URLs', () => {
    expect(isPlaceholderAffiliateUrl('https://amazon.in/dp/example')).toBe(true);
    expect(isPlaceholderAffiliateUrl('')).toBe(true);
    expect(isPlaceholderAffiliateUrl(null)).toBe(true);
    expect(isPlaceholderAffiliateUrl('https://www.amazon.in/dp/B0CHX1W1XY?tag=cslifestyle-21')).toBe(false);
    expect(isPlaceholderAffiliateUrl('https://example.com/foo')).toBe(false); // non-amazon link is allowed
  });

  it('detects stock / empty / non-URL images', () => {
    expect(isPlaceholderImage('https://images.pexels.com/photos/1/x.jpg')).toBe(true);
    expect(isPlaceholderImage('')).toBe(true);
    expect(isPlaceholderImage(null)).toBe(true);
    expect(isPlaceholderImage('NEEDS_IMAGE')).toBe(true); // template sentinel
    expect(isPlaceholderImage('product.jpg')).toBe(true); // bare filename, not a URL
    expect(isPlaceholderImage('https://m.media-amazon.com/images/I/81abc.jpg')).toBe(false);
    expect(isPlaceholderImage('http://cdn.example.org/p.jpg')).toBe(false);
  });

  it('generates the canonical amazon.in URL from a real ASIN', () => {
    const url = resolveAffiliateUrl('B0CHX1W1XY', null, { tag: 'cslifestyle-21', domain: 'amazon.in' });
    expect(url).toContain('https://www.amazon.in/dp/B0CHX1W1XY');
    expect(url).toContain('tag=cslifestyle-21');
  });

  it('returns no URL for a fake ASIN and ignores placeholder stored URLs', () => {
    expect(resolveAffiliateUrl('B0SEED0001', 'https://amazon.in/dp/example', { tag: 't', domain: 'amazon.in' })).toBe('');
  });

  it('honours a real stored URL when the ASIN is not real', () => {
    const stored = 'https://www.flipkart.com/item/p/abc';
    expect(resolveAffiliateUrl('B0SEED0001', stored, { tag: 't', domain: 'amazon.in' })).toBe(stored);
  });

  it('surfaces admin warnings for placeholder product data', () => {
    const warnings = productDataWarnings({
      asin: 'B0SEED0001',
      image: 'https://images.pexels.com/x.jpg',
      affiliateUrl: 'https://amazon.in/dp/example',
    });
    const fields = warnings.map((w) => w.field).sort();
    expect(fields).toEqual(['affiliateUrl', 'asin', 'image']);
  });

  it('returns no warnings for clean data', () => {
    const warnings = productDataWarnings({
      asin: 'B0CHX1W1XY',
      image: 'https://m.media-amazon.com/images/I/81abc.jpg',
      affiliateUrl: '',
    });
    expect(warnings).toEqual([]);
  });
});
