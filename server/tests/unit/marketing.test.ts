import { describe, it, expect } from 'vitest';
import { sha256 } from '../../src/lib/tokens';
import { normalizeEmail } from '../../src/services/marketing/newsletter.service';
import { newVerifyToken, newUnsubscribeToken } from '../../src/services/marketing/delivery';
import { isTemplateKey, renderEmail, verifySubscriptionEmail, productAnnouncementContent } from '../../src/services/marketing/templates';
import { activeEmailProvider } from '../../src/services/marketing/email';

describe('newsletter helpers', () => {
  it('normalises emails (lowercase + trim)', () => {
    expect(normalizeEmail('  Foo@Bar.COM ')).toBe('foo@bar.com');
  });

  it('generates verify tokens whose hash matches sha256(token)', () => {
    const { token, hash } = newVerifyToken();
    expect(token.length).toBeGreaterThan(16);
    expect(hash).toBe(sha256(token));
  });

  it('generates non-empty unsubscribe tokens', () => {
    expect(newUnsubscribeToken().length).toBeGreaterThan(16);
  });
});

describe('email templates', () => {
  it('guards preset template keys', () => {
    expect(isTemplateKey('newsletter')).toBe(true);
    expect(isTemplateKey('product_announcement')).toBe(true);
    expect(isTemplateKey('nope')).toBe(false);
  });

  it('renders an unsubscribe link + tracking pixel into the email', () => {
    const html = renderEmail(
      { heading: 'Hi', bodyHtml: '<p>x</p>', bodyText: 'x' },
      { subject: 'S', unsubscribeUrl: 'https://site/api/newsletter/unsubscribe?token=abc', pixelUrl: 'https://site/api/marketing/track/open/r1.gif' },
    );
    expect(html.subject).toBe('S');
    expect(html.html).toContain('unsubscribe?token=abc');
    expect(html.html).toContain('track/open/r1.gif');
    expect(html.text).toContain('Unsubscribe:');
  });

  it('builds a product announcement reusing product copy + a /go CTA', () => {
    const c = productAnnouncementContent({ title: 'Acme Buds', brand: 'Acme', description: 'Great sound.', seoTitle: null, currentPrice: 1999, asin: 'B0TEST1234' });
    expect(c.ctaHref).toBe('/go/B0TEST1234?src=newsletter');
    expect(c.bodyText).toContain('Great sound.');
    expect(c.ctaLabel).toBe('View on Amazon');
  });

  it('verification email has a confirm CTA', () => {
    const tpl = verifySubscriptionEmail('https://site/api/newsletter/verify?token=t');
    expect(tpl.html).toContain('verify?token=t');
    expect(tpl.subject.toLowerCase()).toContain('confirm');
  });
});

describe('email provider (offline)', () => {
  it('falls back to the console provider with no RESEND_API_KEY', () => {
    const p = activeEmailProvider();
    expect(p.name).toBe('console');
    expect(p.live).toBe(false);
  });
});
