'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Star } from 'lucide-react';
import { ProductCard } from '@/components/products/ProductCard';
import type { CatalogBrand, CatalogProduct } from '@/lib/api/catalog';
import { AnalyticsBeacon } from '@/components/analytics/AnalyticsBeacon';

export function BrandDetail({
  brand,
  brandProducts,
}: {
  brand: CatalogBrand;
  brandProducts: CatalogProduct[];
}) {
  return (
    <div className="min-h-screen">
      <AnalyticsBeacon type="brand_view" entityType="brand" entityId={brand.id} />
      <section className="py-12 bg-muted/30 border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <a href="/" className="hover:text-foreground">Home</a>
            <ChevronRight className="w-4 h-4" />
            <a href="/brands" className="hover:text-foreground">Brands</a>
            <ChevronRight className="w-4 h-4" />
            <span>{brand.name}</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-2xl bg-muted flex items-center justify-center">
              <span className="text-4xl font-bold">{brand.name[0]}</span>
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">{brand.name}</h1>
              <p className="text-muted-foreground mt-1 max-w-xl">{brand.description}</p>
              <div className="flex items-center gap-4 mt-4">
                <div className="flex items-center gap-1">
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold">{brand.rating}</span>
                </div>
                <span className="text-muted-foreground">{brand.productCount} products</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold mb-6">All {brand.name} Products</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
          {brandProducts.map((product) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <ProductCard product={product} />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
