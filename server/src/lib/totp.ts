import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { env } from '../config/env';

// Allow ±1 time-step (~30s) of clock skew between server and authenticator app.
authenticator.options = { window: 1 };

/** Generate a new base32 TOTP secret for an authenticator app. */
export function generateTotpSecret(): string {
  return authenticator.generateSecret();
}

/** Build the otpauth:// URI an authenticator app scans. */
export function buildOtpAuthUri(accountEmail: string, secret: string): string {
  return authenticator.keyuri(accountEmail, env.TWO_FACTOR_ISSUER, secret);
}

/** Render an otpauth URI to a PNG data URL (for inline <img src>). */
export function toQrDataUrl(otpauthUri: string): Promise<string> {
  return QRCode.toDataURL(otpauthUri, { margin: 1, width: 240 });
}

/** Verify a 6-digit TOTP code against a secret (tolerant of ±1 step). */
export function verifyTotp(token: string, secret: string): boolean {
  try {
    return authenticator.verify({ token: token.replace(/\s/g, ''), secret });
  } catch {
    return false;
  }
}
