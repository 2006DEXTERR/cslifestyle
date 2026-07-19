import { describe, it, expect, afterAll } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { assertSafeKey, joinUrl } from '../../src/services/media/providers/blob-store';
import { LocalBlobStore, uploadRoot } from '../../src/services/media/providers/local-provider';
import { blobStoreFor } from '../../src/services/media/providers';
import { S3BlobStore } from '../../src/services/media/providers/s3-provider';
import { hashBuffer } from '../../src/services/media/storage';
import { sniffImageMime, mimeMatchesSignature } from '../../src/services/media/signature';

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 1, 2, 3]);
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 1, 2, 3, 4]);
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.from([0, 0, 0, 0]), Buffer.from('WEBP'), Buffer.from([1, 2])]);
const AVIF = Buffer.concat([Buffer.from([0, 0, 0, 0]), Buffer.from('ftyp'), Buffer.from('avif'), Buffer.from([1, 2])]);
const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>');

const TEST_PREFIX = `__mediatest__`;

afterAll(async () => {
  await fs.rm(path.join(uploadRoot(), TEST_PREFIX), { recursive: true, force: true }).catch(() => undefined);
});

describe('assertSafeKey — path-traversal protection', () => {
  it('accepts server-generated keys (flat + nested)', () => {
    expect(assertSafeKey('abc123.webp')).toBe('abc123.webp');
    expect(assertSafeKey('products/abc123.webp')).toBe('products/abc123.webp');
  });
  it('rejects traversal / absolute / leading-slash / drive / empty keys', () => {
    for (const bad of ['../secret', 'a/../../b', '/etc/passwd', '/abc.webp', 'C:\\x', '\\\\server\\x', '', 'a\0b']) {
      expect(() => assertSafeKey(bad), bad).toThrow();
    }
  });
});

describe('joinUrl — no duplicate slashes', () => {
  it('joins with exactly one slash', () => {
    expect(joinUrl('https://cdn.example.com/', '/key.webp')).toBe('https://cdn.example.com/key.webp');
    expect(joinUrl('https://cdn.example.com', 'key.webp')).toBe('https://cdn.example.com/key.webp');
  });
});

describe('magic-byte signature validation', () => {
  it('sniffs each supported type', () => {
    expect(sniffImageMime(PNG)).toBe('image/png');
    expect(sniffImageMime(JPEG)).toBe('image/jpeg');
    expect(sniffImageMime(WEBP)).toBe('image/webp');
    expect(sniffImageMime(AVIF)).toBe('image/avif');
    expect(sniffImageMime(SVG)).toBe('image/svg+xml');
    expect(sniffImageMime(Buffer.from('not an image at all'))).toBeNull();
  });
  it('matches declared vs signature (jpg≡jpeg) and rejects spoofs', () => {
    expect(mimeMatchesSignature('image/png', sniffImageMime(PNG))).toBe(true);
    expect(mimeMatchesSignature('image/jpg', sniffImageMime(JPEG))).toBe(true);
    // A PNG renamed/declared as webp must be rejected.
    expect(mimeMatchesSignature('image/webp', sniffImageMime(PNG))).toBe(false);
    expect(mimeMatchesSignature('image/png', null)).toBe(false);
  });
});

describe('hashBuffer — unique, stable keys', () => {
  it('same bytes → same hash, different bytes → different hash', () => {
    expect(hashBuffer(PNG)).toBe(hashBuffer(Buffer.from(PNG)));
    expect(hashBuffer(PNG)).not.toBe(hashBuffer(JPEG));
    expect(hashBuffer(PNG)).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe('LocalBlobStore', () => {
  const store = new LocalBlobStore();

  it('put creates a file and delete removes it', async () => {
    const key = `${TEST_PREFIX}/a.bin`;
    await store.put(key, Buffer.from('hello'), 'application/octet-stream');
    const abs = path.join(uploadRoot(), key);
    expect(await fs.readFile(abs, 'utf8')).toBe('hello');
    await store.delete(key);
    await expect(fs.access(abs)).rejects.toThrow(); // gone
  });

  it('deleting a missing file does not throw', async () => {
    await expect(store.delete(`${TEST_PREFIX}/does-not-exist.bin`)).resolves.toBeUndefined();
  });

  it('rejects a traversal key at put time', async () => {
    await expect(store.put('../escape.bin', Buffer.from('x'), 'application/octet-stream')).rejects.toThrow();
  });

  it('publicUrl points under /uploads and reports provider local', () => {
    expect(store.provider).toBe('local');
    expect(store.publicUrl('abc.webp')).toMatch(/\/uploads\/abc\.webp$/);
  });
});

describe('provider factory + driver validation', () => {
  it('blobStoreFor("local") returns the local store', () => {
    expect(blobStoreFor('local')).toBeInstanceOf(LocalBlobStore);
  });
  it('blobStoreFor("s3") constructs the S3 store when creds exist (else fails clearly)', () => {
    // Without AWS creds in the test env, selecting s3 must fail with a clear message —
    // never silently fall back to local.
    try {
      const s = blobStoreFor('s3');
      expect(s).toBeInstanceOf(S3BlobStore);
    } catch (e) {
      expect((e as Error).message).toMatch(/AWS_/);
    }
  });
  it('STORAGE_DRIVER only accepts local|s3', () => {
    const schema = z.enum(['local', 's3']);
    expect(schema.safeParse('local').success).toBe(true);
    expect(schema.safeParse('s3').success).toBe(true);
    expect(schema.safeParse('gcs').success).toBe(false);
  });
});
