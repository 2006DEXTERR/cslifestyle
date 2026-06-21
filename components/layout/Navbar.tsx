'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Menu,
  X,
  Sun,
  Moon,
  ChevronDown,
  User,
  BookOpen,
  GitCompare,
  Tag,
  LayoutGrid,
  Building2,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { catalogApi } from '@/lib/api/catalog';

/** Minimal shape the mega-menu needs for a category link. */
type MenuCategory = { name: string; slug: string; image?: string | null };

interface NavbarProps {
  onSearchOpen?: () => void;
}

const megaMenuData = {
  categories: {
    title: 'All Categories',
    icon: LayoutGrid,
    items: [] as MenuCategory[],
  },
  guides: {
    title: 'Buying Guides',
    icon: BookOpen,
    items: [
      { name: 'Smartphone Guide', slug: 'best-smartphones-under-30000' },
      { name: 'Earbuds Guide', slug: 'best-wireless-earbuds-2024' },
      { name: 'Laptop Guide', slug: 'best-laptops-for-students' },
      { name: 'Smartwatch Guide', slug: 'smartwatch-buying-guide' },
      { name: 'TV Guide', slug: 'best-tv-buying-guide' },
    ],
  },
  comparisons: {
    title: 'Popular Comparisons',
    icon: GitCompare,
    items: [
      { name: 'iPhone 15 vs S24 Ultra', slug: 'iphone-15-vs-samsung-s24' },
      { name: 'boAt vs Noise Earbuds', slug: 'boat-vs-noise-earbuds' },
      { name: 'MacBook vs Dell XPS', slug: 'macbook-vs-dell-xps' },
    ],
  },
  deals: {
    title: 'Best Deals',
    icon: Tag,
    items: [
      { name: 'Smartphone Deals', slug: 'smartphones' },
      { name: 'Audio Deals', slug: 'earbuds' },
      { name: 'Laptop Deals', slug: 'laptops' },
    ],
  },
  brands: {
    title: 'Top Brands',
    icon: Building2,
    items: [
      { name: 'Apple', slug: 'apple' },
      { name: 'Samsung', slug: 'samsung' },
      { name: 'Sony', slug: 'sony' },
      { name: 'boAt', slug: 'boat' },
      { name: 'OnePlus', slug: 'oneplus' },
    ],
  },
};

export function Navbar({ onSearchOpen }: NavbarProps) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [activeMenu, setActiveMenu] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [theme, setTheme] = React.useState<'light' | 'dark'>('light');
  // Live mega-menu categories (Phase 13) — replaces the former mock list.
  const [categoryItems, setCategoryItems] = React.useState<MenuCategory[]>([]);

  React.useEffect(() => {
    let active = true;
    catalogApi
      .listCategories()
      .then((cats) => {
        if (active) setCategoryItems(cats.slice(0, 8).map((c) => ({ name: c.name, slug: c.slug, image: c.image })));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  React.useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setTheme(savedTheme as 'light' | 'dark');
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const navItems = [
    { name: 'Categories', key: 'categories', href: '/categories' },
    { name: 'Buying Guides', key: 'guides', href: '/guides' },
    { name: 'Comparisons', key: 'comparisons', href: '/comparisons' },
    { name: 'Deals', key: 'deals', href: '/deals' },
    { name: 'Brands', key: 'brands', href: '/brands' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="relative flex items-center justify-center w-8 h-8">
              <Sparkles className="w-6 h-6 brand-gradient-text" />
            </div>
            <span className="text-xl font-bold">
              <span className="brand-gradient-text">CS</span>
              <span className="text-foreground">Lifestyle</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navItems.map((item) => (
              <div
                key={item.key}
                className="relative"
                onMouseEnter={() => setActiveMenu(item.key)}
                onMouseLeave={() => setActiveMenu(null)}
              >
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors hover:bg-accent hover:text-accent-foreground',
                    pathname.startsWith(item.href) && 'bg-accent text-accent-foreground'
                  )}
                >
                  {item.name}
                  <ChevronDown className="ml-1 h-4 w-4" />
                </Link>

                <AnimatePresence>
                  {activeMenu === item.key && megaMenuData[item.key as keyof typeof megaMenuData] && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full left-0 pt-2"
                    >
                      <div className="w-64 rounded-xl border bg-popover p-2 shadow-lg">
                        {(item.key === 'categories' ? categoryItems : megaMenuData[item.key as keyof typeof megaMenuData].items).map((subItem: any, index: number) => (
                          <Link
                            key={subItem.slug || index}
                            href={item.key === 'deals' ? '/deals' : `/${item.key === 'categories' ? 'categories' : item.key}/${subItem.slug}`}
                            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-accent"
                          >
                            <div className="flex-shrink-0">
                              {subItem.image ? (
                                <div className="h-10 w-10 rounded-md bg-muted" />
                              ) : (
                                <div className="flex items-center justify-center h-10 w-10 rounded-md bg-muted">
                                  {React.createElement(megaMenuData[item.key as keyof typeof megaMenuData].icon, { className: 'h-4 w-4' })}
                                </div>
                              )}
                            </div>
                            <span>{subItem.name}</span>
                          </Link>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </nav>

          {/* Search Bar */}
          <div className="hidden md:flex items-center flex-1 max-w-md mx-6">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search products, guides, comparisons..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 h-10"
              />
            </div>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="hidden sm:flex"
            >
              {theme === 'light' ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
            </Button>

            <Button variant="ghost" size="icon" className="hidden sm:flex">
              <User className="h-5 w-5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden border-t bg-background"
          >
            <div className="container mx-auto px-4 py-4 space-y-4">
              {/* Mobile Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search..."
                  className="pl-10"
                />
              </div>

              {/* Mobile Nav Items */}
              <nav className="space-y-1">
                {navItems.map((item) => (
                  <Link
                    key={item.key}
                    href={item.href}
                    className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg hover:bg-accent"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {React.createElement(megaMenuData[item.key as keyof typeof megaMenuData].icon, { className: 'h-4 w-4' })}
                    {item.name}
                  </Link>
                ))}
              </nav>

              {/* Mobile Theme Toggle */}
              <div className="pt-4 border-t">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3"
                  onClick={toggleTheme}
                >
                  {theme === 'light' ? (
                    <>
                      <Moon className="h-4 w-4" />
                      Dark Mode
                    </>
                  ) : (
                    <>
                      <Sun className="h-4 w-4" />
                      Light Mode
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
