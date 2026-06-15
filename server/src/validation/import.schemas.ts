import { z } from 'zod';

const DUP = ['skip', 'overwrite', 'create_copy'] as const;
const TYPE = ['csv_product', 'asin', 'category'] as const;

export const importCsvSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  csv: z.string().min(1, 'CSV content is required').max(20_000_000),
  duplicateMode: z.enum(DUP).optional(),
  name: z.string().trim().max(160).optional(),
});

export const importAsinsSchema = z.object({
  asins: z.array(z.string().trim()).min(1, 'Provide at least one ASIN').max(5000),
  duplicateMode: z.enum(DUP).optional(),
  name: z.string().trim().max(160).optional(),
});

export const importCategoriesSchema = z.object({
  categories: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(160),
        parentName: z.string().trim().max(160).optional(),
        slug: z.string().trim().max(160).optional(),
        description: z.string().trim().max(2000).optional(),
      }),
    )
    .min(1, 'Provide at least one category')
    .max(2000),
  duplicateMode: z.enum(DUP).optional(),
  name: z.string().trim().max(160).optional(),
});

export const createTemplateSchema = z.object({
  name: z.string().trim().min(1).max(160),
  type: z.enum(TYPE),
  mappings: z.record(z.any()),
});

export const jobsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['active', 'pending', 'processing', 'completed', 'failed', 'cancelled']).optional(),
  type: z.enum(TYPE).optional(),
});

export type JobsQueryInput = z.infer<typeof jobsQuerySchema>;
