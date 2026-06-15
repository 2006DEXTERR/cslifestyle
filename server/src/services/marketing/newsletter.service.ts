import { Prisma, type NewsletterSubscriber, type SubscriberStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ApiError, type Pagination } from '../../lib/http';
import { sha256 } from '../../lib/tokens';
import { env } from '../../config/env';
import { dispatchMarketingJob } from '../../queues/marketingQueue';
import { newVerifyToken, newUnsubscribeToken } from './delivery';

/**
 * Newsletter subscribe / double opt-in / unsubscribe + subscriber management (Phase 9).
 * Double opt-in: a pending subscriber gets a verification email; only on confirm do they
 * become `active`. Verification tokens are stored **hashed** (SHA-256). Unsubscribe is
 * one-click via a capability token. Email is deduplicated (unique).
 */

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function presentSubscriber(s: NewsletterSubscriber): Record<string, unknown> {
  return {
    id: s.id,
    email: s.email,
    status: s.status,
    source: s.source,
    tags: (s.tags as string[] | null) ?? [],
    verifiedAt: s.verifiedAt?.toISOString() ?? null,
    subscribedAt: s.subscribedAt.toISOString(),
    unsubscribedAt: s.unsubscribedAt?.toISOString() ?? null,
  };
}

export interface SubscribeInput {
  email: string;
  source?: string;
  tags?: string[];
}

export interface SubscribeResult {
  status: 'pending' | 'active' | 'already_subscribed';
  subscriber: Record<string, unknown>;
}

/** Subscribe (idempotent + double opt-in aware). */
export async function subscribe(input: SubscribeInput): Promise<SubscribeResult> {
  const email = normalizeEmail(input.email);
  const doubleOptIn = env.NEWSLETTER_DOUBLE_OPT_IN;
  const existing = await prisma.newsletterSubscriber.findUnique({ where: { email } });

  if (existing && existing.status === 'active') {
    return { status: 'already_subscribed', subscriber: presentSubscriber(existing) };
  }

  const tags = input.tags && input.tags.length ? input.tags : undefined;

  if (!doubleOptIn) {
    // Single opt-in → active immediately + welcome email.
    const sub = existing
      ? await prisma.newsletterSubscriber.update({ where: { id: existing.id }, data: { status: 'active', verifiedAt: new Date(), unsubscribedAt: null, source: input.source ?? existing.source, ...(tags ? { tags } : {}) } })
      : await prisma.newsletterSubscriber.create({ data: { email, status: 'active', verifiedAt: new Date(), source: input.source ?? 'api', tags: tags ?? [], unsubscribeToken: newUnsubscribeToken() } });
    await dispatchMarketingJob({ type: 'welcome', subscriberId: sub.id });
    return { status: 'active', subscriber: presentSubscriber(sub) };
  }

  // Double opt-in → pending + verification email.
  const { token, hash } = newVerifyToken();
  const sub = existing
    ? await prisma.newsletterSubscriber.update({ where: { id: existing.id }, data: { status: 'pending', verifyTokenHash: hash, verifiedAt: null, unsubscribedAt: null, source: input.source ?? existing.source, ...(tags ? { tags } : {}) } })
    : await prisma.newsletterSubscriber.create({ data: { email, status: 'pending', verifyTokenHash: hash, source: input.source ?? 'api', tags: tags ?? [], unsubscribeToken: newUnsubscribeToken() } });
  await dispatchMarketingJob({ type: 'verification', subscriberId: sub.id, token });
  return { status: 'pending', subscriber: presentSubscriber(sub) };
}

/** Confirm double opt-in via the emailed token. */
export async function verify(token: string): Promise<Record<string, unknown>> {
  const hash = sha256(token);
  const sub = await prisma.newsletterSubscriber.findFirst({ where: { verifyTokenHash: hash, status: 'pending' } });
  if (!sub) throw ApiError.badRequest('Invalid or expired confirmation link');
  const updated = await prisma.newsletterSubscriber.update({
    where: { id: sub.id },
    data: { status: 'active', verifiedAt: new Date(), verifyTokenHash: null },
  });
  await dispatchMarketingJob({ type: 'welcome', subscriberId: updated.id });
  return presentSubscriber(updated);
}

/** Unsubscribe by capability token or email (idempotent). */
export async function unsubscribe(input: { token?: string; email?: string }): Promise<Record<string, unknown>> {
  const sub = input.token
    ? await prisma.newsletterSubscriber.findUnique({ where: { unsubscribeToken: input.token } })
    : input.email
      ? await prisma.newsletterSubscriber.findUnique({ where: { email: normalizeEmail(input.email) } })
      : null;
  if (!sub) throw ApiError.notFound('Subscription not found');
  if (sub.status === 'unsubscribed') return presentSubscriber(sub);
  const updated = await prisma.newsletterSubscriber.update({
    where: { id: sub.id },
    data: { status: 'unsubscribed', unsubscribedAt: new Date() },
  });
  await prisma.emailEvent.create({ data: { subscriberId: sub.id, type: 'unsubscribed' } });
  return presentSubscriber(updated);
}

// ── Subscriber management (admin) ──

export interface SubscribersQuery {
  page: number;
  perPage: number;
  status?: SubscriberStatus;
  search?: string;
  tag?: string;
}

export async function listSubscribers(q: SubscribersQuery): Promise<{ items: unknown[]; pagination: Pagination }> {
  const and: Prisma.NewsletterSubscriberWhereInput[] = [];
  if (q.status) and.push({ status: q.status });
  if (q.search) and.push({ email: { contains: q.search.toLowerCase() } });
  if (q.tag) and.push({ tags: { array_contains: q.tag } as object });
  const where = and.length ? { AND: and } : {};
  const [rows, total] = await prisma.$transaction([
    prisma.newsletterSubscriber.findMany({ where, orderBy: { subscribedAt: 'desc' }, skip: (q.page - 1) * q.perPage, take: q.perPage }),
    prisma.newsletterSubscriber.count({ where }),
  ]);
  return {
    items: rows.map(presentSubscriber),
    pagination: { page: q.page, perPage: q.perPage, total, totalPages: Math.max(1, Math.ceil(total / q.perPage)) },
  };
}

export async function getStats(): Promise<Record<string, unknown>> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [total, active, pending, unsubscribed, bounced, recent, tagRows] = await Promise.all([
    prisma.newsletterSubscriber.count(),
    prisma.newsletterSubscriber.count({ where: { status: 'active' } }),
    prisma.newsletterSubscriber.count({ where: { status: 'pending' } }),
    prisma.newsletterSubscriber.count({ where: { status: 'unsubscribed' } }),
    prisma.newsletterSubscriber.count({ where: { status: 'bounced' } }),
    prisma.newsletterSubscriber.findMany({ where: { subscribedAt: { gte: since } }, select: { subscribedAt: true, tags: true }, take: 50000 }),
    prisma.newsletterSubscriber.findMany({ where: { status: 'active' }, select: { tags: true }, take: 50000 }),
  ]);
  const daily = new Map<string, number>();
  for (const r of recent) {
    const d = r.subscribedAt.toISOString().slice(0, 10);
    daily.set(d, (daily.get(d) ?? 0) + 1);
  }
  const tagCounts = new Map<string, number>();
  for (const r of tagRows) for (const t of ((r.tags as string[] | null) ?? [])) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
  return {
    total,
    active,
    pending,
    unsubscribed,
    bounced,
    growth: [...daily.entries()].map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date)),
    segments: [...tagCounts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
  };
}

export async function exportCsv(q: Pick<SubscribersQuery, 'status' | 'tag'>): Promise<string> {
  const where: Prisma.NewsletterSubscriberWhereInput = {};
  if (q.status) where.status = q.status;
  if (q.tag) (where as { tags?: object }).tags = { array_contains: q.tag };
  const rows = await prisma.newsletterSubscriber.findMany({ where, orderBy: { subscribedAt: 'desc' }, take: 100000 });
  const header = 'email,status,source,tags,subscribedAt';
  const lines = rows.map((r) => {
    const tags = ((r.tags as string[] | null) ?? []).join('|');
    return `${r.email},${r.status},${r.source ?? ''},${tags},${r.subscribedAt.toISOString()}`;
  });
  return [header, ...lines].join('\n');
}

export async function createSubscriberAdmin(input: { email: string; tags?: string[]; status?: SubscriberStatus }): Promise<Record<string, unknown>> {
  const email = normalizeEmail(input.email);
  const existing = await prisma.newsletterSubscriber.findUnique({ where: { email } });
  if (existing) throw new ApiError(409, 'Subscriber already exists');
  const sub = await prisma.newsletterSubscriber.create({
    data: { email, status: input.status ?? 'active', verifiedAt: input.status === 'active' || !input.status ? new Date() : null, source: 'admin', tags: input.tags ?? [], unsubscribeToken: newUnsubscribeToken() },
  });
  return presentSubscriber(sub);
}

export async function updateSubscriber(id: string, input: { tags?: string[]; status?: SubscriberStatus }): Promise<Record<string, unknown>> {
  const existing = await prisma.newsletterSubscriber.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Subscriber not found');
  const data: Prisma.NewsletterSubscriberUpdateInput = {};
  if (input.tags) data.tags = input.tags;
  if (input.status) {
    data.status = input.status;
    if (input.status === 'unsubscribed') data.unsubscribedAt = new Date();
    if (input.status === 'active') data.verifiedAt = existing.verifiedAt ?? new Date();
  }
  const updated = await prisma.newsletterSubscriber.update({ where: { id }, data });
  return presentSubscriber(updated);
}

export async function deleteSubscriber(id: string): Promise<void> {
  const existing = await prisma.newsletterSubscriber.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw ApiError.notFound('Subscriber not found');
  await prisma.newsletterSubscriber.delete({ where: { id } });
}
