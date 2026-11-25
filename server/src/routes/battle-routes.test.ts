import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import {
  apiPath,
  CHAPTER_1_BEATS,
  createBattle,
  FIELD_ENCOUNTER_ID,
  FIELD_ROAM_ENCOUNTER_ID,
  SCARECROW_BOSS_ENCOUNTER_ID,
  MIN_REACTION_MS,
  step,
  TUTORIAL_ENCOUNTER_ID,
  TUTORIAL_WORD_IDS,
  type BattleLogEntry,
  type BattleResultRequest,
  type BattleResultResponse,
  type BattleSetup,
  type MeResponse,
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

const START_MS = Date.UTC(2026, 10, 12, 5, 0, 0);
const BATTLES_PATH = apiPath('battles');
const ME_URL = `${apiPath('me')}?utcOffset=420`;
const KNIGHT_TOKEN = 'knight-token-aaaaaaaaaaaaaaaaaaaaaaa';
const NOVICE_TOKEN = 'novice-token-bbbbbbbbbbbbbbbbbbbbbbb';
const NO_HERO_TOKEN = 'nohero-token-ccccccccccccccccccccccc';
const THINK_MS = 1_500;

const bearer = (token: string) => ({ authorization: `Bearer ${token}` });
const resultPath = (battleId: string) => apiPath(`battles/${battleId}/result`);

// Bộ từ tổng hợp: đủ 8 từ hướng dẫn (id theo LingoBrain) và thêm vài từ thường.
const POS_BY_WORD: Readonly<Record<string, string>> = {
  strike: 'verb',
  protect: 'verb',
  fire: 'noun, verb',
  guard: 'noun',
  strong: 'adjective',
  brave: 'adjective',
  quickly: 'adverb',
  away: 'adverb',
  run: 'verb',
  castle: 'noun',
  gate: 'noun',
  over: 'preposition',
};
const DECK: DeckWord[] = Object.entries(POS_BY_WORD).map(([word, pos]) => ({
  id: word,
  word,
  pos,
  meaning: `nghĩa ${word}`,
  emoji: '⭐',
  ipa: '',
}));

function progressFor(wordIds: readonly string[], lapsesById: Readonly<Record<string, number>> = {}): unknown {
  const srs = Object.fromEntries(
    wordIds.map((id) => [id, { state: 'review', ivl: id === 'strike' ? 30 : 3, lapses: lapsesById[id] ?? 0, last: START_MS - 86_400_000 }]),
  );
  return { v: 1, srsEpoch: 0, srs };
}

interface PlayOptions {
  readonly thinkMs?: number;
  /** Trả lời sai mọi đề (để thua). */
  readonly alwaysWrong?: boolean;
  /** Dừng sau số input này (rời trận). */
  readonly maxInputs?: number;
}

/** Chơi như client thật bằng chính logic trận dùng chung, ghi log input. */
function playBattle(setup: BattleSetup, options: PlayOptions = {}): BattleResultRequest {
  let state = createBattle(setup).state;
  const entries: BattleLogEntry[] = [];
  const maxInputs = options.maxInputs ?? 200;
  while (state.outcome === 'ongoing' && entries.length < maxInputs) {
    state = step(state, null, options.thinkMs ?? THINK_MS).state;
    const wordId = state.prompt?.wordId;
    if (state.outcome !== 'ongoing' || wordId === undefined) break;
    const text = options.alwaysWrong === true ? 'zzzz' : (state.index.wordsById.get(wordId)?.word ?? '');
    entries.push({ atMs: state.elapsedMs, kind: 'type', text });
    state = step(state, { kind: 'type', text }, 0).state;
  }
  return { entries, endedAtMs: state.elapsedMs };
}

describe('battle routes on embedded Postgres', () => {
  let db: EmbeddedPostgres;
  let app: FastifyInstance;
  let clock = START_MS;
  let nextSeed = 1;
  let battleCounter = 0;
  let knightId: number;

  async function startBattle(token: string, encounterId: string = FIELD_ENCOUNTER_ID): Promise<StartBattleResponse> {
    const response = await app.inject({ method: 'POST', url: BATTLES_PATH, headers: bearer(token), payload: { encounterId } });
    expect(response.statusCode).toBe(201);
    return response.json<StartBattleResponse>();
  }

  /** Gửi kết quả sau khi đồng hồ server đã trôi đủ thời lượng trận. */
  async function submit(token: string, battleId: string, result: BattleResultRequest, extraWallClockMs = 1_000) {
    clock += result.endedAtMs + extraWallClockMs;
    return app.inject({ method: 'POST', url: resultPath(battleId), headers: bearer(token), payload: result });
  }

  async function readGold(token: string): Promise<number> {
    const me = await app.inject({ method: 'GET', url: ME_URL, headers: bearer(token) });
    return me.json<MeResponse>().hero?.gold ?? -1;
  }

  async function readMisses(userId: number): Promise<Record<string, number>> {
    const rows = await db.query<{ word_id: string; misses: number }>('SELECT word_id, misses FROM herox.word_misses WHERE user_id = $1', [userId]);
    return Object.fromEntries(rows.rows.map((row) => [row.word_id, row.misses]));
  }

  beforeAll(async () => {
    db = await EmbeddedPostgres.create();
    await runMigrations(db, await loadMigrations());
    await db.seedDeck(DECK, 'deck-battle');
    knightId = await db.seedUser('knight', progressFor(Object.keys(POS_BY_WORD), { castle: 3 }));
    await db.seedSession(knightId, hashSessionToken(KNIGHT_TOKEN));
    const noviceId = await db.seedUser('novice', progressFor(['run', 'castle']));
    await db.seedSession(noviceId, hashSessionToken(NOVICE_TOKEN));
    const noHeroId = await db.seedUser('nohero', progressFor(Object.keys(POS_BY_WORD)));
    await db.seedSession(noHeroId, hashSessionToken(NO_HERO_TOKEN));
    for (const [userId, name] of [[knightId, 'Knight'], [noviceId, 'Novice']] as const) {
      await db.query("INSERT INTO herox.heroes (user_id, name, gender) VALUES ($1, $2, 'male')", [userId, name]);
    }
    // Knight đã đạt mốc tới làng nên trận dã ngoại chương 1 mở (novice chưa, để kiểm trận bị khoá).
    await db.query('INSERT INTO herox.story_progress (user_id, chapter, beat) VALUES ($1, 1, $2)', [knightId, 'village-arrival']);

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
        newBattleSeed: () => nextSeed,
        newBattleId: () => `00000000-0000-4000-8000-${String((battleCounter += 1)).padStart(12, '0')}`,
      },
    });
  });

  beforeEach(() => {
    nextSeed += 1;
  });

  afterAll(async () => {
    await app.close();
    await db.close();
  });

  describe('POST /battles', () => {
    it('issues a seeded setup built from learned words, with weak words flagged', async () => {
      const started = await startBattle(KNIGHT_TOKEN);
      expect(started.tutorial).toBe(false);
      expect(started.setup.seed).toBe(nextSeed);
      expect(started.setup.encounterId).toBe(FIELD_ENCOUNTER_ID);
      expect(started.setup.words).toHaveLength(DECK.length);
      expect(started.setup.words.find((word) => word.id === 'castle')).toMatchObject({ weak: true, pos: 'noun' });
      expect(started.setup.words.find((word) => word.id === 'strike')?.mastered).toBe(true);
    });

    it('sends players with fewer than 8 learned words to the tutorial', async () => {
      const started = await startBattle(NOVICE_TOKEN);
      expect(started.tutorial).toBe(true);
      expect(started.setup.encounterId).toBe(TUTORIAL_ENCOUNTER_ID);
      expect(started.setup.words.map((word) => word.id).sort()).toEqual([...TUTORIAL_WORD_IDS].sort());
    });

    it('requires a hero', async () => {
      const response = await app.inject({ method: 'POST', url: BATTLES_PATH, headers: bearer(NO_HERO_TOKEN), payload: { encounterId: FIELD_ENCOUNTER_ID } });
      expect(response.statusCode).toBe(409);
    });

    it('allows a roaming battle after village arrival', async () => {
      const response = await app.inject({ method: 'POST', url: BATTLES_PATH, headers: bearer(KNIGHT_TOKEN), payload: { encounterId: FIELD_ROAM_ENCOUNTER_ID } });
      expect(response.statusCode).toBe(201);
    });

    it('rejects a story battle whose milestones are not met', async () => {
      // Knight mới tới làng, chưa giúp làng xong nên trận trùm còn khoá.
      const response = await app.inject({ method: 'POST', url: BATTLES_PATH, headers: bearer(KNIGHT_TOKEN), payload: { encounterId: SCARECROW_BOSS_ENCOUNTER_ID } });
      expect(response.statusCode).toBe(409);
      expect(response.json<{ error: string }>().error).toContain('Khiên lửa');
    });

    it('rejects replaying a completed story battle through the API', async () => {
      await db.query('INSERT INTO herox.story_progress (user_id, chapter, beat) VALUES ($1, 1, $2)', [knightId, CHAPTER_1_BEATS.scarecrowDefeated]);
      try {
        const response = await app.inject({
          method: 'POST',
          url: BATTLES_PATH,
          headers: bearer(KNIGHT_TOKEN),
          payload: { encounterId: SCARECROW_BOSS_ENCOUNTER_ID },
        });
        expect(response.statusCode).toBe(409);
        expect(response.json<{ error: string }>().error).toContain('đã hoàn thành');
      } finally {
        await db.query('DELETE FROM herox.story_progress WHERE user_id = $1 AND chapter = 1 AND beat = $2', [
          knightId,
          CHAPTER_1_BEATS.scarecrowDefeated,
        ]);
      }
    });

    it.each([[{ encounterId: 'no-such-fight' }], [{}], [[]]])('rejects an unknown encounter %j', async (payload) => {
      const response = await app.inject({ method: 'POST', url: BATTLES_PATH, headers: bearer(KNIGHT_TOKEN), payload });
      expect(response.statusCode).toBe(400);
    });

    it('requires a session', async () => {
      const response = await app.inject({ method: 'POST', url: BATTLES_PATH, payload: { encounterId: FIELD_ENCOUNTER_ID } });
      expect(response.statusCode).toBe(401);
    });
  });

  describe('POST /battles/:battleId/result', () => {
    it('replays an honest victory, pays gold once and records missed words', async () => {
      const goldBefore = await readGold(KNIGHT_TOKEN);
      const missesBefore = await readMisses(knightId);
      const { battleId, setup } = await startBattle(KNIGHT_TOKEN);
      // Sai một đề đầu rồi chơi đúng tới hết.
      const first = createBattle(setup).state;
      const missedId = step(first, null, THINK_MS).state.prompt?.wordId ?? '';
      const opening: BattleLogEntry = { atMs: THINK_MS, kind: 'type', text: 'zzzz' };
      let state = step(step(first, null, THINK_MS).state, { kind: 'type', text: 'zzzz' }, 0).state;
      const entries: BattleLogEntry[] = [opening];
      while (state.outcome === 'ongoing') {
        state = step(state, null, THINK_MS).state;
        const word = state.prompt === null ? '' : (state.index.wordsById.get(state.prompt.wordId)?.word ?? '');
        entries.push({ atMs: state.elapsedMs, kind: 'type', text: word });
        state = step(state, { kind: 'type', text: word }, 0).state;
      }
      expect(state.outcome).toBe('victory');

      const response = await submit(KNIGHT_TOKEN, battleId, { entries, endedAtMs: state.elapsedMs });
      expect(response.statusCode).toBe(200);
      const body = response.json<BattleResultResponse>();
      expect(body).toEqual({ outcome: 'victory', goldEarned: state.goldEarned, missedWordIds: [missedId] });
      expect(body.goldEarned).toBeGreaterThan(0);
      expect(await readGold(KNIGHT_TOKEN)).toBe(goldBefore + body.goldEarned);
      expect((await readMisses(knightId))[missedId]).toBe((missesBefore[missedId] ?? 0) + 1);

      const again = await submit(KNIGHT_TOKEN, battleId, { entries, endedAtMs: state.elapsedMs });
      expect(again.statusCode).toBe(409);
      expect(await readGold(KNIGHT_TOKEN)).toBe(goldBefore + body.goldEarned);
    });

    it('records misses but pays nothing on defeat', async () => {
      const goldBefore = await readGold(KNIGHT_TOKEN);
      const { battleId, setup } = await startBattle(KNIGHT_TOKEN);
      const result = playBattle(setup, { alwaysWrong: true });
      const response = await submit(KNIGHT_TOKEN, battleId, result);
      expect(response.statusCode).toBe(200);
      const body = response.json<BattleResultResponse>();
      expect(body.outcome).toBe('defeat');
      expect(body.goldEarned).toBe(0);
      expect(body.missedWordIds.length).toBeGreaterThan(0);
      expect(await readGold(KNIGHT_TOKEN)).toBe(goldBefore);
    });

    it('settles a battle the player left as fled', async () => {
      const { battleId, setup } = await startBattle(KNIGHT_TOKEN);
      const response = await submit(KNIGHT_TOKEN, battleId, playBattle(setup, { maxInputs: 2 }));
      expect(response.json<BattleResultResponse>()).toMatchObject({ outcome: 'fled', goldEarned: 0, missedWordIds: [] });
    });

    it('settles a battle stored before skill tiers existed, at base tiers', async () => {
      const { battleId, setup } = await startBattle(KNIGHT_TOKEN);
      await db.query("UPDATE herox.battles SET setup = setup - 'skillTiers' WHERE battle_id = $1", [battleId]);
      const response = await submit(KNIGHT_TOKEN, battleId, playBattle(setup, { maxInputs: 2 }));
      expect(response.statusCode).toBe(200);
      expect(response.json<BattleResultResponse>().outcome).toBe('fled');
    });

    it('rejects answers faster than a human can react, without writing anything', async () => {
      const goldBefore = await readGold(KNIGHT_TOKEN);
      const { battleId, setup } = await startBattle(KNIGHT_TOKEN);
      const response = await submit(KNIGHT_TOKEN, battleId, playBattle(setup, { thinkMs: MIN_REACTION_MS - 50 }));
      expect(response.statusCode).toBe(422);
      expect(await readGold(KNIGHT_TOKEN)).toBe(goldBefore);
      const claimed = await db.query('SELECT 1 FROM herox.battle_rewards WHERE user_id = $1 AND battle_id = $2', [knightId, battleId]);
      expect(claimed.rows).toHaveLength(0);
    });

    it('rejects a ring tap on a word that was never offered (e.g. not learned)', async () => {
      const { battleId } = await startBattle(KNIGHT_TOKEN);
      const forged: BattleResultRequest = { entries: [{ atMs: 2_000, kind: 'ring', wordId: 'dragon' }], endedAtMs: 2_000 };
      expect((await submit(KNIGHT_TOKEN, battleId, forged)).statusCode).toBe(422);
    });

    it('rejects a log longer than the real time since the battle started', async () => {
      const { battleId, setup } = await startBattle(KNIGHT_TOKEN);
      const result = playBattle(setup);
      clock += 1_000;
      const response = await app.inject({ method: 'POST', url: resultPath(battleId), headers: bearer(KNIGHT_TOKEN), payload: result });
      expect(response.statusCode).toBe(422);
    });

    it('does not find battles of another player, unknown ids or expired battles', async () => {
      const { battleId, setup } = await startBattle(KNIGHT_TOKEN);
      const result = playBattle(setup, { maxInputs: 1 });
      expect((await submit(NOVICE_TOKEN, battleId, result)).statusCode).toBe(404);
      expect((await submit(KNIGHT_TOKEN, '00000000-0000-4000-8000-999999999999', result)).statusCode).toBe(404);
      expect((await submit(KNIGHT_TOKEN, 'not-a-uuid', result)).statusCode).toBe(404);
      expect((await submit(KNIGHT_TOKEN, battleId, result, 3 * 60 * 60_000)).statusCode).toBe(404);
    });

    it('keeps only one open battle per player: starting a new one abandons the previous', async () => {
      const first = await startBattle(KNIGHT_TOKEN);
      const second = await startBattle(KNIGHT_TOKEN);
      const open = await db.query<{ battle_id: string }>('SELECT battle_id FROM herox.battles WHERE user_id = $1', [knightId]);
      expect(open.rows.map((row) => row.battle_id)).toEqual([second.battleId]);
      const goldBefore = await readGold(KNIGHT_TOKEN);
      expect((await submit(KNIGHT_TOKEN, first.battleId, playBattle(first.setup))).statusCode).toBe(404);
      expect(await readGold(KNIGHT_TOKEN)).toBe(goldBefore);
    });

    it('does not leave two open battles when starts race', async () => {
      await Promise.all([startBattle(KNIGHT_TOKEN), startBattle(KNIGHT_TOKEN), startBattle(KNIGHT_TOKEN)]);
      const open = await db.query('SELECT 1 FROM herox.battles WHERE user_id = $1', [knightId]);
      expect(open.rows).toHaveLength(1);
    });

    it.each([
      ['no entries array', { endedAtMs: 0 }],
      ['a negative end time', { entries: [], endedAtMs: -1 }],
      ['an entry of unknown kind', { entries: [{ atMs: 1, kind: 'cheat' }], endedAtMs: 1 }],
      ['a ring entry without word', { entries: [{ atMs: 1, kind: 'ring' }], endedAtMs: 1 }],
      ['a fractional time', { entries: [{ atMs: 1.5, kind: 'type', text: 'a' }], endedAtMs: 2 }],
      ['too many entries', { entries: Array.from({ length: 1_001 }, (_, atMs) => ({ atMs, kind: 'type', text: '' })), endedAtMs: 1_001 }],
    ])('rejects a body with %s', async (_case, payload) => {
      const { battleId } = await startBattle(KNIGHT_TOKEN);
      const response = await app.inject({ method: 'POST', url: resultPath(battleId), headers: bearer(KNIGHT_TOKEN), payload });
      expect(response.statusCode).toBe(400);
    });
  });
});
