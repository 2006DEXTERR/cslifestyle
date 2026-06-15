import type { Request, Response } from 'express';
import { env } from '../../config/env';
import { getContext } from '../../lib/request-context';
import { sha256 } from '../../lib/tokens';
import { parseDeviceType, parseSourceType } from '../../lib/affiliate';
import { resolveRedirect, logClick } from '../../services/affiliate/affiliate.service';

/**
 * GET /go/:asin — affiliate redirect engine.
 * Validates the ASIN + amazon.in whitelist, applies the associate tag, 302-redirects
 * in <100ms (no awaited DB on the hot path), and logs the click fire-and-forget
 * (privacy-safe: SHA-256 ip/UA only). Query: ?src=<sourceType> &c=<campaignSlug>.
 */
export async function go(req: Request, res: Response): Promise<void> {
  const asin = req.params.asin;
  const campaignSlug = typeof req.query.c === 'string' ? req.query.c : undefined;

  const resolution = await resolveRedirect(asin, campaignSlug);
  if (!resolution) {
    // Invalid ASIN → safe fallback to the site (never an open redirect).
    res.redirect(302, env.APP_URL);
    return;
  }

  // Respond immediately.
  res.redirect(302, resolution.url);

  // Fire-and-forget, privacy-safe click logging (after the response).
  if (resolution.trackingEnabled) {
    const ctx = getContext(req);
    const ua = typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined;
    const country = typeof req.headers['cf-ipcountry'] === 'string' ? req.headers['cf-ipcountry'] : null;
    const sourcePath =
      typeof req.query.from === 'string' ? req.query.from : (req.get('referer') ?? null);

    void logClick({
      asin,
      sourceType: parseSourceType(req.query.src),
      sourcePath,
      campaignId: resolution.campaignId,
      affiliateTag: resolution.tag,
      ipHash: ctx.ipHash ?? null,
      userAgentHash: ua ? sha256(ua) : null,
      deviceType: parseDeviceType(ua),
      country,
    });
  }
}
