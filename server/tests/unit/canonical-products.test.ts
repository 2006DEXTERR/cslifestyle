import { describe, it, expect } from 'vitest';
import { CANONICAL_PRODUCTS } from '../../prisma/canonical-products';
import { isFakeAsin } from '../../src/lib/affiliate';

// The canonical loader reads server/my-products.csv — the single source of truth the
// seed applies so a reseed can never restore old names/ASINs. These assertions lock in
// that the owner's latest values are what gets synced.
describe('canonical product loader (my-products.csv)', () => {
  it('exposes the updated names, not the old lib/data mock names', () => {
    expect(CANONICAL_PRODUCTS['iphone-15-pro-max']?.name).toBe('iPhone 17 Pro Max');
    expect(CANONICAL_PRODUCTS['samsung-galaxy-s24-ultra']?.name).toBe('Samsung Galaxy S26 Ultra');
    expect(CANONICAL_PRODUCTS['oneplus-12']?.name).toBe('OnePlus 15');
  });

  it('carries real ASINs (never the B0SEED placeholders)', () => {
    for (const slug of Object.keys(CANONICAL_PRODUCTS)) {
      const asin = CANONICAL_PRODUCTS[slug].asin;
      if (asin) expect(isFakeAsin(asin), `${slug} asin ${asin}`).toBe(false);
    }
    expect(CANONICAL_PRODUCTS['iphone-15-pro-max']?.asin).toBe('B0FQFW4MVJ');
  });

  it('only ever exposes explicit canonical fields (slug/name/asin/image) — nothing invented', () => {
    const entry = CANONICAL_PRODUCTS['iphone-15-pro-max'];
    expect(entry).toBeTruthy();
    expect(Object.keys(entry).sort()).toEqual(['asin', 'image', 'name', 'slug']);
    // No price / description / specs leak into the canonical source.
    expect('currentPrice' in entry).toBe(false);
  });
});
