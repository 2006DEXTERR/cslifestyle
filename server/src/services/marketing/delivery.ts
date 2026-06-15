import { randomBytes } from 'node:crypto';
import type { Campaign } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';
import { env } from '../../config/env';
import { sha256 } from '../../lib/tokens';
import { sendMarketingEmail } from './email';
import {
  renderEmail,
  newsletterContent,
  productAnnouncementContent,
  guideAnnouncementContent,
  comparisonAnnouncementContent,
  verifySubscriptionEmail,
  welcomeEmail,
  type CampaignContent,
} from './templates';

/**
 * Email delivery functions (Phase 9). Called by the marketing worker/processor — they
 * do NOT import the queue (avoids cycles). Every send is privacy-safe and includes a
 * one-click unsubscribe + open/click tracking. Reuses the email provider (offline-safe).
 */

const APP = env.APP_URL.replace(/\/$/, '');

export function newVerifyToken(): { token: string; hash: string } {
  const token = randomBytes(24).toString('base64url');
  return { token, hash: sha256(token) };
}
export function newUnsubscribeToken(): string {
  return randomBytes(24).toString('base64url');
}

const verifyUrl = (token: string): string => `${APP}/api/newsletter/verify?token=${encodeURIComponent(token)}`;
const unsubscribeUrl = (token: string): string => `${APP}/api/newsletter/unsubscribe?token=${encodeURIComponent(token)}`;
const openPixel = (recipientId: string): string => `${APP}/api/marketing/track/open/${recipientId}.gif`;
const clickUrl = (recipientId: string, target: string): string =>
  `${APP}/api/marketing/track/click/${recipientId}?url=${encodeURIComponent(target.startsWith('http') ? target : APP + target)}`;

// ── Lifecycle ──

export async function sendVerificationFor(subscriberId: string, token: string): Promise<void> {
  const sub = await prisma.newsletterSubscriber.findUnique({ where: { id: subscriberId } });
  if (!sub) return;
  const tpl = verifySubscriptionEmail(verifyUrl(token));
  await sendMarketingEmail({ to: sub.email, ...tpl });
}

export async function sendWelcomeFor(subscriberId: string): Promise<void> {
  const sub = await prisma.newsletterSubscriber.findUnique({ where: { id: subscriberId } });
  if (!sub) return;
  const ok = await sendMarketingEmail({ to: sub.email, ...welcomeEmail(unsubscribeUrl(sub.unsubscribeToken)) });
  if (ok) await prisma.emailEvent.create({ data: { subscriberId, type: 'sent', metadata: { kind: 'welcome' } } });
}

// ── Campaign content ──

async function campaignContent(campaign: Campaign): Promise<CampaignContent> {
  if (campaign.template === 'product_announcement' && campaign.entityId) {
    const p = await prisma.product.findUnique({ where: { id: campaign.entityId }, include: { brand: true } });
    if (p) return productAnnouncementContent({ title: p.title, brand: p.brand?.name, description: p.description, seoTitle: p.seoTitle, currentPrice: p.currentPrice ? Number(p.currentPrice) : null, asin: p.asin });
  }
  if (campaign.template === 'guide_announcement' && campaign.entityId) {
    const g = await prisma.guide.findUnique({ where: { id: campaign.entityId } });
    if (g) return guideAnnouncementContent({ title: g.title, excerpt: g.excerpt, slug: g.slug });
  }
  if (campaign.template === 'comparison_announcement' && campaign.entityId) {
    const c = await prisma.comparison.findUnique({ where: { id: campaign.entityId } });
    if (c) return comparisonAnnouncementContent({ title: c.title, summary: c.summary, verdict: c.verdict, slug: c.slug });
  }
  return newsletterContent(campaign.subject, campaign.content ?? '');
}

/** Render the full per-recipient email (tracking pixel + unsubscribe + tracked CTA). */
export async function renderForRecipient(
  campaign: Campaign,
  recipientId: string,
  unsubscribeTokenValue: string,
): Promise<{ subject: string; html: string; text: string }> {
  const content = await campaignContent(campaign);
  const trackedCta = content.ctaHref ? clickUrl(recipientId, content.ctaHref) : undefined;
  return renderEmail(content, {
    subject: campaign.subject,
    unsubscribeUrl: unsubscribeUrl(unsubscribeTokenValue),
    pixelUrl: openPixel(recipientId),
    ctaHref: trackedCta,
  });
}

// ── Campaign delivery ──

/** Deliver a campaign to its audience (active subscribers, optional tag filter). */
export async function deliverCampaign(campaignId: string): Promise<void> {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign || campaign.status === 'sent' || campaign.status === 'cancelled') return;

  await prisma.campaign.update({ where: { id: campaignId }, data: { status: 'sending', sentAt: campaign.sentAt ?? new Date() } });

  const where = {
    status: 'active' as const,
    ...(campaign.segmentTag ? { tags: { array_contains: campaign.segmentTag } as object } : {}),
  };
  const subscribers = await prisma.newsletterSubscriber.findMany({ where, select: { id: true, email: true, unsubscribeToken: true }, take: 100000 });

  let delivered = 0;
  let failed = 0;
  for (let i = 0; i < subscribers.length; i += env.CAMPAIGN_BATCH_SIZE) {
    const batch = subscribers.slice(i, i + env.CAMPAIGN_BATCH_SIZE);
    for (const sub of batch) {
      const recipient = await prisma.campaignRecipient.upsert({
        where: { campaignId_subscriberId: { campaignId, subscriberId: sub.id } },
        update: {},
        create: { campaignId, subscriberId: sub.id, status: 'pending' },
      });
      try {
        const email = await renderForRecipient(campaign, recipient.id, sub.unsubscribeToken);
        const ok = await sendMarketingEmail({ to: sub.email, ...email });
        if (ok) {
          delivered++;
          await prisma.campaignRecipient.update({ where: { id: recipient.id }, data: { status: 'delivered', deliveredAt: new Date() } });
          await prisma.emailEvent.create({ data: { campaignId, recipientId: recipient.id, subscriberId: sub.id, type: 'delivered' } });
        } else {
          failed++;
          await prisma.campaignRecipient.update({ where: { id: recipient.id }, data: { status: 'failed', error: 'send failed' } });
          await prisma.emailEvent.create({ data: { campaignId, recipientId: recipient.id, subscriberId: sub.id, type: 'failed' } });
        }
      } catch (err) {
        failed++;
        await prisma.campaignRecipient.update({ where: { id: recipient.id }, data: { status: 'failed', error: String(err) } }).catch(() => undefined);
        logger.warn({ err, campaignId, subscriberId: sub.id }, 'campaign recipient delivery failed');
      }
    }
  }

  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: failed > 0 && delivered === 0 ? 'failed' : 'sent', recipientCount: subscribers.length, deliveredCount: delivered, failedCount: failed, sentAt: new Date() },
  });
  logger.info({ campaignId, delivered, failed }, 'campaign delivered');
}

/** Send a single test email for a campaign (no recipient row / no counters). */
export async function sendCampaignTest(campaignId: string, to: string): Promise<boolean> {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) return false;
  const email = await renderForRecipient(campaign, 'test', 'test-unsub-token');
  return sendMarketingEmail({ to, subject: `[TEST] ${email.subject}`, html: email.html, text: email.text });
}

/** Retry failed recipients of a campaign. */
export async function retryFailedRecipients(campaignId: string): Promise<{ retried: number }> {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) return { retried: 0 };
  const failed = await prisma.campaignRecipient.findMany({
    where: { campaignId, status: 'failed' },
    include: { subscriber: { select: { email: true, unsubscribeToken: true } } },
  });
  let retried = 0;
  for (const r of failed) {
    const email = await renderForRecipient(campaign, r.id, r.subscriber.unsubscribeToken);
    const ok = await sendMarketingEmail({ to: r.subscriber.email, ...email });
    if (ok) {
      retried++;
      await prisma.campaignRecipient.update({ where: { id: r.id }, data: { status: 'delivered', deliveredAt: new Date(), error: null } });
      await prisma.emailEvent.create({ data: { campaignId, recipientId: r.id, subscriberId: r.subscriberId, type: 'delivered', metadata: { retry: true } } });
    }
  }
  if (retried > 0) {
    await prisma.campaign.update({ where: { id: campaignId }, data: { deliveredCount: { increment: retried }, failedCount: { decrement: retried } } });
  }
  return { retried };
}

/** Cleanup: prune old email events + stale unverified (pending) subscribers. */
export async function cleanupMarketing(): Promise<{ events: number; staleSubscribers: number }> {
  const eventCutoff = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
  const staleCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [events, stale] = await prisma.$transaction([
    prisma.emailEvent.deleteMany({ where: { createdAt: { lt: eventCutoff } } }),
    prisma.newsletterSubscriber.deleteMany({ where: { status: 'pending', subscribedAt: { lt: staleCutoff } } }),
  ]);
  return { events: events.count, staleSubscribers: stale.count };
}
