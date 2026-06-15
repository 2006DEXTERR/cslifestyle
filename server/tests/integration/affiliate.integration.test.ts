import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { createApp } from '../../src/app';

const RUN = process.env.RUN_DB_TESTS === 'true';
const app = createApp();

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@cslifestyle.in';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe!2026';
const USER_PASSWORD = 'Str0ngPass';
const ASIN = 'B0SEED0001'; // seeded iPhone 15 Pro Max

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
    .send({ name: 'Plain', email: `aff_${randomUUID()}@example.com`, password: USER_PASSWORD });
  return { agent, csrf: cookieValue(reg, 'cs_csrf') ?? (reg.body.data.csrfToken as string) };
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe.skipIf(!RUN)('affiliate integration (DB)', () => {
  // ── redirect engine ──
  it('302-redirects /go/:asin to amazon.in with the associate tag', async () => {
    const res = await request(app).get(`/go/${ASIN}`);
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('https://www.amazon.in/dp/B0SEED0001');
    expect(res.headers.location).toContain('tag=cslifestyle-21');
    expect(res.headers.location).toContain('linkCode=ogi');
  });

  it('applies a campaign tag via ?c=', async () => {
    const res = await request(app).get(`/go/${ASIN}?c=summer-sale&src=guide`);
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('tag=cslifestyle-summer-21');
  });

  it('redirects an invalid ASIN to a safe fallback (not an open redirect)', async () => {
    const res = await request(app).get('/go/not-an-asin');
    expect(res.status).toBe(302);
    expect(res.headers.location).not.toContain('amazon.in/dp/not-an-asin');
  });

  // ── privacy-safe click logging ──
  it('logs a click (privacy-safe — no ip/UA exposed) after a /go', async () => {
    const { agent } = await adminSession();
    const before = (await agent.get(`/api/affiliate/clicks?asin=${ASIN}&perPage=1`)).body.meta.pagination.total;

    await request(app).get(`/go/${ASIN}?src=product`).set('User-Agent', 'Mozilla/5.0 (iPhone) Mobile');

    let after = before;
    for (let i = 0; i < 15 && after <= before; i++) {
      await sleep(150);
      after = (await agent.get(`/api/affiliate/clicks?asin=${ASIN}&perPage=1`)).body.meta.pagination.total;
    }
    expect(after).toBeGreaterThan(before);

    const list = await agent.get(`/api/affiliate/clicks?asin=${ASIN}&perPage=5`);
    expect(list.status).toBe(200);
    const sample = list.body.data[0];
    expect(sample).not.toHaveProperty('ipHash');
    expect(sample).not.toHaveProperty('userAgentHash');
    expect(sample.asin).toBe(ASIN);
  });

  // ── RBAC ──
  it('protects admin endpoints (401 unauth, 403 plain user, 200 admin)', async () => {
    expect((await request(app).get('/api/affiliate/stats')).status).toBe(401);
    const user = await userSession();
    expect((await user.agent.get('/api/affiliate/stats')).status).toBe(403);
    const admin = await adminSession();
    const ok = await admin.agent.get('/api/affiliate/stats?days=30');
    expect(ok.status).toBe(200);
    expect(ok.body.data).toHaveProperty('totalClicks');
    expect(ok.body.data).toHaveProperty('daily');
    expect(Array.isArray(ok.body.data.daily)).toBe(true);
  });

  it('returns top products + compliance checklist', async () => {
    const { agent } = await adminSession();
    const top = await agent.get('/api/affiliate/top-products?days=30');
    expect(top.status).toBe(200);
    expect(Array.isArray(top.body.data)).toBe(true);

    const comp = await agent.get('/api/affiliate/compliance');
    expect(comp.status).toBe(200);
    expect(comp.body.data.score).toBeGreaterThan(0);
    const tagItem = comp.body.data.items.find((i: { id: string }) => i.id === 'associate_tag');
    expect(tagItem.status).toBe('pass');
  });

  // ── settings (associate-tag management) ──
  it('gets and updates affiliate settings (admin + CSRF)', async () => {
    const { agent, csrf } = await adminSession();
    const get = await agent.get('/api/affiliate/settings');
    expect(get.status).toBe(200);
    expect(get.body.data.amazonAssociateTag).toBeTruthy();

    const upd = await agent.put('/api/affiliate/settings').set('x-csrf-token', csrf).send({ amazonAssociateTag: 'cslifestyle-99' });
    expect(upd.status).toBe(200);
    expect(upd.body.data.amazonAssociateTag).toBe('cslifestyle-99');
    // restore
    await agent.put('/api/affiliate/settings').set('x-csrf-token', csrf).send({ amazonAssociateTag: 'cslifestyle-21' });

    const user = await userSession();
    expect((await user.agent.put('/api/affiliate/settings').set('x-csrf-token', user.csrf).send({ amazonAssociateTag: 'x' })).status).toBe(403);
  });

  // ── campaigns ──
  it('creates, updates and deletes a campaign', async () => {
    const { agent, csrf } = await adminSession();
    const created = await agent
      .post('/api/affiliate/campaigns')
      .set('x-csrf-token', csrf)
      .send({ name: `Test Campaign ${randomUUID().slice(0, 6)}`, affiliateTag: 'cslifestyle-test-21' });
    expect(created.status).toBe(201);
    const id = created.body.data.id as string;
    expect(created.body.data.goUrl).toContain('?c=');

    const upd = await agent.put(`/api/affiliate/campaigns/${id}`).set('x-csrf-token', csrf).send({ isActive: false });
    expect(upd.body.data.isActive).toBe(false);
    expect((await agent.delete(`/api/affiliate/campaigns/${id}`).set('x-csrf-token', csrf)).status).toBe(200);
  });

  // ── revenue CSV import ──
  it('imports a revenue CSV and reflects it in the summary + imports list', async () => {
    const { agent, csrf } = await adminSession();
    const csv = ['date,asin,category,revenue,orders,clicks', `2026-06-01,${ASIN},Smartphones,1250.50,12,400`, '2026-06-02,B0SEED0002,Smartphones,980,9,310'].join('\n');

    const imp = await agent
      .post('/api/revenue/import')
      .set('x-csrf-token', csrf)
      .send({ fileName: 'test.csv', source: 'amazon_csv', csv });
    expect(imp.status).toBe(201);
    expect(imp.body.data.rowCount).toBe(2);
    expect(imp.body.data.totalRevenue).toBeCloseTo(2230.5, 1);

    const imports = await agent.get('/api/revenue/imports');
    expect(imports.body.data.some((i: { fileName: string }) => i.fileName === 'test.csv')).toBe(true);

    const summary = await agent.get('/api/revenue/summary?days=365');
    expect(summary.status).toBe(200);
    expect(summary.body.data.totalRevenue).toBeGreaterThan(0);

    const reports = await agent.get('/api/revenue/reports?source=amazon_csv&perPage=10');
    expect(reports.status).toBe(200);
    expect(reports.body.data.length).toBeGreaterThan(0);
  });

  it('rejects an invalid revenue CSV (400)', async () => {
    const { agent, csrf } = await adminSession();
    const res = await agent
      .post('/api/revenue/import')
      .set('x-csrf-token', csrf)
      .send({ fileName: 'bad.csv', source: 'amazon_csv', csv: 'foo,bar\n1,2' });
    expect(res.status).toBe(400);
  });
});
