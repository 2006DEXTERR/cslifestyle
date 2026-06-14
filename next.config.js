/** @type {import('next').NextConfig} */
const backendOrigin = process.env.BACKEND_ORIGIN || 'http://localhost:4000';

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  // Proxy API calls to the Express backend so auth cookies stay first-party.
  async rewrites() {
    return [
      { source: '/api/auth/:path*', destination: `${backendOrigin}/api/auth/:path*` },
      { source: '/api/v1/:path*', destination: `${backendOrigin}/api/v1/:path*` },
    ];
  },
};

module.exports = nextConfig;
