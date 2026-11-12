import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { apiPath, type MeResponse } from '@herox/shared';
import { buildApp, type AppServices } from '../app.js';
import { hashSessionToken } from '../auth/eng-session.js';
import { PgSessionRepository } from '../auth/session-repository.js';
import { PgBattleRepository } from '../battle/battle-repository.js';
import { PgCitadelRepository } from '../citadel/citadel-repository.js';
import { loadConfig } from '../config.js';
import { purgeHeroesOfDeletedUsers } from '../db/deleted-user-cleanup.js';
import { loadMigrations, runMigrations } from '../db/migrate.js';
import { PgHeroRepository } from '../hero/hero-repository.js';
import { PgLearningRepository } from '../learning/learning-repository.js';
import type { DeckWord } from '../learning/learning-stats.js';
import { EmbeddedPostgres } from '../../test/embedded-postgres.js';
import { readFixture } from '../../test/read-fixture.js';

// 2026-11-12 05:00 UTC, cùng mốc với fixture tiến độ.
const NOW = Date.UTC(2026, 10, 12, 5, 0, 0);
const ME_PATH = apiPath('me');
const ME_URL = `${ME_PATH}?utcOffset=420`;
const HERO_PATH = apiPath('hero');
const ALICE_TOKEN = 'alice-token-aaaaaaaaaaaaaaaaaaaaaaaa';
const STALE_TOKEN = 'stale-token-bbbbbbbbbbbbbbbbbbbbbbbb';
const RECENT_TOKEN = 'recent-token-ccccccccccccccccccccccc';
const FUTURE_TOKEN = 'future-token-ddddddddddddddddddddddd';
const deck = readFixture<DeckWord[]>('deck-words.json');

const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

describe('me routes on embedded Postgres', () => {
  let db: EmbeddedPostgres;
  let app: FastifyInstance;
  let services: AppServices;
  let aliceId: number;
  let ready = true;

  beforeAll(async () => {
    db = await EmbeddedPostgres.create();
    await runMigrations(db, await loadMigrations());
    await db.seedDeck(deck, 'deck-v1');
    aliceId = await db.seedUser('alice', readFixture('progress-all-states.json'));
    await db.seedSession(aliceId, hashSessionToken(ALICE_TOKEN));
    const bobId = await db.seedUser('bob', { v: 1 });
    await db.seedSession(bobId, hashSessionToken(STALE_TOKEN), 181);
    await db.seedSession(bobId, hashSessionToken(RECENT_TOKEN), 179);
    const carolId = await db.seedUser('carol', { v: 2, srs: {} });
    await db.seedSession(carolId, hashSessionToken(FUTURE_TOKEN));

    services = {
      sessions: new PgSessionRepository(db),
      learning: new PgLearningRepository(db),
      heroes: new PgHeroRepository(db),
      battles: new PgBattleRepository(db),
      citadel: new PgCitadelRepository(db),
      isReady: () => ready,
      now: () => NOW,
    };
    app = buildApp(loadConfig({}), { logger: false, services });
  });

  afterEach(() => {
    ready = true;
  });

  afterAll(async () => {
    await app.close();
    await db.close();
  });

  it('applies migrations only once', async () => {
    await expect(runMigrations(db, await loadMigrations())).resolves.toEqual([]);
  });

  it('returns learning stats for the logged-in LingoBrain user', async () => {
    const response = await app.inject({ method: 'GET', url: ME_URL, headers: bearer(ALICE_TOKEN) });
    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    const body = response.json<MeResponse>();
    expect(body.user).toEqual({ id: aliceId, username: 'alice' });
    expect(body.learning).toMatchObject({ learned: 5, mastered: 2, streakDays: 5, retention30: 0.75 });
    expect(body.hero).toBeNull();
  });

  it.each([
    ['no token', {}],
    ['a malformed token', { authorization: 'Bearer short' }],
    ['an unknown token', bearer('unknown-token-eeeeeeeeeeeeeeeeeeeee')],
    ['a session idle for more than 180 days', bearer(STALE_TOKEN)],
  ])('rejects %s with 401', async (_case, headers) => {
    const response = await app.inject({ method: 'GET', url: ME_URL, headers });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toHaveProperty('error');
  });

  it('accepts a session idle for less than 180 days', async () => {
    const response = await app.inject({ method: 'GET', url: ME_URL, headers: bearer(RECENT_TOKEN) });
    expect(response.statusCode).toBe(200);
    expect(response.json<MeResponse>().learning.learned).toBe(0);
  });

  it.each([['missing', ME_PATH], ['out of range', `${ME_PATH}?utcOffset=9999`], ['not a number', `${ME_PATH}?utcOffset=7h`]])(
    'rejects a %s time zone offset',
    async (_case, url) => {
      const response = await app.inject({ method: 'GET', url, headers: bearer(ALICE_TOKEN) });
      expect(response.statusCode).toBe(400);
    },
  );

  it('answers 503 instead of wrong numbers when the progress payload version is unknown', async () => {
    const response = await app.inject({ method: 'GET', url: ME_URL, headers: bearer(FUTURE_TOKEN) });
    expect(response.statusCode).toBe(503);
    expect(response.json<{ error: string }>().error).toContain('LingoBrain');
  });

  it('answers 503 while migrations are not finished', async () => {
    ready = false;
    const response = await app.inject({ method: 'GET', url: ME_URL, headers: bearer(ALICE_TOKEN) });
    expect(response.statusCode).toBe(503);
  });

  it('answers 503 while the deck is not seeded, then picks up a new deck by content hash', async () => {
    await db.exec('DELETE FROM public.deck_meta');
    const missing = await app.inject({ method: 'GET', url: ME_URL, headers: bearer(ALICE_TOKEN) });
    expect(missing.statusCode).toBe(503);

    await db.seedDeck(
      deck.filter((word) => word.id !== 'w-run'),
      'deck-v2',
    );
    const refreshed = await app.inject({ method: 'GET', url: ME_URL, headers: bearer(ALICE_TOKEN) });
    expect(refreshed.json<MeResponse>().learning.learned).toBe(4);

    await db.seedDeck(deck, 'deck-v1');
  });

  describe('PUT hero', () => {
    it('validates the body', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: HERO_PATH,
        headers: bearer(ALICE_TOKEN),
        payload: { name: '   ', gender: 'male' },
      });
      expect(response.statusCode).toBe(400);
    });

    it('rejects non-JSON bodies', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: HERO_PATH,
        headers: { ...bearer(ALICE_TOKEN), 'content-type': 'text/plain' },
        payload: 'name=x',
      });
      expect(response.statusCode).toBe(415);
    });

    it('rejects malformed JSON', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: HERO_PATH,
        headers: { ...bearer(ALICE_TOKEN), 'content-type': 'application/json' },
        payload: '{"name":',
      });
      expect(response.statusCode).toBe(400);
    });

    it('rejects bodies over 16 KB', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: HERO_PATH,
        headers: bearer(ALICE_TOKEN),
        payload: { name: 'a', gender: 'male', padding: 'x'.repeat(17 * 1024) },
      });
      expect(response.statusCode).toBe(413);
    });

    it('creates the hero once, then refuses to overwrite it', async () => {
      const created = await app.inject({
        method: 'PUT',
        url: HERO_PATH,
        headers: bearer(ALICE_TOKEN),
        payload: { name: '  Hiệp sĩ  Ánh ', gender: 'female' },
      });
      expect(created.statusCode).toBe(201);
      expect(created.json()).toEqual({
        name: 'Hiệp sĩ Ánh',
        gender: 'female',
        levelSeen: 0,
        gold: 0,
        crystals: 0,
        outfit: 'default',
        rowVersion: 1,
      });

      const again = await app.inject({
        method: 'PUT',
        url: HERO_PATH,
        headers: bearer(ALICE_TOKEN),
        payload: { name: 'Khác', gender: 'male' },
      });
      expect(again.statusCode).toBe(409);

      const me = await app.inject({ method: 'GET', url: ME_URL, headers: bearer(ALICE_TOKEN) });
      expect(me.json<MeResponse>().hero?.name).toBe('Hiệp sĩ Ánh');
    });
  });

  it('limits requests per user', async () => {
    const limitedApp = buildApp(loadConfig({}), { logger: false, services });
    try {
      const statuses: number[] = [];
      for (let attempt = 0; attempt < 61; attempt += 1) {
        const response = await limitedApp.inject({ method: 'GET', url: ME_URL, headers: bearer(RECENT_TOKEN) });
        statuses.push(response.statusCode);
      }
      expect(statuses.slice(0, 60).every((status) => status === 200)).toBe(true);
      expect(statuses[60]).toBe(429);
    } finally {
      await limitedApp.close();
    }
  });

  describe('purgeHeroesOfDeletedUsers', () => {
    it('removes heroes whose LingoBrain account is gone, with their child rows', async () => {
      const daveId = await db.seedUser('dave', { v: 1 });
      await db.query("INSERT INTO herox.heroes (user_id, name, gender) VALUES ($1, 'Dave', 'male')", [daveId]);
      await db.query("INSERT INTO herox.word_misses (user_id, word_id, misses) VALUES ($1, 'w-run', 2)", [daveId]);
      await db.query('DELETE FROM public.users WHERE id = $1', [daveId]);

      await expect(purgeHeroesOfDeletedUsers(db)).resolves.toBe(1);
      const misses = await db.query('SELECT 1 FROM herox.word_misses WHERE user_id = $1', [daveId]);
      expect(misses.rows).toHaveLength(0);
      const alice = await db.query('SELECT 1 FROM herox.heroes WHERE user_id = $1', [aliceId]);
      expect(alice.rows).toHaveLength(1);
    });

    it('does nothing when public.users is empty', async () => {
      const empty = await EmbeddedPostgres.create();
      try {
        await runMigrations(empty, await loadMigrations());
        await empty.query("INSERT INTO herox.heroes (user_id, name, gender) VALUES (1, 'Lone', 'male')");
        await expect(purgeHeroesOfDeletedUsers(empty)).resolves.toBe(0);
      } finally {
        await empty.close();
      }
    });
  });
});
