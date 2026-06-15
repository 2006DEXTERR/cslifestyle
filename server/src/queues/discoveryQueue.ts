import { env } from '../config/env';
import { logger } from '../lib/logger';
import { rebuildIndex } from '../services/discovery/index.service';
import { generateSuggestions, detectBrokenLinks } from '../services/discovery/linking.service';
import { prisma } from '../lib/prisma';

/** BullMQ queue name for discovery jobs (search index / recs / internal links). */
export const DISCOVERY_QUEUE_NAME = 'discovery';

export type DiscoveryJobType = 'index-refresh' | 'recommendation-recalc' | 'internal-link-suggestions' | 'broken-link-detection';

/** Run a discovery job in-process (used by both the inline path and the worker). */
export async function runDiscoveryJob(jobType: DiscoveryJobType): Promise<void> {
  if (jobType === 'index-refresh') {
    const r = await rebuildIndex();
    logger.info(r, 'search index rebuilt');
  } else if (jobType === 'recommendation-recalc') {
    // Recommendations are computed on demand from live signals (views/clicks/rules);
    // this job is a hook for future precomputation/caching. No-op for now.
    logger.info('recommendation recalc tick (on-demand engine — no precompute)');
  } else if (jobType === 'internal-link-suggestions') {
    const [guides, comparisons] = await Promise.all([
      prisma.guide.findMany({ where: { status: 'published' }, select: { id: true } }),
      prisma.comparison.findMany({ where: { status: 'published' }, select: { id: true } }),
    ]);
    let created = 0;
    for (const g of guides) created += (await generateSuggestions('guide', g.id).catch(() => ({ created: 0 }))).created;
    for (const c of comparisons) created += (await generateSuggestions('comparison', c.id).catch(() => ({ created: 0 }))).created;
    logger.info({ created }, 'internal-link suggestions generated');
  } else if (jobType === 'broken-link-detection') {
    const r = await detectBrokenLinks();
    logger.info({ broken: r.broken.length, scanned: r.scanned }, 'broken-link detection complete');
  }
}

/**
 * Dispatch a discovery job. `QUEUE_DRIVER=inline` (dev/test/CI) runs it in-process;
 * `bullmq` (production) enqueues for the worker. See ADR-023.
 */
export async function dispatchDiscoveryJob(jobType: DiscoveryJobType): Promise<void> {
  if (env.QUEUE_DRIVER === 'bullmq') {
    const { getDiscoveryQueue } = await import('./discoveryBullmq');
    await getDiscoveryQueue().add(jobType, { jobType });
    logger.info({ jobType }, 'discovery job enqueued (bullmq)');
  } else {
    await runDiscoveryJob(jobType);
  }
}
