import type { Request, Response } from 'express';
import { ok } from '../../lib/http';
import { parseQuery } from '../../lib/validate-query';
import { sha256 } from '../../lib/tokens';
import { parseDeviceType } from '../../lib/affiliate';
import {
  rangeQuerySchema,
  eventsQuerySchema,
  reportsQuerySchema,
} from '../../validation/analytics.schemas';
import * as svc from '../../services/analytics/analytics.service';
import { recordEvent } from '../../services/analytics/tracking.service';
import { listAnalyticsProviders } from '../../services/analytics/providers';

const range = (req: Request): svc.RangeKey => parseQuery(rangeQuerySchema, req.query).range;

// ── Reads (analytics.view) ──
export async function getDashboard(req: Request, res: Response): Promise<void> {
  res.json(ok(await svc.getDashboard(range(req))));
}
export async function getProducts(req: Request, res: Response): Promise<void> {
  res.json(ok(await svc.getProductAnalytics(range(req))));
}
export async function getSearch(req: Request, res: Response): Promise<void> {
  res.json(ok(await svc.getSearchAnalytics(range(req))));
}
export async function getRevenue(req: Request, res: Response): Promise<void> {
  res.json(ok(await svc.getRevenueAnalytics(range(req))));
}
export async function getAi(req: Request, res: Response): Promise<void> {
  res.json(ok(await svc.getAiAnalytics(range(req))));
}
export async function getContent(req: Request, res: Response): Promise<void> {
  res.json(ok(await svc.getContentAnalytics(range(req))));
}
export async function getProviders(_req: Request, res: Response): Promise<void> {
  res.json(ok(listAnalyticsProviders()));
}
export async function listEvents(req: Request, res: Response): Promise<void> {
  const q = parseQuery(eventsQuerySchema, req.query);
  const { items, pagination } = await svc.listEvents(q);
  res.json(ok(items, { pagination }));
}

// ── Reports (reports.view / reports.manage) ──
export async function listReports(req: Request, res: Response): Promise<void> {
  const q = parseQuery(reportsQuerySchema, req.query);
  const { items, pagination } = await svc.listReports(q);
  res.json(ok(items, { pagination }));
}
export async function getReport(req: Request, res: Response): Promise<void> {
  res.json(ok(await svc.getReport(req.params.id)));
}
export async function generateReport(req: Request, res: Response): Promise<void> {
  const report = await svc.generateReport(req.body.type, req.body.range, req.user?.id ?? null);
  res.status(201).json(ok(report, null, 'Report generated'));
}
export async function removeReport(req: Request, res: Response): Promise<void> {
  await svc.deleteReport(req.params.id);
  res.json(ok({ id: req.params.id }, null, 'Report deleted'));
}

// ── Public collector beacon (privacy-safe; no auth) ──
export async function collect(req: Request, res: Response): Promise<void> {
  const ip = req.ip ?? req.socket.remoteAddress ?? '';
  const ua = typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined;
  const country = typeof req.headers['cf-ipcountry'] === 'string' ? req.headers['cf-ipcountry'] : undefined;
  // Fire-and-forget so the beacon returns immediately; only SHA-256(ip) is stored.
  void recordEvent({
    type: req.body.type,
    entityType: req.body.entityType ?? null,
    entityId: req.body.entityId ?? null,
    url: req.body.url ?? null,
    referrer: req.body.referrer ?? null,
    sessionId: req.body.sessionId ?? null,
    ipHash: ip ? sha256(ip) : null,
    device: parseDeviceType(ua),
    country: country ?? null,
    metadata: req.body.metadata,
  });
  res.status(202).json(ok({ accepted: true }));
}
