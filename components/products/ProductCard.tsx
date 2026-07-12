'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Star, ExternalLink, Clock, TrendingUp, Award, Percent } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Product } from '@/lib/types';
import { formatNumber } from '@/lib/format';
import { productThumbClass } from '@/lib/image';

interface ProductCardProps {
  product: Product;
  variant?: 'default' | 'compact' | 'feature';
  showDeal?: boolean;
}

export function ProductCard({ product, variant = 'default', showDeal = false }: ProductCardProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const renderRating = (rating: number) => {
    // No live rating yet (e.g. a freshly added/imported product) — never show a fake "0".
    if (!rating || rating <= 0) {
      return <span className="text-muted-foreground text-sm">No ratings yet</span>;
    }
    return (
      <div className="flex items-center gap-1">
        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
        <span className="font-medium">{rating}</span>
        <span className="text-muted-foreground text-sm">({formatNumber(product.reviewCount)})</span>
      </div>
    );
  };

  if (variant === 'compact') {
    return (
      <Link href={`/products/${product.slug}`}>
        <motion.div
          whileHover={{ y: -4 }}
          className="group flex gap-3 p-3 rounded-xl border bg-card hover:shadow-lg transition-shadow"
        >
          <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
            <img
              src={product.image}
              alt={product.name}
              className={productThumbClass}
            />
            {product.trending && (
              <div className="absolute top-1 left-1">
                <TrendingUp className="w-4 h-4 text-orange-500" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">{product.brand}</p>
            <h3 className="font-medium text-sm truncate">{product.name}</h3>
            {renderRating(product.rating)}
            <p className="font-semibold text-sm mt-1">
              {formatPrice(product.currentPrice)}
            </p>
          </div>
        </motion.div>
      </Link>
    );
  }

  if (variant === 'feature') {
    return (
      <Link href={`/products/${product.slug}`}>
        <motion.div
          whileHover={{ y: -4 }}
          className="group relative flex flex-col rounded-2xl border bg-card overflow-hidden hover:shadow-xl transition-all"
        >
          {/* Feature Badge */}
          {product.editorsPick && (
            <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-gradient text-white text-xs font-semibold">
              <Award className="w-3.5 h-3.5" />
              Editor's Pick
            </div>
          )}

          {/* Image */}
          <div className="relative aspect-square overflow-hidden bg-muted">
            <img
              src={product.image}
              alt={product.name}
              className={`${productThumbClass} transition-transform duration-500 group-hover:scale-105`}
            />
            {product.discount && (
              <div className="absolute top-4 right-4 flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-500 text-white text-xs font-semibold">
                <Percent className="w-3 h-3" />
                {product.discount}% OFF
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex flex-col p-4 gap-3">
            <div>
              <p className="text-sm text-muted-foreground">{product.brand}</p>
              <h3 className="font-semibold text-lg mt-1">{product.name}</h3>
            </div>

            <div className="flex items-center gap-2">
              {renderRating(product.rating)}
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl font-bold">
                  {formatPrice(product.currentPrice)}
                </p>
                {product.originalPrice && (
                  <p className="text-sm text-muted-foreground line-through">
                    {formatPrice(product.originalPrice)}
                  </p>
                )}
              </div>
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-gradient text-white text-sm font-medium hover:opacity-90 transition-opacity">
                Buy Now
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </motion.div>
      </Link>
    );
  }

  return (
    <Link href={`/products/${product.slug}`}>
      <motion.div
        whileHover={{ y: -4 }}
        className="group relative flex flex-col rounded-xl border bg-card overflow-hidden hover:shadow-lg transition-all"
      >
        {/* Badges */}
        <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
          {product.trending && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-orange-500 text-white text-xs font-medium">
              <TrendingUp className="w-3 h-3" />
              Trending
            </div>
          )}
          {product.editorsPick && !product.trending && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-brand-gradient text-white text-xs font-medium">
              <Award className="w-3 h-3" />
              Pick
            </div>
          )}
        </div>

        {/* Deal Badge */}
        {showDeal && product.deal && (
          <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500 text-white text-xs font-semibold">
            <Clock className="w-3 h-3" />
            {product.deal.expiresIn}
          </div>
        )}

        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          <img
            src={product.image}
            alt={product.name}
            className={`${productThumbClass} transition-transform duration-300 group-hover:scale-105`}
          />
          {product.discount && (
            <div className="absolute bottom-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/90 text-white text-xs font-medium">
              {product.discount}% OFF
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-col p-4 gap-2.5">
          <div>
            <p className="text-xs text-muted-foreground">{product.brand}</p>
            <h3 className="font-medium mt-0.5 line-clamp-2">{product.name}</h3>
          </div>

          {product.rating > 0 ? (
            <div className="flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-medium">{product.rating}</span>
              <span className="text-xs text-muted-foreground">
                ({formatNumber(product.reviewCount)})
              </span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">No ratings yet</span>
          )}

          <div className="flex items-baseline gap-2 mt-auto">
            <p className="text-lg font-bold">
              {formatPrice(product.currentPrice)}
            </p>
            {product.originalPrice && (
              <p className="text-sm text-muted-foreground line-through">
                {formatPrice(product.originalPrice)}
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
