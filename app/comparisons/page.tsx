'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { ComparisonCard } from '@/components/comparisons/ComparisonCard';
import { contentApi, type ContentComparison } from '@/lib/api/content';

export default function ComparisonsPage() {
  const [comparisons, setComparisons] = React.useState<ContentComparison[]>([]);

  React.useEffect(() => {
    let active = true;
    contentApi
      .listComparisons({ perPage: 100 })
      .then((r) => {
        if (active) setComparisons(r.items);
      })
      .catch(() => {
        if (active) setComparisons([]);
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
            <span>Comparisons</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold">Product Comparisons</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Side-by-side comparisons to help you choose between popular products. See how products stack up against each other.
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {comparisons.map((comparison, index) => (
            <motion.div
              key={comparison.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <ComparisonCard comparison={comparison} />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
