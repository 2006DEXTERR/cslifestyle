import { Prisma, type Campaign, type CampaignStatus, type EmailEventType } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ApiError, type Pagination } from '../../lib/http';
import { dispatchMarketingJob } from '../../queues/marketingQueue';
import { sendCampaignTest } from './delivery';
import { getStats as getSubscriberStats } from './newsletter.service';

/**
 * Campaign management (Phase 9): CRUD + draft/schedule/test/send + per-event tracking
 * (delivered/opened/clicked/failed/bounced). Delivery itself runs via the marketing
 * queue (inline or BullMQ, ADR-023). Open/click tracking is updated by the public
 * tracking endpoints.
 */

export function presentCampaign(c: Campaign): Record<string, unknown> {
  const deliv = c.deliveredCount || 0;
  return {
    id: c.id,
    name: c.name,
    subject: c.subject,
    template: c.template,
    content: c.content,
    entityId: c.entityId,
    segmentTag: c.segmentTag,
    status: c.status,
    scheduledAt: c.scheduledAt?.toISOString() ?? null,
    sentAt: c.sentAt?.toISOString() ?? null,
    recipientCount: c.recipientCount,
    deliveredCount: c.deliveredCount,
    openedCount: c.openedCount,
    clickedCount: c.clickedCount,
    failedCount: c.failedCount,
    bouncedCount: c.bouncedCount,
    openRate: deliv ? Number(((c.openedCount / deliv) * 100).toFixed(1)) : 0,
    clickRate: deliv ? Number(((c.clickedCount / deliv) * 100).toFixed(1)) : 0,
    createdAt: c.createdAt.toISOString(),
  };
}

const EDITABLE: CampaignStatus[] = ['draft', 'scheduled'];

export interface CampaignInput {
  name: string;
  subject: string;
  template?: string;
  content?: string;
  entityId?: string;
  fromName?: string;
  segmentTag?: string;
  scheduledAt?: string;
  userId?: string | null;
}

export async function createCampaign(input: CampaignInput): Promise<Record<string, unknown>> {
  const c = await prisma.campaign.create({
    data: {
      name: input.name,
      subject: input.subject,
      template: input.template ?? 'newsletter',
      content: input.content ?? null,
      entityId: input.entityId ?? null,
      fromName: input.fromName ?? null,
      segmentTag: input.segmentTag ?? null,
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
      status: input.scheduledAt ? 'scheduled' : 'draft',
      createdById: input.userId ?? null,
    },
  });
  return presentCampaign(c);
}

export async function updateCampaign(id: string, patch: Partial<CampaignInput>): Promise<Record<string, unknown>> {
  const existing = await prisma.campaign.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Campaign not found');
  if (!EDITABLE.includes(existing.status)) throw ApiError.badRequest(`Cannot edit a ${existing.status} campaign`);
  const c = await prisma.campaign.update({
    where: { id },
    data: {
      name: patch.name ?? undefined,
      subject: patch.subject ?? undefined,
      template: patch.template ?? undefined,
      content: patch.content ?? undefined,
      entityId: patch.entityId ?? undefined,
      fromName: patch.fromName ?? undefined,
      segmentTag: patch.segmentTag ?? undefined,
      scheduledAt: patch.scheduledAt ? new Date(patch.scheduledAt) : undefined,
    },
  });
  return presentCampaign(c);
}

export interface CampaignsQuery {
  page: number;
  perPage: number;
  status?: CampaignStatus;
}

export async function listCampaigns(q: CampaignsQuery): Promise<{ items: unknown[]; pagination: Pagination }> {
  const where: Prisma.CampaignWhereInput = q.status ? { status: q.status } : {};
  const [rows, total] = await prisma.$transaction([
    prisma.campaign.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (q.page - 1) * q.perPage, take: q.perPage }),
    prisma.campaign.count({ where }),
  ]);
  return {
    items: rows.map(presentCampaign),
    pagination: { page: q.page, perPage: q.perPage, total, totalPages: Math.max(1, Math.ceil(total / q.perPage)) },
  };
}

export async function getCampaign(id: string): Promise<Record<string, unknown>> {
  const c = await prisma.campaign.findUnique({ where: { id } });
  if (!c) throw ApiError.notFound('Campaign not found');
  return presentCampaign(c);
}

export async function scheduleCampaign(id: string, scheduledAt: string): Promise<Record<string, unknown>> {
  const c = await prisma.campaign.findUnique({ where: { id } });
  if (!c) throw ApiError.notFound('Campaign not found');
  if (!EDITABLE.includes(c.status)) throw ApiError.badRequest(`Cannot schedule a ${c.status} campaign`);
  const updated = await prisma.campaign.update({ where: { id }, data: { status: 'scheduled', scheduledAt: new Date(scheduledAt) } });
  return presentCampaign(updated);
}

export async function sendTest(id: string, to: string): Promise<{ sent: boolean }> {
  const c = await prisma.campaign.findUnique({ where: { id }, select: { id: true } });
  if (!c) throw ApiError.notFound('Campaign not found');
  const sent = await sendCampaignTest(id, to);
  return { sent };
}

export async function sendCampaign(id: string): Promise<Record<string, unknown>> {
  const c = await prisma.campaign.findUnique({ where: { id } });
  if (!c) throw ApiError.notFound('Campaign not found');
  if (c.status === 'sent' || c.status === 'sending') throw ApiError.badRequest(`Campaign is already ${c.status}`);
  await prisma.campaign.update({ where: { id }, data: { status: 'sending', scheduledAt: null } });
  await dispatchMarketingJob({ type: 'campaign-send', campaignId: id });
  const fresh = await prisma.campaign.findUniqueOrThrow({ where: { id } });
  return presentCampaign(fresh);
}

export async function retryCampaign(id: string): Promise<{ queued: boolean }> {
  const c = await prisma.campaign.findUnique({ where: { id }, select: { id: true } });
  if (!c) throw ApiError.notFound('Campaign not found');
  await dispatchMarketingJob({ type: 'campaign-retry', campaignId: id });
  return { queued: true };
}

export async function deleteCampaign(id: string): Promise<void> {
  const existing = await prisma.campaign.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw ApiError.notFound('Campaign not found');
  await prisma.campaign.delete({ where: { id } });
}

// ── Tracking (called by public pixel/link endpoints) ──

export async function trackOpen(recipientId: string): Promise<void> {
  const r = await prisma.campaignRecipient.findUnique({ where: { id: recipientId } });
  if (!r || r.openedAt) return;
  await prisma.campaignRecipient.update({ where: { id: recipientId }, data: { openedAt: new Date(), status: r.status === 'clicked' ? r.status : 'opened' } });
  await prisma.campaign.update({ where: { id: r.campaignId }, data: { openedCount: { increment: 1 } } });
  await prisma.emailEvent.create({ data: { campaignId: r.campaignId, recipientId, subscriberId: r.subscriberId, type: 'opened' } });
}

export async function trackClick(recipientId: string): Promise<void> {
  const r = await prisma.campaignRecipient.findUnique({ where: { id: recipientId } });
  if (!r) return;
  const firstClick = !r.clickedAt;
  const firstOpen = !r.openedAt;
  await prisma.campaignRecipient.update({ where: { id: recipientId }, data: { clickedAt: new Date(), openedAt: r.openedAt ?? new Date(), status: 'clicked' } });
  await prisma.campaign.update({
    where: { id: r.campaignId },
    data: { clickedCount: firstClick ? { increment: 1 } : undefined, openedCount: firstOpen ? { increment: 1 } : undefined },
  });
  await prisma.emailEvent.create({ data: { campaignId: r.campaignId, recipientId, subscriberId: r.subscriberId, type: 'clicked' } });
}

// ── Events + dashboard ──

export interface EventsQuery {
  page: number;
  perPage: number;
  type?: EmailEventType;
  campaignId?: string;
}

export async function listEvents(q: EventsQuery): Promise<{ items: unknown[]; pagination: Pagination }> {
  const where: Prisma.EmailEventWhereInput = {};
  if (q.type) where.type = q.type;
  if (q.campaignId) where.campaignId = q.campaignId;
  const [rows, total] = await prisma.$transaction([
    prisma.emailEvent.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (q.page - 1) * q.perPage, take: q.perPage }),
    prisma.emailEvent.count({ where }),
  ]);
  return {
    items: rows.map((e) => ({ id: e.id, campaignId: e.campaignId, type: e.type, createdAt: e.createdAt.toISOString() })),
    pagination: { page: q.page, perPage: q.perPage, total, totalPages: Math.max(1, Math.ceil(total / q.perPage)) },
  };
}

/** Marketing dashboard data for /admin/marketing (cards + performance series). */
export async function getDashboard(): Promise<Record<string, unknown>> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [subStats, agg, sentCampaigns, events] = await Promise.all([
    getSubscriberStats(),
    prisma.campaign.aggregate({ where: { status: 'sent' }, _sum: { deliveredCount: true, openedCount: true, clickedCount: true, recipientCount: true } }),
    prisma.campaign.count({ where: { status: 'sent' } }),
    prisma.emailEvent.findMany({ where: { createdAt: { gte: since }, type: { in: ['delivered', 'opened', 'clicked'] } }, select: { type: true, createdAt: true }, take: 100000 }),
  ]);
  const delivered = agg._sum.deliveredCount ?? 0;
  const opened = agg._sum.openedCount ?? 0;
  const clicked = agg._sum.clickedCount ?? 0;

  const daily = new Map<string, { sent: number; opened: number; clicked: number }>();
  for (const e of events) {
    const d = e.createdAt.toISOString().slice(0, 10);
    const b = daily.get(d) ?? { sent: 0, opened: 0, clicked: 0 };
    if (e.type === 'delivered') b.sent++;
    else if (e.type === 'opened') b.opened++;
    else if (e.type === 'clicked') b.clicked++;
    daily.set(d, b);
  }

  return {
    cards: {
      totalSubscribers: subStats.total,
      activeSubscribers: subStats.active,
      avgOpenRate: delivered ? Number(((opened / delivered) * 100).toFixed(1)) : 0,
      avgClickRate: delivered ? Number(((clicked / delivered) * 100).toFixed(1)) : 0,
      campaignsSent: sentCampaigns,
    },
    performance: [...daily.entries()].map(([date, v]) => ({ date, ...v })).sort((a, b) => a.date.localeCompare(b.date)),
    segments: subStats.segments,
    deliveryRate: delivered + (agg._sum.recipientCount ?? 0) > 0 ? 100 : 0,
  };
}
