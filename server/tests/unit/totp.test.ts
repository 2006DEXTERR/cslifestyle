import { describe, it, expect } from 'vitest';
import { authenticator } from 'otplib';
import { generateTotpSecret, buildOtpAuthUri, verifyTotp, toQrDataUrl } from '../../src/lib/totp';

describe('TOTP', () => {
  it('verifies a code generated from the same secret', () => {
    const secret = generateTotpSecret();
    const token = authenticator.generate(secret);
    expect(verifyTotp(token, secret)).toBe(true);
  });

  it('rejects a wrong code', () => {
    const secret = generateTotpSecret();
    expect(verifyTotp('000000', generateTotpSecret())).toBe(false);
    expect(verifyTotp('abc', secret)).toBe(false);
  });

  it('builds an otpauth URI with the issuer and account', () => {
    const uri = buildOtpAuthUri('jane@example.com', generateTotpSecret());
    expect(uri.startsWith('otpauth://totp/')).toBe(true);
    expect(uri).toContain('CSLifestyle');
    // The account label is URL-encoded inside the otpauth URI.
    expect(decodeURIComponent(uri)).toContain('jane@example.com');
  });

  it('renders a QR data URL', async () => {
    const uri = buildOtpAuthUri('jane@example.com', generateTotpSecret());
    const dataUrl = await toQrDataUrl(uri);
    expect(dataUrl.startsWith('data:image/png;base64,')).toBe(true);
  });
});
