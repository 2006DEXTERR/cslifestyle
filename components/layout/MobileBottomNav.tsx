'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Home, Search, LayoutGrid, BookOpen, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { name: 'Home', icon: Home, href: '/' },
  { name: 'Search', icon: Search, href: '/search' },
  { name: 'Categories', icon: LayoutGrid, href: '/categories' },
  { name: 'Guides', icon: BookOpen, href: '/guides' },
  { name: 'Menu', icon: Menu, href: '#menu' },
];

interface MobileBottomNavProps {
  onMenuOpen?: () => void;
}

export function MobileBottomNav({ onMenuOpen }: MobileBottomNavProps) {
  const pathname = usePathname();

  const handleMenuClick = (item: typeof navItems[0]) => {
    if (item.href === '#menu' && onMenuOpen) {
      onMenuOpen();
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = item.href !== '#menu' && (pathname === item.href || pathname.startsWith(item.href + '/'));

          return (
            <Link
              key={item.name}
              href={item.href === '#menu' ? '#' : item.href}
              onClick={() => handleMenuClick(item)}
              className="flex flex-col items-center gap-1 px-3 py-2"
            >
              <div className="relative">
                <item.icon
                  className={cn(
                    'h-5 w-5 transition-colors',
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  )}
                />
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-brand-gradient"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </div>
              <span
                className={cn(
                  'text-[10px] font-medium transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
      <div className="h-safe-area-inset-bottom bg-background" />
    </nav>
  );
}
