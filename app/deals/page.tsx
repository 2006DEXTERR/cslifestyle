'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Percent, Clock, TrendingUp, ChevronRight, Filter, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductCard } from '@/components/products/ProductCard';
import { catalogApi, type CatalogProduct } from '@/lib/api/catalog';

const dealCategories = [
  { id: 'all', name: 'All Deals', count: 24 },
  { id: 'smartphones', name: 'Smartphones', count: 8 },
  { id: 'laptops', name: 'Laptops', count: 5 },
  { id: 'audio', name: 'Audio', count: 6 },
  { id: 'wearables', name: 'Wearables', count: 5 },
];

const sortOptions = [
  { value: 'discount', label: 'Biggest Discount' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
  { value: 'ending', label: 'Ending Soon' },
];

export default function DealsPage() {
  const [activeCategory, setActiveCategory] = React.useState('all');
  const [sortBy, setSortBy] = React.useState('discount');
  const [showExpired, setShowExpired] = React.useState(false);

  // Live discounted products (Phase 13) — the catalog deals feed.
  const [dealProducts, setDealProducts] = React.useState<CatalogProduct[]>([]);
  React.useEffect(() => {
    let active = true;
    catalogApi
      .listProducts({ deals: true, perPage: 100 })
      .then((r) => {
        if (active) setDealProducts(r.items);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const filteredProducts = activeCategory === 'all'
    ? dealProducts
    : dealProducts.filter((p) => p.categorySlug === activeCategory);

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case 'discount':
        return (b.discount || 0) - (a.discount || 0);
      case 'price-low':
        return a.currentPrice - b.currentPrice;
      case 'price-high':
        return b.currentPrice - a.currentPrice;
      default:
        return 0;
    }
  });

  const totalSavings = dealProducts.reduce((acc, p) => {
    if (p.originalPrice && p.currentPrice) {
      return acc + (p.originalPrice - p.currentPrice);
    }
    return acc;
  }, 0);

  return (
    <div className="min-h-screen">
      {/* Hero Banner */}
      <section className="relative overflow-hidden bg-gradient-to-r from-brand-pink via-brand-red to-brand-orange py-16">
        <div className="absolute inset-0 bg-black/20" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col items-center text-center text-white">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur mb-4"
            >
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">Limited Time Offers</span>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4"
            >
              Best Deals & Offers
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg md:text-xl opacity-90 max-w-2xl mb-6"
            >
              Grab the best deals on smartphones, laptops, earbuds, and more. Updated daily!
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="grid grid-cols-3 gap-6 md:gap-12"
            >
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold">{dealProducts.length}+</div>
                <div className="text-sm opacity-80">Active Deals</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold">Up to 50%</div>
                <div className="text-sm opacity-80">Max Discount</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold">
                  ₹{(totalSavings / 1000).toFixed(0)}K+
                </div>
                <div className="text-sm opacity-80">Total Savings</div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Breadcrumb */}
      <div className="bg-muted/30 border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <a href="/" className="hover:text-foreground">Home</a>
            <ChevronRight className="w-4 h-4" />
            <span className="text-foreground">Deals</span>
          </div>
        </div>
      </div>

      {/* Filters & Content */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar */}
            <aside className="lg:w-64 flex-shrink-0">
              <div className="sticky top-24 space-y-6">
                {/* Categories */}
                <div className="p-4 rounded-xl border bg-card">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    Categories
                  </h3>
                  <div className="space-y-1">
                    {dealCategories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                          activeCategory === cat.id
                            ? 'bg-brand-gradient text-white'
                            : 'hover:bg-muted'
                        }`}
                      >
                        <span>{cat.name}</span>
                        <span className={`text-xs ${activeCategory === cat.id ? 'text-white/80' : 'text-muted-foreground'}`}>
                          {cat.count}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Deal Type */}
                <div className="p-4 rounded-xl border bg-card">
                  <h3 className="font-semibold mb-4">Deal Type</h3>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="rounded border-gray-300" />
                      <span className="text-sm">Flash Sale</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="rounded border-gray-300" />
                      <span className="text-sm">Price Drop</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="rounded border-gray-300" />
                      <span className="text-sm">Bank Offers</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="rounded border-gray-300" />
                      <span className="text-sm">Exchange</span>
                    </label>
                  </div>
                </div>
              </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1">
              {/* Toolbar */}
              <div className="flex items-center justify-between mb-6 gap-4">
                <p className="text-sm text-muted-foreground">
                  Showing {sortedProducts.length} deals
                </p>
                <div className="flex items-center gap-2">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="h-9 rounded-lg border bg-background px-3 text-sm"
                  >
                    {sortOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Flash Deals Section */}
              <div className="mb-8 p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-500">
                      <Percent className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="font-semibold text-red-600 dark:text-red-400">Flash Deals</h3>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                    <Clock className="w-4 h-4" />
                    <span>Ends in 05:32:18</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {dealProducts.slice(0, 4).map((product) => (
                    <ProductCard key={product.id} product={product} showDeal />
                  ))}
                </div>
              </div>

              {/* All Deals Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {sortedProducts.map((product, index) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <ProductCard product={product} showDeal />
                  </motion.div>
                ))}
              </div>

              {sortedProducts.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No deals found for this category.</p>
                </div>
              )}

              {/* Load More */}
              {sortedProducts.length > 0 && (
                <div className="flex justify-center mt-8">
                  <Button variant="outline">Load More Deals</Button>
                </div>
              )}
            </main>
          </div>
        </div>
      </section>
    </div>
  );
}
