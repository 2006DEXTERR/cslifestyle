/**
 * Presenters: map normalised Prisma rows → the existing frontend shapes
 * (`lib/types.ts` Product/Category/Brand) so the preserved UI components render
 * unchanged. The returned objects are a SUPERSET — they also carry the raw admin
 * fields (asin, categoryId, isPublished, seoTitle, …) which the public components
 * simply ignore but the admin panel uses for editing. See ADR-018.
 */
import type { Prisma, Product, Category, Brand, ProductImage } from '@prisma/client';

type Decimalish = Prisma.Decimal | number | null | undefined;

function toNum(d: Decimalish): number | undefined {
  if (d === null || d === undefined) return undefined;
  return typeof d === 'number' ? d : Number(d);
}

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? (v.filter((x) => typeof x === 'string') as string[]) : [];
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

export type ProductRow = Product & {
  category?: Category | null;
  brand?: Brand | null;
  images?: ProductImage[];
};

export interface PresentedProduct {
  // ── frontend (lib/types Product) ──
  id: string;
  slug: string;
  name: string;
  brand: string;
  brandSlug: string;
  category: string;
  categorySlug: string;
  image: string;
  images: string[];
  rating: number;
  reviewCount: number;
  currentPrice: number;
  originalPrice?: number;
  discount?: number;
  availability: string;
  highlights: string[];
  pros: string[];
  cons: string[];
  features: Record<string, unknown>;
  description: string;
  specifications: Record<string, unknown>;
  faqs: { question: string; answer: string }[];
  affiliateUrl: string;
  trending: boolean;
  editorsPick: boolean;
  deal?: { expiresIn: string; savings: number };
  // ── admin/raw extras (ignored by public components) ──
  asin: string;
  title: string;
  shortDescription: string;
  categoryId: string;
  brandId: string | null;
  discountPercent: number | null;
  currency: string;
  seoTitle: string | null;
  metaDescription: string | null;
  isPublished: boolean;
  gallery: string[];
  createdAt: string;
  updatedAt: string;
}

export function presentProduct(p: ProductRow): PresentedProduct {
  const gallery = asStringArray(p.gallery);
  const imageUrls =
    p.images && p.images.length > 0
      ? [...p.images].sort((a, b) => a.sortOrder - b.sortOrder).map((i) => i.imageUrl)
      : gallery.length > 0
        ? gallery
        : p.image
          ? [p.image]
          : [];

  const faqs = Array.isArray(p.faqs)
    ? (p.faqs as { question: string; answer: string }[])
    : [];

  return {
    id: p.id,
    slug: p.slug,
    name: p.title,
    brand: p.brand?.name ?? '',
    brandSlug: p.brand?.slug ?? '',
    category: p.category?.name ?? '',
    categorySlug: p.category?.slug ?? '',
    image: p.image ?? imageUrls[0] ?? '',
    images: imageUrls,
    rating: p.rating,
    reviewCount: p.reviewCount,
    currentPrice: toNum(p.currentPrice) ?? 0,
    originalPrice: toNum(p.originalPrice),
    discount: p.discountPercent ?? undefined,
    availability: p.availability,
    highlights: asStringArray(p.highlights),
    pros: asStringArray(p.pros),
    cons: asStringArray(p.cons),
    features: asRecord(p.features),
    description: p.description ?? '',
    specifications: asRecord(p.specifications),
    faqs,
    affiliateUrl: p.affiliateUrl ?? '',
    trending: p.isTrending,
    editorsPick: p.isEditorsPick,
    deal: p.dealExpiresIn
      ? { expiresIn: p.dealExpiresIn, savings: p.dealSavings ?? 0 }
      : undefined,
    // admin extras
    asin: p.asin,
    title: p.title,
    shortDescription: p.shortDescription ?? '',
    categoryId: p.categoryId,
    brandId: p.brandId,
    discountPercent: p.discountPercent,
    currency: p.currency,
    seoTitle: p.seoTitle,
    metaDescription: p.metaDescription,
    isPublished: p.isPublished,
    gallery,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export type CategoryRow = Category & { _count?: { products: number } };

export interface PresentedCategory {
  id: string;
  slug: string;
  name: string;
  description: string;
  image: string;
  icon: string;
  productCount: number;
  subcategories: string[];
  // admin extras
  parentId: string | null;
  seoTitle: string | null;
  metaDescription: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export function presentCategory(c: CategoryRow, productCount?: number): PresentedCategory {
  return {
    id: c.id,
    slug: c.slug,
    name: c.name,
    description: c.description ?? '',
    image: c.image ?? '',
    icon: c.icon ?? '',
    productCount: productCount ?? c._count?.products ?? 0,
    subcategories: asStringArray(c.subcategories),
    parentId: c.parentId,
    seoTitle: c.seoTitle,
    metaDescription: c.metaDescription,
    isActive: c.isActive,
    sortOrder: c.sortOrder,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

export type BrandRow = Brand & { _count?: { products: number } };

export interface PresentedBrand {
  id: string;
  slug: string;
  name: string;
  logo: string;
  description: string;
  productCount: number;
  rating: number;
  // admin extras
  website: string | null;
  seoTitle: string | null;
  metaDescription: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function presentBrand(b: BrandRow, productCount?: number): PresentedBrand {
  return {
    id: b.id,
    slug: b.slug,
    name: b.name,
    logo: b.logo ?? '',
    description: b.description ?? '',
    productCount: productCount ?? b._count?.products ?? 0,
    rating: b.rating,
    website: b.website,
    seoTitle: b.seoTitle,
    metaDescription: b.metaDescription,
    isActive: b.isActive,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  };
}
