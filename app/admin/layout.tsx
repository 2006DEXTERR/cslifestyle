'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Building2,
  BookOpen,
  GitCompare,
  Users,
  Shield,
  Settings,
  Search,
  Bell,
  Sun,
  Moon,
  ChevronDown,
  Menu,
  X,
  LogOut,
  User,
  Sparkles,
  Upload,
  Brain,
  DollarSign,
  TrendingUp,
  Globe,
  BarChart3,
  Mail,
  ImageIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { SearchAutocomplete } from '@/components/search/SearchAutocomplete';

const sidebarSections = [
  {
    title: 'Dashboard',
    items: [
      { name: 'Overview', href: '/admin', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Catalog',
    items: [
      { name: 'Products', href: '/admin/products', icon: Package },
      { name: 'Categories', href: '/admin/categories', icon: FolderTree },
      { name: 'Brands', href: '/admin/brands', icon: Building2 },
    ],
  },
  {
    title: 'Content',
    items: [
      { name: 'Guides', href: '/admin/guides', icon: BookOpen },
      { name: 'Comparisons', href: '/admin/comparisons', icon: GitCompare },
      { name: 'Authors', href: '/admin/authors', icon: Users },
    ],
  },
  {
    title: 'Users',
    items: [
      { name: 'Users', href: '/admin/users', icon: Users },
      { name: 'Roles', href: '/admin/roles', icon: Shield },
    ],
  },
  {
    title: 'Enterprise',
    items: [
      { name: 'Import Center', href: '/admin/import', icon: Upload },
      { name: 'AI Center', href: '/admin/ai', icon: Brain },
      { name: 'Affiliate', href: '/admin/affiliate', icon: DollarSign },
      { name: 'SEO Center', href: '/admin/seo', icon: Globe },
      { name: 'Marketing', href: '/admin/marketing', icon: Mail },
      { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
      { name: 'Media Library', href: '/admin/media', icon: ImageIcon },
      { name: 'Discovery', href: '/admin/search', icon: Search },
    ],
  },
  {
    title: 'System',
    items: [
      { name: 'Settings', href: '/admin/settings', icon: Settings },
    ],
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const [theme, setTheme] = React.useState<'light' | 'dark'>('light');
  const [notifOpen, setNotifOpen] = React.useState(false);
  const notifRef = React.useRef<HTMLDivElement>(null);

  // Close the notifications panel on outside click / Escape.
  React.useEffect(() => {
    if (!notifOpen) return;
    const onDown = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setNotifOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [notifOpen]);

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

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Sidebar (Desktop) */}
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-card hidden lg:block">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b">
            <Link href="/admin" className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-brand-gradient">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <span className="font-bold text-lg">CSLifestyle</span>
                <span className="text-xs text-muted-foreground block">Admin</span>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-auto p-4">
            {sidebarSections.map((section) => (
              <div key={section.title} className="mb-6">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3">
                  {section.title}
                </h3>
                <div className="space-y-1">
                  {section.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                        isActive(item.href)
                          ? 'bg-brand-gradient text-white'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      )}
                    >
                      <item.icon className="w-4 h-4" />
                      {item.name}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </nav>

          {/* User Menu */}
          <div className="p-4 border-t">
            <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted cursor-pointer">
              <div className="w-9 h-9 rounded-full bg-brand-gradient flex items-center justify-center text-white font-semibold">
                A
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">Admin User</p>
                <p className="text-xs text-muted-foreground">Super Admin</p>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
              onClick={() => setIsSidebarOpen(false)}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 z-50 h-screen w-64 border-r bg-card lg:hidden"
            >
              <div className="flex flex-col h-full">
                <div className="p-4 border-b flex items-center justify-between">
                  <Link href="/admin" className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5" style={{ color: '#E91E8F' }} />
                    <span className="font-bold">CSLifestyle Admin</span>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsSidebarOpen(false)}
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
                <nav className="flex-1 overflow-auto p-4">
                  {sidebarSections.map((section) => (
                    <div key={section.title} className="mb-4">
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                        {section.title}
                      </h3>
                      <div className="space-y-1">
                        {section.items.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setIsSidebarOpen(false)}
                            className={cn(
                              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm',
                              isActive(item.href)
                                ? 'bg-brand-gradient text-white'
                                : 'hover:bg-muted'
                            )}
                          >
                            <item.icon className="w-4 h-4" />
                            {item.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </nav>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-30 h-16 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
          <div className="flex items-center justify-between h-full px-4 lg:px-6">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setIsSidebarOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </Button>
              {/* Reuses the shared site autocomplete (grouped DB-backed suggestions,
                  debounce, keyboard + mouse). Enter/selection navigates to /search?q=. */}
              <SearchAutocomplete
                placeholder="Search products, guides..."
                className="hidden md:block w-80"
                inputClassName="pl-10 h-9"
                iconClassName="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10 pointer-events-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="relative" ref={notifRef}>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setNotifOpen((v) => !v)}
                  aria-label="Notifications"
                  aria-expanded={notifOpen}
                >
                  <Bell className="w-5 h-5" />
                </Button>
                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-72 rounded-xl border bg-card shadow-lg z-50">
                    <div className="px-4 py-3 border-b">
                      <p className="text-sm font-semibold">Notifications</p>
                    </div>
                    <div className="p-6 text-center">
                      <Bell className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">No notifications yet.</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Notification alerts aren’t configured yet.
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <Button variant="ghost" size="icon" onClick={toggleTheme}>
                {theme === 'light' ? (
                  <Moon className="w-5 h-5" />
                ) : (
                  <Sun className="w-5 h-5" />
                )}
              </Button>
              <div className="hidden sm:flex items-center gap-3 pl-3 border-l ml-2">
                <div className="w-8 h-8 rounded-full bg-brand-gradient flex items-center justify-center text-white text-sm font-semibold">
                  A
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-medium">Admin</p>
                  <p className="text-xs text-muted-foreground">Super Admin</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
