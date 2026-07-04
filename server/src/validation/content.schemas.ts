import { z } from 'zod';

/** Content validation (Phase 3): authors, guides, comparisons. */

const optionalText = z.string().trim().max(50000).optional();
const stringArray = z.array(z.string().trim().min(1).max(2000));
const WINNER = ['A', 'B', 'tie'] as const;
const STATUS = ['draft', 'published'] as const;

const socialLinks = z
  .object({
    twitter: z.string().trim().max(300).optional(),
    linkedin: z.string().trim().max(300).optional(),
    website: z.string().trim().max(500).optional(),
  })
  .partial()
  .optional();

// ───────────────────────── Authors ─────────────────────────

const authorBase = {
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(160),
  slug: z.string().trim().min(1).max(160).optional(),
  avatarUrl: z.string().trim().max(2000).optional(),
  bio: optionalText,
  credentials: optionalText,
  expertise: stringArray.max(30).optional(),
  socialLinks,
  seoTitle: z.string().trim().max(300).optional(),
  metaDescription: z.string().trim().max(500).optional(),
  isActive: z.boolean().optional(),
};

export const createAuthorSchema = z.object(authorBase);
export const updateAuthorSchema = createAuthorSchema
  .partial()
  .refine((b) => Object.keys(b).length > 0, { message: 'No fields to update' });

// ───────────────────────── Guides ─────────────────────────

const tocSchema = z.array(
  z.object({ title: z.string().trim().min(1).max(300), id: z.string().trim().min(1).max(160) }),
);
const faqSchema = z.array(
  z.object({
    question: z.string().trim().min(1).max(2000),
    answer: z.string().trim().min(1).max(20000),
  }),
);
const guideProductsSchema = z.array(
  z.object({
    productId: z.string().trim().min(1),
    position: z.coerce.number().int().min(0).optional(),
    reason: z.string().trim().max(2000).optional(),
    isTopPick: z.boolean().optional(),
  }),
);

const guideBase = {
  title: z.string().trim().min(2, 'Title must be at least 2 characters').max(300),
  slug: z.string().trim().min(1).max(200).optional(),
  excerpt: optionalText,
  content: optionalText,
  coverImage: z.string().trim().max(2000).optional(),
  categoryId: z.string().trim().min(1).nullable().optional(),
  authorId: z.string().trim().min(1).nullable().optional(),
  readingTime: z.coerce.number().int().min(0).max(1000).optional(),
  tableOfContents: tocSchema.max(100).optional(),
  faqItems: faqSchema.max(50).optional(),
  tags: stringArray.max(40).optional(),
  seoTitle: z.string().trim().max(300).optional(),
  metaDescription: z.string().trim().max(500).optional(),
  status: z.enum(STATUS).optional(),
  products: guideProductsSchema.max(50).optional(),
};

export const createGuideSchema = z.object(guideBase);
export const updateGuideSchema = createGuideSchema
  .partial()
  .refine((b) => Object.keys(b).length > 0, { message: 'No fields to update' });

// ───────────────────────── Comparisons ─────────────────────────

const specsSchema = z.array(
  z.object({
    specName: z.string().trim().min(1).max(300),
    productAValue: z.string().trim().max(2000).optional(),
    productBValue: z.string().trim().max(2000).optional(),
    winner: z.enum(WINNER).optional(),
    details: z.string().trim().max(5000).optional(),
    // ── Rich spec fields (Phase: rich comparison schema) — all optional/backward compatible ──
    specGroup: z.string().trim().max(80).optional(),
    subgroup: z.string().trim().max(80).optional(),
    displayType: z.enum(['text', 'number', 'boolean', 'percentage', 'rating', 'currency', 'badge', 'progress', 'stars', 'icon']).optional(),
    valueType: z.enum(['string', 'integer', 'float', 'boolean', 'json']).optional(),
    winnerMode: z.enum(['manual', 'higher_better', 'lower_better', 'equal', 'none']).optional(),
    unit: z.string().trim().max(20).optional(),
    numberValueA: z.number().nullable().optional(),
    numberValueB: z.number().nullable().optional(),
    booleanValueA: z.boolean().nullable().optional(),
    booleanValueB: z.boolean().nullable().optional(),
    jsonValueA: z.unknown().optional(),
    jsonValueB: z.unknown().optional(),
  }),
);
const prosConsSchema = z
  .object({
    productA: z.object({ pros: stringArray.max(30), cons: stringArray.max(30) }).partial(),
    productB: z.object({ pros: stringArray.max(30), cons: stringArray.max(30) }).partial(),
  })
  .partial();

const comparisonBase = {
  title: z.string().trim().min(2, 'Title must be at least 2 characters').max(300),
  slug: z.string().trim().min(1).max(200).optional(),
  excerpt: optionalText,
  summary: optionalText,
  productAId: z.string().trim().min(1, 'Product A is required'),
  productBId: z.string().trim().min(1, 'Product B is required'),
  verdict: optionalText,
  winner: z.enum(WINNER).optional(),
  prosCons: prosConsSchema.optional(),
  specs: specsSchema.max(200).optional(),
  seoTitle: z.string().trim().max(300).optional(),
  metaDescription: z.string().trim().max(500).optional(),
  status: z.enum(STATUS).optional(),
  // ── Rich editorial content (Phase: rich comparison schema) — all optional ──
  editorSummary: optionalText,
  whoShouldBuyA: optionalText,
  whoShouldBuyB: optionalText,
  bestFor: z.string().trim().max(300).optional(),
  bestAlternativeIds: stringArray.max(12).optional(),
  faq: z
    .array(z.object({ question: z.string().trim().min(1).max(500), answer: z.string().trim().min(1).max(3000) }))
    .max(30)
    .optional(),
  comparisonNotes: optionalText,
  lastReviewedBy: z.string().trim().max(120).optional(),
  reviewStatus: z.enum(['draft', 'in_review', 'approved']).optional(),
  featured: z.boolean().optional(),
  stickyCta: z.boolean().optional(),
  comparisonScoreA: z.number().min(0).max(100).nullable().optional(),
  comparisonScoreB: z.number().min(0).max(100).nullable().optional(),
};

export const createComparisonSchema = z.object(comparisonBase).refine((b) => b.productAId !== b.productBId, {
  message: 'Choose two different products',
  path: ['productBId'],
});
export const updateComparisonSchema = z
  .object(comparisonBase)
  .partial()
  .refine((b) => Object.keys(b).length > 0, { message: 'No fields to update' })
  .refine((b) => !b.productAId || !b.productBId || b.productAId !== b.productBId, {
    message: 'Choose two different products',
    path: ['productBId'],
  });

// ───────────────────────── List query parsers ─────────────────────────

export const authorListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(24),
  q: z.string().trim().max(200).optional(),
  status: z.enum(['active', 'all']).default('active'),
  sort: z.enum(['name', 'newest']).default('name'),
});

export const guideListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(12),
  q: z.string().trim().max(200).optional(),
  category: z.string().trim().optional(),
  author: z.string().trim().optional(),
  status: z.enum(['published', 'draft', 'all']).default('published'),
  sort: z.enum(['newest', 'oldest', 'title']).default('newest'),
});

export const comparisonListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(12),
  q: z.string().trim().max(200).optional(),
  status: z.enum(['published', 'draft', 'all']).default('published'),
  sort: z.enum(['newest', 'oldest', 'title']).default('newest'),
});

export type AuthorListQuery = z.infer<typeof authorListQuerySchema>;
export type GuideListQuery = z.infer<typeof guideListQuerySchema>;
export type ComparisonListQuery = z.infer<typeof comparisonListQuerySchema>;
export type CreateAuthorBody = z.infer<typeof createAuthorSchema>;
export type CreateGuideBody = z.infer<typeof createGuideSchema>;
export type CreateComparisonBody = z.infer<typeof createComparisonSchema>;
