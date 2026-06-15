import { env } from '../../config/env';
import { logger } from '../../lib/logger';
import { emailProvider, type EmailMessage } from '../../lib/email/provider';
import { withRetry } from '../../lib/email/retry';

/**
 * Marketing send layer. Reuses the existing email provider abstraction (Resend →
 * console fallback, ADR-015) so offline/CI works with no keys. Unlike the fire-and-
 * forget auth mailer, this returns a per-recipient success boolean so campaigns can
 * track delivered vs failed.
 */

export function activeEmailProvider(): { name: string; live: boolean } {
  return { name: emailProvider.name, live: emailProvider.name === 'resend' };
}

/** Send one marketing email with retry. Returns true on success, false on failure. */
export async function sendMarketingEmail(msg: EmailMessage): Promise<boolean> {
  try {
    await withRetry(() => emailProvider.send(msg), env.EMAIL_MAX_RETRIES);
    return true;
  } catch (err) {
    logger.warn({ err, to: msg.to }, 'marketing email send failed after retries');
    return false;
  }
}
