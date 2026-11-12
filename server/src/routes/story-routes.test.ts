import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import {
  apiPath,
  BEAT_REJECTION_MESSAGES,
  CHAPTER_1_BEATS as B,
  createBattle,
  step,
  TUTORIAL_ENCOUNTER_ID,
  type BattleLogEntry,
  type BattleResultResponse,
  type StartBattleResponse,
  type StoryResponse,
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
import type { DeckWord } from '../learning/learning-stats.js';
import { PgStoryRepository } from '../story/story-repository.js';
import { EmbeddedPostgres } from '../../test/embedded-postgres.js';

const START_MS = Date.UTC(2026, 10, 12, 5, 0, 0);
const HERO_TOKEN = 'story-hero-aaaaaaaaaaaaaaaaaaaaaaaaa';
const NO_HERO_TOKEN = 'story-nohero-bbbbbbbbbbbbbbbbbbbbbbb';
const THINK_MS = 1_500;
const WORD_COUNT = 12;
const STORY_URL = apiPath('story');
const BEAT_URL = apiPath('story/beat');

const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

const DECK: DeckWord[] = Array.from({ length: WORD_COUNT }, (_, index) => ({
  id: `s${index}`,
  word: `spell${index}`,
  pos: index % 2 === 0 ? 'noun' : 'verb',
  meaning: `nghĩa ${index}`,
  emoji: '⭐',
  ipa: '',
}));

function progressForDeck(): unknown {
  const srs = Object.fromEntries(DECK.map((word) => [word.id, { state: 'review', ivl: 3, lapses: 0, last: START_MS - 86_400_000 }]));
  return { v: 1, srsEpoch: 0, srs };
}

describe('story routes on embedded Postgres', () => {
  let db: EmbeddedPostgres;
  let app: FastifyInstance;
  let clock = START_MS;

  function postBeat(payload: unknown, token = HERO_TOKEN) {
    return app.inject({ method: 'POST', url: BEAT_URL, headers: bearer(token), payload: payload as object });
  }

  function beatIds(response: { json: <T>() => T }): string[] {
    return response.json<StoryResponse>().beats.map((record) => record.beat);
  }

  /** Thắng trận `encounterId` qua đúng API trận (server tự ghi bằng chứng thắng). */
  async function winBattle(encounterId: string): Promise<void> {
    const started = await app.inject({ method: 'POST', url: apiPath('battles'), headers: bearer(HERO_TOKEN), payload: { encounterId } });
    const { battleId, setup } = started.json<StartBattleResponse>();
    let state = createBattle(setup).state;
    const entries: BattleLogEntry[] = [];
    while (state.outcome === 'ongoing') {
      state = step(state, null, THINK_MS).state;
      const word = state.prompt === null ? '' : (state.index.wordsById.get(state.prompt.wordId)?.word ?? '');
      if (state.outcome !== 'ongoing') break;
      entries.push({ atMs: state.elapsedMs, kind: 'type', text: word });
      state = step(state, { kind: 'type', text: word }, 0).state;
    }
    clock += state.elapsedMs + 1_000;
    const result = await app.inject({
      method: 'POST',
      url: apiPath(`battles/${battleId}/result`),
      headers: bearer(HERO_TOKEN),
      payload: { entries, endedAtMs: state.elapsedMs },
    });
    expect(result.json<BattleResultResponse>().outcome).toBe('victory');
  }

  beforeAll(async () => {
    db = await EmbeddedPostgres.create();
    await runMigrations(db, await loadMigrations());
    await db.seedDeck(DECK, 'deck-story');
    const heroId = await db.seedUser('pilgrim', progressForDeck());
    await db.seedSession(heroId, hashSessionToken(HERO_TOKEN));
    const noHeroId = await db.seedUser('wanderer', progressForDeck());
    await db.seedSession(noHeroId, hashSessionToken(NO_HERO_TOKEN));
    await db.query("INSERT INTO herox.heroes (user_id, name, gender) VALUES ($1, 'Pilgrim', 'female')", [heroId]);
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

  it('starts with no beats, and requires a hero and a session', async () => {
    const response = await app.inject({ method: 'GET', url: STORY_URL, headers: bearer(HERO_TOKEN) });
    expect(response.json<StoryResponse>()).toEqual({ beats: [] });
    expect((await app.inject({ method: 'GET', url: STORY_URL, headers: bearer(NO_HERO_TOKEN) })).statusCode).toBe(409);
    expect((await postBeat({ chapter: 1, beat: B.awaken }, NO_HERO_TOKEN)).statusCode).toBe(409);
    expect((await app.inject({ method: 'GET', url: STORY_URL })).statusCode).toBe(401);
  });

  it('records a dialog beat once, even when the client sends it again', async () => {
    const first = await postBeat({ chapter: 1, beat: B.awaken });
    expect(first.statusCode).toBe(200);
    expect(beatIds(first)).toEqual([B.awaken]);
    const again = await postBeat({ chapter: 1, beat: B.awaken });
    expect(again.statusCode).toBe(200);
    expect(again.json<StoryResponse>()).toEqual(first.json<StoryResponse>());
  });

  it('refuses to skip ahead in the story', async () => {
    const response = await postBeat({ chapter: 1, beat: B.scarecrowDefeated });
    expect(response.statusCode).toBe(422);
    expect(response.json()).toEqual({ error: BEAT_REJECTION_MESSAGES['prerequisites-missing'] });
  });

  it('needs a real victory recorded by the battle API for a battle beat', async () => {
    const before = await postBeat({ chapter: 1, beat: B.gateImps });
    expect(before.statusCode).toBe(422);
    expect(before.json()).toEqual({ error: BEAT_REJECTION_MESSAGES['battle-not-won'] });

    await winBattle(TUTORIAL_ENCOUNTER_ID);
    const after = await postBeat({ chapter: 1, beat: B.gateImps });
    expect(after.statusCode).toBe(200);
    expect(beatIds(after)).toEqual([B.awaken, B.gateImps]);
  });

  it('checks the typed holy word for a word beat', async () => {
    expect((await postBeat({ chapter: 1, beat: B.villageArrival })).statusCode).toBe(200);
    const wrong = await postBeat({ chapter: 1, beat: B.chapelDoor, answer: 'dor' });
    expect(wrong.statusCode).toBe(422);
    expect(wrong.json()).toEqual({ error: BEAT_REJECTION_MESSAGES['wrong-answer'] });
    expect((await postBeat({ chapter: 1, beat: B.chapelDoor })).statusCode).toBe(422);
    const right = await postBeat({ chapter: 1, beat: B.chapelDoor, answer: ' Door ' });
    expect(right.statusCode).toBe(200);
    // Sau khi tải lại (máy khác) vẫn thấy đúng mốc đã xong.
    const reloaded = await app.inject({ method: 'GET', url: STORY_URL, headers: bearer(HERO_TOKEN) });
    expect(beatIds(reloaded)).toEqual([B.awaken, B.gateImps, B.villageArrival, B.chapelDoor]);
  });

  it.each([
    ['an unknown beat', { chapter: 1, beat: 'no-such-beat' }],
    ['an unknown chapter', { chapter: 7, beat: B.awaken }],
    ['a missing beat', { chapter: 1 }],
    ['a fractional chapter', { chapter: 1.5, beat: B.awaken }],
    ['a non-string answer', { chapter: 1, beat: B.chapelDoor, answer: 42 }],
    ['an array body', [B.awaken]],
  ])('rejects %s with 400', async (_case, payload) => {
    expect((await postBeat(payload)).statusCode).toBe(400);
  });
});
