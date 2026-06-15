import { z } from 'zod';

export const RANGES = ['today', 'last7days', 'last30days', 'thisMonth'] as const;

/** Event types a PUBLIC client beacon may submit (views + search only — never clicks/
 *  AI/revenue, which are recorded server-side from trusted flows). */
const PUBLIC_EVENT_TYPES = [
  'page_view',
  'product_view',
  'guide_view',
  'comparison_view',
  'author_view',
  'category_view',
  'brand_view',
  'search',
] as const;

const ALL_EVENT_TYPES = [
  ...PUBLIC_EVENT_TYPES,
  'affiliate_click',
  'ai_generation',
  'revenue_import',
  'import_job',
  'admin_action',
] as const;

export const rangeQuerySchema = z.object({
  range: z.enum(RANGES).default('last7days'),
});

/** Public collector beacon body. */
export const collectSchema = z.object({
  type: z.enum(PUBLIC_EVENT_TYPES),
  entityType: z.enum(['product', 'guide', 'comparison', 'author', 'category', 'brand']).optional(),
  entityId: z.string().trim().max(120).optional(),
  url: z.string().trim().max(2048).optional(),
  referrer: z.string().trim().max(2048).optional(),
  sessionId: z.string().trim().max(120).optional(),
  metadata: z.record(z.any()).optional(),
});

export const eventsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  eventType: z.enum(ALL_EVENT_TYPES).optional(),
  entityType: z.string().trim().max(40).optional(),
});

export const reportsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  type: z.string().trim().max(40).optional(),
});

export const generateReportSchema = z.object({
  type: z.enum(['daily', 'weekly', 'monthly', 'custom']).default('custom'),
  range: z.enum(RANGES).default('last30days'),
});
