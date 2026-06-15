import { z } from 'zod';

const ENTITY = ['product', 'guide', 'comparison', 'category', 'brand'] as const;
const JOB = [
  'title',
  'meta_description',
  'description',
  'pros',
  'cons',
  'faq',
  'verdict',
  'guide',
  'category_description',
] as const;

/** Generate AI content for a single entity (per-entity generate-ai / regenerate-ai). */
export const generateSchema = z.object({
  entityType: z.enum(ENTITY),
  entityId: z.string().min(1),
  jobTypes: z.array(z.enum(JOB)).max(20).optional(),
  priority: z.coerce.number().int().min(0).max(10).optional(),
});

/** Bulk generate (FR-051). Either explicit ids, or auto-select products needing AI. */
export const bulkGenerateSchema = z.object({
  entityType: z.enum(ENTITY).default('product'),
  entityIds: z.array(z.string().min(1)).max(500).optional(),
  jobTypes: z.array(z.enum(JOB)).max(20).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

export const updatePromptSchema = z.object({
  template: z.string().trim().min(1, 'Template is required').max(8000),
});

export const queueQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['active', 'pending', 'processing', 'done', 'failed']).optional(),
  entityType: z.enum(ENTITY).optional(),
  jobType: z.enum(JOB).optional(),
});

export const logsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['success', 'failed']).optional(),
  entityType: z.enum(ENTITY).optional(),
});
