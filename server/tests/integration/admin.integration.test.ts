import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { createApp } from '../../src/app';

/**
 * Admin management integration + RBAC tests (Phase 13): users, roles,
 * settings, SEO sitemap. Require a migrated + seeded PostgreSQL — gated on
 * RUN_DB_TESTS.
 */
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
    .send({ name: 'Plain User', email: `adm_${randomUUID()}@example.com`, password: USER_PASSWORD });
  expect(reg.status).toBe(201);
  return { agent, csrf: cookieValue(reg, 'cs_csrf') ?? (reg.body.data.csrfToken as string) };
}

describe.skipIf(!RUN)('admin management integration (DB)', () => {
  // ── Users ──
  it('requires auth to list users', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(401);
  });

  it('forbids a plain user from listing users', async () => {
    const { agent } = await userSession();
    const res = await agent.get('/api/users');
    expect(res.status).toBe(403);
  });

  it('admin lists users without exposing secrets', async () => {
    const { agent } = await adminSession();
    const res = await agent.get('/api/users');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.meta.pagination).toBeTruthy();
    const u = res.body.data[0];
    expect(u.passwordHash).toBeUndefined();
    expect(u.twoFactorSecret).toBeUndefined();
    expect(u.role).toBeTruthy();
    expect(['active', 'inactive']).toContain(u.status);
  });

  it('admin edits a user and toggles status', async () => {
    const { agent, csrf } = await adminSession();
    // create a target user via registration so we never mutate the seed admin
    const targetEmail = `target_${randomUUID()}@example.com`;
    const reg = await request.agent(app).post('/api/auth/register').send({ name: 'Target', email: targetEmail, password: USER_PASSWORD });
    expect(reg.status).toBe(201);

    const list = await agent.get(`/api/users?q=${encodeURIComponent(targetEmail)}`);
    expect(list.status).toBe(200);
    const target = list.body.data.find((x: { email: string }) => x.email === targetEmail);
    expect(target).toBeTruthy();

    const upd = await agent
      .patch(`/api/users/${target.id}`)
      .set('x-csrf-token', csrf)
      .send({ name: 'Target Renamed' });
    expect(upd.status).toBe(200);
    expect(upd.body.data.name).toBe('Target Renamed');

    const deact = await agent
      .patch(`/api/users/${target.id}/status`)
      .set('x-csrf-token', csrf)
      .send({ isActive: false });
    expect(deact.status).toBe(200);
    expect(deact.body.data.status).toBe('inactive');
  });

  // ── Roles ──
  it('admin lists roles with permissions + user counts', async () => {
    const { agent } = await adminSession();
    const res = await agent.get('/api/roles');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(5);
    const adminRole = res.body.data.find((r: { name: string }) => r.name === 'admin');
    expect(adminRole).toBeTruthy();
    expect(adminRole.permissions.length).toBeGreaterThan(50);
    expect(adminRole.permissions).toContain('users.view');
    expect(typeof adminRole.userCount).toBe('number');
  });

  it('admin updates a role description', async () => {
    const { agent, csrf } = await adminSession();
    const list = await agent.get('/api/roles');
    const editor = list.body.data.find((r: { name: string }) => r.name === 'editor');
    const res = await agent
      .patch(`/api/roles/${editor.id}`)
      .set('x-csrf-token', csrf)
      .send({ description: 'Content management (updated by test)' });
    expect(res.status).toBe(200);
    expect(res.body.data.description).toContain('updated by test');
  });

  // ── Settings ──
  it('admin saves + reloads settings (persist)', async () => {
    const { agent, csrf } = await adminSession();
    const key = `test.flag_${randomUUID().slice(0, 8)}`;
    const put = await agent
      .put('/api/settings')
      .set('x-csrf-token', csrf)
      .send({ values: { 'site.name': 'CSLifestyle QA', [key]: 'on' } });
    expect(put.status).toBe(200);
    expect(put.body.data.values['site.name']).toBe('CSLifestyle QA');

    const get = await agent.get('/api/settings');
    expect(get.status).toBe(200);
    expect(get.body.data.values['site.name']).toBe('CSLifestyle QA');
    expect(get.body.data.values[key]).toBe('on');
  });

  // ── SEO ──
  it('admin reads real sitemap status', async () => {
    const { agent } = await adminSession();
    const res = await agent.get('/api/seo/sitemap');
    expect(res.status).toBe(200);
    expect(res.body.data.totalUrls).toBeGreaterThan(0);
    expect(res.body.data.byType.products).toBeGreaterThanOrEqual(1);
    expect(res.body.data.sitemapUrl).toBe('/sitemap.xml');
  });

  // ── Dashboard overview ──
  it('requires auth for the dashboard overview', async () => {
    expect((await request(app).get('/api/admin/overview')).status).toBe(401);
  });

  it('forbids a plain user from the dashboard overview', async () => {
    const { agent } = await userSession();
    expect((await agent.get('/api/admin/overview')).status).toBe(403);
  });

  it('admin reads live dashboard overview counts (Prisma aggregation, no mock)', async () => {
    const { agent } = await adminSession();
    const res = await agent.get('/api/admin/overview');
    expect(res.status).toBe(200);
    const d = res.body.data;
    // Live counts derived from the seeded catalog.
    expect(d.counts.products.total).toBeGreaterThanOrEqual(1);
    expect(d.counts.products.published + d.counts.products.draft).toBe(d.counts.products.total);
    expect(d.counts.categories).toBeGreaterThanOrEqual(1);
    expect(d.counts.users).toBeGreaterThanOrEqual(1);
    expect(d.counts.roles).toBeGreaterThanOrEqual(1);
    // Shapes for the charts/lists.
    expect(Array.isArray(d.categoryDistribution)).toBe(true);
    expect(Array.isArray(d.recentProducts)).toBe(true);
    expect(d.contentGrowth).toHaveLength(6);
    expect(d.affiliateClicksDaily).toHaveLength(7);
  });
});
