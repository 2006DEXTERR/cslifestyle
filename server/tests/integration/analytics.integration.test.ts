import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { createApp } from '../../src/app';

// Analytics & Reporting integration tests. Gated on RUN_DB_TESTS. ANALYTICS_DRIVER=mock
// (offline) + QUEUE_DRIVER=inline, so report generation runs in-process.

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
  const reg = await agent.post('/api/auth/register').send({ name: 'Plain', email: `an_${randomUUID()}@example.com`, password: USER_PASSWORD });
  return { agent, csrf: cookieValue(reg, 'cs_csrf') ?? (reg.body.data.csrfToken as string) };
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe.skipIf(!RUN)('analytics integration (DB)', () => {
  let productId = '';
  beforeAll(async () => {
    const res = await request(app).get('/api/products?perPage=1');
    productId = res.body.data[0]?.id ?? '';
    expect(productId).not.toBe('');
  });

  // ── RBAC ──
  it('guards dashboards (401 unauth, 403 plain user, 200 admin)', async () => {
    expect((await request(app).get('/api/analytics/dashboard')).status).toBe(401);
    const { agent } = await adminSession();
    const user = await userSession();
    expect((await user.agent.get('/api/analytics/dashboard')).status).toBe(403);
    expect((await agent.get('/api/analytics/dashboard')).status).toBe(200);
  });

  it('rejects report generation without CSRF', async () => {
    const { agent } = await adminSession();
    expect((await agent.post('/api/analytics/reports').send({ type: 'custom', range: 'last7days' })).status).toBe(403);
  });

  // ── Public collector + privacy + dashboard aggregation ──
  it('accepts a public privacy-safe beacon and aggregates it (no PII exposed)', async () => {
    const sessionId = `sess_${randomUUID()}`;
    const beacon = await request(app)
      .post('/api/analytics/collect')
      .send({ type: 'product_view', entityType: 'product', entityId: productId, url: '/products/test', sessionId });
    expect(beacon.status).toBe(202);

    // Aggregation is fire-and-forget — poll briefly.
    const { agent } = await adminSession();
    let pageViews = 0;
    for (let i = 0; i < 15 && pageViews === 0; i++) {
      await sleep(150);
      pageViews = (await agent.get('/api/analytics/dashboard?range=today')).body.data.cards.pageViews;
    }
    expect(pageViews).toBeGreaterThan(0);

    const events = await agent.get('/api/analytics/events?perPage=5&eventType=product_view');
    expect(events.status).toBe(200);
    expect(events.body.data.length).toBeGreaterThan(0);
    // Privacy: the presenter must not leak hashed/raw IP.
    expect(events.body.data[0]).not.toHaveProperty('ipHash');
    expect(events.body.data[0]).not.toHaveProperty('ip');
    expect(events.body.data[0]).toHaveProperty('eventType', 'product_view');
  });

  it('rejects a forged privileged event type at the collector', async () => {
    const res = await request(app).post('/api/analytics/collect').send({ type: 'affiliate_click', entityId: 'x' });
    expect(res.status).toBe(400); // not in the public allow-list
  });

  // ── Dashboard + section shapes ──
  it('returns dashboard + product + search + revenue + ai + content shapes', async () => {
    const { agent } = await adminSession();
    const dash = (await agent.get('/api/analytics/dashboard?range=last30days')).body.data;
    for (const k of ['pageViews', 'productViews', 'affiliateClicks', 'revenue', 'aiCost', 'searchCount', 'importCount', 'bounceRate']) {
      expect(dash.cards).toHaveProperty(k);
    }
    expect(Array.isArray(dash.traffic)).toBe(true);

    expect((await agent.get('/api/analytics/products')).body.data).toHaveProperty('mostViewed');
    expect((await agent.get('/api/analytics/search')).body.data).toHaveProperty('topSearches');
    const rev = (await agent.get('/api/analytics/revenue')).body.data;
    expect(rev).toHaveProperty('byCategory');
    expect(rev).toHaveProperty('estimateInputs');
    expect((await agent.get('/api/analytics/ai')).body.data).toHaveProperty('byProvider');
    expect((await agent.get('/api/analytics/content')).body.data).toHaveProperty('topGuides');
    expect((await agent.get('/api/analytics/providers')).body.data).toHaveLength(3);
  });

  // ── Reports (reports.view / reports.manage) ──
  it('generates, lists, fetches and deletes a report snapshot', async () => {
    const { agent, csrf } = await adminSession();
    const gen = await agent.post('/api/analytics/reports').set('x-csrf-token', csrf).send({ type: 'custom', range: 'last7days' });
    expect(gen.status).toBe(201);
    const id = gen.body.data.id as string;
    expect(gen.body.data.payload).toHaveProperty('dashboard');

    const list = await agent.get('/api/analytics/reports?perPage=5');
    expect(list.status).toBe(200);
    expect(list.body.meta.pagination.perPage).toBe(5);

    expect((await agent.get(`/api/analytics/reports/${id}`)).status).toBe(200);

    const user = await userSession();
    expect((await user.agent.get('/api/analytics/reports')).status).toBe(403);

    const del = await agent.delete(`/api/analytics/reports/${id}`).set('x-csrf-token', csrf);
    expect(del.status).toBe(200);
    expect((await agent.get(`/api/analytics/reports/${id}`)).status).toBe(404);
  });
});
