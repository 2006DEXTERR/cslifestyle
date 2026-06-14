import { describe, it, expect } from 'vitest';
import { generateBackupCodes, hashBackupCode, normalizeBackupCode } from '../../src/lib/backup-codes';

describe('backup codes', () => {
  it('generates the requested count of unique XXXXX-XXXXX codes', () => {
    const codes = generateBackupCodes(10);
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    for (const c of codes) expect(c).toMatch(/^[A-Z0-9]{5}-[A-Z0-9]{5}$/);
  });

  it('normalises formatting (case + dashes/spaces) for comparison', () => {
    expect(normalizeBackupCode('ab cd-ef')).toBe('ABCDEF');
    const code = generateBackupCodes(1)[0];
    expect(hashBackupCode(code)).toBe(hashBackupCode(code.toLowerCase().replace('-', ' ')));
  });

  it('hashes deterministically and irreversibly', () => {
    const code = generateBackupCodes(1)[0];
    expect(hashBackupCode(code)).toBe(hashBackupCode(code));
    expect(hashBackupCode(code)).not.toBe(code);
    expect(hashBackupCode('AAAAA-AAAAA')).not.toBe(hashBackupCode('BBBBB-BBBBB'));
  });
});
