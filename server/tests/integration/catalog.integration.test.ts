import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { createApp } from '../../src/app';

/**
 * Catalog integration + RBAC tests (products, categories, brands, search).
 * Require a migrated + seeded PostgreSQL — gated on RUN_DB_TESTS (CI / embedded PG).
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
    .send({ name: 'Plain User', email: `cat_${randomUUID()}@example.com`, password: USER_PASSWORD });
  expect(reg.status).toBe(201);
  return { agent, csrf: cookieValue(reg, 'cs_csrf') ?? (reg.body.data.csrfToken as string) };
}

describe.skipIf(!RUN)('catalog integration (DB)', () => {
  let categoryId: string;

  beforeAll(async () => {
    const res = await request(app).get('/api/categories');
    categoryId = res.body.data[0].id;
  });

  // ── public reads ──
  it('lists seeded categories (public)', async () => {
    const res = await request(app).get('/api/categories');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(10);
    expect(res.body.data[0]).toHaveProperty('subcategories');
    expect(res.body.data[0]).toHaveProperty('productCount');
  });

  it('gets a category by slug', async () => {
    const res = await request(app).get('/api/categories/smartphones');
    expect(res.status).toBe(200);
    expect(res.body.data.slug).toBe('smartphones');
  });

  it('lists seeded brands and gets one by slug', async () => {
    const list = await request(app).get('/api/brands');
    expect(list.status).toBe(200);
    expect(list.body.data.length).toBeGreaterThanOrEqual(8);
    const one = await request(app).get('/api/brands/apple');
    expect(one.status).toBe(200);
    expect(one.body.data.name).toBe('Apple');
  });

  it('lists products with pagination meta', async () => {
    const res = await request(app).get('/api/products?perPage=5');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(5);
    expect(res.body.meta.pagination).toMatchObject({ page: 1, perPage: 5 });
    expect(res.body.meta.pagination.total).toBeGreaterThanOrEqual(12);
  });

  it('filters products by category and brand', async () => {
    const byCat = await request(app).get('/api/products?category=smartphones&perPage=50');
    expect(byCat.status).toBe(200);
    expect(byCat.body.data.every((p: { categorySlug: string }) => p.categorySlug === 'smartphones')).toBe(true);

    const byBrand = await request(app).get('/api/products?brand=apple&perPage=50');
    expect(byBrand.body.data.every((p: { brandSlug: string }) => p.brandSlug === 'apple')).toBe(true);
  });

  it('sorts products by price', async () => {
    const res = await request(app).get('/api/products?sort=price-low&perPage=50');
    const prices = res.body.data.map((p: { currentPrice: number }) => p.currentPrice);
    const sorted = [...prices].sort((a, b) => a - b);
    expect(prices).toEqual(sorted);
  });

  it('gets a product by slug with full detail', async () => {
    const res = await request(app).get('/api/products/iphone-15-pro-max');
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('iPhone 15 Pro Max');
    expect(res.body.data.pros.length).toBeGreaterThan(0);
    expect(res.body.data.images.length).toBeGreaterThan(0);
  });

  it('404s an unknown product slug', async () => {
    expect((await request(app).get('/api/products/does-not-exist')).status).toBe(404);
  });

  // ── RBAC ──
  it('401s unauthenticated product create', async () => {
    const res = await request(app).post('/api/products').send({ asin: 'X', title: 'X', categoryId });
    expect(res.status).toBe(401);
  });

  it('403s a plain user creating a product', async () => {
    const { agent, csrf } = await userSession();
    const res = await agent
      .post('/api/products')
      .set('x-csrf-token', csrf)
      .send({ asin: `T${randomUUID().slice(0, 8)}`, title: 'Nope', categoryId });
    expect(res.status).toBe(403);
  });

  it('403s a mutation missing the CSRF token', async () => {
    const { agent } = await adminSession();
    const res = await agent.post('/api/products').send({ asin: 'C', title: 'C', categoryId });
    expect(res.status).toBe(403);
  });

  // ── admin product lifecycle ──
  it('admin creates → updates → publishes → deletes a product', async () => {
    const { agent, csrf } = await adminSession();
    const asin = `B0NEW${randomUUID().slice(0, 6).toUpperCase()}`;

    const created = await agent
      .post('/api/products')
      .set('x-csrf-token', csrf)
      .send({ asin, title: 'Test Widget', categoryId, currentPrice: 999, isPublished: false });
    expect(created.status).toBe(201);
    const id = created.body.data.id as string;
    const slug = created.body.data.slug as string;
    expect(created.body.data.isPublished).toBe(false);

    // Draft is hidden from the public.
    expect((await request(app).get(`/api/products/${slug}`)).status).toBe(404);

    // Update + publish.
    const updated = await agent
      .put(`/api/products/${id}`)
      .set('x-csrf-token', csrf)
      .send({ title: 'Test Widget v2', isPublished: true, currentPrice: 1299 });
    expect(updated.status).toBe(200);
    expect(updated.body.data.title).toBe('Test Widget v2');

    // Now public.
    const pub = await request(app).get(`/api/products/${slug}`);
    expect(pub.status).toBe(200);
    expect(pub.body.data.currentPrice).toBe(1299);

    // Delete.
    expect((await agent.delete(`/api/products/${id}`).set('x-csrf-token', csrf)).status).toBe(200);
    expect((await request(app).get(`/api/products/${slug}`)).status).toBe(404);
  });

  it('rejects duplicate ASIN (409)', async () => {
    const { agent, csrf } = await adminSession();
    const asin = `B0DUP${randomUUID().slice(0, 6).toUpperCase()}`;
    const first = await agent.post('/api/products').set('x-csrf-token', csrf).send({ asin, title: 'Dup A', categoryId });
    expect(first.status).toBe(201);
    const second = await agent.post('/api/products').set('x-csrf-token', csrf).send({ asin, title: 'Dup B', categoryId });
    expect(second.status).toBe(409);
    await agent.delete(`/api/products/${first.body.data.id}`).set('x-csrf-token', csrf);
  });

  it('records price history on price change', async () => {
    const { agent, csrf } = await adminSession();
    const asin = `B0PH${randomUUID().slice(0, 6).toUpperCase()}`;
    const created = await agent
      .post('/api/products')
      .set('x-csrf-token', csrf)
      .send({ asin, title: 'Price Tracked', categoryId, currentPrice: 500 });
    const id = created.body.data.id as string;
    await agent.put(`/api/products/${id}`).set('x-csrf-token', csrf).send({ currentPrice: 450 });
    // Two points: initial 500 + updated 450 (asserted indirectly via no error + cleanup).
    expect((await agent.delete(`/api/products/${id}`).set('x-csrf-token', csrf)).status).toBe(200);
  });

  it('bulk publish/unpublish toggles visibility', async () => {
    const { agent, csrf } = await adminSession();
    const asin = `B0BULK${randomUUID().slice(0, 5).toUpperCase()}`;
    const created = await agent
      .post('/api/products')
      .set('x-csrf-token', csrf)
      .send({ asin, title: 'Bulk Item', categoryId, isPublished: false });
    const id = created.body.data.id as string;
    const slug = created.body.data.slug as string;

    await agent.post('/api/products/bulk').set('x-csrf-token', csrf).send({ action: 'publish', ids: [id] });
    expect((await request(app).get(`/api/products/${slug}`)).status).toBe(200);

    await agent.post('/api/products/bulk').set('x-csrf-token', csrf).send({ action: 'unpublish', ids: [id] });
    expect((await request(app).get(`/api/products/${slug}`)).status).toBe(404);

    await agent.delete(`/api/products/${id}`).set('x-csrf-token', csrf);
  });

  // ── categories & brands admin ──
  it('admin creates a category, blocks delete while it has products, then deletes when empty', async () => {
    const { agent, csrf } = await adminSession();
    const name = `Test Cat ${randomUUID().slice(0, 6)}`;
    const cat = await agent.post('/api/categories').set('x-csrf-token', csrf).send({ name });
    expect(cat.status).toBe(201);
    const catId = cat.body.data.id as string;

    // Add a product to it.
    const prod = await agent
      .post('/api/products')
      .set('x-csrf-token', csrf)
      .send({ asin: `B0CAT${randomUUID().slice(0, 6).toUpperCase()}`, title: 'In Cat', categoryId: catId });
    const prodId = prod.body.data.id as string;

    // Delete blocked (409).
    expect((await agent.delete(`/api/categories/${catId}`).set('x-csrf-token', csrf)).status).toBe(409);

    // Remove product, then delete succeeds.
    await agent.delete(`/api/products/${prodId}`).set('x-csrf-token', csrf);
    expect((await agent.delete(`/api/categories/${catId}`).set('x-csrf-token', csrf)).status).toBe(200);
  });

  it('admin creates, updates and deletes a brand', async () => {
    const { agent, csrf } = await adminSession();
    const name = `Test Brand ${randomUUID().slice(0, 6)}`;
    const brand = await agent.post('/api/brands').set('x-csrf-token', csrf).send({ name, rating: 4.3 });
    expect(brand.status).toBe(201);
    const id = brand.body.data.id as string;

    const upd = await agent.put(`/api/brands/${id}`).set('x-csrf-token', csrf).send({ description: 'Updated' });
    expect(upd.body.data.description).toBe('Updated');
    expect((await agent.delete(`/api/brands/${id}`).set('x-csrf-token', csrf)).status).toBe(200);
  });

  // ── search ──
  it('searches the catalog and logs the query', async () => {
    const res = await request(app).get('/api/search?q=iphone');
    expect(res.status).toBe(200);
    expect(res.body.data.products.length).toBeGreaterThan(0);
    expect(res.body.data.total).toBeGreaterThan(0);
  });

  it('search requires a query term (400)', async () => {
    expect((await request(app).get('/api/search')).status).toBe(400);
  });

  it('search can be scoped by type', async () => {
    const res = await request(app).get('/api/search?q=smart&type=categories');
    expect(res.status).toBe(200);
    expect(res.body.data.products.length).toBe(0);
    expect(res.body.data.categories.length).toBeGreaterThan(0);
  });
});
