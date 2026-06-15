import { Router } from 'express';
import { asyncHandler } from '../lib/async-handler';
import { goLimiter } from '../middleware/rateLimit';
import { go } from '../controllers/affiliate/go.controller';

/**
 * Affiliate redirect router — mounted at root `/go` (FR-044/046/049).
 * Public, fast 302 to amazon.in with the associate tag; click logged async.
 */
export const goRouter = Router();

/**
 * @openapi
 * /go/{asin}:
 *   get:
 *     tags: [Affiliate]
 *     summary: Affiliate redirect — 302 to amazon.in/dp/{ASIN} with the associate tag
 *     description: >
 *       Validates the ASIN + amazon.in whitelist, applies the associate tag (or a campaign
 *       override via `?c=<slug>`), 302-redirects, and logs the click fire-and-forget
 *       (SHA-256 ip/UA only). `?src=<sourceType>` attributes the traffic source. Invalid
 *       ASIN → 302 to the site home.
 *     parameters:
 *       - { in: path, name: asin, required: true, schema: { type: string } }
 *       - { in: query, name: src, schema: { type: string, enum: [product, guide, comparison, category, deals, search, direct, other] } }
 *       - { in: query, name: c, schema: { type: string }, description: campaign slug }
 *     responses:
 *       302: { description: Redirect to the affiliate URL }
 */
goRouter.get('/:asin', goLimiter, asyncHandler(go));
