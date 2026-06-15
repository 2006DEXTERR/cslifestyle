import { z } from 'zod';

const SOURCE_TYPE = ['product', 'guide', 'comparison', 'category', 'deals', 'search', 'direct', 'other'] as const;
const DEVICE_TYPE = ['mobile', 'tablet', 'desktop', 'unknown'] as const;
const REVENUE_SOURCE = ['estimated', 'amazon_csv'] as const;

// ── Settings ──
export const updateSettingsSchema = z
  .object({
    amazonAssociateTag: z.string().trim().min(1).max(80),
    amazonDomain: z.enum(['amazon.in', 'amazon.com', 'amzn.to']),
    linkCode: z.string().trim().min(1).max(40),
    extraParams: z.record(z.string()).nullable(),
    disclosureText: z.string().trim().max(5000),
    trackingEnabled: z.boolean(),
  })
  .partial()
  .refine((b) => Object.keys(b).length > 0, { message: 'No fields to update' });

// ── Campaigns ──
const campaignBase = {
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(160),
  slug: z.string().trim().min(1).max(160).optional(),
  affiliateTag: z.string().trim().min(1).max(80).nullable().optional(),
  description: z.string().trim().max(2000).optional(),
  isActive: z.boolean().optional(),
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
};
export const createCampaignSchema = z.object(campaignBase);
export const updateCampaignSchema = z
  .object({ ...campaignBase, name: campaignBase.name.optional() })
  .refine((b) => Object.keys(b).length > 0, { message: 'No fields to update' });

// ── Revenue import ──
export const importRevenueSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  source: z.enum(REVENUE_SOURCE).default('amazon_csv'),
  csv: z.string().min(1, 'CSV content is required').max(5_000_000),
});

// ── Query parsers ──
export const clicksQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(25),
  asin: z.string().trim().max(20).optional(),
  sourceType: z.enum(SOURCE_TYPE).optional(),
  deviceType: z.enum(DEVICE_TYPE).optional(),
  days: z.coerce.number().int().min(1).max(365).optional(),
});

export const statsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
});

export const topProductsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const reportsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(25),
  source: z.enum(REVENUE_SOURCE).optional(),
  days: z.coerce.number().int().min(1).max(365).optional(),
});

export type ClicksQueryInput = z.infer<typeof clicksQuerySchema>;
export type ReportsQueryInput = z.infer<typeof reportsQuerySchema>;
