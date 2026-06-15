import { describe, it, expect } from 'vitest';
import {
  presentAuthor,
  presentAuthorLight,
  presentGuide,
  presentComparison,
} from '../../src/services/content/presenters';
import type { GuideRow, ComparisonRow } from '../../src/services/content/presenters';
import type { Author } from '@prisma/client';

const author = {
  id: 'a1',
  slug: 'priya-sharma',
  name: 'Priya Sharma',
  avatarUrl: 'https://img/avatar.jpg',
  bio: 'Senior editor',
  credentials: '8 years',
  expertise: ['Smartphones', 'Wearables'],
  socialLinks: { twitter: 'priya', linkedin: 'priya' },
  seoTitle: null,
  metaDescription: null,
  isActive: true,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-02T00:00:00Z'),
} as unknown as Author;

const product = {
  id: 'p1',
  slug: 'iphone-15-pro-max',
  asin: 'B0X',
  categoryId: 'c1',
  brandId: 'b1',
  title: 'iPhone 15 Pro Max',
  shortDescription: '',
  description: '',
  image: 'main.jpg',
  gallery: [],
  rating: 4.8,
  reviewCount: 2847,
  currentPrice: 134900,
  originalPrice: null,
  discountPercent: null,
  currency: 'INR',
  availability: 'In Stock',
  affiliateUrl: '',
  seoTitle: null,
  metaDescription: null,
  isPublished: true,
  isTrending: false,
  isEditorsPick: false,
  dealExpiresIn: null,
  dealSavings: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  category: { id: 'c1', slug: 'smartphones', name: 'Smartphones' },
  brand: { id: 'b1', slug: 'apple', name: 'Apple' },
  images: [],
};

describe('presentAuthor', () => {
  it('maps DB columns to the frontend Author shape', () => {
    const a = presentAuthorLight(author);
    expect(a.name).toBe('Priya Sharma');
    expect(a.avatar).toBe('https://img/avatar.jpg');
    expect(a.expertise).toEqual(['Smartphones', 'Wearables']);
    expect(a.social).toEqual({ twitter: 'priya', linkedin: 'priya' });
    expect(a.guides).toEqual([]);
    expect(a.comparisons).toEqual([]);
  });

  it('fills articlesCount and guides when provided', () => {
    const a = presentAuthor(author, { articlesCount: 5, guides: [] });
    expect(a.articlesCount).toBe(5);
  });
});

describe('presentGuide', () => {
  const guide = {
    id: 'g1',
    slug: 'best-smartphones',
    title: 'Best Smartphones',
    excerpt: 'excerpt',
    content: 'content',
    coverImage: 'cover.jpg',
    categoryId: 'c1',
    authorId: 'a1',
    readingTime: 12,
    tableOfContents: [{ title: 'Intro', id: 'intro' }],
    faqItems: [{ question: 'q', answer: 'a' }],
    tags: ['budget', 'phones'],
    seoTitle: null,
    metaDescription: null,
    status: 'published',
    publishedAt: new Date('2024-01-15T00:00:00Z'),
    createdAt: new Date('2024-01-10T00:00:00Z'),
    updatedAt: new Date('2024-01-16T00:00:00Z'),
    category: { name: 'Smartphones', slug: 'smartphones' },
    author,
    products: [
      { guideId: 'g1', productId: 'p1', position: 1, reason: 'runner up', isTopPick: false, product },
      { guideId: 'g1', productId: 'p2', position: 0, reason: 'best overall', isTopPick: true, product: { ...product, id: 'p2', slug: 'oneplus-12', title: 'OnePlus 12' } },
    ],
  } as unknown as GuideRow;

  it('maps fields, derives lastUpdated, and orders product picks by position', () => {
    const g = presentGuide(guide);
    expect(g.title).toBe('Best Smartphones');
    expect(g.category).toBe('Smartphones');
    expect(g.categorySlug).toBe('smartphones');
    expect(g.lastUpdated).toBe('2024-01-15');
    expect(g.tags).toEqual(['budget', 'phones']);
    expect(g.author?.name).toBe('Priya Sharma');
    // ordered by position: p2 (0) then p1 (1)
    expect(g.productRecommendations.map((r) => r.product.id)).toEqual(['p2', 'p1']);
    expect(g.productRecommendations[0]).toMatchObject({ reason: 'best overall', isTopPick: true });
    expect(g.tableOfContents).toEqual([{ title: 'Intro', id: 'intro' }]);
  });
});

describe('presentComparison', () => {
  const comparison = {
    id: 'cmp1',
    slug: 'iphone-vs-samsung',
    title: 'iPhone vs Samsung',
    excerpt: 'excerpt',
    summary: 'both great',
    prosCons: { productA: { pros: ['camera'], cons: ['price'] }, productB: { pros: ['display'], cons: ['bulky'] } },
    productAId: 'p1',
    productBId: 'p2',
    verdict: 'pick your ecosystem',
    winner: 'tie',
    seoTitle: null,
    metaDescription: null,
    status: 'published',
    publishedAt: new Date('2024-01-20T00:00:00Z'),
    createdAt: new Date(),
    updatedAt: new Date(),
    productA: product,
    productB: { ...product, id: 'p2', slug: 'galaxy-s24', title: 'Galaxy S24 Ultra' },
    specs: [
      { id: 's2', comparisonId: 'cmp1', specName: 'Camera', productAValue: 'Best video', productBValue: 'Best zoom', winner: 'tie', details: 'both strong', position: 1 },
      { id: 's1', comparisonId: 'cmp1', specName: 'Display', productAValue: 'Great', productBValue: 'Brighter', winner: 'B', details: 'samsung wins', position: 0 },
    ],
  } as unknown as ComparisonRow;

  it('maps products, normalises prosCons, and orders specs into categories', () => {
    const c = presentComparison(comparison);
    expect(c.productA?.name).toBe('iPhone 15 Pro Max');
    expect(c.productB?.name).toBe('Galaxy S24 Ultra');
    expect(c.winner).toBe('tie');
    expect(c.prosCons.productA).toEqual({ pros: ['camera'], cons: ['price'] });
    // specs ordered by position → Display (0) then Camera (1)
    expect(c.categories.map((s) => s.name)).toEqual(['Display', 'Camera']);
    expect(c.categories[0]).toMatchObject({ winner: 'B', productA: 'Great', productB: 'Brighter', details: 'samsung wins' });
  });
});
