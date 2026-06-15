import { z } from 'zod';

const SUB_STATUS = ['pending', 'active', 'unsubscribed', 'bounced', 'complained'] as const;
const CAMP_STATUS = ['draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled'] as const;
const TEMPLATES = ['newsletter', 'product_announcement', 'guide_announcement', 'comparison_announcement'] as const;
const EVENT_TYPES = ['queued', 'sent', 'delivered', 'opened', 'clicked', 'failed', 'bounced', 'unsubscribed', 'complained'] as const;

// ── Public newsletter ──
export const subscribeSchema = z.object({
  email: z.string().trim().email().max(254),
  source: z.string().trim().max(40).optional(),
  tags: z.array(z.string().trim().max(40)).max(20).optional(),
});

export const unsubscribeSchema = z
  .object({
    email: z.string().trim().email().max(254).optional(),
    token: z.string().trim().max(200).optional(),
  })
  .refine((v) => v.email || v.token, { message: 'Provide an email or token' });

// ── Admin campaigns ──
export const campaignCreateSchema = z.object({
  name: z.string().trim().min(1).max(160),
  subject: z.string().trim().min(1).max(200),
  template: z.enum(TEMPLATES).optional(),
  content: z.string().max(50_000).optional(),
  entityId: z.string().trim().max(120).optional(),
  fromName: z.string().trim().max(80).optional(),
  segmentTag: z.string().trim().max(40).optional(),
  scheduledAt: z.string().datetime().optional(),
});

export const campaignUpdateSchema = campaignCreateSchema.partial();

export const scheduleSchema = z.object({ scheduledAt: z.string().datetime() });
export const sendTestSchema = z.object({ email: z.string().trim().email().max(254) });

// ── Admin subscribers ──
export const subscriberCreateSchema = z.object({
  email: z.string().trim().email().max(254),
  tags: z.array(z.string().trim().max(40)).max(20).optional(),
  status: z.enum(SUB_STATUS).optional(),
});
export const subscriberUpdateSchema = z.object({
  tags: z.array(z.string().trim().max(40)).max(20).optional(),
  status: z.enum(SUB_STATUS).optional(),
});

// ── Queries ──
export const subscribersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(SUB_STATUS).optional(),
  search: z.string().trim().max(254).optional(),
  tag: z.string().trim().max(40).optional(),
});
export const campaignsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(CAMP_STATUS).optional(),
});
export const marketingEventsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  type: z.enum(EVENT_TYPES).optional(),
  campaignId: z.string().trim().max(120).optional(),
});
