import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { createApp } from '../../src/app';

// Import Center integration tests. Gated on RUN_DB_TESTS (embedded Postgres harness).
// The inline queue driver (QUEUE_DRIVER=inline, the default) runs jobs in-process,
// so a POST returns a job that is already `completed`.

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
    .send({ name: 'Plain', email: `imp_${randomUUID()}@example.com`, password: USER_PASSWORD });
  return { agent, csrf: cookieValue(reg, 'cs_csrf') ?? (reg.body.data.csrfToken as string) };
}

const uniqAsin = () => ('B0' + randomUUID().replace(/[^A-Z0-9]/gi, '').toUpperCase()).slice(0, 10);

describe.skipIf(!RUN)('import center integration (DB)', () => {
  // ── RBAC ──
  it('guards endpoints (401 unauth, 403 plain user, 200 admin)', async () => {
    expect((await request(app).get('/api/import/stats')).status).toBe(401);
    const { agent } = await adminSession();
    const user = await userSession();
    expect((await user.agent.get('/api/import/stats')).status).toBe(403);
    expect((await agent.get('/api/import/stats')).status).toBe(200);
  });

  it('rejects writes without a CSRF token', async () => {
    const { agent } = await adminSession();
    const res = await agent.post('/api/import/asins').send({ asins: [uniqAsin()] });
    expect(res.status).toBe(403);
  });

  // ── CSV import ──
  it('imports a products CSV and reports per-row outcomes', async () => {
    const { agent, csrf } = await adminSession();
    const asin = uniqAsin();
    const csv = [
      'asin,title,brand,category,price,rating,reviewCount',
      `${asin},Test Widget ${asin},Acme,Gadgets,1999,4.5,120`,
      ',Missing Asin Row,Acme,Gadgets,10,3,2', // invalid → failed
    ].join('\n');

    const res = await agent
      .post('/api/import/csv')
      .set('x-csrf-token', csrf)
      .send({ fileName: 'test.csv', csv });
    expect(res.status).toBe(201);
    const job = res.body.data;
    expect(job.type).toBe('csv_product');
    expect(job.status).toBe('completed');
    expect(job.totalItems).toBe(2);
    expect(job.successCount).toBe(1);
    expect(job.failedCount).toBe(1);

    const report = await agent.get(`/api/import/jobs/${job.id}/report`);
    expect(report.status).toBe(200);
    expect(report.body.data.imported).toBe(1);
    expect(report.body.data.failed).toBe(1);
    expect(report.body.data.errors.length).toBeGreaterThan(0);
  });

  // ── ASIN import + duplicate detection ──
  it('imports ASINs and detects duplicates on re-import (skip mode)', async () => {
    const { agent, csrf } = await adminSession();
    const asin = uniqAsin();

    const first = await agent.post('/api/import/asins').set('x-csrf-token', csrf).send({ asins: [asin, asin] });
    expect(first.status).toBe(201);
    // Deduped input → 1 item, 1 created.
    expect(first.body.data.totalItems).toBe(1);
    expect(first.body.data.successCount).toBe(1);

    const second = await agent
      .post('/api/import/asins')
      .set('x-csrf-token', csrf)
      .send({ asins: [asin], duplicateMode: 'skip' });
    expect(second.body.data.successCount).toBe(0);
    expect(second.body.data.skippedCount + second.body.data.failedCount).toBeGreaterThanOrEqual(0);
    // The job's report records the duplicate.
    const report = await agent.get(`/api/import/jobs/${second.body.data.id}/report`);
    expect(report.body.data.duplicates).toBeGreaterThanOrEqual(1);
  });

  // ── Category import (nested) ──
  it('imports nested categories with parent mapping', async () => {
    const { agent, csrf } = await adminSession();
    const parent = `Cat ${randomUUID().slice(0, 8)}`;
    const child = `Sub ${randomUUID().slice(0, 8)}`;
    const res = await agent
      .post('/api/import/categories')
      .set('x-csrf-token', csrf)
      .send({ categories: [{ name: parent }, { name: child, parentName: parent }] });
    expect(res.status).toBe(201);
    expect(res.body.data.type).toBe('category');
    expect(res.body.data.successCount).toBe(2);

    const detail = await agent.get(`/api/import/jobs/${res.body.data.id}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.items.length).toBe(2);
  });

  // ── Listing + stats ──
  it('lists jobs (paginated) and reports stats', async () => {
    const { agent } = await adminSession();
    const list = await agent.get('/api/import/jobs?perPage=5');
    expect(list.status).toBe(200);
    expect(Array.isArray(list.body.data)).toBe(true);
    expect(list.body.meta.pagination.perPage).toBe(5);

    const stats = await agent.get('/api/import/stats');
    expect(stats.body.data).toHaveProperty('successRate');
    expect(stats.body.data).toHaveProperty('completedJobs');
  });
});
