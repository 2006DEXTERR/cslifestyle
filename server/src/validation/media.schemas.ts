import { z } from 'zod';

export const mediaListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(24),
  folderId: z.string().trim().max(120).optional(),
  mimeType: z.string().trim().max(60).optional(),
  search: z.string().trim().max(255).optional(),
  unused: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
});

export const mediaSearchQuerySchema = z.object({
  q: z.string().trim().max(255).optional(),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(24),
  mimeType: z.string().trim().max(60).optional(),
});

export const updateMediaSchema = z.object({
  altText: z.string().trim().max(500).optional(),
  caption: z.string().trim().max(1000).optional(),
  folderId: z.string().trim().max(120).nullable().optional(),
});

export const attachUsageSchema = z.object({
  entityType: z.enum(['product', 'guide', 'comparison', 'category', 'brand', 'author', 'campaign']),
  entityId: z.string().trim().min(1).max(120),
  field: z.string().trim().max(40).optional(),
});

export const createFolderSchema = z.object({
  name: z.string().trim().min(1).max(80),
  parentId: z.string().trim().max(120).nullable().optional(),
});
