'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Smartphone, Laptop, Headphones, Watch, Home, Camera, Gamepad2, Tablet, Tv, Dumbbell, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Category } from '@/lib/types';

const iconMap: Record<string, LucideIcon> = {
  Smartphone,
  Laptop,
  Headphones,
  Watch,
  Home,
  Camera,
  Gamepad2,
  Tablet,
  Tv,
  Dumbbell,
};

interface CategoryCardProps {
  category: Category;
  variant?: 'default' | 'feature' | 'compact';
}

export function CategoryCard({ category, variant = 'default' }: CategoryCardProps) {
  const Icon = iconMap[category.icon] || Smartphone;

  if (variant === 'compact') {
    return (
      <Link href={`/categories/${category.slug}`}>
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-brand-gradient">
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-sm">{category.name}</h3>
            <p className="text-xs text-muted-foreground">
              {category.productCount} products
            </p>
          </div>
        </motion.div>
      </Link>
    );
  }

  if (variant === 'feature') {
    return (
      <Link href={`/categories/${category.slug}`}>
        <motion.div
          whileHover={{ y: -8 }}
          className="group relative flex flex-col rounded-2xl overflow-hidden bg-card hover:shadow-xl transition-all"
        >
          {/* Background Image */}
          <div className="absolute inset-0">
            <img
              src={category.image}
              alt={category.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          </div>

          {/* Content */}
          <div className="relative flex flex-col items-center justify-center p-6 aspect-[4/3] text-white">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-white/20 backdrop-blur mb-4">
              <Icon className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold">{category.name}</h3>
            <p className="text-sm text-white/80 mt-1">
              {category.productCount} products
            </p>
          </div>
        </motion.div>
      </Link>
    );
  }

  return (
    <Link href={`/categories/${category.slug}`}>
      <motion.div
        whileHover={{ y: -4 }}
        className="group flex flex-col items-center justify-center p-6 rounded-xl border bg-card hover:shadow-lg transition-all"
      >
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-muted group-hover:bg-brand-gradient transition-colors">
          <Icon className="w-8 h-8 text-muted-foreground group-hover:text-white transition-colors" />
        </div>
        <h3 className="font-semibold mt-4 text-center">{category.name}</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {category.productCount} products
        </p>
      </motion.div>
    </Link>
  );
}
