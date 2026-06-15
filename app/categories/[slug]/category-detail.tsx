'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Filter, X, Star, SlidersHorizontal, LayoutGrid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductCard } from '@/components/products/ProductCard';
import { GuideCard } from '@/components/guides/GuideCard';
import type { CatalogCategory, CatalogProduct } from '@/lib/api/catalog';
import type { ContentGuide } from '@/lib/api/content';
import { AnalyticsBeacon } from '@/components/analytics/AnalyticsBeacon';

const priceRanges = [
  { label: 'Under Rs 1,000', min: 0, max: 1000 },
  { label: 'Rs 1,000 - Rs 5,000', min: 1000, max: 5000 },
  { label: 'Rs 5,000 - Rs 10,000', min: 5000, max: 10000 },
  { label: 'Rs 10,000 - Rs 25,000', min: 10000, max: 25000 },
  { label: 'Rs 25,000 - Rs 50,000', min: 25000, max: 50000 },
  { label: 'Over Rs 50,000', min: 50000, max: Infinity },
];

const sortOptions = [
  { value: 'popularity', label: 'Popularity' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'newest', label: 'Newest First' },
];

export function CategoryDetail({
  category,
  categoryProducts,
  categoryGuides,
}: {
  category: CatalogCategory;
  categoryProducts: CatalogProduct[];
  categoryGuides: ContentGuide[];
}) {
  const [selectedPriceRange, setSelectedPriceRange] = React.useState<number | null>(null);
  const [minRating, setMinRating] = React.useState(0);
  const [sortBy, setSortBy] = React.useState('popularity');
  const [viewMode, setViewMode] = React.useState<'grid' | 'list'>('grid');
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);

  const filteredProducts = categoryProducts.filter((product) => {
    if (selectedPriceRange !== null) {
      const range = priceRanges[selectedPriceRange];
      if (product.currentPrice < range.min || product.currentPrice > range.max) {
        return false;
      }
    }
    if (product.rating < minRating) {
      return false;
    }
    return true;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case 'price-low':
        return a.currentPrice - b.currentPrice;
      case 'price-high':
        return b.currentPrice - a.currentPrice;
      case 'rating':
        return b.rating - a.rating;
      default:
        return 0;
    }
  });

  return (
    <div className="min-h-screen">
      <AnalyticsBeacon type="category_view" entityType="category" entityId={category.id} />
      {/* Category Header */}
      <section className="bg-muted/30 border-b">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <a href="/" className="hover:text-foreground">Home</a>
                <span>/</span>
                <a href="/categories" className="hover:text-foreground">Categories</a>
                <span>/</span>
                <span>{category.name}</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold">{category.name}</h1>
              <p className="text-muted-foreground mt-2 max-w-2xl">
                {category.description}
              </p>
              <div className="flex items-center gap-4 mt-4">
                <span className="text-sm text-muted-foreground">
                  {categoryProducts.length} products
                </span>
                {category.subcategories.map((sub) => (
                  <a
                    key={sub}
                    href={`#${sub.toLowerCase()}`}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    {sub}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* Sidebar Filters (Desktop) */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-24 space-y-6">
              <div className="p-4 rounded-xl border bg-card">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Filters
                </h3>

                {/* Price Filter */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-3">Price Range</h4>
                    <div className="space-y-2">
                      {priceRanges.map((range, index) => (
                        <button
                          key={index}
                          onClick={() => setSelectedPriceRange(selectedPriceRange === index ? null : index)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                            selectedPriceRange === index
                              ? 'bg-muted font-medium'
                              : 'hover:bg-muted/50'
                          }`}
                        >
                          {range.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Rating Filter */}
                  <div>
                    <h4 className="text-sm font-medium mb-3">Minimum Rating</h4>
                    <div className="space-y-2">
                      {[4, 3, 2, 1].map((rating) => (
                        <button
                          key={rating}
                          onClick={() => setMinRating(minRating === rating ? 0 : rating)}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                            minRating === rating
                              ? 'bg-muted font-medium'
                              : 'hover:bg-muted/50'
                          }`}
                        >
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          {rating}+ Stars
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {(selectedPriceRange !== null || minRating > 0) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-4"
                    onClick={() => {
                      setSelectedPriceRange(null);
                      setMinRating(0);
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-6 gap-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="lg:hidden"
                  onClick={() => setIsFilterOpen(true)}
                >
                  <SlidersHorizontal className="w-4 h-4 mr-2" />
                  Filters
                </Button>
                <span className="text-sm text-muted-foreground">
                  {sortedProducts.length} results
                </span>
              </div>

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

                <div className="hidden md:flex items-center border rounded-lg">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 ${viewMode === 'grid' ? 'bg-muted' : ''}`}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 ${viewMode === 'list' ? 'bg-muted' : ''}`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Product Grid */}
            <div className={`grid gap-4 ${
              viewMode === 'grid'
                ? 'grid-cols-2 md:grid-cols-3'
                : 'grid-cols-1'
            }`}>
              {sortedProducts.map((product) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </div>

            {sortedProducts.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No products match your filters.</p>
                <Button
                  variant="link"
                  onClick={() => {
                    setSelectedPriceRange(null);
                    setMinRating(0);
                  }}
                >
                  Clear all filters
                </Button>
              </div>
            )}

            {/* Pagination */}
            <div className="flex items-center justify-center gap-2 mt-8">
              <Button variant="outline" size="sm" disabled>
                Previous
              </Button>
              {[1, 2, 3].map((page) => (
                <Button
                  key={page}
                  variant={page === 1 ? 'default' : 'outline'}
                  size="sm"
                >
                  {page}
                </Button>
              ))}
              <Button variant="outline" size="sm">
                Next
              </Button>
            </div>
          </main>
        </div>
      </div>

      {/* Related Guides */}
      {categoryGuides.length > 0 && (
        <section className="py-12 bg-muted/30">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold mb-6">
              {category.name} Buying Guides
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categoryGuides.map((guide) => (
                <GuideCard key={guide.id} guide={guide} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Mobile Filter Drawer */}
      {isFilterOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 lg:hidden"
        >
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsFilterOpen(false)}
          />
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            className="absolute left-0 top-0 bottom-0 w-72 bg-background p-6 overflow-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-lg">Filters</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsFilterOpen(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Price Filter */}
            <div className="space-y-4 mb-6">
              <h4 className="font-medium">Price Range</h4>
              {priceRanges.map((range, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedPriceRange(selectedPriceRange === index ? null : index)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                    selectedPriceRange === index ? 'bg-muted font-medium' : ''
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>

            {/* Rating Filter */}
            <div className="space-y-4 mb-6">
              <h4 className="font-medium">Minimum Rating</h4>
              {[4, 3, 2, 1].map((rating) => (
                <button
                  key={rating}
                  onClick={() => setMinRating(minRating === rating ? 0 : rating)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                    minRating === rating ? 'bg-muted font-medium' : ''
                  }`}
                >
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  {rating}+ Stars
                </button>
              ))}
            </div>

            <Button className="w-full bg-brand-gradient" onClick={() => setIsFilterOpen(false)}>
              Apply Filters
            </Button>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
