'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { BookOpen, Clock, ChevronRight } from 'lucide-react';
import { GuideCard } from '@/components/guides/GuideCard';
import { contentApi, type ContentGuide } from '@/lib/api/content';
import { catalogApi, type CatalogCategory } from '@/lib/api/catalog';

export default function GuidesPage() {
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);
  const [buyingGuides, setBuyingGuides] = React.useState<ContentGuide[]>([]);
  const [categories, setCategories] = React.useState<CatalogCategory[]>([]);

  React.useEffect(() => {
    let active = true;
    contentApi
      .listGuides({ perPage: 100 })
      .then((r) => {
        if (active) setBuyingGuides(r.items);
      })
      .catch(() => {
        if (active) setBuyingGuides([]);
      });
    catalogApi
      .listCategories()
      .then((data) => {
        if (active) setCategories(data);
      })
      .catch(() => {
        if (active) setCategories([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const filteredGuides = selectedCategory
    ? buyingGuides.filter((g) => g.categorySlug === selectedCategory)
    : buyingGuides;

  return (
    <div className="min-h-screen">
      <section className="py-12 bg-muted/30 border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <a href="/" className="hover:text-foreground">Home</a>
            <ChevronRight className="w-4 h-4" />
            <span>Buying Guides</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold">Buying Guides</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Expert guides to help you make informed purchasing decisions across all product categories.
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              !selectedCategory ? 'bg-brand-gradient text-white' : 'bg-muted hover:bg-muted/80'
            }`}
          >
            All Guides
          </button>
          {categories.slice(0, 6).map((cat) => (
            <button
              key={cat.slug}
              onClick={() => setSelectedCategory(cat.slug)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === cat.slug ? 'bg-brand-gradient text-white' : 'bg-muted hover:bg-muted/80'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Guides Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGuides.map((guide, index) => (
            <motion.div
              key={guide.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <GuideCard guide={guide} variant="feature" />
            </motion.div>
          ))}
        </div>

        {filteredGuides.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No guides found for this category.</p>
          </div>
        )}
      </div>
    </div>
  );
}
