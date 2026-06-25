import { env } from '../config/env';
import { logger } from '../lib/logger';
import {
  sendVerificationFor,
  sendWelcomeFor,
  deliverCampaign,
  retryFailedRecipients,
  cleanupMarketing,
} from '../services/marketing/delivery';

/** BullMQ queue name for marketing/communication jobs (Phase 9). */
export const MARKETING_QUEUE_NAME = 'marketing';

export type MarketingJob =
  | { type: 'verification'; subscriberId: string; token: string }
  | { type: 'welcome'; subscriberId: string }
  | { type: 'campaign-send'; campaignId: string }
  | { type: 'campaign-retry'; campaignId: string }
  | { type: 'cleanup' };

/** Run a marketing job in-process (used by both the inline path and the worker). */
export async function runMarketingJob(job: MarketingJob): Promise<void> {
  switch (job.type) {
    case 'verification':
      await sendVerificationFor(job.subscriberId, job.token);
      return;
    case 'welcome':
      return sendWelcomeFor(job.subscriberId);
    case 'campaign-send':
      return deliverCampaign(job.campaignId);
    case 'campaign-retry':
      await retryFailedRecipients(job.campaignId);
      return;
    case 'cleanup': {
      const r = await cleanupMarketing();
      logger.info(r, 'marketing cleanup done');
      return;
    }
  }
}

/**
 * Dispatch a marketing job. `QUEUE_DRIVER=inline` (dev/test/CI) runs it in-process with
 * no Redis; `bullmq` (production) enqueues for the worker. See ADR-023.
 */
export async function dispatchMarketingJob(job: MarketingJob): Promise<void> {
  if (env.QUEUE_DRIVER === 'bullmq') {
    const { getMarketingQueue } = await import('./marketingBullmq');
    await getMarketingQueue().add(job.type, job);
    logger.info({ type: job.type }, 'marketing job enqueued (bullmq)');
  } else {
    await runMarketingJob(job);
  }
}

/**
 * Dispatch the newsletter confirmation email and report whether it was sent/queued.
 * Inline mode runs it now and returns the real send result; bullmq mode enqueues and
 * returns true (queued — the worker delivers it). Callers use this to avoid telling a
 * subscriber "check your inbox" when no email actually went out.
 */
export async function dispatchVerificationEmail(subscriberId: string, token: string): Promise<boolean> {
  if (env.QUEUE_DRIVER === 'bullmq') {
    const { getMarketingQueue } = await import('./marketingBullmq');
    await getMarketingQueue().add('verification', { type: 'verification', subscriberId, token } satisfies MarketingJob);
    logger.info({ type: 'verification' }, 'marketing job enqueued (bullmq)');
    return true;
  }
  return sendVerificationFor(subscriberId, token);
}
