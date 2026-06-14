import { describe, it, expect, vi } from 'vitest';
import { withRetry } from '../../src/lib/email/retry';
import { verificationEmailTemplate, passwordResetEmailTemplate } from '../../src/lib/email/templates';
import { createEmailProvider } from '../../src/lib/email/provider';

describe('email templates', () => {
  it('verification email contains the link, subject and CTA', () => {
    const link = 'https://app.test/verify-email?token=abc';
    const t = verificationEmailTemplate(link);
    expect(t.subject).toMatch(/verify/i);
    expect(t.html).toContain(link);
    expect(t.text).toContain(link);
    expect(t.html).toMatch(/Verify email/);
  });

  it('password reset email contains the link and reset wording', () => {
    const link = 'https://app.test/reset-password?token=xyz';
    const t = passwordResetEmailTemplate(link);
    expect(t.subject).toMatch(/reset/i);
    expect(t.html).toContain(link);
    expect(t.text).toContain(link);
  });
});

describe('email retry', () => {
  it('returns on the first success without retrying', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    expect(await withRetry(fn, 3, 1)).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on failure then succeeds', async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValue('ok');
    expect(await withRetry(fn, 3, 1)).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('throws after exhausting attempts', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always'));
    await expect(withRetry(fn, 2, 1)).rejects.toThrow('always');
    expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
  });
});

describe('email provider selection', () => {
  it('falls back to the console provider when RESEND_API_KEY is unset', () => {
    // In tests RESEND_API_KEY is not set, so the console provider is used.
    expect(createEmailProvider().name).toBe('console');
  });
});
