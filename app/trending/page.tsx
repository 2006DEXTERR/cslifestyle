'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { ProductCard } from '@/components/products/ProductCard';
import { catalogApi, type CatalogProduct } from '@/lib/api/catalog';

export default function TrendingPage() {
  const [products, setProducts] = React.useState<CatalogProduct[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    catalogApi
      .listProducts({ trending: true, perPage: 24 })
      .then((r) => {
        if (active) setProducts(r.items);
      })
      .catch(() => {
        if (active) setProducts([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen">
      <section className="py-12 bg-muted/30 border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <a href="/" className="hover:text-foreground">Home</a>
            <span>/</span>
            <span>Trending</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold">Trending Products</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Most viewed products this week.
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12">
        {loading ? (
          <p className="text-muted-foreground">Loading products…</p>
        ) : products.length === 0 ? (
          <p className="text-muted-foreground">No trending products yet. Check back soon.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
            {products.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <ProductCard product={product} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
