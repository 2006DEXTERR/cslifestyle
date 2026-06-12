'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Home, Search, ArrowLeft, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md"
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-brand-gradient">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div className="text-left">
            <span className="text-xl font-bold">
              <span className="brand-gradient-text">CS</span>
              <span className="text-foreground">Lifestyle</span>
            </span>
          </div>
        </div>

        {/* 404 */}
        <div className="relative mb-8">
          <h1 className="text-[160px] md:text-[200px] font-bold leading-none brand-gradient-text opacity-20">
            404
          </h1>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
              <Search className="w-10 h-10 text-muted-foreground" />
            </div>
          </div>
        </div>

        <h2 className="text-2xl md:text-3xl font-bold mb-4">Page Not Found</h2>
        <p className="text-muted-foreground mb-8">
          The page you're looking for doesn't exist or has been moved. Let's get you back on track.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/">
            <Button className="w-full sm:w-auto bg-brand-gradient hover:opacity-90">
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Button>
          </Link>
          <Link href="/search">
            <Button variant="outline" className="w-full sm:w-auto">
              <Search className="w-4 h-4 mr-2" />
              Search Products
            </Button>
          </Link>
        </div>

        <p className="text-sm text-muted-foreground mt-8">
          Lost? Try these popular pages:
        </p>
        <div className="flex flex-wrap justify-center gap-2 mt-4">
          {[
            { name: 'Categories', href: '/categories' },
            { name: 'Guides', href: '/guides' },
            { name: 'Comparisons', href: '/comparisons' },
            { name: 'Deals', href: '/deals' },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-3 py-1.5 rounded-full bg-muted text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.name}
            </Link>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
