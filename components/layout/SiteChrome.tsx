'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { Footer } from '@/components/layout/Footer';

/** Standalone auth routes (login/signup/password) — rendered without public chrome. */
const AUTH_PREFIXES = ['/login', '/signup', '/forgot-password', '/reset-password', '/auth'];

/**
 * Renders the public site chrome (Navbar / Footer / mobile bottom nav) for public
 * content routes only.
 *
 * - Admin routes (`/admin/*`) provide their own full-screen layout (sidebar +
 *   header) in app/admin/layout.tsx, so the public chrome must NOT wrap them —
 *   otherwise the public header stacks on top of the admin header.
 * - Auth routes (the admin/user login, signup and password screens) are
 *   standalone centered cards; they must not show the public header/footer either.
 *
 * This is a thin client boundary; `children` (server components) are passed
 * through untouched, so public pages keep their existing SSR behaviour.
 */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';
  const isAdmin = pathname.startsWith('/admin');
  const isAuth = AUTH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  // Admin owns its entire layout — render children as-is.
  if (isAdmin) {
    return <>{children}</>;
  }

  // Auth pages: no public chrome, but keep a full-height wrapper so the centered
  // card sits mid-screen instead of floating under an empty header area.
  if (isAuth) {
    return <div className="min-h-screen flex flex-col justify-center">{children}</div>;
  }

  return (
    <div className="relative min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pb-20 md:pb-0">{children}</main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
