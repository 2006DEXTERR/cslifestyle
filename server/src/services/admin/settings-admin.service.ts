import { prisma } from '../../lib/prisma';
import { setSetting } from '../settings.service';
import type { UpdateSettingsBody } from '../../validation/admin.schemas';

/**
 * Admin settings + SEO-sitemap service (Phase 13). Settings persist through the
 * existing `Setting` model (key/value/type/group) via `settings.service`.
 * The SEO sitemap status reports REAL counts of the entities that the public
 * `sitemap.xml` includes — no fabricated analytics.
 */

const SETTINGS_GROUP = 'site';
/** Keys whose values are secrets — persisted but never returned to the client. */
const SECRET_KEYS = new Set(['email.smtp_password']);

export interface SettingsResult {
  values: Record<string, string>;
}

/** All persisted settings as a flat `{ key: value }` map (secrets redacted). */
export async function listSettings(): Promise<SettingsResult> {
  const rows = await prisma.setting.findMany({ orderBy: { key: 'asc' } });
  const values: Record<string, string> = {};
  for (const row of rows) {
    if (SECRET_KEYS.has(row.key)) continue;
    values[row.key] = row.value ?? '';
  }
  return { values };
}

/** Upsert a batch of settings; returns the refreshed (redacted) map. */
export async function saveSettings(body: UpdateSettingsBody): Promise<SettingsResult> {
  for (const [key, raw] of Object.entries(body.values)) {
    const value = raw === null || raw === undefined ? '' : String(raw);
    const type = typeof raw === 'boolean' ? 'boolean' : typeof raw === 'number' ? 'integer' : 'string';
    await setSetting(key, value, { type, group: SETTINGS_GROUP });
  }
  return listSettings();
}

// ───────────────────────── SEO sitemap status ─────────────────────────

export interface SitemapStatus {
  totalUrls: number;
  byType: {
    products: number;
    categories: number;
    brands: number;
    guides: number;
    comparisons: number;
    authors: number;
    staticPages: number;
  };
  sitemapUrl: string;
  robotsUrl: string;
}

/** A handful of always-present static routes in the public sitemap. */
const STATIC_PAGES = ['/', '/categories', '/brands', '/guides', '/comparisons', '/deals', '/search'];

/** Real, DB-backed counts of the published entities exposed in `sitemap.xml`. */
export async function getSitemapStatus(): Promise<SitemapStatus> {
  const [products, categories, brands, guides, comparisons, authors] = await Promise.all([
    prisma.product.count({ where: { isPublished: true } }),
    prisma.category.count({ where: { isActive: true } }),
    prisma.brand.count({ where: { isActive: true } }),
    prisma.guide.count({ where: { status: 'published' } }),
    prisma.comparison.count({ where: { status: 'published' } }),
    prisma.author.count({ where: { isActive: true } }),
  ]);
  const staticPages = STATIC_PAGES.length;
  const byType = { products, categories, brands, guides, comparisons, authors, staticPages };
  const totalUrls = products + categories + brands + guides + comparisons + authors + staticPages;
  return { totalUrls, byType, sitemapUrl: '/sitemap.xml', robotsUrl: '/robots.txt' };
}
