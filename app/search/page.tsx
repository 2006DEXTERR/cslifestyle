'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Clock, TrendingUp, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ProductCard } from '@/components/products/ProductCard';
import { GuideCard } from '@/components/guides/GuideCard';
import { ComparisonCard } from '@/components/comparisons/ComparisonCard';
import { catalogApi, type CatalogProduct, type CatalogBrand } from '@/lib/api/catalog';
import { contentApi, type ContentGuide, type ContentComparison } from '@/lib/api/content';
import { discoveryApi } from '@/lib/api/discovery';

const defaultTrendingSearches = [
  'iPhone 15 Pro',
  'Samsung S24',
  'Best wireless earbuds',
  'Smartwatch under 3000',
  'Gaming laptop',
  'OLED TV',
];

const recentSearches = [
  'OnePlus earbuds',
  'MacBook Pro',
  'Air conditioner guide',
];

export default function SearchPage() {
  // Real trending terms (Phase 11), with a static fallback so the chips never empty.
  const [trendingSearches, setTrendingSearches] = React.useState<string[]>(defaultTrendingSearches);
  React.useEffect(() => {
    discoveryApi.trending().then((t) => { if (t.length) setTrendingSearches(t); }).catch(() => undefined);
  }, []);

  const [query, setQuery] = React.useState('');
  const [activeTab, setActiveTab] = React.useState<'all' | 'products' | 'guides' | 'comparisons' | 'brands'>('all');
  const [isSearching, setIsSearching] = React.useState(false);
  const [results, setResults] = React.useState<{
    products: CatalogProduct[];
    guides: ContentGuide[];
    comparisons: ContentComparison[];
    brands: CatalogBrand[];
  }>({
    products: [],
    guides: [],
    comparisons: [],
    brands: [],
  });

  // Live, DB-driven search (Phase 13). Debounced; queries the live catalog +
  // content search endpoints (full-text `q`) so the existing rich cards render
  // real results. Stale responses are dropped via the request-id guard.
  const searchSeq = React.useRef(0);
  React.useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults({ products: [], guides: [], comparisons: [], brands: [] });
      return;
    }
    const seq = ++searchSeq.current;
    const timer = setTimeout(async () => {
      const [prods, guides, comps, brandList] = await Promise.all([
        catalogApi.listProducts({ q: trimmed, perPage: 24 }).then((r) => r.items).catch(() => [] as CatalogProduct[]),
        contentApi.listGuides({ q: trimmed, perPage: 12 }).then((r) => r.items).catch(() => [] as ContentGuide[]),
        contentApi.listComparisons({ q: trimmed, perPage: 12 }).then((r) => r.items).catch(() => [] as ContentComparison[]),
        catalogApi.listBrands({ q: trimmed }).catch(() => [] as CatalogBrand[]),
      ]);
      if (seq !== searchSeq.current) return; // a newer query superseded this one
      setResults({ products: prods, guides, comparisons: comps, brands: brandList });
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const totalResults =
    results.products.length +
    results.guides.length +
    results.comparisons.length +
    results.brands.length;

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Search Header */}
      <section className="py-12 border-b bg-background">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold mb-6">Search</h1>
          <div className="relative max-w-3xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search products, guides, comparisons, brands..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsSearching(true);
              }}
              className="pl-12 pr-4 h-14 text-lg"
            />
            {query && (
              <button
                onClick={() => {
                  setQuery('');
                  setResults({ products: [], guides: [], comparisons: [], brands: [] });
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2"
              >
                <X className="w-5 h-5 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>

          {/* Recent & Trending */}
          {!query && (
            <div className="mt-6 space-y-4">
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Recent Searches
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map((search) => (
                      <button
                        key={search}
                        onClick={() => setQuery(search)}
                        className="px-3 py-1.5 rounded-full bg-muted text-sm hover:bg-muted/80"
                      >
                        {search}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Trending Searches */}
              <div>
                <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-orange-500" />
                  Trending Searches
                </h3>
                <div className="flex flex-wrap gap-2">
                  {trendingSearches.map((search) => (
                    <button
                      key={search}
                      onClick={() => setQuery(search)}
                      className="px-3 py-1.5 rounded-full bg-muted text-sm hover:bg-muted/80"
                    >
                      {search}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Results */}
      {query && (
        <section className="py-8">
          <div className="container mx-auto px-4">
            {/* Tabs */}
            <div className="flex gap-1 mb-8 overflow-x-auto">
              {[
                { id: 'all', label: 'All', count: totalResults },
                { id: 'products', label: 'Products', count: results.products.length },
                { id: 'guides', label: 'Guides', count: results.guides.length },
                { id: 'comparisons', label: 'Comparisons', count: results.comparisons.length },
                { id: 'brands', label: 'Brands', count: results.brands.length },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'bg-foreground text-background'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  {tab.label}
                  <span className={`ml-1.5 ${activeTab === tab.id ? '' : 'text-muted-foreground'}`}>
                    ({tab.count})
                  </span>
                </button>
              ))}
            </div>

            {/* Results Content */}
            <AnimatePresence mode="wait">
              {/* No Results */}
              {totalResults === 0 && (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-center py-16"
                >
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">No results found</h3>
                  <p className="text-muted-foreground">
                    We couldn't find anything matching "{query}". Try different keywords.
                  </p>
                </motion.div>
              )}

              {/* Results */}
              {totalResults > 0 && (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-12"
                >
                  {/* Products */}
                  {(activeTab === 'all' || activeTab === 'products') && results.products.length > 0 && (
                    <div>
                      {activeTab === 'all' && (
                        <h2 className="text-lg font-semibold mb-4">
                          Products ({results.products.length})
                        </h2>
                      )}
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
                        {results.products
                          .slice(0, activeTab === 'all' ? 4 : undefined)
                          .map((product) => (
                            <ProductCard key={product.id} product={product} />
                          ))}
                      </div>
                      {activeTab === 'all' && results.products.length > 4 && (
                        <Button
                          variant="link"
                          className="mt-4"
                          onClick={() => setActiveTab('products')}
                        >
                          View all {results.products.length} products
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Guides */}
                  {(activeTab === 'all' || activeTab === 'guides') && results.guides.length > 0 && (
                    <div>
                      {activeTab === 'all' && (
                        <h2 className="text-lg font-semibold mb-4">
                          Buying Guides ({results.guides.length})
                        </h2>
                      )}
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {results.guides
                          .slice(0, activeTab === 'all' ? 3 : undefined)
                          .map((guide) => (
                            <GuideCard key={guide.id} guide={guide} />
                          ))}
                      </div>
                      {activeTab === 'all' && results.guides.length > 3 && (
                        <Button
                          variant="link"
                          className="mt-4"
                          onClick={() => setActiveTab('guides')}
                        >
                          View all {results.guides.length} guides
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Comparisons */}
                  {(activeTab === 'all' || activeTab === 'comparisons') && results.comparisons.length > 0 && (
                    <div>
                      {activeTab === 'all' && (
                        <h2 className="text-lg font-semibold mb-4">
                          Comparisons ({results.comparisons.length})
                        </h2>
                      )}
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {results.comparisons
                          .slice(0, activeTab === 'all' ? 3 : undefined)
                          .map((comparison) => (
                            <ComparisonCard key={comparison.id} comparison={comparison} />
                          ))}
                      </div>
                      {activeTab === 'all' && results.comparisons.length > 3 && (
                        <Button
                          variant="link"
                          className="mt-4"
                          onClick={() => setActiveTab('comparisons')}
                        >
                          View all {results.comparisons.length} comparisons
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Brands */}
                  {(activeTab === 'all' || activeTab === 'brands') && results.brands.length > 0 && (
                    <div>
                      {activeTab === 'all' && (
                        <h2 className="text-lg font-semibold mb-4">
                          Brands ({results.brands.length})
                        </h2>
                      )}
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
                        {results.brands.map((brand) => (
                          <a
                            key={brand.id}
                            href={`/brands/${brand.slug}`}
                            className="flex flex-col items-center justify-center p-4 rounded-xl border bg-card hover:shadow-md transition-shadow"
                          >
                            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-2">
                              <span className="text-lg font-bold">{brand.name[0]}</span>
                            </div>
                            <span className="text-sm font-medium text-center">{brand.name}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>
      )}
    </div>
  );
}
