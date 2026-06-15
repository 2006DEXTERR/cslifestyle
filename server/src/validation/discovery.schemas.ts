import { z } from 'zod';

const ENTITY = ['product', 'category', 'brand', 'guide', 'comparison', 'author'] as const;

// ── Search (public) ──
export const advancedSearchQuerySchema = z.object({
  q: z.string().trim().max(200).default(''),
  types: z
    .string()
    .optional()
    .transform((v) => (v ? v.split(',').map((s) => s.trim()).filter((s): s is (typeof ENTITY)[number] => (ENTITY as readonly string[]).includes(s)) : undefined)),
  limit: z.coerce.number().int().min(1).max(50).default(24),
  page: z.coerce.number().int().min(1).default(1),
});

export const suggestionsQuerySchema = z.object({
  q: z.string().trim().max(120).default(''),
  limit: z.coerce.number().int().min(1).max(15).default(8),
});

// ── Recommendations (public reads) ──
export const recommendProductsQuerySchema = z.object({
  type: z.enum(['related', 'similar', 'category', 'brand', 'price', 'trending']).default('related'),
  productId: z.string().trim().max(120).optional(),
  categoryId: z.string().trim().max(120).optional(),
  brandId: z.string().trim().max(120).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  limit: z.coerce.number().int().min(1).max(24).default(6),
});

export const recommendContentQuerySchema = z.object({
  type: z.enum(['guide', 'comparison']),
  id: z.string().trim().min(1).max(120),
  limit: z.coerce.number().int().min(1).max(12).default(3),
});

// ── Synonyms (search.manage) ──
export const createSynonymSchema = z.object({
  term: z.string().trim().min(1).max(80),
  synonyms: z.array(z.string().trim().min(1).max(80)).min(1).max(50),
  isActive: z.boolean().optional(),
});
export const updateSynonymSchema = z.object({
  synonyms: z.array(z.string().trim().min(1).max(80)).max(50).optional(),
  isActive: z.boolean().optional(),
});

// ── Rules (recommendations.manage) ──
export const createRuleSchema = z.object({
  name: z.string().trim().min(1).max(120),
  type: z.enum(['category', 'brand', 'price', 'rating', 'trending', 'affiliate', 'related_products', 'similar']),
  weight: z.coerce.number().min(0).max(100).optional(),
  conditions: z.record(z.any()).optional(),
  isActive: z.boolean().optional(),
});
export const updateRuleSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  weight: z.coerce.number().min(0).max(100).optional(),
  conditions: z.record(z.any()).optional(),
  isActive: z.boolean().optional(),
});

// ── Internal links (recommendations.manage) ──
export const generateLinksSchema = z.object({
  sourceType: z.enum(['guide', 'comparison']),
  sourceId: z.string().trim().min(1).max(120),
});
export const linkStatusSchema = z.object({ status: z.enum(['suggested', 'approved', 'rejected', 'broken']) });

// ── Queries ──
export const pageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(120).optional(),
});
export const linksQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['suggested', 'approved', 'rejected', 'broken']).optional(),
  sourceType: z.enum(['guide', 'comparison']).optional(),
  sourceId: z.string().trim().max(120).optional(),
});
