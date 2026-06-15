import { describe, it, expect } from 'vitest';
import { presentProduct, presentCategory, presentBrand } from '../../src/services/catalog/presenters';
import type { ProductRow, CategoryRow, BrandRow } from '../../src/services/catalog/presenters';

const baseProduct = {
  id: 'p1',
  slug: 'iphone-15-pro-max',
  asin: 'B0SEED0001',
  categoryId: 'c1',
  brandId: 'b1',
  title: 'iPhone 15 Pro Max',
  shortDescription: 'short',
  description: 'long description',
  image: 'main.jpg',
  gallery: ['g1.jpg', 'g2.jpg'],
  specifications: { Display: { Size: '6.7' } },
  highlights: ['A17 Pro'],
  features: { Display: '6.7 OLED' },
  pros: ['camera'],
  cons: ['price'],
  faqs: [{ question: 'q', answer: 'a' }],
  rating: 4.8,
  reviewCount: 2847,
  currentPrice: 134900,
  originalPrice: 149900,
  discountPercent: 10,
  currency: 'INR',
  availability: 'In Stock',
  affiliateUrl: 'https://amazon.in/dp/x',
  seoTitle: null,
  metaDescription: null,
  isPublished: true,
  isTrending: true,
  isEditorsPick: false,
  dealExpiresIn: null,
  dealSavings: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-02T00:00:00Z'),
  category: { id: 'c1', slug: 'smartphones', name: 'Smartphones' },
  brand: { id: 'b1', slug: 'apple', name: 'Apple' },
  images: [],
} as unknown as ProductRow;

describe('presentProduct', () => {
  it('maps DB columns to the frontend Product shape', () => {
    const p = presentProduct(baseProduct);
    expect(p.name).toBe('iPhone 15 Pro Max');
    expect(p.brand).toBe('Apple');
    expect(p.brandSlug).toBe('apple');
    expect(p.category).toBe('Smartphones');
    expect(p.categorySlug).toBe('smartphones');
    expect(p.currentPrice).toBe(134900);
    expect(p.discount).toBe(10);
    expect(p.trending).toBe(true);
    expect(p.editorsPick).toBe(false);
    expect(p.faqs).toEqual([{ question: 'q', answer: 'a' }]);
  });

  it('falls back to gallery for images when no ProductImage rows', () => {
    const p = presentProduct(baseProduct);
    expect(p.images).toEqual(['g1.jpg', 'g2.jpg']);
  });

  it('prefers ordered ProductImage rows over gallery', () => {
    const withImages = {
      ...baseProduct,
      images: [
        { id: 'i2', productId: 'p1', imageUrl: 'second.jpg', sortOrder: 1, createdAt: new Date() },
        { id: 'i1', productId: 'p1', imageUrl: 'first.jpg', sortOrder: 0, createdAt: new Date() },
      ],
    } as unknown as ProductRow;
    expect(presentProduct(withImages).images).toEqual(['first.jpg', 'second.jpg']);
  });

  it('exposes a deal object only when a deal is set', () => {
    expect(presentProduct(baseProduct).deal).toBeUndefined();
    const withDeal = { ...baseProduct, dealExpiresIn: '2 days', dealSavings: 15000 } as unknown as ProductRow;
    expect(presentProduct(withDeal).deal).toEqual({ expiresIn: '2 days', savings: 15000 });
  });

  it('carries admin extras for editing', () => {
    const p = presentProduct(baseProduct);
    expect(p.asin).toBe('B0SEED0001');
    expect(p.categoryId).toBe('c1');
    expect(p.isPublished).toBe(true);
  });
});

describe('presentCategory', () => {
  it('maps fields and uses the provided product count', () => {
    const row = {
      id: 'c1',
      slug: 'smartphones',
      name: 'Smartphones',
      description: 'desc',
      image: 'img.jpg',
      icon: 'Smartphone',
      subcategories: ['Budget', 'Flagship'],
      parentId: null,
      seoTitle: null,
      metaDescription: null,
      isActive: true,
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as CategoryRow;
    const c = presentCategory(row, 7);
    expect(c.productCount).toBe(7);
    expect(c.subcategories).toEqual(['Budget', 'Flagship']);
    expect(c.icon).toBe('Smartphone');
  });
});

describe('presentBrand', () => {
  it('maps fields and product count', () => {
    const row = {
      id: 'b1',
      slug: 'apple',
      name: 'Apple',
      logo: '/brands/apple.png',
      description: 'Premium',
      website: null,
      seoTitle: null,
      metaDescription: null,
      rating: 4.8,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as BrandRow;
    const b = presentBrand(row, 12);
    expect(b.name).toBe('Apple');
    expect(b.rating).toBe(4.8);
    expect(b.productCount).toBe(12);
  });
});
