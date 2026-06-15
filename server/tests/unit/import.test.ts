import { describe, it, expect } from 'vitest';
import { parseCsv, csvToObjects, parseNumber } from '../../src/lib/csv';
import { importProductRow } from '../../src/services/import/product-import';

describe('CSV parsing (lib/csv)', () => {
  it('parses simple rows', () => {
    expect(parseCsv('a,b,c\n1,2,3')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]);
  });

  it('handles quoted fields with embedded commas and quotes', () => {
    const text = 'title,price\n"Sony WH-1000XM5, Black",29990\n"He said ""hi""",10';
    const m = parseCsv(text);
    expect(m[1]).toEqual(['Sony WH-1000XM5, Black', '29990']);
    expect(m[2]).toEqual(['He said "hi"', '10']);
  });

  it('handles CRLF and drops blank lines', () => {
    expect(parseCsv('a,b\r\n1,2\r\n\r\n3,4')).toEqual([
      ['a', 'b'],
      ['1', '2'],
      ['3', '4'],
    ]);
  });

  it('maps headers to lower-cased object keys', () => {
    const { headers, rows } = csvToObjects('ASIN,Title\nB0CXXX1234,Widget');
    expect(headers).toEqual(['asin', 'title']);
    expect(rows[0]).toEqual({ asin: 'B0CXXX1234', title: 'Widget' });
  });

  it('returns empty for header-only CSV', () => {
    expect(csvToObjects('asin,title').rows).toEqual([]);
  });

  it('parses money cells stripping currency/commas', () => {
    expect(parseNumber('₹1,29,990')).toBe(129990);
    expect(parseNumber('$10.50')).toBe(10.5);
    expect(parseNumber('')).toBe(0);
    expect(parseNumber('abc')).toBe(0);
  });
});

describe('product row validation (no DB)', () => {
  it('fails a row with a missing ASIN', async () => {
    const r = await importProductRow({ title: 'Widget' }, 'skip');
    expect(r.status).toBe('failed');
    expect(r.errors).toContain('Missing ASIN');
  });

  it('fails a row with an invalid ASIN format', async () => {
    const r = await importProductRow({ asin: 'not-an-asin', title: 'Widget' }, 'skip');
    expect(r.status).toBe('failed');
    expect(r.errors.some((e) => e.includes('Invalid ASIN'))).toBe(true);
  });

  it('fails a row with a missing title', async () => {
    const r = await importProductRow({ asin: 'B0CXXX1234' }, 'skip');
    expect(r.status).toBe('failed');
    expect(r.errors).toContain('Missing title');
  });
});
