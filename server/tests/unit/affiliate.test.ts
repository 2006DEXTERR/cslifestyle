import { describe, it, expect } from 'vitest';
import {
  isValidAsin,
  normalizeAsin,
  buildAmazonUrl,
  isWhitelistedDomain,
  parseDeviceType,
  parseSourceType,
} from '../../src/lib/affiliate';
import { parseCsv } from '../../src/services/affiliate/revenue.service';

describe('ASIN validation', () => {
  it('accepts 10-char uppercase alphanumeric (case-insensitive input)', () => {
    expect(isValidAsin('B0SEED0001')).toBe(true);
    expect(isValidAsin('b0seed0001')).toBe(true); // normalised
    expect(normalizeAsin(' b0seed0001 ')).toBe('B0SEED0001');
  });
  it('rejects malformed ASINs', () => {
    expect(isValidAsin('short')).toBe(false);
    expect(isValidAsin('B0-SEED-001')).toBe(false);
    expect(isValidAsin('TOOLONGVALUE12')).toBe(false);
  });
});

describe('buildAmazonUrl', () => {
  it('builds a whitelist-safe URL with tag + standard params', () => {
    const url = buildAmazonUrl('B0SEED0001', { tag: 'cslifestyle-21' });
    expect(url).toContain('https://www.amazon.in/dp/B0SEED0001?');
    expect(url).toContain('tag=cslifestyle-21');
    expect(url).toContain('linkCode=ogi');
    expect(url).toContain('th=1');
    expect(url).toContain('psc=1');
  });
  it('falls back to amazon.in for a non-whitelisted domain', () => {
    const url = buildAmazonUrl('B0SEED0001', { tag: 't', domain: 'evil.example.com' });
    expect(url).toContain('https://www.amazon.in/dp/');
  });
  it('merges extra params', () => {
    expect(buildAmazonUrl('B0SEED0001', { tag: 't', extraParams: { ref_: 'foo' } })).toContain('ref_=foo');
  });
});

describe('whitelist', () => {
  it('allows amazon hosts only', () => {
    expect(isWhitelistedDomain('amazon.in')).toBe(true);
    expect(isWhitelistedDomain('www.amazon.in')).toBe(true);
    expect(isWhitelistedDomain('phishing.in')).toBe(false);
  });
});

describe('parseDeviceType', () => {
  it('classifies UAs', () => {
    expect(parseDeviceType('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148')).toBe('mobile');
    expect(parseDeviceType('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)')).toBe('tablet');
    expect(parseDeviceType('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('desktop');
    expect(parseDeviceType(undefined)).toBe('unknown');
  });
});

describe('parseSourceType', () => {
  it('validates against the enum', () => {
    expect(parseSourceType('guide')).toBe('guide');
    expect(parseSourceType('deals')).toBe('deals');
    expect(parseSourceType('bogus')).toBe('other');
    expect(parseSourceType(undefined)).toBe('other');
  });
});

describe('parseCsv', () => {
  it('parses rows incl. quoted fields with commas', () => {
    const rows = parseCsv('date,asin,revenue\n2026-06-01,B0SEED0001,"1,234.50"\n2026-06-02,B0SEED0002,99');
    expect(rows.length).toBe(3);
    expect(rows[0]).toEqual(['date', 'asin', 'revenue']);
    expect(rows[1]).toEqual(['2026-06-01', 'B0SEED0001', '1,234.50']);
    expect(rows[2][2]).toBe('99');
  });
  it('skips blank lines', () => {
    expect(parseCsv('a,b\n\n1,2\n').length).toBe(2);
  });
});
