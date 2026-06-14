import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { createApp } from '../../src/app';

/**
 * Integration + RBAC tests. They require a migrated + seeded PostgreSQL, so
 * they only run when RUN_DB_TESTS=true (set in CI after `prisma migrate deploy`
 * + `db:seed`). Locally without a DB they are skipped — unit tests still run.
 */
const RUN = process.env.RUN_DB_TESTS === 'true';
const app = createApp();

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@cslifestyle.in';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe!2026';
const PASSWORD = 'Str0ngPass';

const uniqueEmail = (): string => `test_${randomUUID()}@example.com`;

function cookieValue(res: request.Response, name: string): string | undefined {
  const arr = res.headers['set-cookie'] as unknown as string[] | undefined;
  if (!arr) return undefined;
  for (const c of arr) {
    const m = new RegExp(`^${name}=([^;]+)`).exec(c);
    if (m) return m[1];
  }
  return undefined;
}

describe.skipIf(!RUN)('auth integration (DB)', () => {
  it('registers a user, sets auth cookies, defaults to role "user"', async () => {
    const email = uniqueEmail();
    const res = await request(app).post('/api/auth/register').send({ name: 'Test User', email, password: PASSWORD });
    expect(res.status).toBe(201);
    expect(res.body.data.user.email).toBe(email);
    expect(res.body.data.user.role).toBe('user');
    const cookies = ((res.headers['set-cookie'] as unknown as string[]) ?? []).join(';');
    expect(cookies).toContain('cs_access=');
    expect(cookies).toContain('cs_refresh=');
    expect(cookies).toContain('cs_csrf=');
  });

  it('rejects duplicate registration (409)', async () => {
    const email = uniqueEmail();
    await request(app).post('/api/auth/register').send({ name: 'Tester', email, password: PASSWORD });
    const res = await request(app).post('/api/auth/register').send({ name: 'Tester', email, password: PASSWORD });
    expect(res.status).toBe(409);
  });

  it('rejects weak passwords (400)', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'Tester', email: uniqueEmail(), password: 'weak' });
    expect(res.status).toBe(400);
    expect(res.body.errors).toHaveProperty('password');
  });

  it('logs in with valid credentials and rejects invalid ones', async () => {
    const email = uniqueEmail();
    await request(app).post('/api/auth/register').send({ name: 'Tester', email, password: PASSWORD });
    expect((await request(app).post('/api/auth/login').send({ email, password: PASSWORD })).status).toBe(200);
    expect((await request(app).post('/api/auth/login').send({ email, password: 'WrongPass1' })).status).toBe(401);
  });

  it('GET /me returns the authenticated user', async () => {
    const agent = request.agent(app);
    const email = uniqueEmail();
    await agent.post('/api/auth/register').send({ name: 'Me', email, password: PASSWORD });
    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.data.user.email).toBe(email);
  });

  it('rotates refresh tokens and detects reuse of a revoked token', async () => {
    const agent = request.agent(app);
    const email = uniqueEmail();
    const reg = await agent.post('/api/auth/register').send({ name: 'Rotator', email, password: PASSWORD });
    const origRefresh = cookieValue(reg, 'cs_refresh')!;
    const csrf = reg.body.data.csrfToken as string;

    // First rotation succeeds (agent updates to the new refresh token).
    const r1 = await agent.post('/api/auth/refresh').set('x-csrf-token', csrf);
    expect(r1.status).toBe(200);

    // Replaying the ORIGINAL (now revoked) refresh token → reuse detected (401).
    const reuse = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', [`cs_refresh=${origRefresh}`, `cs_csrf=${csrf}`])
      .set('x-csrf-token', csrf);
    expect(reuse.status).toBe(401);
  });

  it('blocks logout/refresh without a CSRF token (403)', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send({ name: 'Csrfer', email: uniqueEmail(), password: PASSWORD });
    const res = await agent.post('/api/auth/logout'); // no x-csrf-token header
    expect(res.status).toBe(403);
  });

  it('completes the forgot → reset password flow', async () => {
    const email = uniqueEmail();
    await request(app).post('/api/auth/register').send({ name: 'Forgot', email, password: PASSWORD });

    const forgot = await request(app).post('/api/auth/forgot-password').send({ email });
    expect(forgot.status).toBe(200);
    const token = forgot.body.data.devResetToken as string;
    expect(token).toBeTruthy();

    const reset = await request(app).post('/api/auth/reset-password').send({ token, password: 'NewStr0ng1' });
    expect(reset.status).toBe(200);

    expect((await request(app).post('/api/auth/login').send({ email, password: 'NewStr0ng1' })).status).toBe(200);
    expect((await request(app).post('/api/auth/login').send({ email, password: PASSWORD })).status).toBe(401);
  });

  it('verifies email via token', async () => {
    const agent = request.agent(app);
    const email = uniqueEmail();
    const reg = await agent.post('/api/auth/register').send({ name: 'Verify', email, password: PASSWORD });
    expect(reg.body.data.user.emailVerified).toBe(false);
    const token = reg.body.data.devVerificationToken as string;

    const verify = await request(app).post('/api/auth/verify-email').send({ token });
    expect(verify.status).toBe(200);

    const me = await agent.get('/api/auth/me');
    expect(me.body.data.user.emailVerified).toBe(true);
  });

  it('enforces login brute-force protection (429 after 5 failures)', async () => {
    const email = uniqueEmail();
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      const res = await request(app).post('/api/auth/login').send({ email, password: 'WrongPass1' });
      statuses.push(res.status);
    }
    expect(statuses.slice(0, 5).every((s) => s === 401)).toBe(true);
    expect(statuses[5]).toBe(429);
  });

  describe('RBAC: /api/v1/admin/ping', () => {
    it('401 without authentication', async () => {
      expect((await request(app).get('/api/v1/admin/ping')).status).toBe(401);
    });

    it('403 for a plain user (no admin.access)', async () => {
      const agent = request.agent(app);
      await agent.post('/api/auth/register').send({ name: 'Plainy', email: uniqueEmail(), password: PASSWORD });
      const res = await agent.get('/api/v1/admin/ping');
      expect(res.status).toBe(403);
    });

    it('200 for the seeded admin', async () => {
      const agent = request.agent(app);
      const login = await agent.post('/api/auth/login').send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
      expect(login.status).toBe(200);
      const res = await agent.get('/api/v1/admin/ping');
      expect(res.status).toBe(200);
      expect(res.body.data.role).toBe('admin');
    });
  });
});
