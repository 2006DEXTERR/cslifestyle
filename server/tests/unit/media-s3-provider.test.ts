import { describe, it, expect, vi, beforeEach } from 'vitest';

// Set AWS env BEFORE any import parses the env schema (hoisted runs first). STORAGE_DRIVER
// stays 'local' so global validation doesn't force s3 — we test the S3 provider directly.
const { sendMock } = vi.hoisted(() => {
  process.env.AWS_REGION = 'us-east-1';
  process.env.AWS_S3_BUCKET = 'test-bucket';
  process.env.AWS_ACCESS_KEY_ID = 'AKIA_TEST_ID';
  process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-value';
  return { sendMock: vi.fn().mockResolvedValue({}) };
});

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(() => ({ send: sendMock })),
  PutObjectCommand: vi.fn((input: unknown) => ({ kind: 'put', input })),
  DeleteObjectCommand: vi.fn((input: unknown) => ({ kind: 'delete', input })),
}));

import { S3BlobStore } from '../../src/services/media/providers/s3-provider';

describe('S3BlobStore (AWS SDK mocked — no real AWS)', () => {
  beforeEach(() => sendMock.mockClear());

  it('reports provider s3 and never leaks credentials on the instance surface', () => {
    const store = new S3BlobStore();
    expect(store.provider).toBe('s3');
    expect(JSON.stringify(store)).not.toContain('test-secret-value');
  });

  it('put sends PutObjectCommand with the correct bucket, key, body, content-type, cache-control', async () => {
    const store = new S3BlobStore();
    const body = Buffer.from('image-bytes');
    await store.put('ab12cd.webp', body, 'image/webp');
    expect(sendMock).toHaveBeenCalledTimes(1);
    const cmd = sendMock.mock.calls[0][0] as { kind: string; input: Record<string, unknown> };
    expect(cmd.kind).toBe('put');
    expect(cmd.input.Bucket).toBe('test-bucket');
    expect(cmd.input.Key).toBe('ab12cd.webp');
    expect(cmd.input.Body).toBe(body);
    expect(cmd.input.ContentType).toBe('image/webp');
    expect(String(cmd.input.CacheControl)).toContain('immutable');
  });

  it('delete uses the STORED KEY (never a parsed URL)', async () => {
    const store = new S3BlobStore();
    await store.delete('ab12cd.webp');
    const cmd = sendMock.mock.calls[0][0] as { kind: string; input: Record<string, unknown> };
    expect(cmd.kind).toBe('delete');
    expect(cmd.input.Bucket).toBe('test-bucket');
    expect(cmd.input.Key).toBe('ab12cd.webp');
  });

  it('builds a standard regional public URL when no public base is set', () => {
    const store = new S3BlobStore();
    expect(store.publicUrl('ab12cd.webp')).toBe('https://test-bucket.s3.us-east-1.amazonaws.com/ab12cd.webp');
  });

  it('rejects a traversal key before any S3 call', async () => {
    const store = new S3BlobStore();
    await expect(store.put('../../etc/passwd', Buffer.from('x'), 'image/png')).rejects.toThrow();
    expect(sendMock).not.toHaveBeenCalled();
  });
});
