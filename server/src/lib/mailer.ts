import { env } from '../config/env';
import { logger } from './logger';
import { recordAudit } from './audit';
import { emailProvider, type EmailMessage } from './email/provider';
import { withRetry } from './email/retry';
import { passwordResetEmailTemplate, verificationEmailTemplate } from './email/templates';

/**
 * Email delivery orchestrator. Renders a branded template, sends via the
 * configured provider (Resend, or a console fallback when RESEND_API_KEY is
 * unset) with retry + backoff, and writes an audit-log entry on success/failure.
 *
 * The public helpers are fire-and-forget (return void) so the auth request path
 * is never blocked or failed by email delivery.
 */
export async function deliverEmail(msg: EmailMessage, type: string): Promise<void> {
  try {
    await withRetry(() => emailProvider.send(msg), env.EMAIL_MAX_RETRIES);
    await recordAudit({
      event: 'email.sent',
      module: 'email',
      metadata: { type, to: msg.to, provider: emailProvider.name },
    });
  } catch (err) {
    logger.error({ err, type, to: msg.to }, 'Email delivery failed after retries');
    await recordAudit({
      event: 'email.failed',
      module: 'email',
      metadata: { type, to: msg.to, provider: emailProvider.name, error: String(err) },
    });
  }
}

export function sendVerificationEmail(to: string, link: string): void {
  const tpl = verificationEmailTemplate(link);
  void deliverEmail({ to, ...tpl }, 'verification');
}

export function sendPasswordResetEmail(to: string, link: string): void {
  const tpl = passwordResetEmailTemplate(link);
  void deliverEmail({ to, ...tpl }, 'password_reset');
}
