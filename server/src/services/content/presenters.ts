/**
 * Presenters: map normalised Prisma content rows → the existing frontend shapes
 * (`lib/types.ts` BuyingGuide/Comparison/Author) so the preserved UI renders unchanged.
 * Returned objects are a SUPERSET — they also carry raw admin fields (status, authorId,
 * categoryId, seoTitle…) used by the admin panel. See ADR-018/ADR-020.
 */
import type { Author, Guide, Comparison, ComparisonSpec, GuideProduct } from '@prisma/client';
import { presentProduct, type ProductRow, type PresentedProduct } from '../catalog/presenters';

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? (v.filter((x) => typeof x === 'string') as string[]) : [];
}
function asObject(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}
function isoDate(d: Date | null | undefined): string {
  return (d ?? new Date(0)).toISOString().slice(0, 10);
}

// ───────────────────────── Author ─────────────────────────

export interface PresentedAuthor {
  id: string;
  slug: string;
  name: string;
  avatar: string;
  bio: string;
  expertise: string[];
  social: { twitter?: string; linkedin?: string; website?: string };
  articlesCount: number;
  guides: PresentedGuide[];
  comparisons: PresentedComparison[];
  // admin extras
  avatarUrl: string | null;
  credentials: string | null;
  socialLinks: Record<string, unknown>;
  seoTitle: string | null;
  metaDescription: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Lightweight author (no nested guides/comparisons) — used when embedded in a guide. */
export function presentAuthorLight(a: Author): PresentedAuthor {
  const social = asObject(a.socialLinks) as PresentedAuthor['social'];
  return {
    id: a.id,
    slug: a.slug,
    name: a.name,
    avatar: a.avatarUrl ?? '',
    bio: a.bio ?? '',
    expertise: asStringArray(a.expertise),
    social,
    articlesCount: 0,
    guides: [],
    comparisons: [],
    avatarUrl: a.avatarUrl,
    credentials: a.credentials,
    socialLinks: asObject(a.socialLinks),
    seoTitle: a.seoTitle,
    metaDescription: a.metaDescription,
    isActive: a.isActive,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}

export function presentAuthor(
  a: Author,
  opts: { articlesCount?: number; guides?: GuideRow[] } = {},
): PresentedAuthor {
  return {
    ...presentAuthorLight(a),
    articlesCount: opts.articlesCount ?? opts.guides?.length ?? 0,
    guides: (opts.guides ?? []).map(presentGuide),
    comparisons: [],
  };
}

// ───────────────────────── Guide ─────────────────────────

export type GuideProductRow = GuideProduct & { product?: ProductRow };
export type GuideRow = Guide & {
  category?: { name: string; slug: string } | null;
  author?: Author | null;
  products?: GuideProductRow[];
};

export interface PresentedGuide {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverImage: string;
  author: PresentedAuthor | null;
  readingTime: number;
  lastUpdated: string;
  category: string;
  categorySlug: string;
  tags: string[];
  productRecommendations: { product: PresentedProduct; reason: string; isTopPick: boolean }[];
  tableOfContents: { title: string; id: string }[];
  // admin extras
  categoryId: string | null;
  authorId: string | null;
  faqItems: { question: string; answer: string }[];
  seoTitle: string | null;
  metaDescription: string | null;
  status: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export function presentGuide(g: GuideRow): PresentedGuide {
  const recs = (g.products ?? [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .filter((gp) => gp.product)
    .map((gp) => ({
      product: presentProduct(gp.product as ProductRow),
      reason: gp.reason ?? '',
      isTopPick: gp.isTopPick,
    }));

  const toc = Array.isArray(g.tableOfContents)
    ? (g.tableOfContents as { title: string; id: string }[])
    : [];
  const faqs = Array.isArray(g.faqItems)
    ? (g.faqItems as { question: string; answer: string }[])
    : [];

  return {
    id: g.id,
    slug: g.slug,
    title: g.title,
    excerpt: g.excerpt ?? '',
    content: g.content ?? '',
    coverImage: g.coverImage ?? '',
    author: g.author ? presentAuthorLight(g.author) : null,
    readingTime: g.readingTime ?? 0,
    lastUpdated: isoDate(g.publishedAt ?? g.updatedAt),
    category: g.category?.name ?? '',
    categorySlug: g.category?.slug ?? '',
    tags: asStringArray(g.tags),
    productRecommendations: recs,
    tableOfContents: toc,
    categoryId: g.categoryId,
    authorId: g.authorId,
    faqItems: faqs,
    seoTitle: g.seoTitle,
    metaDescription: g.metaDescription,
    status: g.status,
    publishedAt: g.publishedAt ? g.publishedAt.toISOString() : null,
    createdAt: g.createdAt.toISOString(),
    updatedAt: g.updatedAt.toISOString(),
  };
}

// ───────────────────────── Comparison ─────────────────────────

export type ComparisonRow = Comparison & {
  productA?: ProductRow | null;
  productB?: ProductRow | null;
  specs?: ComparisonSpec[];
};

export interface PresentedComparison {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  productA: PresentedProduct | null;
  productB: PresentedProduct | null;
  winner: string;
  summary: string;
  categories: {
    name: string;
    winner: string;
    details: string;
    productA: string;
    productB: string;
  }[];
  prosCons: {
    productA: { pros: string[]; cons: string[] };
    productB: { pros: string[]; cons: string[] };
  };
  verdict: string;
  // admin extras
  productAId: string;
  productBId: string;
  seoTitle: string | null;
  metaDescription: string | null;
  status: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

function normalisePros(v: unknown): PresentedComparison['prosCons'] {
  const o = asObject(v);
  const side = (s: unknown): { pros: string[]; cons: string[] } => {
    const so = asObject(s);
    return { pros: asStringArray(so.pros), cons: asStringArray(so.cons) };
  };
  return { productA: side(o.productA), productB: side(o.productB) };
}

export function presentComparison(c: ComparisonRow): PresentedComparison {
  const categories = (c.specs ?? [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((s) => ({
      name: s.specName,
      winner: s.winner ?? 'tie',
      details: s.details ?? '',
      productA: s.productAValue ?? '',
      productB: s.productBValue ?? '',
    }));

  return {
    id: c.id,
    slug: c.slug,
    title: c.title,
    excerpt: c.excerpt ?? '',
    productA: c.productA ? presentProduct(c.productA) : null,
    productB: c.productB ? presentProduct(c.productB) : null,
    winner: c.winner ?? 'tie',
    summary: c.summary ?? '',
    categories,
    prosCons: normalisePros(c.prosCons),
    verdict: c.verdict ?? '',
    productAId: c.productAId,
    productBId: c.productBId,
    seoTitle: c.seoTitle,
    metaDescription: c.metaDescription,
    status: c.status,
    publishedAt: c.publishedAt ? c.publishedAt.toISOString() : null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}
