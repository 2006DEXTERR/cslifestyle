'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
import { discoveryApi, type SearchSuggestion, type SuggestionType } from '@/lib/api/discovery';

/** Minimal shape the mega-menu needs for a category link. */
type MenuCategory = { name: string; slug: string; image?: string | null };

/** Autocomplete group display order + headers (predictive search). */
const SUGGESTION_GROUPS: { type: SuggestionType; label: string }[] = [
  { type: 'product', label: 'Products' },
  { type: 'category', label: 'Categories' },
  { type: 'brand', label: 'Brands' },
  { type: 'guide', label: 'Guides' },
  { type: 'comparison', label: 'Comparisons' },
  { type: 'popular', label: 'Popular searches' },
];

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
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [activeMenu, setActiveMenu] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  // Predictive autocomplete (Phase 13.x) — DB-backed, grouped, debounced, keyboard + mouse.
  const [suggestions, setSuggestions] = React.useState<SearchSuggestion[]>([]);
  const [showSuggest, setShowSuggest] = React.useState(false);
  const [activeIdx, setActiveIdx] = React.useState(-1);
  const suggestSeq = React.useRef(0);
  const blurTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
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

  // Debounced autocomplete: fetch DB-backed suggestions as the user types (≥2 chars).
  React.useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) { setSuggestions([]); setActiveIdx(-1); return; }
    const seq = ++suggestSeq.current;
    const timer = setTimeout(() => {
      discoveryApi
        .suggestions(q)
        .then((s) => {
          if (seq !== suggestSeq.current) return; // a newer keystroke superseded this
          setSuggestions(s.slice(0, 8));
          setActiveIdx(-1);
        })
        .catch(() => undefined);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Navigate to the search results page. Enter searches the current input; a chosen
  // suggestion searches that suggestion. The /search page reads ?q=.
  const runSearch = (term?: string) => {
    const q = (term ?? searchQuery).trim();
    if (!q) return;
    if (term && term !== searchQuery) setSearchQuery(term);
    setShowSuggest(false);
    setActiveIdx(-1);
    router.push(`/search?q=${encodeURIComponent(q)}`);
    setIsMenuOpen(false);
  };

  // Group suggestions by source (display order) and flatten for keyboard navigation.
  const orderedGroups = React.useMemo(
    () => SUGGESTION_GROUPS.map((g) => ({ ...g, items: suggestions.filter((s) => s.type === g.type) })).filter((g) => g.items.length > 0),
    [suggestions],
  );
  const ordered = React.useMemo(() => orderedGroups.flatMap((g) => g.items), [orderedGroups]);
  // Navigable rows = each suggestion + the trailing "Search for …" row (index === ordered.length).

  const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (ordered.length) { setShowSuggest(true); setActiveIdx((i) => Math.min(i + 1, ordered.length)); }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      // A highlighted suggestion searches its label; the "Search for …" row or no
      // selection searches the raw input.
      runSearch(activeIdx >= 0 && activeIdx < ordered.length ? ordered[activeIdx].label : undefined);
    } else if (e.key === 'Escape') {
      setShowSuggest(false);
      setActiveIdx(-1);
    }
  };

  const onSearchBlur = () => {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    blurTimer.current = setTimeout(() => setShowSuggest(false), 120); // allow click to register
  };

  // Predictive autocomplete dropdown — grouped by type, with a trailing "Search for …"
  // row. Reuses the existing popover styling (mega-menu look); no redesign.
  const renderSuggestions = () => {
    if (!showSuggest || ordered.length === 0) return null;
    const offsets: number[] = [];
    orderedGroups.reduce((acc, g, i) => { offsets[i] = acc; return acc + g.items.length; }, 0);
    const rawQuery = searchQuery.trim();
    return (
      <div className="absolute top-full left-0 right-0 mt-2 z-50">
        <ul className="rounded-xl border bg-popover p-2 shadow-lg max-h-96 overflow-auto" role="listbox">
          {orderedGroups.map((g, gi) => (
            <React.Fragment key={g.type}>
              <li className="px-3 pt-2 pb-1 text-xs font-medium text-muted-foreground" role="presentation">{g.label}</li>
              {g.items.map((s, ii) => {
                const idx = offsets[gi] + ii;
                return (
                  <li key={`${g.type}:${s.label}`} role="option" aria-selected={activeIdx === idx}>
                    <button
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); runSearch(s.label); }}
                      onMouseEnter={() => setActiveIdx(idx)}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-left transition-colors hover:bg-accent',
                        activeIdx === idx && 'bg-accent',
                      )}
                    >
                      <Search className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      <span className="truncate">{s.label}</span>
                    </button>
                  </li>
                );
              })}
            </React.Fragment>
          ))}
          {rawQuery && (
            <li role="option" aria-selected={activeIdx === ordered.length} className="mt-1 border-t pt-1">
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); runSearch(); }}
                onMouseEnter={() => setActiveIdx(ordered.length)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-left transition-colors hover:bg-accent',
                  activeIdx === ordered.length && 'bg-accent',
                )}
              >
                <Search className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                <span className="truncate">Search for &ldquo;{rawQuery}&rdquo;</span>
              </button>
            </li>
          )}
        </ul>
      </div>
    );
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
                onChange={(e) => { setSearchQuery(e.target.value); setShowSuggest(true); }}
                onFocus={() => { if (suggestions.length) setShowSuggest(true); }}
                onBlur={onSearchBlur}
                onKeyDown={onSearchKeyDown}
                role="combobox"
                aria-expanded={showSuggest && suggestions.length > 0}
                aria-autocomplete="list"
                className="pl-10 pr-4 h-10"
              />
              {renderSuggestions()}
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
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setShowSuggest(true); }}
                  onFocus={() => { if (suggestions.length) setShowSuggest(true); }}
                  onBlur={onSearchBlur}
                  onKeyDown={onSearchKeyDown}
                  role="combobox"
                  aria-expanded={showSuggest && suggestions.length > 0}
                  aria-autocomplete="list"
                  className="pl-10"
                />
                {renderSuggestions()}
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
