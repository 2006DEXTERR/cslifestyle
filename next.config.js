/** @type {import('next').NextConfig} */
// Default to IPv4 127.0.0.1 (not "localhost") so the dev proxy doesn't resolve to
// IPv6 ::1 and fail to reach the IPv4-bound backend on Windows. Prod overrides via env.
const backendOrigin = process.env.BACKEND_ORIGIN || 'http://127.0.0.1:4000';

const nextConfig = {
  // Slim, self-contained server bundle for the production Docker image (Phase 12).
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  // Proxy API calls to the Express backend so auth cookies stay first-party.
  async rewrites() {
    return [
      { source: '/api/auth/:path*', destination: `${backendOrigin}/api/auth/:path*` },
      { source: '/api/v1/:path*', destination: `${backendOrigin}/api/v1/:path*` },
      // Catalog (Phase 2) — unversioned per the catalog API contract.
      { source: '/api/products/:path*', destination: `${backendOrigin}/api/products/:path*` },
      { source: '/api/products', destination: `${backendOrigin}/api/products` },
      { source: '/api/categories/:path*', destination: `${backendOrigin}/api/categories/:path*` },
      { source: '/api/categories', destination: `${backendOrigin}/api/categories` },
      { source: '/api/brands/:path*', destination: `${backendOrigin}/api/brands/:path*` },
      { source: '/api/brands', destination: `${backendOrigin}/api/brands` },
      { source: '/api/search', destination: `${backendOrigin}/api/search` },
      // Discovery — advanced search + recommendations + internal linking (Phase 11).
      { source: '/api/search/:path*', destination: `${backendOrigin}/api/search/:path*` },
      { source: '/api/recommendations/:path*', destination: `${backendOrigin}/api/recommendations/:path*` },
      // Content (Phase 3).
      { source: '/api/authors/:path*', destination: `${backendOrigin}/api/authors/:path*` },
      { source: '/api/authors', destination: `${backendOrigin}/api/authors` },
      { source: '/api/guides/:path*', destination: `${backendOrigin}/api/guides/:path*` },
      { source: '/api/guides', destination: `${backendOrigin}/api/guides` },
      { source: '/api/comparisons/:path*', destination: `${backendOrigin}/api/comparisons/:path*` },
      { source: '/api/comparisons', destination: `${backendOrigin}/api/comparisons` },
      // Affiliate + revenue (Phase 5) + the /go redirect engine.
      { source: '/api/affiliate/:path*', destination: `${backendOrigin}/api/affiliate/:path*` },
      { source: '/api/revenue/:path*', destination: `${backendOrigin}/api/revenue/:path*` },
      { source: '/go/:path*', destination: `${backendOrigin}/go/:path*` },
      // Import Center (Phase 6).
      { source: '/api/import/:path*', destination: `${backendOrigin}/api/import/:path*` },
      // AI content engine (Phase 7).
      { source: '/api/ai/:path*', destination: `${backendOrigin}/api/ai/:path*` },
      // Analytics & Reporting (Phase 8).
      { source: '/api/analytics/:path*', destination: `${backendOrigin}/api/analytics/:path*` },
      // Marketing & Communication (Phase 9).
      { source: '/api/marketing/:path*', destination: `${backendOrigin}/api/marketing/:path*` },
      { source: '/api/newsletter/:path*', destination: `${backendOrigin}/api/newsletter/:path*` },
      // Media Library (Phase 10) — API + static uploaded files.
      { source: '/api/media/:path*', destination: `${backendOrigin}/api/media/:path*` },
      { source: '/uploads/:path*', destination: `${backendOrigin}/uploads/:path*` },
      // Admin management (Phase 13: users, roles, settings, SEO sitemap status).
      { source: '/api/users/:path*', destination: `${backendOrigin}/api/users/:path*` },
      { source: '/api/users', destination: `${backendOrigin}/api/users` },
      { source: '/api/roles/:path*', destination: `${backendOrigin}/api/roles/:path*` },
      { source: '/api/roles', destination: `${backendOrigin}/api/roles` },
      { source: '/api/settings/:path*', destination: `${backendOrigin}/api/settings/:path*` },
      { source: '/api/settings', destination: `${backendOrigin}/api/settings` },
      { source: '/api/seo/:path*', destination: `${backendOrigin}/api/seo/:path*` },
      // Admin dashboard overview + API Import Center live under /api/admin/* — must be
      // proxied to the backend (previously missing → admin dashboard/import 404'd in
      // split frontend/backend deployments).
      { source: '/api/admin/:path*', destination: `${backendOrigin}/api/admin/:path*` },
    ];
  },
  // Security headers for the storefront/admin HTML (the backend API sets its own via
  // Helmet). No CSP here to avoid breaking Next's inline runtime; these are safe defaults.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
