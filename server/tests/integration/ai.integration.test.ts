import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { createApp } from '../../src/app';

// AI Center integration tests. Gated on RUN_DB_TESTS (embedded Postgres harness).
// AI_DRIVER defaults to 'mock' and QUEUE_DRIVER to 'inline', so a POST /api/ai/generate
// runs the generation in-process and returns jobs that are already `done`.

const RUN = process.env.RUN_DB_TESTS === 'true';
const app = createApp();

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@cslifestyle.in';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe!2026';
const USER_PASSWORD = 'Str0ngPass';

function cookieValue(res: request.Response, name: string): string | undefined {
  const arr = res.headers['set-cookie'] as unknown as string[] | undefined;
  if (!arr) return undefined;
  for (const c of arr) {
    const m = new RegExp(`^${name}=([^;]+)`).exec(c);
    if (m) return m[1];
  }
  return undefined;
}
type Session = { agent: ReturnType<typeof request.agent>; csrf: string };
async function adminSession(): Promise<Session> {
  const agent = request.agent(app);
  const login = await agent.post('/api/auth/login').send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  expect(login.status).toBe(200);
  return { agent, csrf: cookieValue(login, 'cs_csrf') ?? (login.body.data.csrfToken as string) };
}
async function userSession(): Promise<Session> {
  const agent = request.agent(app);
  const reg = await agent
    .post('/api/auth/register')
    .send({ name: 'Plain', email: `ai_${randomUUID()}@example.com`, password: USER_PASSWORD });
  return { agent, csrf: cookieValue(reg, 'cs_csrf') ?? (reg.body.data.csrfToken as string) };
}

describe.skipIf(!RUN)('AI center integration (DB)', () => {
  let productId = '';
  beforeAll(async () => {
    const res = await request(app).get('/api/products?perPage=1');
    productId = res.body.data[0]?.id ?? '';
    expect(productId).not.toBe('');
  });

  // ── RBAC ──
  it('guards endpoints (401 unauth, 403 plain user, 200 admin)', async () => {
    expect((await request(app).get('/api/ai/stats')).status).toBe(401);
    const { agent } = await adminSession();
    const user = await userSession();
    expect((await user.agent.get('/api/ai/stats')).status).toBe(403);
    expect((await agent.get('/api/ai/stats')).status).toBe(200);
  });

  it('rejects writes without a CSRF token', async () => {
    const { agent } = await adminSession();
    const res = await agent.post('/api/ai/generate').send({ entityType: 'product', entityId: productId });
    expect(res.status).toBe(403);
  });

  // ── Generate (inline + mock → done) + logs (FR-050/052/055) ──
  it('generates AI content for a product and records cost logs', async () => {
    const { agent, csrf } = await adminSession();
    const res = await agent
      .post('/api/ai/generate')
      .set('x-csrf-token', csrf)
      .send({ entityType: 'product', entityId: productId, jobTypes: ['title', 'description', 'pros', 'faq'] });
    expect(res.status).toBe(201);
    const jobs = res.body.data as { status: string; jobType: string; approved: boolean; result: { text: string } | null }[];
    expect(jobs).toHaveLength(4);
    expect(jobs.every((j) => j.status === 'done')).toBe(true);
    expect(jobs.every((j) => j.approved === false)).toBe(true); // review gate: not yet applied
    expect(jobs.find((j) => j.jobType === 'title')?.result?.text).toBeTruthy();

    const logs = await agent.get('/api/ai/logs?perPage=5');
    expect(logs.status).toBe(200);
    expect(logs.body.data.length).toBeGreaterThan(0);
    expect(logs.body.data[0]).toHaveProperty('costUsd');
    expect(logs.body.data[0].provider).toBe('mock');
  });

  // ── Review gate: approval applies content to the entity (FR-052 / §4.6) ──
  it('approves a completed job → applies content; rejects approving a non-existent job', async () => {
    const { agent, csrf } = await adminSession();
    const gen = await agent
      .post('/api/ai/generate')
      .set('x-csrf-token', csrf)
      .send({ entityType: 'product', entityId: productId, jobTypes: ['title'] });
    const jobId = gen.body.data[0].id as string;

    const approve = await agent.post(`/api/ai/queue/approve/${jobId}`).set('x-csrf-token', csrf);
    expect(approve.status).toBe(200);
    expect(approve.body.data.approved).toBe(true);

    expect((await agent.post('/api/ai/queue/approve/does-not-exist').set('x-csrf-token', csrf)).status).toBe(404);
  });

  // ── Prompts (FR-054) ──
  it('lists 10 prompt templates and persists an edit', async () => {
    const { agent, csrf } = await adminSession();
    const list = await agent.get('/api/ai/prompts');
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(10);

    const upd = await agent
      .put('/api/ai/prompts/title')
      .set('x-csrf-token', csrf)
      .send({ template: 'Custom title prompt for {{title}} by {{brand}}.' });
    expect(upd.status).toBe(200);

    const after = await agent.get('/api/ai/prompts');
    const title = (after.body.data as { type: string; isDefault: boolean }[]).find((p) => p.type === 'title');
    expect(title?.isDefault).toBe(false);

    expect((await agent.put('/api/ai/prompts/nope').set('x-csrf-token', csrf).send({ template: 'x' })).status).toBe(400);
  });

  // ── Stats / providers / bulk / retry-all ──
  it('reports stats, providers, bulk-generates, and retries-all-failed', async () => {
    const { agent, csrf } = await adminSession();
    const stats = await agent.get('/api/ai/stats');
    expect(stats.body.data).toHaveProperty('costThisMonth');
    expect(stats.body.data.totalProviders).toBe(4);
    expect(stats.body.data.activeProviders).toBeGreaterThanOrEqual(1);

    const providers = await agent.get('/api/ai/providers');
    expect(providers.body.data).toHaveLength(4);
    expect((providers.body.data as { id: string; primary: boolean }[]).find((p) => p.id === 'anthropic')?.primary).toBe(true);

    const bulk = await agent.post('/api/ai/bulk-generate').set('x-csrf-token', csrf).send({ entityType: 'product', limit: 2 });
    expect(bulk.status).toBe(201);
    expect(bulk.body.data.jobs).toBeGreaterThan(0);

    const retry = await agent.post('/api/ai/queue/retry-all-failed').set('x-csrf-token', csrf);
    expect(retry.status).toBe(200);
    expect(retry.body.data).toHaveProperty('retried');
  });

  // ── Import auto-trigger (FR-006/FR-050) ──
  it('auto-enqueues AI jobs when a product is imported', async () => {
    const { agent, csrf } = await adminSession();
    const before = (await agent.get('/api/ai/queue?entityType=product&perPage=1')).body.meta.pagination.total as number;

    const asin = ('B0' + randomUUID().replace(/[^A-Z0-9]/gi, '').toUpperCase()).slice(0, 10);
    const imp = await agent.post('/api/import/asins').set('x-csrf-token', csrf).send({ asins: [asin] });
    expect(imp.status).toBe(201);

    const after = (await agent.get('/api/ai/queue?entityType=product&perPage=1')).body.meta.pagination.total as number;
    expect(after).toBeGreaterThan(before);
  });
});
