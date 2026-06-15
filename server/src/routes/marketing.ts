import { Router } from 'express';
import { asyncHandler } from '../lib/async-handler';
import { authenticate } from '../middleware/authenticate';
import { requirePermission } from '../middleware/authorize';
import { requireCsrf } from '../middleware/csrf';
import { validateBody } from '../middleware/validate';
import { auditLogger } from '../middleware/audit';
import { publicCatalogLimiter } from '../middleware/rateLimit';
import {
  subscribeSchema,
  unsubscribeSchema,
  campaignCreateSchema,
  campaignUpdateSchema,
  scheduleSchema,
  sendTestSchema,
  subscriberCreateSchema,
  subscriberUpdateSchema,
} from '../validation/marketing.schemas';
import * as ctrl from '../controllers/marketing/marketing.controller';

/**
 * Marketing & Communication API (Phase 9). Mounted at `/api`. Public newsletter
 * subscribe/confirm/unsubscribe + email open/click tracking need no auth (privacy-safe,
 * validated, rate-limited). Admin reads need `marketing.view`; subscriber writes need
 * `newsletter.manage`; campaign writes need `campaign.manage` (JWT + CSRF + audit).
 */
export const marketingRouter = Router();

const view = [authenticate, requirePermission('marketing.view')] as const;

// ── Public newsletter ──
/**
 * @openapi
 * /api/newsletter/subscribe:
 *   post: { tags: [Marketing], summary: Subscribe to the newsletter (public, double opt-in), responses: { 201: { description: Pending/active } } }
 * /api/newsletter/unsubscribe:
 *   post: { tags: [Marketing], summary: Unsubscribe by email or token (public), responses: { 200: { description: Unsubscribed } } }
 *   get: { tags: [Marketing], summary: One-click unsubscribe from an email link (public), responses: { 200: { description: Unsubscribed } } }
 * /api/newsletter/verify:
 *   get: { tags: [Marketing], summary: Confirm a double opt-in subscription (public), responses: { 200: { description: Confirmed } } }
 */
marketingRouter.post('/newsletter/subscribe', publicCatalogLimiter, validateBody(subscribeSchema), asyncHandler(ctrl.subscribe));
marketingRouter.post('/newsletter/unsubscribe', publicCatalogLimiter, validateBody(unsubscribeSchema), asyncHandler(ctrl.unsubscribePost));
marketingRouter.get('/newsletter/unsubscribe', asyncHandler(ctrl.unsubscribeGet));
marketingRouter.get('/newsletter/verify', asyncHandler(ctrl.verify));

// ── Public email tracking ──
/**
 * @openapi
 * /api/marketing/track/open/{id}.gif:
 *   get: { tags: [Marketing], summary: Open-tracking pixel (public), responses: { 200: { description: 1x1 GIF } } }
 * /api/marketing/track/click/{id}:
 *   get: { tags: [Marketing], summary: Click-tracking redirect (public, same-origin only), responses: { 302: { description: Redirect } } }
 */
marketingRouter.get('/marketing/track/open/:id', asyncHandler(ctrl.trackOpen));
marketingRouter.get('/marketing/track/click/:id', asyncHandler(ctrl.trackClick));

// ── Admin reads ──
/**
 * @openapi
 * /api/marketing/dashboard:
 *   get: { tags: [Marketing], summary: Marketing dashboard — subscribers + open/click rates + performance (marketing.view), responses: { 200: { description: Dashboard } } }
 * /api/marketing/subscribers:
 *   get: { tags: [Marketing], summary: List subscribers (paginated; search/filter/tag; marketing.view), responses: { 200: { description: Subscribers } } }
 * /api/marketing/campaigns:
 *   get: { tags: [Marketing], summary: List campaigns (marketing.view), responses: { 200: { description: Campaigns } } }
 * /api/marketing/events:
 *   get: { tags: [Marketing], summary: List email events (marketing.view), responses: { 200: { description: Events } } }
 * /api/marketing/templates:
 *   get: { tags: [Marketing], summary: List email templates (marketing.view), responses: { 200: { description: Templates } } }
 */
marketingRouter.get('/marketing/dashboard', ...view, asyncHandler(ctrl.getDashboard));
marketingRouter.get('/marketing/subscribers/stats', ...view, asyncHandler(ctrl.getSubscriberStats));
marketingRouter.get('/marketing/subscribers/export', ...view, asyncHandler(ctrl.exportSubscribers));
marketingRouter.get('/marketing/subscribers', ...view, asyncHandler(ctrl.listSubscribers));
marketingRouter.get('/marketing/campaigns/:id', ...view, asyncHandler(ctrl.getCampaign));
marketingRouter.get('/marketing/campaigns', ...view, asyncHandler(ctrl.listCampaigns));
marketingRouter.get('/marketing/events', ...view, asyncHandler(ctrl.listEvents));
marketingRouter.get('/marketing/templates', ...view, ctrl.listTemplates);
marketingRouter.get('/marketing/provider', ...view, ctrl.getProvider);

// ── Subscriber management (newsletter.manage) ──
marketingRouter.post('/marketing/subscribers', authenticate, requireCsrf, requirePermission('newsletter.manage'), validateBody(subscriberCreateSchema), auditLogger('marketing.subscriber_created', 'marketing'), asyncHandler(ctrl.createSubscriber));
marketingRouter.patch('/marketing/subscribers/:id', authenticate, requireCsrf, requirePermission('newsletter.manage'), validateBody(subscriberUpdateSchema), auditLogger('marketing.subscriber_updated', 'marketing'), asyncHandler(ctrl.updateSubscriber));
marketingRouter.delete('/marketing/subscribers/:id', authenticate, requireCsrf, requirePermission('newsletter.manage'), auditLogger('marketing.subscriber_deleted', 'marketing'), asyncHandler(ctrl.removeSubscriber));

// ── Campaign management (campaign.manage) ──
/**
 * @openapi
 * /api/marketing/campaigns/{id}/send:
 *   post: { tags: [Marketing], summary: Send a campaign (campaign.manage), parameters: [{ in: path, name: id, required: true, schema: { type: string } }], responses: { 200: { description: Sending } } }
 * /api/marketing/campaigns/{id}/test:
 *   post: { tags: [Marketing], summary: Send a test email (campaign.manage), responses: { 200: { description: Sent } } }
 * /api/marketing/campaigns/{id}/schedule:
 *   post: { tags: [Marketing], summary: Schedule a campaign (campaign.manage), responses: { 200: { description: Scheduled } } }
 */
marketingRouter.post('/marketing/campaigns', authenticate, requireCsrf, requirePermission('campaign.manage'), validateBody(campaignCreateSchema), auditLogger('marketing.campaign_created', 'marketing'), asyncHandler(ctrl.createCampaign));
marketingRouter.patch('/marketing/campaigns/:id', authenticate, requireCsrf, requirePermission('campaign.manage'), validateBody(campaignUpdateSchema), auditLogger('marketing.campaign_updated', 'marketing'), asyncHandler(ctrl.updateCampaign));
marketingRouter.post('/marketing/campaigns/:id/schedule', authenticate, requireCsrf, requirePermission('campaign.manage'), validateBody(scheduleSchema), auditLogger('marketing.campaign_scheduled', 'marketing'), asyncHandler(ctrl.scheduleCampaign));
marketingRouter.post('/marketing/campaigns/:id/test', authenticate, requireCsrf, requirePermission('campaign.manage'), validateBody(sendTestSchema), auditLogger('marketing.campaign_test', 'marketing'), asyncHandler(ctrl.sendTest));
marketingRouter.post('/marketing/campaigns/:id/send', authenticate, requireCsrf, requirePermission('campaign.manage'), auditLogger('marketing.campaign_sent', 'marketing'), asyncHandler(ctrl.sendCampaign));
marketingRouter.post('/marketing/campaigns/:id/retry', authenticate, requireCsrf, requirePermission('campaign.manage'), auditLogger('marketing.campaign_retry', 'marketing'), asyncHandler(ctrl.retryCampaign));
marketingRouter.delete('/marketing/campaigns/:id', authenticate, requireCsrf, requirePermission('campaign.manage'), auditLogger('marketing.campaign_deleted', 'marketing'), asyncHandler(ctrl.removeCampaign));
