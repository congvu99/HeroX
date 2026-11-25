import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import {
  apiPath,
  BASE_SKILL_TIERS,
  CHAPTER_1_BEATS,
  CITADEL_REJECTION_MESSAGES,
  FIELD_ENCOUNTER_ID,
  FORGE_LEVELS,
  heroStatsWithGear,
  SKILL_TIER_UPGRADES,
  type CitadelResponse,
  type StartBattleResponse,
} from '@herox/shared';
import { buildApp } from '../app.js';
import { hashSessionToken } from '../auth/eng-session.js';
import { PgSessionRepository } from '../auth/session-repository.js';
import { PgBattleRepository } from '../battle/battle-repository.js';
import { PgCitadelRepository } from '../citadel/citadel-repository.js';
import { loadConfig } from '../config.js';
import { loadMigrations, runMigrations } from '../db/migrate.js';
import { PgHeroRepository } from '../hero/hero-repository.js';
import { PgLearningRepository } from '../learning/learning-repository.js';
import { PgStoryRepository } from '../story/story-repository.js';
import type { DeckWord } from '../learning/learning-stats.js';
import { EmbeddedPostgres } from '../../test/embedded-postgres.js';

// 12:00 ngày 2026-11-12 giờ Việt Nam.
const START_MS = Date.UTC(2026, 10, 12, 5, 0, 0);
const UTC_OFFSET = 420;
const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;
const KNIGHT_TOKEN = 'citadel-knight-aaaaaaaaaaaaaaaaaaaaa';
const NOVICE_TOKEN = 'citadel-novice-bbbbbbbbbbbbbbbbbbbbb';
const NO_HERO_TOKEN = 'citadel-nohero-ccccccccccccccccccccc';
const WORD_COUNT = 60;
const MASTERED_COUNT = 25;

const bearer = (token: string) => ({ authorization: `Bearer ${token}` });
const citadelUrl = (route = '') => `${apiPath(route === '' ? 'citadel' : `citadel/${route}`)}?utcOffset=${UTC_OFFSET}`;

const DECK: DeckWord[] = Array.from({ length: WORD_COUNT }, (_, index) => ({
  id: `w${index}`,
  word: `word${index}`,
  pos: index % 3 === 0 ? 'noun' : 'verb',
  meaning: `nghĩa ${index}`,
  emoji: '⭐',
  ipa: '',
}));

/** Tiến độ tổng hợp: `count` từ đã học, `mastered` từ đầu có ivl ≥ 21, mỗi từ một lượt ôn "nhớ" sáng nay, chuỗi 2 ngày. */
function progressFor(count: number, mastered: number): unknown {
  const srs = Object.fromEntries(
    DECK.slice(0, count).map((word, index) => [
      word.id,
      { state: 'review', ivl: index < mastered ? 30 : 3, lapses: 0, last: START_MS - HOUR_MS, hist: [{ t: START_MS - HOUR_MS, g: 2 }] },
    ]),
  );
  return { v: 1, srsEpoch: 0, srs, day: { data: { date: '2026-11-12', streak: 2, done: {} } } };
}

describe('citadel routes on embedded Postgres', () => {
  let db: EmbeddedPostgres;
  let app: FastifyInstance;
  let clock = START_MS;
  let knightId: number;
  let noviceId: number;

  async function readCitadel(token: string): Promise<CitadelResponse> {
    const response = await app.inject({ method: 'GET', url: citadelUrl(), headers: bearer(token) });
    expect(response.statusCode).toBe(200);
    return response.json<CitadelResponse>();
  }

  function post(token: string, route: string, payload: object) {
    return app.inject({ method: 'POST', url: citadelUrl(route), headers: bearer(token), payload });
  }

  async function rescueSmith(userId: number): Promise<void> {
    await db.query('INSERT INTO herox.story_progress (user_id, chapter, beat) VALUES ($1, 1, $2)', [userId, CHAPTER_1_BEATS.smithRescued]);
  }

  async function setResources(userId: number, gold: number, crystals: number): Promise<void> {
    await db.query('UPDATE herox.heroes SET gold = $2, crystals = $3, row_version = row_version + 1 WHERE user_id = $1', [userId, gold, crystals]);
  }

  beforeAll(async () => {
    db = await EmbeddedPostgres.create();
    await runMigrations(db, await loadMigrations());
    await db.seedDeck(DECK, 'deck-citadel');
    knightId = await db.seedUser('knight', progressFor(WORD_COUNT, MASTERED_COUNT));
    await db.seedSession(knightId, hashSessionToken(KNIGHT_TOKEN));
    noviceId = await db.seedUser('novice', progressFor(5, 0));
    await db.seedSession(noviceId, hashSessionToken(NOVICE_TOKEN));
    const noHeroId = await db.seedUser('nohero', progressFor(5, 0));
    await db.seedSession(noHeroId, hashSessionToken(NO_HERO_TOKEN));
    for (const [userId, name] of [[knightId, 'Knight'], [noviceId, 'Novice']] as const) {
      await db.query("INSERT INTO herox.heroes (user_id, name, gender) VALUES ($1, $2, 'female')", [userId, name]);
    }
    // Lò rèn khoá theo truyện; knight đã cứu thợ rèn để thử các luật nâng cấp khác.
    await rescueSmith(knightId);
    // Mốc tới làng để trận dã ngoại chương 1 mở (POST /battles kiểm cổng khoá theo truyện).
    await db.query('INSERT INTO herox.story_progress (user_id, chapter, beat) VALUES ($1, 1, $2)', [knightId, CHAPTER_1_BEATS.villageArrival]);
    app = buildApp(loadConfig({}), {
      logger: false,
      services: {
        sessions: new PgSessionRepository(db),
        learning: new PgLearningRepository(db),
        heroes: new PgHeroRepository(db),
        battles: new PgBattleRepository(db),
        citadel: new PgCitadelRepository(db),
        story: new PgStoryRepository(db),
        isReady: () => true,
        now: () => clock,
      },
    });
  });

  afterAll(async () => {
    await app.close();
    await db.close();
  });

  describe('GET /citadel', () => {
    it('returns the starting citadel with learning numbers, stage and learned words', async () => {
      const citadel = await readCitadel(NOVICE_TOKEN);
      expect(citadel.state).toMatchObject({
        gold: 0,
        crystals: 0,
        outfit: 'default',
        forgeLevel: 1,
        skillTiers: BASE_SKILL_TIERS,
        inventory: [],
        loadout: [],
        lastCrystalClaimDay: null,
      });
      expect(citadel.learning).toMatchObject({ learned: 5, mastered: 0, streakDays: 3, retention30: 1 });
      expect(citadel.stage).toBe('ruined');
      expect(citadel.words.map((word) => word.id)).toEqual(['w0', 'w1', 'w2', 'w3', 'w4']);
      expect(citadel.words[0]).toMatchObject({ word: 'word0', pos: 'noun', mastered: false });
      // Chuỗi 3 ngày + tỉ lệ nhớ 100% (+3).
      expect(citadel.dailyCrystals).toEqual({ amount: 6, claimedToday: false });
      expect(citadel.story).toEqual([]);
    });

    it('requires a hero, a session and the player time zone', async () => {
      expect((await app.inject({ method: 'GET', url: citadelUrl(), headers: bearer(NO_HERO_TOKEN) })).statusCode).toBe(409);
      expect((await app.inject({ method: 'GET', url: citadelUrl() })).statusCode).toBe(401);
      expect((await app.inject({ method: 'GET', url: apiPath('citadel'), headers: bearer(NOVICE_TOKEN) })).statusCode).toBe(400);
    });
  });

  describe('upgrades are checked on the server', () => {
    it('refuses without enough gold, with the reason', async () => {
      const { state } = await readCitadel(KNIGHT_TOKEN);
      const response = await post(KNIGHT_TOKEN, 'upgrade', { rowVersion: state.rowVersion, target: { kind: 'forge' } });
      expect(response.statusCode).toBe(422);
      expect(response.json()).toEqual({ error: CITADEL_REJECTION_MESSAGES['not-enough-gold'] });
    });

    it('keeps the forge locked until the smith is rescued in the story', async () => {
      await setResources(noviceId, 10_000, 0);
      const { state } = await readCitadel(NOVICE_TOKEN);
      const response = await post(NOVICE_TOKEN, 'upgrade', { rowVersion: state.rowVersion, target: { kind: 'forge' } });
      expect(response.statusCode).toBe(422);
      expect(response.json()).toEqual({ error: CITADEL_REJECTION_MESSAGES['building-locked'] });
    });

    it('refuses without enough learned words even with gold', async () => {
      await rescueSmith(noviceId);
      const { state } = await readCitadel(NOVICE_TOKEN);
      const response = await post(NOVICE_TOKEN, 'upgrade', { rowVersion: state.rowVersion, target: { kind: 'forge' } });
      expect(response.statusCode).toBe(422);
      expect(response.json()).toEqual({ error: CITADEL_REJECTION_MESSAGES['not-enough-learned'] });
      expect((await readCitadel(NOVICE_TOKEN)).state.gold).toBe(10_000);
    });

    it('upgrades the forge, charges gold, bumps the row version and keeps it for the next device', async () => {
      await setResources(knightId, 1_000, 50);
      const before = await readCitadel(KNIGHT_TOKEN);
      const response = await post(KNIGHT_TOKEN, 'upgrade', { rowVersion: before.state.rowVersion, target: { kind: 'forge' } });
      expect(response.statusCode).toBe(200);
      const after = response.json<CitadelResponse>();
      expect(after.state).toMatchObject({ forgeLevel: 2, gold: 1_000 - (FORGE_LEVELS[1]?.goldCost ?? 0), rowVersion: before.state.rowVersion + 1 });
      // "Máy khác" chỉ đọc lại từ server.
      expect((await readCitadel(KNIGHT_TOKEN)).state).toEqual(after.state);
    });

    it('crafts, levels and equips gear, then the battle setup carries the bonus', async () => {
      let citadel = await readCitadel(KNIGHT_TOKEN);
      for (const target of [
        { kind: 'item', itemId: 'pilgrim-sword' },
        { kind: 'item', itemId: 'pilgrim-sword' },
        { kind: 'item', itemId: 'pilgrim-mail' },
      ]) {
        const response = await post(KNIGHT_TOKEN, 'upgrade', { rowVersion: citadel.state.rowVersion, target });
        expect(response.statusCode).toBe(200);
        citadel = response.json<CitadelResponse>();
      }
      expect(citadel.state.inventory).toEqual([
        { itemId: 'pilgrim-mail', level: 1, equipped: true },
        { itemId: 'pilgrim-sword', level: 2, equipped: true },
      ]);
      expect(citadel.heroStats).toEqual(heroStatsWithGear(WORD_COUNT, citadel.state.inventory));

      const tier2 = SKILL_TIER_UPGRADES[2];
      const skill = await post(KNIGHT_TOKEN, 'upgrade', { rowVersion: citadel.state.rowVersion, target: { kind: 'skill', skill: 'attack' } });
      expect(skill.statusCode).toBe(200);
      citadel = skill.json<CitadelResponse>();
      expect(citadel.state.crystals).toBe(50 - tier2.crystalCost);

      const battle = await app.inject({ method: 'POST', url: apiPath('battles'), headers: bearer(KNIGHT_TOKEN), payload: { encounterId: FIELD_ENCOUNTER_ID } });
      expect(battle.statusCode).toBe(201);
      const { setup } = battle.json<StartBattleResponse>();
      expect(setup.hero).toEqual(citadel.heroStats);
      expect(setup.skillTiers).toEqual({ ...BASE_SKILL_TIERS, attack: 2 });
    });

    it('keeps the ring loadout to learned words and uses it in battle', async () => {
      const { state } = await readCitadel(KNIGHT_TOKEN);
      const rejected = await post(KNIGHT_TOKEN, 'loadout', { rowVersion: state.rowVersion, wordIds: ['w1', 'not-learned'] });
      expect(rejected.statusCode).toBe(422);
      const saved = await post(KNIGHT_TOKEN, 'loadout', { rowVersion: state.rowVersion, wordIds: ['w4', 'w1', 'w7'] });
      expect(saved.statusCode).toBe(200);
      expect((await readCitadel(KNIGHT_TOKEN)).state.loadout).toEqual(['w4', 'w1', 'w7']);
      const battle = await app.inject({ method: 'POST', url: apiPath('battles'), headers: bearer(KNIGHT_TOKEN), payload: { encounterId: FIELD_ENCOUNTER_ID } });
      expect(battle.json<StartBattleResponse>().setup.loadout).toEqual(['w4', 'w1', 'w7']);
    });

    it('switches outfits only after the milestone', async () => {
      const { state } = await readCitadel(NOVICE_TOKEN);
      const locked = await post(NOVICE_TOKEN, 'outfit', { rowVersion: state.rowVersion, outfitId: 'ashen-pilgrim' });
      expect(locked.statusCode).toBe(422);
      expect(locked.json()).toEqual({ error: CITADEL_REJECTION_MESSAGES['outfit-locked'] });
      const knight = await readCitadel(KNIGHT_TOKEN);
      const worn = await post(KNIGHT_TOKEN, 'outfit', { rowVersion: knight.state.rowVersion, outfitId: 'ashen-pilgrim' });
      expect(worn.json<CitadelResponse>().state.outfit).toBe('ashen-pilgrim');
    });
  });

  describe('daily crystals', () => {
    it('can be claimed once per day; the second claim is blocked', async () => {
      const before = await readCitadel(NOVICE_TOKEN);
      const first = await post(NOVICE_TOKEN, 'daily-crystals', { rowVersion: before.state.rowVersion });
      expect(first.statusCode).toBe(200);
      const claimed = first.json<CitadelResponse>();
      expect(claimed.state.crystals).toBe(before.state.crystals + 6);
      expect(claimed.state.lastCrystalClaimDay).toBe('2026-11-12');
      expect(claimed.dailyCrystals.claimedToday).toBe(true);

      const second = await post(NOVICE_TOKEN, 'daily-crystals', { rowVersion: claimed.state.rowVersion });
      expect(second.statusCode).toBe(422);
      expect(second.json()).toEqual({ error: CITADEL_REJECTION_MESSAGES['already-claimed'] });

      // Lùi múi giờ sang hôm qua cũng không nhận thêm.
      const westward = await app.inject({
        method: 'POST',
        url: `${apiPath('citadel/daily-crystals')}?utcOffset=-720`,
        headers: bearer(NOVICE_TOKEN),
        payload: { rowVersion: claimed.state.rowVersion },
      });
      expect(westward.statusCode).toBe(422);
    });

    it('opens again the next local day', async () => {
      clock = START_MS + DAY_MS;
      try {
        const citadel = await readCitadel(NOVICE_TOKEN);
        expect(citadel.dailyCrystals.claimedToday).toBe(false);
        const response = await post(NOVICE_TOKEN, 'daily-crystals', { rowVersion: citadel.state.rowVersion });
        expect(response.statusCode).toBe(200);
      } finally {
        clock = START_MS;
      }
    });
  });

  describe('row version guards concurrent devices', () => {
    it('lets exactly one of two parallel writes with the same row version through; the other gets 409', async () => {
      const { state } = await readCitadel(KNIGHT_TOKEN);
      // Hai thao tác đều hợp lệ nếu chạy riêng.
      const [first, second] = await Promise.all([
        post(KNIGHT_TOKEN, 'outfit', { rowVersion: state.rowVersion, outfitId: 'default' }),
        post(KNIGHT_TOKEN, 'loadout', { rowVersion: state.rowVersion, wordIds: ['w2'] }),
      ]);
      expect([first.statusCode, second.statusCode].sort()).toEqual([200, 409]);
      const winner = [first, second].find((response) => response.statusCode === 200);
      const after = await readCitadel(KNIGHT_TOKEN);
      expect(after.state).toEqual(winner?.json<CitadelResponse>().state);
      expect(after.state.rowVersion).toBe(state.rowVersion + 1);
    });

    it('rejects a write based on a stale row version', async () => {
      const { state } = await readCitadel(KNIGHT_TOKEN);
      const response = await post(KNIGHT_TOKEN, 'equip', { rowVersion: state.rowVersion - 1, itemId: 'pilgrim-sword' });
      expect(response.statusCode).toBe(409);
    });
  });

  describe('request validation', () => {
    it.each([
      ['no row version', 'upgrade', { target: { kind: 'forge' } }],
      ['an unknown upgrade kind', 'upgrade', { rowVersion: 1, target: { kind: 'castle' } }],
      ['an unknown skill', 'upgrade', { rowVersion: 1, target: { kind: 'skill', skill: 'fly' } }],
      ['a non-array loadout', 'loadout', { rowVersion: 1, wordIds: 'w1' }],
      ['an over-long id', 'equip', { rowVersion: 1, itemId: 'x'.repeat(65) }],
    ])('returns 400 for %s', async (_case, route, payload) => {
      expect((await post(KNIGHT_TOKEN, route, payload)).statusCode).toBe(400);
    });

    it('returns 422 for an unknown item', async () => {
      const { state } = await readCitadel(KNIGHT_TOKEN);
      const response = await post(KNIGHT_TOKEN, 'upgrade', { rowVersion: state.rowVersion, target: { kind: 'item', itemId: 'excalibur' } });
      expect(response.statusCode).toBe(422);
      expect(response.json()).toEqual({ error: CITADEL_REJECTION_MESSAGES['unknown-item'] });
    });
  });
});
