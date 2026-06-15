import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { createApp } from '../../src/app';

// Discovery integration tests (advanced search, recommendations, internal links).
// Gated on RUN_DB_TESTS. The seed builds the search index, so advanced search is DB-backed.

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
  const reg = await agent.post('/api/auth/register').send({ name: 'Plain', email: `disc_${randomUUID()}@example.com`, password: USER_PASSWORD });
  return { agent, csrf: cookieValue(reg, 'cs_csrf') ?? (reg.body.data.csrfToken as string) };
}

describe.skipIf(!RUN)('discovery integration (DB)', () => {
  let productId = '';
  let guideId = '';
  beforeAll(async () => {
    productId = (await request(app).get('/api/products?perPage=1')).body.data[0]?.id ?? '';
    guideId = (await request(app).get('/api/guides?perPage=1')).body.data[0]?.id ?? '';
    expect(productId).not.toBe('');
  });

  // ── Advanced search (public, DB-backed) ──
  it('runs weighted advanced search across the index', async () => {
    const res = await request(app).get('/api/search/advanced?q=iphone');
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBeGreaterThan(0);
    expect(res.body.data.hits[0]).toHaveProperty('score');
    expect(res.body.data.hits[0].score).toBeGreaterThan(0);
  });

  it('offers fuzzy suggestions for a misspelled query', async () => {
    const res = await request(app).get('/api/search/advanced?q=iphonr');
    expect(res.status).toBe(200);
    // Either fuzzy still matched, or a did-you-mean/suggestion is offered.
    expect(res.body.data.total > 0 || res.body.data.suggestions.length > 0 || res.body.data.didYouMean).toBeTruthy();
  });

  it('returns autocomplete suggestions + trending terms', async () => {
    expect((await request(app).get('/api/search/suggestions?q=ip')).status).toBe(200);
    const trending = await request(app).get('/api/search/trending');
    expect(trending.status).toBe(200);
    expect(Array.isArray(trending.body.data)).toBe(true);
  });

  // ── Synonyms expand the query (search.manage) ──
  it('expands queries with admin-managed synonyms', async () => {
    const { agent, csrf } = await adminSession();
    const term = `gizmo${randomUUID().slice(0, 6)}`;
    const create = await agent.post('/api/search/synonyms').set('x-csrf-token', csrf).send({ term, synonyms: ['widget', 'gadget'] });
    expect(create.status).toBe(201);
    const res = await request(app).get(`/api/search/advanced?q=${term}`);
    expect(res.body.data.expandedTerms).toEqual(expect.arrayContaining(['widget', 'gadget']));

    // RBAC: plain user cannot list/manage synonyms.
    const user = await userSession();
    expect((await user.agent.get('/api/search/synonyms')).status).toBe(403);
    expect((await request(app).get('/api/search/synonyms')).status).toBe(401);
  });

  // ── Recommendations (public, DB-backed) ──
  it('returns DB-backed product + content recommendations', async () => {
    const prod = await request(app).get(`/api/recommendations/products?type=related&productId=${productId}&limit=4`);
    expect(prod.status).toBe(200);
    expect(Array.isArray(prod.body.data)).toBe(true);
    if (prod.body.data.length) expect(prod.body.data[0]).toHaveProperty('slug');

    expect((await request(app).get('/api/recommendations/products?type=trending&limit=4')).status).toBe(200);

    if (guideId) {
      const content = await request(app).get(`/api/recommendations/content?type=guide&id=${guideId}&limit=3`);
      expect(content.status).toBe(200);
      expect(Array.isArray(content.body.data)).toBe(true);
    }
  });

  // ── Recommendation rules (recommendations.view/manage) ──
  it('manages recommendation rules with RBAC + CSRF', async () => {
    const { agent, csrf } = await adminSession();
    expect((await agent.post('/api/recommendations/rules').send({ name: 'x', type: 'category' })).status).toBe(403); // no CSRF
    const create = await agent.post('/api/recommendations/rules').set('x-csrf-token', csrf).send({ name: 'Boost brand', type: 'brand', weight: 5 });
    expect(create.status).toBe(201);
    const id = create.body.data.id as string;
    expect((await agent.get('/api/recommendations/rules')).status).toBe(200);
    expect((await agent.delete(`/api/recommendations/rules/${id}`).set('x-csrf-token', csrf)).status).toBe(200);

    const user = await userSession();
    expect((await user.agent.get('/api/recommendations/rules')).status).toBe(403);
  });

  // ── Internal links: generate + review + broken-link scan ──
  it('generates internal-link suggestions and scans for broken links', async () => {
    if (!guideId) return;
    const { agent, csrf } = await adminSession();
    const gen = await agent.post('/api/recommendations/internal-links/generate').set('x-csrf-token', csrf).send({ sourceType: 'guide', sourceId: guideId });
    expect(gen.status).toBe(201);

    const list = await agent.get('/api/recommendations/internal-links?perPage=50');
    expect(list.status).toBe(200);
    if (list.body.data.length) {
      const linkId = list.body.data[0].id as string;
      const approve = await agent.patch(`/api/recommendations/internal-links/${linkId}`).set('x-csrf-token', csrf).send({ status: 'approved' });
      expect(approve.body.data.status).toBe('approved');
    }

    const scan = await agent.post('/api/recommendations/internal-links/detect-broken').set('x-csrf-token', csrf);
    expect(scan.status).toBe(200);
    expect(scan.body.data).toHaveProperty('scanned');
  });

  // ── Reindex (search.manage) ──
  it('rebuilds the search index on demand', async () => {
    const { agent, csrf } = await adminSession();
    const res = await agent.post('/api/search/reindex').set('x-csrf-token', csrf);
    expect(res.status).toBe(200);
    expect(res.body.data.indexed).toBeGreaterThan(0);
  });
});
