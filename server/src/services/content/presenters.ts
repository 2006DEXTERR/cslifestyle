/**
 * Presenters: map normalised Prisma content rows → the existing frontend shapes
 * (`lib/types.ts` BuyingGuide/Comparison/Author) so the preserved UI renders unchanged.
 * Returned objects are a SUPERSET — they also carry raw admin fields (status, authorId,
 * categoryId, seoTitle…) used by the admin panel. See ADR-018/ADR-020.
 */
import type { Author, Guide, Comparison, ComparisonSpec, GuideProduct } from '@prisma/client';
import { presentProduct, type ProductRow, type PresentedProduct } from '../catalog/presenters';
import { resolveSpecWinner } from './winner-engine';

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

export interface PresentedSpec {
  name: string;
  winner: string;
  details: string;
  productA: string;
  productB: string;
  // typed extensions (Phase: rich comparison schema) — null when not set
  group: string;
  subgroup: string | null;
  displayType: string;
  valueType: string;
  winnerMode: string;
  unit: string | null;
  numberValueA: number | null;
  numberValueB: number | null;
  booleanValueA: boolean | null;
  booleanValueB: boolean | null;
  jsonValueA: unknown;
  jsonValueB: unknown;
}

export interface PresentedSpecGroup {
  group: string;
  specs: PresentedSpec[];
}

export interface PresentedComparison {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  productA: PresentedProduct | null;
  productB: PresentedProduct | null;
  winner: string;
  summary: string;
  categories: PresentedSpec[]; // flat list (backward compatible)
  specGroups: PresentedSpecGroup[]; // grouped view (schema-driven)
  prosCons: {
    productA: { pros: string[]; cons: string[] };
    productB: { pros: string[]; cons: string[] };
  };
  verdict: string;
  insights: ComparisonInsights;
  // rich editorial content (all optional — null/empty when absent)
  editorSummary: string | null;
  whoShouldBuyA: string | null;
  whoShouldBuyB: string | null;
  bestFor: string | null;
  bestAlternativeIds: string[];
  faq: { question: string; answer: string }[];
  comparisonNotes: string | null;
  lastReviewedBy: string | null;
  reviewStatus: string;
  featured: boolean;
  stickyCta: boolean;
  comparisonScoreA: number | null;
  comparisonScoreB: number | null;
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

/** Canonical spec-group display order (unknown groups sort after these, alphabetically). */
const SPEC_GROUP_ORDER = [
  'General', 'Design', 'Display', 'Performance', 'Processor', 'Memory', 'Storage',
  'Camera', 'Battery', 'Charging', 'Connectivity', 'Network', 'Build', 'Dimensions',
  'Weight', 'Software', 'Gaming', 'AI', 'Audio', 'Sensors', 'Warranty', 'Value', 'Custom',
];

function groupSpecs(specs: PresentedSpec[]): PresentedSpecGroup[] {
  const byGroup = new Map<string, PresentedSpec[]>();
  for (const s of specs) {
    const g = s.group || 'General';
    (byGroup.get(g) ?? byGroup.set(g, []).get(g)!).push(s);
  }
  const rank = (g: string) => {
    const i = SPEC_GROUP_ORDER.indexOf(g);
    return i === -1 ? SPEC_GROUP_ORDER.length : i;
  };
  return [...byGroup.entries()]
    .sort((a, b) => rank(a[0]) - rank(b[0]) || a[0].localeCompare(b[0]))
    .map(([group, groupSpecsList]) => ({ group, specs: groupSpecsList }));
}

function asFaq(v: unknown): { question: string; answer: string }[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => asObject(x))
    .filter((o) => typeof o.question === 'string' && typeof o.answer === 'string')
    .map((o) => ({ question: String(o.question), answer: String(o.answer) }));
}

function normalisePros(v: unknown): PresentedComparison['prosCons'] {
  const o = asObject(v);
  const side = (s: unknown): { pros: string[]; cons: string[] } => {
    const so = asObject(s);
    return { pros: asStringArray(so.pros), cons: asStringArray(so.cons) };
  };
  return { productA: side(o.productA), productB: side(o.productB) };
}

/**
 * Smart comparison insights — derived ONLY from real DB fields (price, rating, review
 * count, and the editorially-set per-spec winners). Never invents values: any field the
 * data can't support is `null`. `bestPrice` = lower current price ("more affordable"),
 * not a subjective "value" claim.
 */
export interface ComparisonInsights {
  bestPrice: 'A' | 'B' | null;
  higherRated: 'A' | 'B' | null;
  moreReviewed: 'A' | 'B' | null;
  specWins: { a: number; b: number; tie: number };
  priceDiff: number | null;
}

const toNum = (v: unknown): number | null => {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

export function computeComparisonInsights(c: ComparisonRow): ComparisonInsights {
  const pick = (a: number | null, b: number | null, lowerWins = false): 'A' | 'B' | null => {
    if (a === null || b === null || a === b) return null;
    return (lowerWins ? a < b : a > b) ? 'A' : 'B';
  };
  const priceA = toNum(c.productA?.currentPrice);
  const priceB = toNum(c.productB?.currentPrice);

  const specWins = { a: 0, b: 0, tie: 0 };
  for (const s of c.specs ?? []) {
    const w = resolveSpecWinner({ winnerMode: s.winnerMode, winner: s.winner, numberValueA: s.numberValueA, numberValueB: s.numberValueB });
    if (w === 'A') specWins.a += 1;
    else if (w === 'B') specWins.b += 1;
    else specWins.tie += 1;
  }

  return {
    bestPrice: pick(priceA, priceB, true),
    higherRated: pick(toNum(c.productA?.rating), toNum(c.productB?.rating)),
    moreReviewed: pick(toNum(c.productA?.reviewCount), toNum(c.productB?.reviewCount)),
    specWins,
    priceDiff: priceA !== null && priceB !== null ? Math.abs(priceA - priceB) : null,
  };
}

export function presentComparison(c: ComparisonRow): PresentedComparison {
  const categories: PresentedSpec[] = (c.specs ?? [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((s) => {
      const winner = resolveSpecWinner({ winnerMode: s.winnerMode, winner: s.winner, numberValueA: s.numberValueA, numberValueB: s.numberValueB });
      return {
        name: s.specName,
        winner: winner ?? 'tie',
        details: s.details ?? '',
        productA: s.productAValue ?? '',
        productB: s.productBValue ?? '',
        group: s.specGroup || 'General',
        subgroup: s.subgroup ?? null,
        displayType: s.displayType,
        valueType: s.valueType,
        winnerMode: s.winnerMode,
        unit: s.unit ?? null,
        numberValueA: s.numberValueA ?? null,
        numberValueB: s.numberValueB ?? null,
        booleanValueA: s.booleanValueA ?? null,
        booleanValueB: s.booleanValueB ?? null,
        jsonValueA: s.jsonValueA ?? null,
        jsonValueB: s.jsonValueB ?? null,
      };
    });

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
    specGroups: groupSpecs(categories),
    prosCons: normalisePros(c.prosCons),
    verdict: c.verdict ?? '',
    insights: computeComparisonInsights(c),
    editorSummary: c.editorSummary ?? null,
    whoShouldBuyA: c.whoShouldBuyA ?? null,
    whoShouldBuyB: c.whoShouldBuyB ?? null,
    bestFor: c.bestFor ?? null,
    bestAlternativeIds: asStringArray(c.bestAlternativeIds),
    faq: asFaq(c.faq),
    comparisonNotes: c.comparisonNotes ?? null,
    lastReviewedBy: c.lastReviewedBy ?? null,
    reviewStatus: c.reviewStatus,
    featured: c.featured,
    stickyCta: c.stickyCta,
    comparisonScoreA: c.comparisonScoreA ?? null,
    comparisonScoreB: c.comparisonScoreB ?? null,
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
