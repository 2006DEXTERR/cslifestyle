import type { Request, Response } from 'express';
import { ok } from '../../lib/http';
import { parseQuery } from '../../lib/validate-query';
import {
  clicksQuerySchema,
  statsQuerySchema,
  topProductsQuerySchema,
  reportsQuerySchema,
} from '../../validation/affiliate.schemas';
import * as affiliate from '../../services/affiliate/affiliate.service';
import * as settings from '../../services/affiliate/settings.service';
import * as campaigns from '../../services/affiliate/campaign.service';
import * as revenue from '../../services/affiliate/revenue.service';

// ── Settings ──
export async function getSettings(_req: Request, res: Response): Promise<void> {
  res.json(ok(await settings.getAffiliateSettings()));
}
export async function updateSettings(req: Request, res: Response): Promise<void> {
  res.json(ok(await settings.updateAffiliateSettings(req.body), null, 'Settings updated'));
}

// ── Analytics ──
export async function getStats(req: Request, res: Response): Promise<void> {
  const { days } = parseQuery(statsQuerySchema, req.query);
  res.json(ok(await affiliate.getStats(days)));
}
export async function getClicks(req: Request, res: Response): Promise<void> {
  const q = parseQuery(clicksQuerySchema, req.query);
  const { items, pagination } = await affiliate.getClicks(q);
  res.json(ok(items, { pagination }));
}
export async function getTopProducts(req: Request, res: Response): Promise<void> {
  const { days, limit } = parseQuery(topProductsQuerySchema, req.query);
  res.json(ok(await affiliate.getTopProducts(days, limit)));
}
export async function getCompliance(_req: Request, res: Response): Promise<void> {
  res.json(ok(await affiliate.getCompliance()));
}

// ── Campaigns ──
export async function listCampaigns(_req: Request, res: Response): Promise<void> {
  res.json(ok(await campaigns.listCampaigns()));
}
export async function createCampaign(req: Request, res: Response): Promise<void> {
  res.status(201).json(ok(await campaigns.createCampaign(req.body), null, 'Campaign created'));
}
export async function updateCampaign(req: Request, res: Response): Promise<void> {
  res.json(ok(await campaigns.updateCampaign(req.params.id, req.body), null, 'Campaign updated'));
}
export async function deleteCampaign(req: Request, res: Response): Promise<void> {
  await campaigns.deleteCampaign(req.params.id);
  res.json(ok({ id: req.params.id }, null, 'Campaign deleted'));
}

// ── Revenue ──
export async function importRevenue(req: Request, res: Response): Promise<void> {
  const result = await revenue.importRevenueCsv({
    fileName: req.body.fileName,
    source: req.body.source,
    csv: req.body.csv,
    userId: req.user?.id ?? null,
  });
  res.status(201).json(ok(result, null, `Imported ${result.rowCount} revenue row(s)`));
}
export async function listImports(_req: Request, res: Response): Promise<void> {
  res.json(ok(await revenue.listImports()));
}
export async function getReports(req: Request, res: Response): Promise<void> {
  const q = parseQuery(reportsQuerySchema, req.query);
  const { items, pagination } = await revenue.getReports(q);
  res.json(ok(items, { pagination }));
}
export async function getSummary(req: Request, res: Response): Promise<void> {
  const { days } = parseQuery(statsQuerySchema, req.query);
  res.json(ok(await revenue.getSummary(days)));
}
