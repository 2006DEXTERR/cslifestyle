import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { authenticator } from 'otplib';
import { createApp } from '../../src/app';
import { prisma } from '../../src/lib/prisma';
import { deliverEmail } from '../../src/lib/mailer';

const RUN = process.env.RUN_DB_TESTS === 'true';
const app = createApp();
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@cslifestyle.in';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe!2026';
const PASSWORD = 'Str0ngPass';
const uniqueEmail = (): string => `2fa_${randomUUID()}@example.com`;

/** Register a fresh user via an agent; returns the agent + csrf token. */
async function registerAgent() {
  const agent = request.agent(app);
  const email = uniqueEmail();
  const reg = await agent.post('/api/auth/register').send({ name: 'TwoFa', email, password: PASSWORD });
  return { agent, email, csrf: reg.body.data.csrfToken as string };
}

describe.skipIf(!RUN)('2FA integration (DB)', () => {
  it('enrolls, logs in with TOTP, logs in with a backup code, then disables', async () => {
    const { agent, email, csrf } = await registerAgent();

    // status starts disabled
    const status0 = await agent.get('/api/auth/2fa/status');
    expect(status0.body.data.enabled).toBe(false);

    // setup → returns a secret + QR
    const setup = await agent.post('/api/auth/2fa/setup').set('x-csrf-token', csrf);
    expect(setup.status).toBe(200);
    const secret = setup.body.data.secret as string;
    expect(setup.body.data.qrDataUrl).toMatch(/^data:image\/png/);

    // wrong code is rejected
    const bad = await agent.post('/api/auth/2fa/enable').set('x-csrf-token', csrf).send({ code: '000000' });
    expect(bad.status).toBe(400);

    // enable with a valid TOTP → returns backup codes
    const enable = await agent
      .post('/api/auth/2fa/enable')
      .set('x-csrf-token', csrf)
      .send({ code: authenticator.generate(secret) });
    expect(enable.status).toBe(200);
    const backupCodes = enable.body.data.backupCodes as string[];
    expect(backupCodes.length).toBeGreaterThanOrEqual(10);

    // login now requires a second factor (no session yet)
    const loginB = request.agent(app);
    const step1 = await loginB.post('/api/auth/login').send({ email, password: PASSWORD });
    expect(step1.status).toBe(200);
    expect(step1.body.data.twoFactorRequired).toBe(true);
    const challenge = step1.body.data.challenge as string;
    expect(step1.headers['set-cookie']).toBeUndefined();

    // complete with TOTP → full session
    const step2 = await loginB
      .post('/api/auth/login/2fa')
      .send({ challenge, code: authenticator.generate(secret) });
    expect(step2.status).toBe(200);
    expect((await loginB.get('/api/auth/me')).body.data.user.email).toBe(email);

    // wrong 2FA code is rejected
    const loginBad = request.agent(app);
    const s1 = await loginBad.post('/api/auth/login').send({ email, password: PASSWORD });
    const wrong = await loginBad
      .post('/api/auth/login/2fa')
      .send({ challenge: s1.body.data.challenge, code: '111111' });
    expect(wrong.status).toBe(401);

    // login using a backup code (single-use)
    const loginC = request.agent(app);
    const c1 = await loginC.post('/api/auth/login').send({ email, password: PASSWORD });
    const viaBackup = await loginC
      .post('/api/auth/login/2fa')
      .send({ challenge: c1.body.data.challenge, code: backupCodes[0] });
    expect(viaBackup.status).toBe(200);

    // the same backup code cannot be reused
    const loginD = request.agent(app);
    const d1 = await loginD.post('/api/auth/login').send({ email, password: PASSWORD });
    const reuse = await loginD
      .post('/api/auth/login/2fa')
      .send({ challenge: d1.body.data.challenge, code: backupCodes[0] });
    expect(reuse.status).toBe(401);

    // disable via the original (still-authenticated) agent
    const disable = await agent
      .post('/api/auth/2fa/disable')
      .set('x-csrf-token', csrf)
      .send({ code: authenticator.generate(secret) });
    expect(disable.status).toBe(200);
    expect((await agent.get('/api/auth/2fa/status')).body.data.enabled).toBe(false);

    // after disabling, a normal login works again (no challenge)
    const plain = await request(app).post('/api/auth/login').send({ email, password: PASSWORD });
    expect(plain.body.data.twoFactorRequired).toBeUndefined();
    expect(plain.body.data.user.email).toBe(email);
  });

  it('exposes and updates the admin 2FA enforcement policy', async () => {
    const agent = request.agent(app);
    const login = await agent.post('/api/auth/login').send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    expect(login.status).toBe(200);
    // admin role is enforced by default → must-enable flag surfaces
    expect(login.body.data.mustEnable2fa).toBe(true);
    const csrf = login.body.data.csrfToken as string;

    const get = await agent.get('/api/v1/admin/security/2fa-policy');
    expect(get.status).toBe(200);
    expect(get.body.data.enforcedRoles).toContain('admin');

    const put = await agent
      .put('/api/v1/admin/security/2fa-policy')
      .set('x-csrf-token', csrf)
      .send({ roles: ['admin', 'editor'] });
    expect(put.status).toBe(200);
    expect(put.body.data.enforcedRoles).toEqual(expect.arrayContaining(['admin', 'editor']));

    // restore default so other tests/ordering aren't affected
    await agent.put('/api/v1/admin/security/2fa-policy').set('x-csrf-token', csrf).send({ roles: ['admin'] });
  });

  it('records an audit entry when an email is delivered', async () => {
    const to = uniqueEmail();
    await deliverEmail({ to, subject: 'Test', html: '<p>hi</p>', text: 'hi' }, 'verification');
    const audit = await prisma.auditLog.findFirst({
      where: { event: 'email.sent', metadata: { path: ['to'], equals: to } },
    });
    expect(audit).not.toBeNull();
  });
});
