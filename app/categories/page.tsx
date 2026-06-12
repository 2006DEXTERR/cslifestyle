'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { CategoryCard } from '@/components/categories/CategoryCard';
import { categories } from '@/lib/data';

export default function CategoriesPage() {
  return (
    <div className="min-h-screen">
      <section className="py-12 bg-muted/30 border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <a href="/" className="hover:text-foreground">Home</a>
            <span>/</span>
            <span>Categories</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold">All Categories</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Browse our comprehensive collection of product reviews and buying guides organized by category.
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12">
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {categories.map((category, index) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <CategoryCard category={category} variant="feature" />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
