'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Search } from 'lucide-react';
import { ComparisonCard } from '@/components/comparisons/ComparisonCard';
import { contentApi, type ContentComparison } from '@/lib/api/content';

const shortName = (name: string) => name?.split(' ')[0] ?? '';

export default function ComparisonsPage() {
  const [comparisons, setComparisons] = React.useState<ContentComparison[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [query, setQuery] = React.useState('');
  const [category, setCategory] = React.useState('');

  React.useEffect(() => {
    let active = true;
    contentApi
      .listComparisons({ perPage: 100 })
      .then((r) => {
        if (active) setComparisons(r.items);
      })
      .catch(() => {
        if (active) setComparisons([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Category options derived from the loaded comparisons (no invented data).
  const categories = React.useMemo(() => {
    const set = new Set<string>();
    for (const c of comparisons) {
      const cat = c.productA?.category || c.productB?.category;
      if (cat) set.add(cat);
    }
    return Array.from(set).sort();
  }, [comparisons]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return comparisons.filter((c) => {
      const cat = c.productA?.category || c.productB?.category || '';
      if (category && cat !== category) return false;
      if (!q) return true;
      const hay = [c.title, c.excerpt, shortName(c.productA?.name), shortName(c.productB?.name)]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [comparisons, query, category]);

  return (
    <div className="min-h-screen">
      <section className="py-12 bg-muted/30 border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <a href="/" className="hover:text-foreground">Home</a>
            <ChevronRight className="w-4 h-4" />
            <span>Comparisons</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold">Product Comparisons</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Side-by-side comparisons to help you choose between popular products. See how products stack up against each other.
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        {/* Search + category filter */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search comparisons…"
              aria-label="Search comparisons"
              className="w-full pl-9 pr-3 h-10 rounded-lg border bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          {categories.length > 0 && (
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              aria-label="Filter by category"
              className="h-10 rounded-lg border bg-background px-3 text-sm"
            >
              <option value="">All categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          )}
          {!loading && (
            <span className="text-sm text-muted-foreground sm:ml-auto">
              {filtered.length} comparison{filtered.length === 1 ? '' : 's'}
            </span>
          )}
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 rounded-xl border bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card p-12 text-center">
            <p className="text-muted-foreground">
              {comparisons.length === 0
                ? 'No comparisons published yet. Check back soon.'
                : 'No comparisons match your search.'}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((comparison, index) => (
              <motion.div
                key={comparison.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index, 8) * 0.05 }}
              >
                <ComparisonCard comparison={comparison} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
