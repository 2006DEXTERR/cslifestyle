'use client';

import * as React from 'react';
import { use } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Trophy,
  ChevronRight,
  Check,
  X,
  ExternalLink,
  Star,
  ThumbsUp,
  ThumbsDown,
  GitCompare,
  AlertTriangle,
  Share2,
  Heart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ComparisonCard } from '@/components/comparisons/ComparisonCard';
import { comparisons } from '@/lib/data';

export default function ComparisonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const comparison = comparisons.find((c) => c.slug === slug);

  if (!comparison) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Comparison Not Found</h1>
        <p className="text-muted-foreground">The comparison you're looking for doesn't exist.</p>
      </div>
    );
  }

  const relatedComparisons = comparisons.filter((c) => c.id !== comparison.id).slice(0, 3);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="min-h-screen">
      {/* Breadcrumb */}
      <div className="bg-muted/30 border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <a href="/" className="hover:text-foreground">Home</a>
            <ChevronRight className="w-4 h-4" />
            <a href="/comparisons" className="hover:text-foreground">Comparisons</a>
            <ChevronRight className="w-4 h-4" />
            <span className="text-foreground">{comparison.productA.name} vs {comparison.productB.name}</span>
          </div>
        </div>
      </div>

      {/* Hero Comparison */}
      <section className="py-8 lg:py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-center mb-8">
            {comparison.title}
          </h1>

          {/* Product Cards */}
          <div className="grid md:grid-cols-[1fr_auto_1fr] gap-4 md:gap-0 items-start">
            {/* Product A */}
            <div className={`relative rounded-2xl border bg-card overflow-hidden ${comparison.winner === 'A' ? 'ring-2 ring-offset-2 ring-green-500' : ''}`}>
              {comparison.winner === 'A' && (
                <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-gradient text-white text-xs font-semibold">
                  <Trophy className="w-3.5 h-3.5" />
                  Winner
                </div>
              )}
              <div className="aspect-video overflow-hidden bg-muted">
                <img
                  src={comparison.productA.image}
                  alt={comparison.productA.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6">
                <p className="text-sm text-muted-foreground mb-1">{comparison.productA.brand}</p>
                <h2 className="text-xl font-bold mb-3">{comparison.productA.name}</h2>
                <div className="flex items-center gap-2 mb-4">
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold">{comparison.productA.rating}</span>
                  <span className="text-sm text-muted-foreground">
                    ({comparison.productA.reviewCount.toLocaleString()} reviews)
                  </span>
                </div>
                <p className="text-2xl font-bold mb-4">
                  {formatPrice(comparison.productA.currentPrice)}
                </p>
                <a href={comparison.productA.affiliateUrl} target="_blank" rel="noopener noreferrer">
                  <Button className="w-full bg-brand-gradient hover:opacity-90">
                    Check Price on Amazon
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
                </a>
              </div>
            </div>

            {/* VS Divider */}
            <div className="hidden md:flex items-center justify-center w-16">
              <div className="flex flex-col items-center">
                <div className="w-px h-20 bg-border" />
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center font-bold text-sm">
                  VS
                </div>
                <div className="w-px h-20 bg-border" />
              </div>
            </div>

            {/* VS Divider (Mobile) */}
            <div className="md:hidden flex items-center justify-center">
              <div className="flex items-center gap-4">
                <div className="w-16 h-px bg-border" />
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-bold text-xs">
                  VS
                </div>
                <div className="w-16 h-px bg-border" />
              </div>
            </div>

            {/* Product B */}
            <div className={`relative rounded-2xl border bg-card overflow-hidden ${comparison.winner === 'B' ? 'ring-2 ring-offset-2 ring-green-500' : ''}`}>
              {comparison.winner === 'B' && (
                <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-gradient text-white text-xs font-semibold">
                  <Trophy className="w-3.5 h-3.5" />
                  Winner
                </div>
              )}
              <div className="aspect-video overflow-hidden bg-muted">
                <img
                  src={comparison.productB.image}
                  alt={comparison.productB.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6">
                <p className="text-sm text-muted-foreground mb-1">{comparison.productB.brand}</p>
                <h2 className="text-xl font-bold mb-3">{comparison.productB.name}</h2>
                <div className="flex items-center gap-2 mb-4">
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold">{comparison.productB.rating}</span>
                  <span className="text-sm text-muted-foreground">
                    ({comparison.productB.reviewCount.toLocaleString()} reviews)
                  </span>
                </div>
                <p className="text-2xl font-bold mb-4">
                  {formatPrice(comparison.productB.currentPrice)}
                </p>
                <a href={comparison.productB.affiliateUrl} target="_blank" rel="noopener noreferrer">
                  <Button className="w-full bg-brand-gradient hover:opacity-90">
                    Check Price on Amazon
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
                </a>
              </div>
            </div>
          </div>

          {/* Summary Card */}
          <div className="mt-8 p-6 rounded-xl bg-muted/50 border text-center">
            <p className="text-lg text-muted-foreground">{comparison.summary}</p>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-8 border-t">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold mb-6">Detailed Comparison</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left p-4 font-semibold">Category</th>
                  <th className="text-center p-4 font-semibold">{comparison.productA.name.split(' ').slice(0, 2).join(' ')}</th>
                  <th className="text-center p-4 font-semibold">{comparison.productB.name.split(' ').slice(0, 2).join(' ')}</th>
                  <th className="text-center p-4 font-semibold">Winner</th>
                </tr>
              </thead>
              <tbody>
                {comparison.categories.map((cat, index) => (
                  <motion.tr
                    key={cat.name}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b"
                  >
                    <td className="p-4 font-medium">{cat.name}</td>
                    <td className="p-4 text-center">
                      <span className={cat.winner === 'A' ? 'font-semibold text-green-600' : ''}>
                        {cat.productA}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className={cat.winner === 'B' ? 'font-semibold text-green-600' : ''}>
                        {cat.productB}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      {cat.winner === 'tie' ? (
                        <span className="text-muted-foreground">Tie</span>
                      ) : (
                        <span className="flex items-center justify-center gap-1">
                          <Trophy className="w-4 h-4 text-green-500" />
                          {cat.winner === 'A' ? (
                            <span>{comparison.productA.brand}</span>
                          ) : (
                            <span>{comparison.productB.brand}</span>
                          )}
                        </span>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Pros & Cons Comparison */}
      <section className="py-8 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold mb-6">Pros & Cons</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Product A */}
            <div>
              <h3 className="text-lg font-semibold mb-4">{comparison.productA.name}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/20">
                  <h4 className="font-medium text-green-600 mb-3 flex items-center gap-2">
                    <ThumbsUp className="w-4 h-4" />
                    Pros
                  </h4>
                  <ul className="space-y-2">
                    {comparison.prosCons.productA.pros.map((pro, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        {pro}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20">
                  <h4 className="font-medium text-red-600 mb-3 flex items-center gap-2">
                    <ThumbsDown className="w-4 h-4" />
                    Cons
                  </h4>
                  <ul className="space-y-2">
                    {comparison.prosCons.productA.cons.map((con, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <X className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                        {con}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Product B */}
            <div>
              <h3 className="text-lg font-semibold mb-4">{comparison.productB.name}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/20">
                  <h4 className="font-medium text-green-600 mb-3 flex items-center gap-2">
                    <ThumbsUp className="w-4 h-4" />
                    Pros
                  </h4>
                  <ul className="space-y-2">
                    {comparison.prosCons.productB.pros.map((pro, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        {pro}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20">
                  <h4 className="font-medium text-red-600 mb-3 flex items-center gap-2">
                    <ThumbsDown className="w-4 h-4" />
                    Cons
                  </h4>
                  <ul className="space-y-2">
                    {comparison.prosCons.productB.cons.map((con, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <X className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                        {con}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Verdict */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-bold mb-4">Final Verdict</h2>
            <p className="text-lg text-muted-foreground mb-8">{comparison.verdict}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href={comparison.productA.affiliateUrl} target="_blank" rel="noopener noreferrer">
                <Button className="w-full sm:w-auto bg-brand-gradient hover:opacity-90">
                  {comparison.productA.name.split(' ').slice(0, 2).join(' ')} on Amazon
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              </a>
              <a href={comparison.productB.affiliateUrl} target="_blank" rel="noopener noreferrer">
                <Button className="w-full sm:w-auto bg-brand-gradient hover:opacity-90">
                  {comparison.productB.name.split(' ').slice(0, 2).join(' ')} on Amazon
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Related Comparisons */}
      {relatedComparisons.length > 0 && (
        <section className="py-12 bg-muted/30">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold mb-6">More Comparisons</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {relatedComparisons.map((c) => (
                <ComparisonCard key={c.id} comparison={c} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
