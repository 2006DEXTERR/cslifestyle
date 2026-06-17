import type { Request, Response, NextFunction } from 'express';

/**
 * Public read-cache headers for catalog GETs (loading-performance fix, Phase 13).
 * Lets the browser + any CDN serve repeat/navigation reads instantly instead of
 * round-tripping the (Render) backend on every paint.
 *
 * Applied AFTER `optionalAuthenticate`: authenticated/admin requests (which may see
 * drafts) are never cached — only anonymous public reads are. Safe by construction.
 */
export function publicCache(maxAge = 60, sMaxAge = 300) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user && req.method === 'GET') {
      res.setHeader(
        'Cache-Control',
        `public, max-age=${maxAge}, s-maxage=${sMaxAge}, stale-while-revalidate=600`,
      );
    } else {
      res.setHeader('Cache-Control', 'private, no-cache');
    }
    next();
  };
}
