import { afterEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { apiPath } from '@herox/shared';
import { buildApp, type AppServices } from './app.js';
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

describe('buildApp with services', () => {
  const UNAVAILABLE = Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' });
  const ME_URL = `${apiPath('me')}?utcOffset=420`;
  let ready = true;
  const services: AppServices = {
    sessions: { findActiveSessionUser: () => Promise.resolve({ userId: 1, username: 'probe' }) },
    learning: { readProgressData: () => Promise.reject(UNAVAILABLE), readDeckWords: () => Promise.resolve([]) },
    heroes: { findHero: () => Promise.resolve(null), createHero: () => Promise.resolve(null) },
    battles: {
      readWordMisses: () => Promise.reject(UNAVAILABLE),
      createBattle: () => Promise.reject(UNAVAILABLE),
      findBattle: () => Promise.reject(UNAVAILABLE),
      settleBattle: () => Promise.reject(UNAVAILABLE),
    },
    citadel: {
      readCitadel: () => Promise.reject(UNAVAILABLE),
      readStory: () => Promise.reject(UNAVAILABLE),
      updateCitadel: () => Promise.reject(UNAVAILABLE),
    },
    isReady: () => ready,
  };
  let app: FastifyInstance | undefined;
  const bearer = { authorization: `Bearer ${'t'.repeat(32)}` };

  afterEach(async () => {
    await app?.close();
    app = undefined;
    ready = true;
  });

  it('reports readiness separately from liveness', async () => {
    app = buildApp(loadConfig({}), { logger: false, services });
    ready = false;
    const starting = await app.inject({ method: 'GET', url: apiPath('ready') });
    expect(starting.statusCode).toBe(503);
    expect((await app.inject({ method: 'GET', url: apiPath('health') })).statusCode).toBe(200);
    ready = true;
    expect((await app.inject({ method: 'GET', url: apiPath('ready') })).json()).toEqual({ status: 'ready' });
  });

  it('answers 503 with a friendly message when Postgres is unreachable', async () => {
    app = buildApp(loadConfig({}), { logger: false, services });
    const response = await app.inject({ method: 'GET', url: ME_URL, headers: bearer });
    expect(response.statusCode).toBe(503);
    expect(response.json<{ error: string }>().error).not.toContain('ECONNREFUSED');
  });

  it('limits requests per IP before touching the session store', async () => {
    let lookups = 0;
    app = buildApp(loadConfig({}), {
      logger: false,
      services: { ...services, sessions: { findActiveSessionUser: () => ((lookups += 1), Promise.resolve(null)) } },
    });
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 121; attempt += 1) {
      statuses.push((await app.inject({ method: 'GET', url: ME_URL, headers: bearer, remoteAddress: '198.51.100.4' })).statusCode);
    }
    expect(statuses.slice(0, 120).every((status) => status === 401)).toBe(true);
    expect(statuses[120]).toBe(429);
    expect(lookups).toBe(120);
  });
});
