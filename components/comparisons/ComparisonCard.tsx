'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Trophy } from 'lucide-react';
import { Comparison } from '@/lib/types';
import { productThumbClass, resolveProductImage } from '@/lib/image';

interface ComparisonCardProps {
  comparison: Comparison;
  variant?: 'default' | 'compact';
}

export function ComparisonCard({ comparison, variant = 'default' }: ComparisonCardProps) {
  if (variant === 'compact') {
    return (
      <Link href={`/comparisons/${comparison.slug}`}>
        <motion.div
          whileHover={{ x: 4 }}
          className="group flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted">
              <img
                src={resolveProductImage(comparison.productA)}
                alt={comparison.productA.name}
                className={productThumbClass}
              />
            </div>
            <span className="text-muted-foreground">vs</span>
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted">
              <img
                src={resolveProductImage(comparison.productB)}
                alt={comparison.productB.name}
                className={productThumbClass}
              />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm line-clamp-1 group-hover:text-primary transition-colors">
              {comparison.productA.name.split(' ')[0]} vs {comparison.productB.name.split(' ')[0]}
            </h3>
          </div>
        </motion.div>
      </Link>
    );
  }

  return (
    <Link href={`/comparisons/${comparison.slug}`}>
      <motion.div
        whileHover={{ y: -4 }}
        className="group flex flex-col rounded-xl border bg-card overflow-hidden hover:shadow-lg transition-all"
      >
        {/* Product Images */}
        <div className="relative flex items-center justify-center gap-4 p-6 bg-gradient-to-b from-muted/50 to-background">
          <div className="relative w-28 h-28 rounded-xl overflow-hidden bg-background border shadow-sm">
            <img
              src={resolveProductImage(comparison.productA)}
              alt={comparison.productA.name}
              className={productThumbClass}
            />
            {comparison.winner === 'A' && (
              <div className="absolute -top-1 -right-1 flex items-center justify-center w-6 h-6 rounded-full bg-brand-gradient text-white">
                <Trophy className="w-3.5 h-3.5" />
              </div>
            )}
          </div>

          <div className="flex flex-col items-center">
            <span className="text-sm font-semibold text-muted-foreground">VS</span>
            <div className="w-8 h-px bg-border my-2" />
          </div>

          <div className="relative w-28 h-28 rounded-xl overflow-hidden bg-background border shadow-sm">
            <img
              src={resolveProductImage(comparison.productB)}
              alt={comparison.productB.name}
              className={productThumbClass}
            />
            {comparison.winner === 'B' && (
              <div className="absolute -top-1 -right-1 flex items-center justify-center w-6 h-6 rounded-full bg-brand-gradient text-white">
                <Trophy className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col p-4 gap-3">
          <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">
            {comparison.title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {comparison.excerpt}
          </p>
          <div className="flex items-center gap-2 text-sm font-medium text-brand-pink group-hover:gap-3 transition-all" style={{ color: '#E91E8F' }}>
            Read Comparison
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
