import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { createApp } from '../../src/app';

// Media Library integration tests. Gated on RUN_DB_TESTS. Real multipart uploads are
// processed by sharp and written under UPLOAD_DIR.

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
  const reg = await agent.post('/api/auth/register').send({ name: 'Plain', email: `md_${randomUUID()}@example.com`, password: USER_PASSWORD });
  return { agent, csrf: cookieValue(reg, 'cs_csrf') ?? (reg.body.data.csrfToken as string) };
}
// Distinct image per call (unique colour → unique hash).
function png(r: number, g: number, b: number, w = 600, h = 400): Promise<Buffer> {
  return sharp({ create: { width: w, height: h, channels: 3, background: { r, g, b } } }).png().toBuffer();
}

describe.skipIf(!RUN)('media library integration (DB)', () => {
  // ── RBAC ──
  it('guards the library (401 unauth, 403 plain user, 200 admin)', async () => {
    expect((await request(app).get('/api/media')).status).toBe(401);
    const { agent } = await adminSession();
    const user = await userSession();
    expect((await user.agent.get('/api/media')).status).toBe(403);
    expect((await agent.get('/api/media')).status).toBe(200);
  });

  it('rejects upload without CSRF', async () => {
    const { agent } = await adminSession();
    const res = await agent.post('/api/media/upload').attach('files', await png(1, 2, 3), { filename: 'x.png', contentType: 'image/png' });
    expect(res.status).toBe(403);
  });

  // ── Upload + optimization + dedup ──
  it('uploads an image, optimizes it, and dedups identical bytes', async () => {
    const { agent, csrf } = await adminSession();
    const buf = await png(10, 20, 30, 800, 600);

    const up = await agent.post('/api/media/upload').set('x-csrf-token', csrf).attach('files', buf, { filename: 'hero.png', contentType: 'image/png' });
    expect(up.status).toBe(201);
    const asset = up.body.data.uploaded[0];
    expect(asset.width).toBe(800);
    expect(asset.height).toBe(600);
    expect(asset.url).toContain('/uploads/');
    expect(asset.webpUrl).toContain('.webp');
    expect(asset.thumbnailUrl).toContain('.webp');

    // The optimized webp is statically served.
    const file = await request(app).get(asset.webpUrl);
    expect(file.status).toBe(200);
    expect(file.headers['content-type']).toContain('image');

    // Same bytes again → duplicate (no new asset).
    const dup = await agent.post('/api/media/upload').set('x-csrf-token', csrf).attach('files', buf, { filename: 'hero-copy.png', contentType: 'image/png' });
    expect(dup.body.data.duplicates).toBe(1);
  });

  it('rejects an unsupported file type', async () => {
    const { agent, csrf } = await adminSession();
    const res = await agent.post('/api/media/upload').set('x-csrf-token', csrf).attach('files', Buffer.from('hello'), { filename: 'note.txt', contentType: 'text/plain' });
    expect(res.status).toBe(400);
  });

  // ── Browse / search / get / metadata ──
  it('lists, searches and edits metadata', async () => {
    const { agent, csrf } = await adminSession();
    const name = `searchme_${randomUUID().slice(0, 8)}`;
    const up = await agent.post('/api/media/upload').set('x-csrf-token', csrf).attach('files', await png(40, 50, 60), { filename: `${name}.png`, contentType: 'image/png' });
    const id = up.body.data.uploaded[0].id as string;

    const search = await agent.get(`/api/media/search?q=${name}`);
    expect(search.status).toBe(200);
    expect(search.body.data.length).toBeGreaterThan(0);

    const patch = await agent.patch(`/api/media/${id}`).set('x-csrf-token', csrf).send({ altText: 'A nice photo', caption: 'cap' });
    expect(patch.status).toBe(200);
    expect(patch.body.data.altText).toBe('A nice photo');
  });

  // ── Usage tracking + unused detection ──
  it('tracks usage and detects unused assets', async () => {
    const { agent, csrf } = await adminSession();
    const up = await agent.post('/api/media/upload').set('x-csrf-token', csrf).attach('files', await png(70, 80, 90), { filename: 'used.png', contentType: 'image/png' });
    const id = up.body.data.uploaded[0].id as string;

    // Initially unused.
    const unusedBefore = await agent.get('/api/media/unused?perPage=100');
    expect((unusedBefore.body.data as { id: string }[]).some((a) => a.id === id)).toBe(true);

    // Link to a product.
    const attach = await agent.post(`/api/media/${id}/usage`).set('x-csrf-token', csrf).send({ entityType: 'product', entityId: 'prod-123', field: 'image' });
    expect(attach.status).toBe(201);
    const usage = await agent.get(`/api/media/${id}/usage`);
    expect(usage.body.data.length).toBe(1);

    // No longer unused.
    const unusedAfter = await agent.get('/api/media/unused?perPage=100');
    expect((unusedAfter.body.data as { id: string }[]).some((a) => a.id === id)).toBe(false);
  });

  // ── Replace + delete + stats ──
  it('replaces in place, reports stats, and deletes', async () => {
    const { agent, csrf } = await adminSession();
    const up = await agent.post('/api/media/upload').set('x-csrf-token', csrf).attach('files', await png(11, 22, 33, 400, 400), { filename: 'r.png', contentType: 'image/png' });
    const id = up.body.data.uploaded[0].id as string;

    const replaced = await agent.post(`/api/media/${id}/replace`).set('x-csrf-token', csrf).attach('file', await png(99, 88, 77, 1000, 500), { filename: 'r2.png', contentType: 'image/png' });
    expect(replaced.status).toBe(200);
    expect(replaced.body.data.width).toBe(1000);
    expect(replaced.body.data.height).toBe(500);

    const stats = await agent.get('/api/media/stats');
    expect(stats.body.data).toHaveProperty('totalAssets');
    expect(stats.body.data.totalAssets).toBeGreaterThan(0);

    const del = await agent.delete(`/api/media/${id}`).set('x-csrf-token', csrf);
    expect(del.status).toBe(200);
    expect((await agent.get(`/api/media/${id}`)).status).toBe(404);

    // RBAC: plain user cannot upload.
    const user = await userSession();
    expect((await user.agent.post('/api/media/upload').set('x-csrf-token', user.csrf).attach('files', await png(5, 5, 5), { filename: 'x.png', contentType: 'image/png' })).status).toBe(403);
  });
});
