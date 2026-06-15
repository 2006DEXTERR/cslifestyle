import { env } from '../../config/env';

/**
 * Marketing email templates (Phase 9). Reuses the existing branded shell style. Each
 * builder returns a `CampaignContent`; `renderEmail` wraps it with a tracking pixel +
 * one-click unsubscribe footer (CAN-SPAM-style). Announcement templates reuse the
 * AI-generated product/guide/comparison copy where present.
 */

const BRAND = env.TWO_FACTOR_ISSUER; // "CSLifestyle"
const GRADIENT = 'linear-gradient(135deg,#E91E8F 0%,#FF4D4D 50%,#FF7A00 100%)';

export interface CampaignContent {
  heading: string;
  bodyHtml: string;
  bodyText: string;
  ctaLabel?: string;
  ctaHref?: string;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const PRESET_TEMPLATES = ['newsletter', 'product_announcement', 'guide_announcement', 'comparison_announcement'] as const;
export type TemplateKey = (typeof PRESET_TEMPLATES)[number];
export function isTemplateKey(v: string): v is TemplateKey {
  return (PRESET_TEMPLATES as readonly string[]).includes(v);
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}
function paragraphs(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#374151;">${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

// ── Content builders ──

export function newsletterContent(subject: string, content: string): CampaignContent {
  return { heading: subject, bodyHtml: paragraphs(content || ''), bodyText: content || '' };
}

export function productAnnouncementContent(p: {
  title: string;
  brand?: string | null;
  description?: string | null;
  seoTitle?: string | null;
  currentPrice?: number | null;
  asin: string;
}): CampaignContent {
  const blurb = (p.description ?? '').slice(0, 400) || `Check out ${p.title} — a new pick from ${p.brand ?? 'a top brand'}.`;
  const price = p.currentPrice ? ` Now around ₹${Math.round(p.currentPrice).toLocaleString('en-IN')}.` : '';
  return {
    heading: p.seoTitle || `New pick: ${p.title}`,
    bodyHtml: paragraphs(`${blurb}${price}`),
    bodyText: `${blurb}${price}`,
    ctaLabel: 'View on Amazon',
    ctaHref: `/go/${p.asin}?src=newsletter`,
  };
}

export function guideAnnouncementContent(g: { title: string; excerpt?: string | null; slug: string }): CampaignContent {
  const blurb = g.excerpt || `Read our new buying guide: ${g.title}.`;
  return {
    heading: `New guide: ${g.title}`,
    bodyHtml: paragraphs(blurb),
    bodyText: blurb,
    ctaLabel: 'Read the guide',
    ctaHref: `/guides/${g.slug}`,
  };
}

export function comparisonAnnouncementContent(c: { title: string; summary?: string | null; verdict?: string | null; slug: string }): CampaignContent {
  const blurb = c.summary || c.verdict || `See our head-to-head: ${c.title}.`;
  return {
    heading: `New comparison: ${c.title}`,
    bodyHtml: paragraphs(blurb),
    bodyText: blurb,
    ctaLabel: 'See the comparison',
    ctaHref: `/comparisons/${c.slug}`,
  };
}

// ── Wrapper ──

export function renderEmail(
  content: CampaignContent,
  opts: { subject: string; unsubscribeUrl: string; pixelUrl?: string; ctaHref?: string },
): RenderedEmail {
  const ctaHref = opts.ctaHref ?? content.ctaHref;
  const ctaBlock = ctaHref && content.ctaLabel
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0;">
         <tr><td style="border-radius:8px;background:${GRADIENT};">
           <a href="${ctaHref}" style="display:inline-block;padding:12px 24px;color:#ffffff;font-weight:700;text-decoration:none;font-size:15px;">${escapeHtml(content.ctaLabel)}</a>
         </td></tr></table>`
    : '';
  const pixel = opts.pixelUrl ? `<img src="${opts.pixelUrl}" width="1" height="1" alt="" style="display:none;">` : '';

  const html = `<!doctype html>
<html><body style="margin:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
        <tr><td style="background:${GRADIENT};padding:20px 28px;"><span style="color:#ffffff;font-size:20px;font-weight:700;">${BRAND}</span></td></tr>
        <tr><td style="padding:28px;">
          <h1 style="margin:0 0 14px;font-size:21px;color:#111827;">${escapeHtml(content.heading)}</h1>
          ${content.bodyHtml}
          ${ctaBlock}
        </td></tr>
        <tr><td style="padding:18px 28px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">You're receiving this because you subscribed to ${BRAND}.
            <a href="${opts.unsubscribeUrl}" style="color:#9ca3af;text-decoration:underline;">Unsubscribe</a>.</p>
        </td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:11px;color:#9ca3af;">© ${BRAND}</p>
    </td></tr>
  </table>
  ${pixel}
</body></html>`;

  const text = `${content.heading}\n\n${content.bodyText}\n${ctaHref ? `\n${content.ctaLabel}: ${ctaHref}\n` : ''}\n—\nUnsubscribe: ${opts.unsubscribeUrl}\n© ${BRAND}`;
  return { subject: opts.subject, html, text };
}

// ── Lifecycle emails ──

export function verifySubscriptionEmail(confirmUrl: string): RenderedEmail {
  return renderEmail(
    {
      heading: `Confirm your ${BRAND} subscription`,
      bodyHtml: paragraphs(`Thanks for subscribing to the ${BRAND} newsletter! Please confirm your email to start receiving our best deals, guides and comparisons.`),
      bodyText: `Confirm your ${BRAND} subscription to start receiving our best deals, guides and comparisons.`,
      ctaLabel: 'Confirm subscription',
      ctaHref: confirmUrl,
    },
    { subject: `Confirm your ${BRAND} subscription`, unsubscribeUrl: confirmUrl, ctaHref: confirmUrl },
  );
}

export function welcomeEmail(unsubscribeUrl: string): RenderedEmail {
  return renderEmail(
    {
      heading: `Welcome to ${BRAND}! 🎉`,
      bodyHtml: paragraphs(`You're in! You'll now get our handpicked deals, buying guides and product comparisons. No spam — just the good stuff.`),
      bodyText: `Welcome to ${BRAND}! You'll now get our handpicked deals, buying guides and product comparisons.`,
    },
    { subject: `Welcome to ${BRAND}`, unsubscribeUrl },
  );
}
