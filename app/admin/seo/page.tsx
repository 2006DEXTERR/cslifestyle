'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Globe, FileText, ExternalLink, Layers, Info, RefreshCw } from 'lucide-react';
import { formatNumber } from '@/lib/format';
import { adminApi, AdminApiError, type SitemapStatus } from '@/lib/api/admin';

/**
 * SEO Center — shows the REAL, DB-backed sitemap status only. Search-analytics
 * metrics (indexing coverage, impressions, keyword positions, crawl errors, audit
 * findings) require a Google Search Console integration that this project does not
 * have, so they are shown as an explicit "not connected" state rather than
 * fabricated numbers.
 */

const TYPE_LABELS: { key: keyof SitemapStatus['byType']; label: string }[] = [
  { key: 'products', label: 'Products' },
  { key: 'categories', label: 'Categories' },
  { key: 'brands', label: 'Brands' },
  { key: 'guides', label: 'Guides' },
  { key: 'comparisons', label: 'Comparisons' },
  { key: 'authors', label: 'Authors' },
  { key: 'staticPages', label: 'Static Pages' },
];

export default function SEOCenterPage() {
  const [sitemap, setSitemap] = useState<SitemapStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    adminApi
      .sitemapStatus()
      .then((s) => { setSitemap(s); setError(null); })
      .catch((e) => setError(e instanceof AdminApiError ? e.message : 'Could not load sitemap status.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">SEO Center</h1>
          <p className="text-muted-foreground">Live sitemap coverage for the storefront</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          {sitemap && (
            <>
              <a href={sitemap.sitemapUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent">
                <FileText className="h-4 w-4" /> sitemap.xml <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <a href={sitemap.robotsUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent">
                <Globe className="h-4 w-4" /> robots.txt <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-600">{error}</div>
      )}

      {/* Live sitemap totals */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-blue-100 p-3 dark:bg-blue-950/30"><Globe className="h-6 w-6 text-blue-600" /></div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-bold text-foreground">
              {loading ? '…' : sitemap ? formatNumber(sitemap.totalUrls) : '—'}
            </p>
            <p className="text-sm text-muted-foreground">Total URLs in sitemap</p>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-green-100 p-3 dark:bg-green-950/30"><Layers className="h-6 w-6 text-green-600" /></div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-bold text-foreground">
              {loading ? '…' : sitemap ? TYPE_LABELS.filter((t) => sitemap.byType[t.key] > 0).length : '—'}
            </p>
            <p className="text-sm text-muted-foreground">Content types indexed</p>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-purple-100 p-3 dark:bg-purple-950/30"><FileText className="h-6 w-6 text-purple-600" /></div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-bold text-foreground">
              {loading ? '…' : sitemap ? formatNumber(sitemap.byType.staticPages) : '—'}
            </p>
            <p className="text-sm text-muted-foreground">Static pages</p>
          </div>
        </div>
      </div>

      {/* Sitemap breakdown by type (live) */}
      <div className="rounded-xl border border-border bg-card">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Sitemap Breakdown</h2>
          <p className="text-sm text-muted-foreground">Published, indexable URLs by content type</p>
        </div>
        <div className="divide-y divide-border">
          {loading && <div className="p-6 text-center text-sm text-muted-foreground">Loading…</div>}
          {!loading && sitemap && TYPE_LABELS.map((t) => (
            <div key={t.key} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm font-medium text-foreground">{t.label}</span>
              <span className="text-sm tabular-nums text-muted-foreground">{formatNumber(sitemap.byType[t.key])}</span>
            </div>
          ))}
          {!loading && !sitemap && !error && (
            <div className="p-6 text-center text-sm text-muted-foreground">No sitemap data available.</div>
          )}
        </div>
      </div>

      {/* Honest "not connected" state for search analytics */}
      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-foreground">Search analytics not connected</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Indexing coverage, impressions, keyword positions, crawl errors and site-audit findings require a
              Google Search Console integration, which isn’t set up for this project yet. Rather than show
              placeholder numbers, this section stays empty until a real data source is connected. The sitemap
              counts above are live from the database.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
