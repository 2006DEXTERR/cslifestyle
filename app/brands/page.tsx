'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { catalogApi, type CatalogBrand } from '@/lib/api/catalog';

export default function BrandsPage() {
  const [brands, setBrands] = React.useState<CatalogBrand[]>([]);

  React.useEffect(() => {
    let active = true;
    catalogApi
      .listBrands()
      .then((data) => {
        if (active) setBrands(data);
      })
      .catch(() => {
        if (active) setBrands([]);
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
            <ChevronRight className="w-4 h-4" />
            <span>Brands</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold">All Brands</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Explore products from your favorite brands. We review products from all major manufacturers.
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {brands.map((brand, index) => (
            <motion.div
              key={brand.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link href={`/brands/${brand.slug}`}>
                <div className="group flex flex-col items-center p-6 rounded-2xl border bg-card hover:shadow-lg transition-all">
                  <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center mb-4 group-hover:bg-brand-gradient transition-colors">
                    <span className={`text-2xl font-bold group-hover:text-white transition-colors`}>
                      {brand.name[0]}
                    </span>
                  </div>
                  <h3 className="font-semibold text-center group-hover:text-primary transition-colors">
                    {brand.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {brand.productCount} products
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
