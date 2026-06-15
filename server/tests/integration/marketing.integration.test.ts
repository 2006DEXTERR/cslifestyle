import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { createApp } from '../../src/app';
import { prisma } from '../../src/lib/prisma';
import { newVerifyToken, newUnsubscribeToken } from '../../src/services/marketing/delivery';

// Marketing & Communication integration tests. Gated on RUN_DB_TESTS. Email uses the
// console provider (offline) and QUEUE_DRIVER=inline, so subscribe/campaign jobs run
// in-process and console sends always "succeed".

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
  const reg = await agent.post('/api/auth/register').send({ name: 'Plain', email: `mk_${randomUUID()}@example.com`, password: USER_PASSWORD });
  return { agent, csrf: cookieValue(reg, 'cs_csrf') ?? (reg.body.data.csrfToken as string) };
}
const email = () => `sub_${randomUUID()}@example.com`;

describe.skipIf(!RUN)('marketing integration (DB)', () => {
  // ── RBAC ──
  it('guards the dashboard (401 unauth, 403 plain user, 200 admin)', async () => {
    expect((await request(app).get('/api/marketing/dashboard')).status).toBe(401);
    const { agent } = await adminSession();
    const user = await userSession();
    expect((await user.agent.get('/api/marketing/dashboard')).status).toBe(403);
    expect((await agent.get('/api/marketing/dashboard')).status).toBe(200);
  });

  it('rejects campaign writes without CSRF', async () => {
    const { agent } = await adminSession();
    const res = await agent.post('/api/marketing/campaigns').send({ name: 'x', subject: 'y' });
    expect(res.status).toBe(403);
  });

  // ── Public newsletter: subscribe (double opt-in) + dedup + verify + unsubscribe ──
  it('subscribes (double opt-in → pending) and dedups', async () => {
    const e = email();
    const first = await request(app).post('/api/newsletter/subscribe').send({ email: e, source: 'footer' });
    expect(first.status).toBe(201);
    expect(first.body.data.status).toBe('pending');

    // Activate it directly so re-subscribe reports already_subscribed.
    await prisma.newsletterSubscriber.update({ where: { email: e }, data: { status: 'active', verifiedAt: new Date() } });
    const again = await request(app).post('/api/newsletter/subscribe').send({ email: e });
    expect(again.body.data.status).toBe('already_subscribed');
  });

  it('confirms a double opt-in via the emailed token', async () => {
    const e = email();
    const { token, hash } = newVerifyToken();
    await prisma.newsletterSubscriber.create({ data: { email: e, status: 'pending', verifyTokenHash: hash, unsubscribeToken: newUnsubscribeToken(), source: 'api' } });
    const res = await request(app).get(`/api/newsletter/verify?token=${encodeURIComponent(token)}`);
    expect(res.status).toBe(200);
    const sub = await prisma.newsletterSubscriber.findUnique({ where: { email: e } });
    expect(sub?.status).toBe('active');
    expect(sub?.verifyTokenHash).toBeNull();
  });

  it('unsubscribes by email (idempotent)', async () => {
    const e = email();
    await prisma.newsletterSubscriber.create({ data: { email: e, status: 'active', verifiedAt: new Date(), unsubscribeToken: newUnsubscribeToken() } });
    const res = await request(app).post('/api/newsletter/unsubscribe').send({ email: e });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('unsubscribed');
  });

  // ── Subscriber management ──
  it('admin adds, lists and exports subscribers', async () => {
    const { agent, csrf } = await adminSession();
    const e = email();
    const add = await agent.post('/api/marketing/subscribers').set('x-csrf-token', csrf).send({ email: e, tags: ['tech'], status: 'active' });
    expect(add.status).toBe(201);

    const list = await agent.get('/api/marketing/subscribers?perPage=5&search=' + encodeURIComponent(e));
    expect(list.status).toBe(200);
    expect(list.body.data.length).toBeGreaterThan(0);

    const csv = await agent.get('/api/marketing/subscribers/export?status=active');
    expect(csv.status).toBe(200);
    expect(csv.headers['content-type']).toContain('text/csv');
  });

  // ── Campaign lifecycle + delivery + tracking ──
  it('creates, sends a campaign (inline) and tracks opens/clicks', async () => {
    const { agent, csrf } = await adminSession();
    // Ensure at least one active subscriber.
    await agent.post('/api/marketing/subscribers').set('x-csrf-token', csrf).send({ email: email(), status: 'active' });

    const create = await agent.post('/api/marketing/campaigns').set('x-csrf-token', csrf).send({ name: 'Welcome Blast', subject: 'Hello!', template: 'newsletter', content: 'Big news.' });
    expect(create.status).toBe(201);
    const id = create.body.data.id as string;
    expect(create.body.data.status).toBe('draft');

    // Send test (offline console → succeeds).
    const test = await agent.post(`/api/marketing/campaigns/${id}/test`).set('x-csrf-token', csrf).send({ email: 'tester@example.com' });
    expect(test.body.data.sent).toBe(true);

    // Send the campaign (inline delivery).
    const send = await agent.post(`/api/marketing/campaigns/${id}/send`).set('x-csrf-token', csrf);
    expect(send.status).toBe(200);
    const sent = await prisma.campaign.findUnique({ where: { id } });
    expect(sent?.status).toBe('sent');
    expect(sent?.deliveredCount ?? 0).toBeGreaterThan(0);

    // Open tracking → pixel + counter increment.
    const recipient = await prisma.campaignRecipient.findFirst({ where: { campaignId: id } });
    expect(recipient).not.toBeNull();
    const open = await request(app).get(`/api/marketing/track/open/${recipient!.id}.gif`);
    expect(open.status).toBe(200);
    expect(open.headers['content-type']).toContain('image/gif');

    const click = await request(app).get(`/api/marketing/track/click/${recipient!.id}?url=${encodeURIComponent(process.env.APP_URL ?? 'http://localhost:3000')}/x`);
    expect(click.status).toBe(302);

    const after = await prisma.campaign.findUnique({ where: { id } });
    expect(after?.openedCount ?? 0).toBeGreaterThan(0);
    expect(after?.clickedCount ?? 0).toBeGreaterThan(0);

    // RBAC: plain user cannot create campaigns.
    const user = await userSession();
    expect((await user.agent.post('/api/marketing/campaigns').set('x-csrf-token', user.csrf).send({ name: 'x', subject: 'y' })).status).toBe(403);
  });

  it('reports the offline email provider + templates', async () => {
    const { agent } = await adminSession();
    expect((await agent.get('/api/marketing/provider')).body.data.name).toBe('console');
    expect((await agent.get('/api/marketing/templates')).body.data).toHaveLength(4);
  });
});
