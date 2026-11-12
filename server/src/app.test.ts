import { afterEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { apiPath } from '@herox/shared';
import { buildApp } from './app.js';
import { loadConfig } from './config.js';

describe('buildApp', () => {
  let app: FastifyInstance | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it('answers the health check under the API prefix', async () => {
    app = buildApp(loadConfig({}), { logger: false });
    const response = await app.inject({ method: 'GET', url: apiPath('health') });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });

  it.each([
    [0, '10.0.0.1'],
    [1, '203.0.113.7'],
  ])('with TRUST_PROXY_HOPS=%i resolves the client ip to %s', async (hops, expectedIp) => {
    app = buildApp(loadConfig({ TRUST_PROXY_HOPS: String(hops) }), { logger: false });
    app.get('/ip-probe', (request) => request.ip);
    const response = await app.inject({
      method: 'GET',
      url: '/ip-probe',
      remoteAddress: '10.0.0.1',
      headers: { 'x-forwarded-for': '198.51.100.9, 203.0.113.7' },
    });
    expect(response.body).toBe(expectedIp);
  });
});
