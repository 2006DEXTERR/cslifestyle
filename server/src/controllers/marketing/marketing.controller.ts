import type { Request, Response } from 'express';
import { ok } from '../../lib/http';
import { parseQuery } from '../../lib/validate-query';
import {
  subscribersQuerySchema,
  campaignsQuerySchema,
  marketingEventsQuerySchema,
} from '../../validation/marketing.schemas';
import * as newsletter from '../../services/marketing/newsletter.service';
import * as campaigns from '../../services/marketing/campaign.service';
import { activeEmailProvider } from '../../services/marketing/email';
import { env } from '../../config/env';

// 1x1 transparent GIF for open tracking.
const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

// ── Public newsletter ──
export async function subscribe(req: Request, res: Response): Promise<void> {
  const result = await newsletter.subscribe(req.body);
  res.status(201).json(ok(result, null, result.status === 'already_subscribed' ? 'Already subscribed' : 'Check your inbox to confirm'));
}
export async function unsubscribePost(req: Request, res: Response): Promise<void> {
  res.json(ok(await newsletter.unsubscribe(req.body), null, 'Unsubscribed'));
}
export async function unsubscribeGet(req: Request, res: Response): Promise<void> {
  const token = typeof req.query.token === 'string' ? req.query.token : undefined;
  const email = typeof req.query.email === 'string' ? req.query.email : undefined;
  await newsletter.unsubscribe({ token, email });
  res.type('html').send('<p>You have been unsubscribed. Sorry to see you go.</p>');
}
export async function verify(req: Request, res: Response): Promise<void> {
  const token = typeof req.query.token === 'string' ? req.query.token : '';
  await newsletter.verify(token);
  res.type('html').send('<p>Subscription confirmed — welcome aboard! 🎉</p>');
}

// ── Tracking (public) ──
export async function trackOpen(req: Request, res: Response): Promise<void> {
  const id = req.params.id.replace(/\.gif$/, '');
  await campaigns.trackOpen(id).catch(() => undefined);
  res.set('Content-Type', 'image/gif').set('Cache-Control', 'no-store').send(PIXEL);
}
export async function trackClick(req: Request, res: Response): Promise<void> {
  const target = typeof req.query.url === 'string' ? req.query.url : env.APP_URL;
  await campaigns.trackClick(req.params.id).catch(() => undefined);
  // Only redirect to our own app origin (no open redirect).
  const safe = target.startsWith(env.APP_URL) ? target : env.APP_URL;
  res.redirect(302, safe);
}

// ── Admin: dashboard / subscribers ──
export async function getDashboard(_req: Request, res: Response): Promise<void> {
  res.json(ok(await campaigns.getDashboard()));
}
export async function getSubscriberStats(_req: Request, res: Response): Promise<void> {
  res.json(ok(await newsletter.getStats()));
}
export async function listSubscribers(req: Request, res: Response): Promise<void> {
  const q = parseQuery(subscribersQuerySchema, req.query);
  const { items, pagination } = await newsletter.listSubscribers(q);
  res.json(ok(items, { pagination }));
}
export async function exportSubscribers(req: Request, res: Response): Promise<void> {
  const q = parseQuery(subscribersQuerySchema, req.query);
  const csv = await newsletter.exportCsv({ status: q.status, tag: q.tag });
  res.set('Content-Type', 'text/csv').set('Content-Disposition', 'attachment; filename="subscribers.csv"').send(csv);
}
export async function createSubscriber(req: Request, res: Response): Promise<void> {
  res.status(201).json(ok(await newsletter.createSubscriberAdmin(req.body), null, 'Subscriber added'));
}
export async function updateSubscriber(req: Request, res: Response): Promise<void> {
  res.json(ok(await newsletter.updateSubscriber(req.params.id, req.body), null, 'Subscriber updated'));
}
export async function removeSubscriber(req: Request, res: Response): Promise<void> {
  await newsletter.deleteSubscriber(req.params.id);
  res.json(ok({ id: req.params.id }, null, 'Subscriber deleted'));
}

// ── Admin: campaigns ──
export async function listCampaigns(req: Request, res: Response): Promise<void> {
  const q = parseQuery(campaignsQuerySchema, req.query);
  const { items, pagination } = await campaigns.listCampaigns(q);
  res.json(ok(items, { pagination }));
}
export async function getCampaign(req: Request, res: Response): Promise<void> {
  res.json(ok(await campaigns.getCampaign(req.params.id)));
}
export async function createCampaign(req: Request, res: Response): Promise<void> {
  res.status(201).json(ok(await campaigns.createCampaign({ ...req.body, userId: req.user?.id ?? null }), null, 'Campaign created'));
}
export async function updateCampaign(req: Request, res: Response): Promise<void> {
  res.json(ok(await campaigns.updateCampaign(req.params.id, req.body), null, 'Campaign updated'));
}
export async function scheduleCampaign(req: Request, res: Response): Promise<void> {
  res.json(ok(await campaigns.scheduleCampaign(req.params.id, req.body.scheduledAt), null, 'Campaign scheduled'));
}
export async function sendTest(req: Request, res: Response): Promise<void> {
  res.json(ok(await campaigns.sendTest(req.params.id, req.body.email), null, 'Test email sent'));
}
export async function sendCampaign(req: Request, res: Response): Promise<void> {
  res.json(ok(await campaigns.sendCampaign(req.params.id), null, 'Campaign sending'));
}
export async function retryCampaign(req: Request, res: Response): Promise<void> {
  res.json(ok(await campaigns.retryCampaign(req.params.id), null, 'Retry queued'));
}
export async function removeCampaign(req: Request, res: Response): Promise<void> {
  await campaigns.deleteCampaign(req.params.id);
  res.json(ok({ id: req.params.id }, null, 'Campaign deleted'));
}

// ── Admin: events / templates ──
export async function listEvents(req: Request, res: Response): Promise<void> {
  const q = parseQuery(marketingEventsQuerySchema, req.query);
  const { items, pagination } = await campaigns.listEvents(q);
  res.json(ok(items, { pagination }));
}
export function listTemplates(_req: Request, res: Response): void {
  res.json(ok([
    { key: 'newsletter', name: 'Newsletter', description: 'Free-form subject + content' },
    { key: 'product_announcement', name: 'Product Announcement', description: 'Reuses product copy (AI-generated where present)' },
    { key: 'guide_announcement', name: 'Guide Announcement', description: 'Reuses a buying guide' },
    { key: 'comparison_announcement', name: 'Comparison Announcement', description: 'Reuses a comparison' },
  ]));
}
export function getProvider(_req: Request, res: Response): void {
  res.json(ok(activeEmailProvider()));
}
