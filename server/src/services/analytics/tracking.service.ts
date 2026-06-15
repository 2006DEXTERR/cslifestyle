import type { AnalyticsEventType, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';
import { dispatchExternal } from './providers';

/**
 * Privacy-safe event ingestion (spec §13, NFR-SEC-007). Writes the unified
 * `AnalyticsEvent` log plus the specialised `PageView`/`ProductView` tables, then
 * fire-and-forget forwards to enabled external providers. **Only SHA-256(ip) is ever
 * stored** — raw IPs never touch the DB (the caller hashes via `lib/request-context`).
 */

export interface TrackInput {
  type: AnalyticsEventType;
  entityType?: string | null;
  entityId?: string | null;
  url?: string | null;
  referrer?: string | null;
  sessionId?: string | null;
  userId?: string | null;
  ipHash?: string | null;
  device?: string | null;
  country?: string | null;
  metadata?: Record<string, unknown>;
}

const VIEW_TYPES: AnalyticsEventType[] = [
  'page_view',
  'product_view',
  'guide_view',
  'comparison_view',
  'author_view',
  'category_view',
  'brand_view',
];

/** Record one analytics event (+ derived view rows). Never throws to the caller. */
export async function recordEvent(input: TrackInput): Promise<void> {
  try {
    await prisma.analyticsEvent.create({
      data: {
        eventType: input.type,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        sessionId: input.sessionId ?? null,
        userId: input.userId ?? null,
        ipHash: input.ipHash ?? null,
        country: input.country ?? null,
        device: input.device ?? null,
        metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });

    // Any page/entity view is also a PageView (drives "Total Page Views").
    if (VIEW_TYPES.includes(input.type) && input.url) {
      await prisma.pageView.create({
        data: {
          url: input.url,
          referrer: input.referrer ?? null,
          device: input.device ?? null,
          country: input.country ?? null,
          sessionId: input.sessionId ?? null,
          ipHash: input.ipHash ?? null,
        },
      });
    }

    // Product views also land in the specialised table (FK-validated; skip if invalid).
    if (input.type === 'product_view' && input.entityId) {
      await prisma.productView
        .create({
          data: {
            productId: input.entityId,
            sessionId: input.sessionId ?? null,
            country: input.country ?? null,
            device: input.device ?? null,
          },
        })
        .catch(() => undefined); // unknown productId → skip the specialised row
    }
  } catch (err) {
    logger.warn({ err, type: input.type }, 'analytics event record failed');
    return;
  }

  void dispatchExternal({
    eventType: input.type,
    entityType: input.entityType,
    entityId: input.entityId,
    sessionId: input.sessionId,
    url: input.url,
    device: input.device,
    country: input.country,
    metadata: input.metadata,
  });
}
