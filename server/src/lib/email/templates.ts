import { env } from '../../config/env';

interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const BRAND = env.TWO_FACTOR_ISSUER; // "CSLifestyle"
const GRADIENT = 'linear-gradient(135deg,#E91E8F 0%,#FF4D4D 50%,#FF7A00 100%)';

/** Shared branded shell (inline styles only — email-client safe). */
function layout(opts: { heading: string; bodyHtml: string; cta: { label: string; href: string } }): string {
  return `<!doctype html>
<html><body style="margin:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
        <tr><td style="background:${GRADIENT};padding:20px 28px;">
          <span style="color:#ffffff;font-size:20px;font-weight:700;">${BRAND}</span>
        </td></tr>
        <tr><td style="padding:28px;">
          <h1 style="margin:0 0 12px;font-size:20px;color:#111827;">${opts.heading}</h1>
          ${opts.bodyHtml}
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
            <tr><td style="border-radius:8px;background:${GRADIENT};">
              <a href="${opts.cta.href}" style="display:inline-block;padding:12px 24px;color:#ffffff;font-weight:700;text-decoration:none;font-size:15px;">${opts.cta.label}</a>
            </td></tr>
          </table>
          <p style="margin:16px 0 0;font-size:13px;color:#6b7280;">Or copy this link into your browser:<br>
            <a href="${opts.cta.href}" style="color:#1a56db;word-break:break-all;">${opts.cta.href}</a></p>
        </td></tr>
        <tr><td style="padding:18px 28px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">If you didn't request this, you can safely ignore this email.</p>
        </td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:11px;color:#9ca3af;">© ${BRAND}</p>
    </td></tr>
  </table>
</body></html>`;
}

export function verificationEmailTemplate(link: string): RenderedEmail {
  return {
    subject: `Verify your ${BRAND} email`,
    html: layout({
      heading: 'Confirm your email address',
      bodyHtml: `<p style="margin:0;font-size:15px;line-height:1.6;color:#374151;">Welcome to ${BRAND}! Please confirm your email address to finish setting up your account.</p>`,
      cta: { label: 'Verify email', href: link },
    }),
    text: `Welcome to ${BRAND}!\n\nConfirm your email address by opening this link:\n${link}\n\nIf you didn't create an account, you can ignore this email.`,
  };
}

export function passwordResetEmailTemplate(link: string): RenderedEmail {
  return {
    subject: `Reset your ${BRAND} password`,
    html: layout({
      heading: 'Reset your password',
      bodyHtml: `<p style="margin:0;font-size:15px;line-height:1.6;color:#374151;">We received a request to reset your ${BRAND} password. This link expires soon. If you didn't request it, no action is needed.</p>`,
      cta: { label: 'Reset password', href: link },
    }),
    text: `Reset your ${BRAND} password by opening this link:\n${link}\n\nThis link expires soon. If you didn't request a reset, you can ignore this email.`,
  };
}
