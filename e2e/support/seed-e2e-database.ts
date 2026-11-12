import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { loadMigrations, runMigrations } from '../../server/src/db/migrate.js';
import type { Database } from '../../server/src/db/pool.js';
import { buildProgressData, E2E_DECK, E2E_DECK_CONTENT_HASH, E2E_PERSONAS, E2E_STORY_BEATS, type E2ePersona } from '../fixtures/e2e-fixture.js';

// Dùng lại bản sao bảng LingoBrain của test server để seed và test đọc cùng một cấu trúc.
const ENG_PUBLIC_SCHEMA_FILE = new URL('../../server/test/eng-public-schema.sql', import.meta.url);
const FIXTURE_PASSWORD_HASH = 'scrypt$e2e-fixture';
const HERO_GENDER = 'male';

/** Băm token như LingoBrain lưu ở `sessions.token_hash` (SHA-256 hex). */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

async function seedDeck(database: Database): Promise<void> {
  await database.exec('DELETE FROM public.words; DELETE FROM public.deck_meta;');
  for (const [sortOrder, word] of E2E_DECK.entries()) {
    await database.query(
      'INSERT INTO public.words (id, word, pos, meaning, emoji, ipa, sort_order) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [word.id, word.word, word.pos, word.meaning, word.emoji, word.ipa, sortOrder],
    );
  }
  await database.query("INSERT INTO public.deck_meta (id, deck, content_hash) VALUES (1, 'e2e', $1)", [E2E_DECK_CONTENT_HASH]);
}

/** Xoá người dùng E2E cũ (kèm phiên, tiến độ qua cascade) và nhân vật của họ, để seed chạy lại được. */
async function removePersonas(database: Database): Promise<void> {
  const usernames = E2E_PERSONAS.map((persona) => persona.username);
  const existing = await database.query<{ id: number }>('SELECT id FROM public.users WHERE username = ANY($1::text[])', [usernames]);
  const userIds = existing.rows.map((row) => row.id);
  if (userIds.length === 0) return;
  await database.query('DELETE FROM herox.heroes WHERE user_id = ANY($1::int[])', [userIds]);
  await database.query('DELETE FROM public.users WHERE id = ANY($1::int[])', [userIds]);
}

async function seedPersona(database: Database, persona: E2ePersona, nowMs: number): Promise<void> {
  const inserted = await database.query<{ id: number }>(
    'INSERT INTO public.users (username, pass_hash) VALUES ($1, $2) RETURNING id',
    [persona.username, FIXTURE_PASSWORD_HASH],
  );
  const userId = inserted.rows[0]?.id;
  if (userId === undefined) throw new Error(`Không tạo được người dùng ${persona.username}`);
  await database.query('INSERT INTO public.sessions (token_hash, user_id) VALUES ($1, $2)', [hashToken(persona.token), userId]);
  await database.query('INSERT INTO public.progress (user_id, data) VALUES ($1, $2)', [userId, JSON.stringify(buildProgressData(nowMs))]);
  // Màn tạo nhân vật chưa có ở client: seed sẵn nhân vật để vào trận, thành trì được ngay.
  await database.query('INSERT INTO herox.heroes (user_id, name, gender, gold) VALUES ($1, $2, $3, $4)', [
    userId,
    persona.heroName,
    HERO_GENDER,
    persona.startGold,
  ]);
  if (!persona.seedsStoryBeats) return;
  for (const { chapter, beat } of E2E_STORY_BEATS) {
    await database.query('INSERT INTO herox.story_progress (user_id, chapter, beat) VALUES ($1, $2, $3)', [userId, chapter, beat]);
  }
}

/**
 * Dựng dữ liệu E2E trên DB thử: bảng LingoBrain tối giản, schema `herox` (migration của server), bộ từ,
 * người dùng, phiên, tiến độ, nhân vật và mốc truyện. Chạy lại bao nhiêu lần cũng được; không bao giờ trỏ vào DB thật.
 */
export async function seedE2eDatabase(database: Database, nowMs: number = Date.now()): Promise<void> {
  await database.exec(await readFile(ENG_PUBLIC_SCHEMA_FILE, 'utf8'));
  await runMigrations(database, await loadMigrations());
  await seedDeck(database);
  await removePersonas(database);
  for (const persona of E2E_PERSONAS) await seedPersona(database, persona, nowMs);
}
