import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

describe('health & envelope', () => {
  it('GET /healthz returns 200 with a success envelope', async () => {
    const res = await request(app).get('/healthz');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.status).toBe('ok');
    expect(res.body).toHaveProperty('meta');
    expect(res.body).toHaveProperty('errors');
    expect(res.headers).toHaveProperty('x-request-id');
  });

  it('GET /api/v1/health confirms the versioned API is mounted', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.api).toBe('v1');
  });

  it('echoes an inbound x-request-id', async () => {
    const res = await request(app).get('/healthz').set('x-request-id', 'test-corr-123');
    expect(res.headers['x-request-id']).toBe('test-corr-123');
  });

  it('returns a 404 error envelope for unknown routes', async () => {
    const res = await request(app).get('/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.status).toBe('error');
    expect(res.body.data).toBeNull();
    expect(typeof res.body.message).toBe('string');
  });
});
