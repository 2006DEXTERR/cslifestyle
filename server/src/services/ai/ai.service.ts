import { Prisma, type AiEntityType, type AiJobType, type AiQueue, type AiLog } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ApiError, type Pagination } from '../../lib/http';
import { env } from '../../config/env';
import { dispatchAiJobs } from '../../queues/aiQueue';
import { JOBS_FOR_ENTITY, applyApprovedResult } from './engine';
import { providerConfigured } from './providers';

/** AI log retention window (FR-055). */
export const AI_LOG_RETENTION_DAYS = 30;

// ───────────────────────── Presenters ─────────────────────────

export function presentJob(job: AiQueue): Record<string, unknown> {
  const result = (job.result ?? null) as { text?: string; provider?: string; model?: string } | null;
  return {
    id: job.id,
    entityType: job.entityType,
    entityId: job.entityId,
    jobType: job.jobType,
    status: job.status,
    priority: job.priority,
    attempts: job.attempts,
    maxAttempts: job.maxAttempts,
    approved: job.approved,
    promptTemplate: job.promptTemplate,
    result: result ? { text: result.text ?? '', provider: result.provider ?? null, model: result.model ?? null } : null,
    error: job.errorMessage,
    model: result?.model ?? null,
    createdAt: job.createdAt.toISOString(),
    startedAt: job.startedAt?.toISOString() ?? null,
    completedAt: job.completedAt?.toISOString() ?? null,
  };
}

function presentLog(log: AiLog): Record<string, unknown> {
  return {
    id: log.id,
    queueId: log.queueId,
    entityType: log.entityType,
    entityId: log.entityId,
    jobType: log.jobType,
    model: log.modelUsed,
    provider: log.provider,
    tokensInput: log.tokensInput ?? 0,
    tokensOutput: log.tokensOutput ?? 0,
    costUsd: log.costUsd ? Number(log.costUsd) : 0,
    status: log.status,
    error: log.errorMessage,
    createdAt: log.createdAt.toISOString(),
  };
}

// ───────────────────────── Enqueue / generate ─────────────────────────

interface EnqueueInput {
  entityType: AiEntityType;
  entityId: string;
  jobTypes?: AiJobType[];
  priority?: number;
}

/** Create + dispatch AI jobs for one entity (FR-050/FR-052). */
export async function enqueueJobs(input: EnqueueInput): Promise<Record<string, unknown>[]> {
  const jobTypes = input.jobTypes?.length ? input.jobTypes : JOBS_FOR_ENTITY[input.entityType];
  if (!jobTypes.length) throw ApiError.badRequest(`No AI jobs apply to ${input.entityType}`);

  const created = await prisma.$transaction(
    jobTypes.map((jobType) =>
      prisma.aiQueue.create({
        data: { entityType: input.entityType, entityId: input.entityId, jobType, priority: input.priority ?? 0 },
      }),
    ),
  );
  await dispatchAiJobs(created.map((j) => j.id));
  const fresh = await prisma.aiQueue.findMany({ where: { id: { in: created.map((j) => j.id) } } });
  return fresh.map(presentJob);
}

interface BulkInput {
  entityType: AiEntityType;
  entityIds?: string[];
  jobTypes?: AiJobType[];
  limit?: number;
}

/**
 * Bulk-generate (FR-051, `POST /admin/ai/bulk-generate`). Targets explicit ids, or —
 * for products — those still needing AI (`aiStatus` pending/failed), capped by `limit`.
 */
export async function bulkGenerate(input: BulkInput): Promise<{ entities: number; jobs: number }> {
  let ids = input.entityIds ?? [];
  if (ids.length === 0 && input.entityType === 'product') {
    const rows = await prisma.product.findMany({
      where: { aiStatus: { in: ['pending', 'failed'] } },
      select: { id: true },
      take: Math.min(input.limit ?? 50, 500),
    });
    ids = rows.map((r) => r.id);
  }
  if (ids.length === 0) throw ApiError.badRequest('No entities to generate for');

  let jobs = 0;
  for (const entityId of ids) {
    const created = await enqueueJobs({ entityType: input.entityType, entityId, jobTypes: input.jobTypes });
    jobs += created.length;
  }
  return { entities: ids.length, jobs };
}

// ───────────────────────── Queue queries ─────────────────────────

export interface QueueQuery {
  page: number;
  perPage: number;
  status?: AiQueue['status'] | 'active';
  entityType?: AiEntityType;
  jobType?: AiJobType;
}

export async function listQueue(q: QueueQuery): Promise<{ items: unknown[]; pagination: Pagination }> {
  const and: Prisma.AiQueueWhereInput[] = [];
  if (q.status === 'active') and.push({ status: { in: ['pending', 'processing'] } });
  else if (q.status) and.push({ status: q.status });
  if (q.entityType) and.push({ entityType: q.entityType });
  if (q.jobType) and.push({ jobType: q.jobType });
  const where = and.length ? { AND: and } : {};

  const [rows, total] = await prisma.$transaction([
    prisma.aiQueue.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      skip: (q.page - 1) * q.perPage,
      take: q.perPage,
    }),
    prisma.aiQueue.count({ where }),
  ]);
  return {
    items: rows.map(presentJob),
    pagination: { page: q.page, perPage: q.perPage, total, totalPages: Math.max(1, Math.ceil(total / q.perPage)) },
  };
}

export async function getJob(id: string): Promise<Record<string, unknown>> {
  const job = await prisma.aiQueue.findUnique({ where: { id }, include: { logs: { orderBy: { createdAt: 'desc' } } } });
  if (!job) throw ApiError.notFound('AI job not found');
  return { ...presentJob(job), logs: job.logs.map(presentLog) };
}

// ───────────────────────── Job control ─────────────────────────

export async function retryJob(id: string): Promise<Record<string, unknown>> {
  const job = await prisma.aiQueue.findUnique({ where: { id } });
  if (!job) throw ApiError.notFound('AI job not found');
  if (job.status === 'pending' || job.status === 'processing') throw ApiError.badRequest('Job is already queued');
  await prisma.aiQueue.update({
    where: { id },
    data: { status: 'pending', errorMessage: null, attempts: 0, startedAt: null, completedAt: null },
  });
  await dispatchAiJobs([id]);
  const fresh = await prisma.aiQueue.findUniqueOrThrow({ where: { id } });
  return presentJob(fresh);
}

export async function retryAllFailed(): Promise<{ retried: number }> {
  const failed = await prisma.aiQueue.findMany({ where: { status: 'failed' }, select: { id: true } });
  if (failed.length === 0) return { retried: 0 };
  await prisma.aiQueue.updateMany({
    where: { status: 'failed' },
    data: { status: 'pending', errorMessage: null, attempts: 0, startedAt: null, completedAt: null },
  });
  await dispatchAiJobs(failed.map((f) => f.id));
  return { retried: failed.length };
}

/** Approve a completed job → apply its content to the entity (review gate, §4.6). */
export async function approveJob(id: string): Promise<Record<string, unknown>> {
  const job = await prisma.aiQueue.findUnique({ where: { id } });
  if (!job) throw ApiError.notFound('AI job not found');
  if (job.status !== 'done') throw ApiError.badRequest('Only completed jobs can be approved');
  await applyApprovedResult(job);
  const updated = await prisma.aiQueue.update({ where: { id }, data: { approved: true, approvedAt: new Date() } });
  return presentJob(updated);
}

// ───────────────────────── Stats / logs / providers / usage ─────────────────────────

function startOfMonth(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

export async function getStats(): Promise<Record<string, unknown>> {
  const monthStart = startOfMonth();
  const [monthAgg, activeJobs, doneJobs, failedJobs, pendingReview] = await Promise.all([
    prisma.aiLog.aggregate({
      where: { createdAt: { gte: monthStart } },
      _sum: { tokensInput: true, tokensOutput: true, costUsd: true },
    }),
    prisma.aiQueue.count({ where: { status: { in: ['pending', 'processing'] } } }),
    prisma.aiQueue.count({ where: { status: 'done' } }),
    prisma.aiQueue.count({ where: { status: 'failed' } }),
    prisma.aiQueue.count({ where: { status: 'done', approved: false } }),
  ]);
  const providers = listProviders();
  const tokensIn = monthAgg._sum.tokensInput ?? 0;
  const tokensOut = monthAgg._sum.tokensOutput ?? 0;
  return {
    totalTokensThisMonth: tokensIn + tokensOut,
    costThisMonth: Number(Number(monthAgg._sum.costUsd ?? 0).toFixed(2)),
    activeJobs,
    doneJobs,
    failedJobs,
    pendingReview,
    activeProviders: providers.filter((p) => isUsable(p.status)).length,
    totalProviders: providers.length,
  };
}

export interface LogsQuery {
  page: number;
  perPage: number;
  status?: AiLog['status'];
  entityType?: AiEntityType;
}

export async function listLogs(q: LogsQuery): Promise<{ items: unknown[]; pagination: Pagination }> {
  const where: Prisma.AiLogWhereInput = {};
  if (q.status) where.status = q.status;
  if (q.entityType) where.entityType = q.entityType;
  const [rows, total] = await prisma.$transaction([
    prisma.aiLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (q.page - 1) * q.perPage, take: q.perPage }),
    prisma.aiLog.count({ where }),
  ]);
  return {
    items: rows.map(presentLog),
    pagination: { page: q.page, perPage: q.perPage, total, totalPages: Math.max(1, Math.ceil(total / q.perPage)) },
  };
}

/**
 * Provider status — the single source of truth shared with the admin UI:
 *   - 'active'         → this provider actually serves requests right now
 *                        (AI_DRIVER=live, key configured, first usable in order).
 *   - 'configured'     → key is configured but it is NOT the selected/used one
 *                        (a live fallback, or any real provider while in mock mode).
 *   - 'not_configured' → required API key env var is missing.
 *   - 'mock'           → the built-in mock driver, active because AI_DRIVER=mock.
 * A real external provider is NEVER 'active' unless AI_DRIVER=live AND its key is set.
 */
export type ProviderStatus = 'active' | 'configured' | 'not_configured' | 'mock';

interface ProviderView {
  id: string;
  name: string;
  status: ProviderStatus;
  primary: boolean;
  models: string[];
  /** Env var name(s) that must be set for this provider to become usable (empty for mock). */
  requiredEnv: string[];
}

type RealProviderId = 'anthropic' | 'openai' | 'gemini';
const REAL_PROVIDERS: { id: RealProviderId; name: string; model: () => string; env: string }[] = [
  { id: 'anthropic', name: 'Anthropic', model: () => env.ANTHROPIC_MODEL, env: 'ANTHROPIC_API_KEY' },
  { id: 'openai', name: 'OpenAI', model: () => env.OPENAI_MODEL, env: 'OPENAI_API_KEY' },
  { id: 'gemini', name: 'Google AI', model: () => env.GOOGLE_AI_MODEL, env: 'GOOGLE_AI_API_KEY' },
];

/**
 * Pure status resolver (unit-tested). Given the runtime driver mode, the selected
 * primary, and which real providers have their key configured, decide each
 * provider's status. In live mode only the first configured provider in order
 * (primary first) is "active"; every other configured provider is "configured"
 * (not selected). In mock mode no real provider is active — the mock driver is.
 */
export function resolveProviderStatuses(opts: {
  live: boolean;
  primary: RealProviderId;
  configured: Record<RealProviderId, boolean>;
}): Record<RealProviderId | 'mock', ProviderStatus> {
  const ids: RealProviderId[] = ['anthropic', 'openai', 'gemini'];
  const order: RealProviderId[] = [opts.primary, ...ids.filter((id) => id !== opts.primary)];
  const firstUsable = opts.live ? order.find((id) => opts.configured[id]) ?? null : null;

  const realStatus = (id: RealProviderId): ProviderStatus => {
    if (!opts.configured[id]) return 'not_configured';
    if (!opts.live) return 'configured'; // key present, but mock mode is on → not in use
    return id === firstUsable ? 'active' : 'configured';
  };

  return {
    anthropic: realStatus('anthropic'),
    openai: realStatus('openai'),
    gemini: realStatus('gemini'),
    mock: opts.live ? 'not_configured' : 'mock',
  };
}

/** Configured providers + status (FR-053). Drives the AI Providers tab. */
export function listProviders(): ProviderView[] {
  const primary = env.AI_PRIMARY_PROVIDER;
  const statuses = resolveProviderStatuses({
    live: env.AI_DRIVER === 'live',
    primary,
    configured: {
      anthropic: providerConfigured('anthropic'),
      openai: providerConfigured('openai'),
      gemini: providerConfigured('gemini'),
    },
  });

  const real: ProviderView[] = REAL_PROVIDERS.map((p) => ({
    id: p.id,
    name: p.name,
    models: [p.model()],
    status: statuses[p.id],
    primary: primary === p.id,
    requiredEnv: [p.env],
  }));

  return [
    ...real,
    { id: 'mock', name: 'Local (Mock)', models: ['mock'], status: statuses.mock, primary: false, requiredEnv: [] },
  ];
}

/** Providers that can serve a request right now (the live selected one, or mock). */
function isUsable(status: ProviderStatus): boolean {
  return status === 'active' || status === 'mock';
}

/** Providers with usage rolled up from AiLog (tokens + cost + last used). */
export async function getProvidersWithUsage(): Promise<Record<string, unknown>[]> {
  const usage = await prisma.aiLog.groupBy({
    by: ['provider'],
    _sum: { tokensInput: true, tokensOutput: true, costUsd: true },
    _max: { createdAt: true },
  });
  const byProvider = new Map(usage.map((u) => [u.provider ?? 'mock', u]));
  return listProviders().map((p) => {
    const u = byProvider.get(p.id);
    return {
      ...p,
      driver: env.AI_DRIVER,
      usage: {
        tokens: (u?._sum.tokensInput ?? 0) + (u?._sum.tokensOutput ?? 0),
        cost: Number(Number(u?._sum.costUsd ?? 0).toFixed(2)),
      },
      lastUsed: u?._max.createdAt ? u._max.createdAt.toISOString() : null,
    };
  });
}

/** Usage & Costs tab data: daily token/cost series + provider distribution + in/out split. */
export async function getUsage(days = 10): Promise<Record<string, unknown>> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const logs = await prisma.aiLog.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true, tokensInput: true, tokensOutput: true, costUsd: true, provider: true },
    orderBy: { createdAt: 'asc' },
  });

  const daily = new Map<string, { tokens: number; cost: number }>();
  const byProvider = new Map<string, number>();
  let inputCost = 0;
  let outputCost = 0;
  for (const l of logs) {
    const day = l.createdAt.toISOString().slice(0, 10);
    const t = (l.tokensInput ?? 0) + (l.tokensOutput ?? 0);
    const c = Number(l.costUsd ?? 0);
    const d = daily.get(day) ?? { tokens: 0, cost: 0 };
    d.tokens += t;
    d.cost += c;
    daily.set(day, d);
    byProvider.set(l.provider ?? 'mock', (byProvider.get(l.provider ?? 'mock') ?? 0) + t);
    // Split cost ~ proportionally to in/out tokens for the breakdown card.
    const tin = l.tokensInput ?? 0;
    const tout = l.tokensOutput ?? 0;
    if (tin + tout > 0) {
      inputCost += (c * tin) / (tin + tout);
      outputCost += (c * tout) / (tin + tout);
    }
  }
  return {
    daily: [...daily.entries()].map(([date, v]) => ({ date, tokens: v.tokens, cost: Number(v.cost.toFixed(2)) })),
    providerDistribution: [...byProvider.entries()].map(([name, tokens]) => ({ name, tokens })),
    inputCost: Number(inputCost.toFixed(2)),
    outputCost: Number(outputCost.toFixed(2)),
  };
}

/** Delete AiLog rows older than the retention window (FR-055). Returns deleted count. */
export async function pruneLogs(): Promise<number> {
  const cutoff = new Date(Date.now() - AI_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const { count } = await prisma.aiLog.deleteMany({ where: { createdAt: { lt: cutoff } } });
  return count;
}
