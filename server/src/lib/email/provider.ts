import { Resend } from 'resend';
import { env } from '../../config/env';
import { logger } from '../logger';

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface EmailProvider {
  readonly name: string;
  send(msg: EmailMessage): Promise<void>;
}

/** Sends via Resend (resend.com). Used when RESEND_API_KEY is configured. */
class ResendProvider implements EmailProvider {
  readonly name = 'resend';
  private readonly client: Resend;

  constructor(apiKey: string) {
    this.client = new Resend(apiKey);
  }

  async send(msg: EmailMessage): Promise<void> {
    const { error } = await this.client.emails.send({
      from: env.EMAIL_FROM,
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
    });
    if (error) {
      throw new Error(`Resend send failed: ${error.name ?? 'error'} — ${error.message ?? ''}`);
    }
  }
}

/** Dev/test fallback — logs the email instead of sending it. */
class ConsoleProvider implements EmailProvider {
  readonly name = 'console';

  async send(msg: EmailMessage): Promise<void> {
    logger.info({ to: msg.to, subject: msg.subject }, '[email:console] email logged (not sent)');
  }
}

export function createEmailProvider(): EmailProvider {
  if (env.RESEND_API_KEY) return new ResendProvider(env.RESEND_API_KEY);
  return new ConsoleProvider();
}

export const emailProvider: EmailProvider = createEmailProvider();
