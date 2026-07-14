import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { createApp } from '../../src/app';

/**
 * Content integration + RBAC tests (authors, guides, comparisons).
 * Require a migrated + seeded PostgreSQL — gated on RUN_DB_TESTS.
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
    .send({ name: 'Plain User', email: `cnt_${randomUUID()}@example.com`, password: USER_PASSWORD });
  expect(reg.status).toBe(201);
  return { agent, csrf: cookieValue(reg, 'cs_csrf') ?? (reg.body.data.csrfToken as string) };
}

describe.skipIf(!RUN)('content integration (DB)', () => {
  let productIds: string[] = [];
  let categoryId: string;

  beforeAll(async () => {
    const prods = await request(app).get('/api/products?perPage=5');
    productIds = prods.body.data.map((p: { id: string }) => p.id);
    const cats = await request(app).get('/api/categories');
    categoryId = cats.body.data[0].id;
  });

  // ── public reads (seeded) ──
  it('lists seeded authors / guides / comparisons (public)', async () => {
    const a = await request(app).get('/api/authors');
    expect(a.status).toBe(200);
    expect(a.body.data.length).toBeGreaterThanOrEqual(4);

    const g = await request(app).get('/api/guides');
    expect(g.status).toBe(200);
    expect(g.body.data.length).toBeGreaterThanOrEqual(5);
    expect(g.body.meta.pagination).toBeTruthy();

    const c = await request(app).get('/api/comparisons');
    expect(c.status).toBe(200);
    expect(c.body.data.length).toBeGreaterThanOrEqual(3);
  });

  // Regression: the admin content pages fetch the full set with perPage=200. The cap used
  // to be 100 → 400 → empty admin Guides/Comparisons/Authors tables. All must accept 200.
  it('accepts perPage=200 on guides/comparisons/authors (admin full-set fetch)', async () => {
    for (const path of ['/api/guides', '/api/comparisons', '/api/authors']) {
      const res = await request(app).get(`${path}?status=all&perPage=200`);
      expect(res.status, `${path} should accept perPage=200`).toBe(200);
    }
    expect((await request(app).get('/api/guides?perPage=201')).status).toBe(400);
  });

  it('gets a guide by slug with author + product picks', async () => {
    const res = await request(app).get('/api/guides/best-smartphones-under-30000');
    expect(res.status).toBe(200);
    expect(res.body.data.author?.name).toBeTruthy();
    expect(res.body.data.productRecommendations.length).toBeGreaterThan(0);
  });

  it('gets a comparison by slug with products + specs + derived insights', async () => {
    const res = await request(app).get('/api/comparisons/iphone-15-vs-samsung-s24');
    expect(res.status).toBe(200);
    expect(res.body.data.productA?.name).toBeTruthy();
    expect(res.body.data.productB?.name).toBeTruthy();
    expect(res.body.data.categories.length).toBeGreaterThan(0);
    // Smart insights are computed from real fields (bestPrice/higherRated may be 'A'|'B'|null).
    const ins = res.body.data.insights;
    expect(ins).toBeTruthy();
    expect(ins.specWins.a + ins.specWins.b + ins.specWins.tie).toBe(res.body.data.categories.length);
    for (const k of ['bestPrice', 'higherRated', 'moreReviewed'] as const) {
      expect([null, 'A', 'B']).toContain(ins[k]);
    }
  });

  it('gets an author by slug with their published guides', async () => {
    const res = await request(app).get('/api/authors/priya-sharma');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.guides)).toBe(true);
    expect(res.body.data.articlesCount).toBeGreaterThanOrEqual(1);
  });

  it('404s unknown slugs', async () => {
    expect((await request(app).get('/api/guides/nope')).status).toBe(404);
    expect((await request(app).get('/api/comparisons/nope')).status).toBe(404);
    expect((await request(app).get('/api/authors/nope')).status).toBe(404);
  });

  // ── RBAC ──
  it('401 unauthenticated create, 403 plain user', async () => {
    expect((await request(app).post('/api/guides').send({ title: 'X' })).status).toBe(401);
    const { agent, csrf } = await userSession();
    const res = await agent.post('/api/guides').set('x-csrf-token', csrf).send({ title: 'Nope' });
    expect(res.status).toBe(403);
  });

  // ── author lifecycle ──
  it('admin creates, updates and deletes an author', async () => {
    const { agent, csrf } = await adminSession();
    const created = await agent
      .post('/api/authors')
      .set('x-csrf-token', csrf)
      .send({ name: `Test Author ${randomUUID().slice(0, 6)}`, expertise: ['Audio'], socialLinks: { twitter: 't' } });
    expect(created.status).toBe(201);
    const id = created.body.data.id as string;
    const upd = await agent.put(`/api/authors/${id}`).set('x-csrf-token', csrf).send({ bio: 'Updated bio' });
    expect(upd.body.data.bio).toBe('Updated bio');
    expect((await agent.delete(`/api/authors/${id}`).set('x-csrf-token', csrf)).status).toBe(200);
  });

  // ── guide lifecycle + publish/draft + product picks ──
  it('admin creates a draft guide (hidden), publishes it, then deletes', async () => {
    const { agent, csrf } = await adminSession();
    const created = await agent
      .post('/api/guides')
      .set('x-csrf-token', csrf)
      .send({
        title: 'Test Guide',
        categoryId,
        readingTime: 7,
        products: [{ productId: productIds[0], reason: 'great', isTopPick: true }],
        status: 'draft',
      });
    expect(created.status).toBe(201);
    const id = created.body.data.id as string;
    const slug = created.body.data.slug as string;
    expect(created.body.data.status).toBe('draft');
    expect(created.body.data.productRecommendations.length).toBe(1);

    // Draft hidden from public.
    expect((await request(app).get(`/api/guides/${slug}`)).status).toBe(404);

    // Publish via the action endpoint.
    const pub = await agent.post(`/api/guides/${id}/publish`).set('x-csrf-token', csrf);
    expect(pub.status).toBe(200);
    expect(pub.body.data.status).toBe('published');
    expect((await request(app).get(`/api/guides/${slug}`)).status).toBe(200);

    // Unpublish.
    await agent.post(`/api/guides/${id}/unpublish`).set('x-csrf-token', csrf);
    expect((await request(app).get(`/api/guides/${slug}`)).status).toBe(404);

    expect((await agent.delete(`/api/guides/${id}`).set('x-csrf-token', csrf)).status).toBe(200);
  });

  it('filters guides by category and author', async () => {
    const byCat = await request(app).get('/api/guides?category=smartphones&perPage=50');
    expect(byCat.status).toBe(200);
    expect(byCat.body.data.every((g: { categorySlug: string }) => g.categorySlug === 'smartphones')).toBe(true);
  });

  // ── comparison lifecycle + specs ──
  it('admin creates a comparison with specs, publishes, then deletes', async () => {
    const { agent, csrf } = await adminSession();
    const created = await agent
      .post('/api/comparisons')
      .set('x-csrf-token', csrf)
      .send({
        title: 'Test Comparison',
        productAId: productIds[0],
        productBId: productIds[1],
        winner: 'A',
        verdict: 'A wins',
        prosCons: { productA: { pros: ['fast'], cons: [] }, productB: { pros: [], cons: ['slow'] } },
        specs: [{ specName: 'Speed', productAValue: 'Fast', productBValue: 'Slow', winner: 'A', details: 'A is faster' }],
        status: 'published',
      });
    expect(created.status).toBe(201);
    const id = created.body.data.id as string;
    const slug = created.body.data.slug as string;
    expect(created.body.data.categories.length).toBe(1);
    expect(created.body.data.prosCons.productA.pros).toContain('fast');

    const pub = await request(app).get(`/api/comparisons/${slug}`);
    expect(pub.status).toBe(200);
    expect(pub.body.data.winner).toBe('A');

    expect((await agent.delete(`/api/comparisons/${id}`).set('x-csrf-token', csrf)).status).toBe(200);
  });

  it('rejects a comparison with identical products (400)', async () => {
    const { agent, csrf } = await adminSession();
    const res = await agent
      .post('/api/comparisons')
      .set('x-csrf-token', csrf)
      .send({ title: 'Same', productAId: productIds[0], productBId: productIds[0] });
    expect(res.status).toBe(400);
  });

  it('blocks a guide mutation missing the CSRF token (403)', async () => {
    const { agent } = await adminSession();
    const res = await agent.post('/api/guides').send({ title: 'NoCsrf', categoryId });
    expect(res.status).toBe(403);
  });
});
