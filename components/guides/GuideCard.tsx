'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Clock, BookOpen } from 'lucide-react';
import { BuyingGuide } from '@/lib/types';

interface GuideCardProps {
  guide: BuyingGuide;
  variant?: 'default' | 'feature' | 'compact';
}

export function GuideCard({ guide, variant = 'default' }: GuideCardProps) {
  if (variant === 'compact') {
    return (
      <Link href={`/guides/${guide.slug}`}>
        <motion.div
          whileHover={{ x: 4 }}
          className="group flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
        >
          <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-muted">
            <img
              src={guide.coverImage}
              alt={guide.title}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
              {guide.title}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {guide.readingTime} min read
            </p>
          </div>
        </motion.div>
      </Link>
    );
  }

  if (variant === 'feature') {
    return (
      <Link href={`/guides/${guide.slug}`}>
        <motion.div
          whileHover={{ y: -8 }}
          className="group relative rounded-2xl overflow-hidden bg-card hover:shadow-xl transition-all"
        >
          {/* Cover Image */}
          <div className="relative aspect-[16/9]">
            <img
              src={guide.coverImage}
              alt={guide.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <span className="inline-block px-2.5 py-1 rounded-full bg-white/20 backdrop-blur text-white text-xs font-medium">
                {guide.category}
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <h3 className="text-xl font-bold line-clamp-2 group-hover:text-primary transition-colors">
              {guide.title}
            </h3>
            <p className="text-muted-foreground mt-2 line-clamp-2">
              {guide.excerpt}
            </p>

            {/* Meta */}
            <div className="flex items-center gap-4 mt-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full overflow-hidden">
                  <img
                    src={guide.author.avatar}
                    alt={guide.author.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="text-sm font-medium">{guide.author.name}</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground text-sm ml-auto">
                <Clock className="w-4 h-4" />
                {guide.readingTime} min
              </div>
            </div>
          </div>
        </motion.div>
      </Link>
    );
  }

  return (
    <Link href={`/guides/${guide.slug}`}>
      <motion.div
        whileHover={{ y: -4 }}
        className="group flex flex-col rounded-xl border bg-card overflow-hidden hover:shadow-lg transition-all"
      >
        {/* Cover Image */}
        <div className="relative aspect-video overflow-hidden">
          <img
            src={guide.coverImage}
            alt={guide.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>

        {/* Content */}
        <div className="flex flex-col p-4 gap-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-brand-pink" style={{ color: '#E91E8F' }} />
            <span className="text-xs font-medium text-muted-foreground">
              {guide.category}
            </span>
          </div>

          <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">
            {guide.title}
          </h3>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            {guide.readingTime} min read
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
