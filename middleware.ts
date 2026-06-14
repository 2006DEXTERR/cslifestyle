import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

/**
 * Edge middleware guarding /admin/*.
 * - Unauthenticated (no/invalid access token) → redirect to /login?redirect=…
 * - Authenticated but lacking the "admin.access" permission → redirect home.
 *
 * The backend APIs independently enforce JWT + fine-grained RBAC (returning
 * 401/403); this edge check is the coarse gate for the admin UI.
 *
 * JWT_ACCESS_SECRET must match the backend. The dev default below mirrors the
 * backend default so local development works without extra configuration.
 */
const ACCESS_SECRET = new TextEncoder().encode(
  process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me-please-32+chars',
);

const ACCESS_COOKIE = 'cs_access';

async function getClaims(token: string): Promise<{ permissions?: string[] } | null> {
  try {
    const { payload } = await jwtVerify(token, ACCESS_SECRET, { issuer: 'cslifestyle' });
    return payload as { permissions?: string[] };
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const token = req.cookies.get(ACCESS_COOKIE)?.value;

  const loginUrl = new URL('/login', req.url);
  loginUrl.searchParams.set('redirect', pathname + search);

  if (!token) return NextResponse.redirect(loginUrl);

  const claims = await getClaims(token);
  if (!claims) return NextResponse.redirect(loginUrl);

  const permissions = claims.permissions ?? [];
  if (!permissions.includes('admin.access')) {
    const home = new URL('/', req.url);
    home.searchParams.set('error', 'forbidden');
    return NextResponse.redirect(home);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
