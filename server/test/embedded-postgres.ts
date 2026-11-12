import { readFileSync } from 'node:fs';
import { PGlite, type Transaction } from '@electric-sql/pglite';
import type { Database, SqlExecutor } from '../src/db/pool.js';
import type { DeckWord } from '../src/learning/learning-stats.js';

const ENG_PUBLIC_SCHEMA = readFileSync(new URL('./eng-public-schema.sql', import.meta.url), 'utf8');

class EmbeddedExecutor implements SqlExecutor {
  constructor(private readonly target: PGlite | Transaction) {}

  async query<Row>(text: string, values: readonly unknown[] = []): Promise<{ rows: Row[] }> {
    const result = await this.target.query<Row>(text, [...values]);
    return { rows: result.rows };
  }

  async exec(sql: string): Promise<void> {
    await this.target.exec(sql);
  }
}

/** Postgres nhúng (PGlite) chạy trong process, có sẵn các bảng LingoBrain HeroX đọc. Chỉ dùng cho test. */
export class EmbeddedPostgres extends EmbeddedExecutor implements Database {
  private constructor(readonly pglite: PGlite) {
    super(pglite);
  }

  static async create(): Promise<EmbeddedPostgres> {
    const pglite = await PGlite.create();
    await pglite.exec(ENG_PUBLIC_SCHEMA);
    return new EmbeddedPostgres(pglite);
  }

  transaction<T>(work: (tx: SqlExecutor) => Promise<T>): Promise<T> {
    return this.pglite.transaction((tx) => work(new EmbeddedExecutor(tx)));
  }

  close(): Promise<void> {
    return this.pglite.close();
  }

  async seedUser(username: string, progressData: unknown): Promise<number> {
    const user = await this.query<{ id: number }>(
      "INSERT INTO public.users (username, pass_hash) VALUES ($1, 'scrypt$test') RETURNING id",
      [username],
    );
    const userId = user.rows[0]?.id;
    if (userId === undefined) throw new Error('Không tạo được user test');
    await this.query('INSERT INTO public.progress (user_id, data) VALUES ($1, $2)', [userId, JSON.stringify(progressData)]);
    return userId;
  }

  async seedSession(userId: number, tokenHash: string, idleDays = 0): Promise<void> {
    await this.query(
      'INSERT INTO public.sessions (token_hash, user_id, last_used_at) VALUES ($1, $2, now() - make_interval(days => $3))',
      [tokenHash, userId, idleDays],
    );
  }

  async seedDeck(words: readonly DeckWord[], contentHash: string): Promise<void> {
    await this.exec('DELETE FROM public.words; DELETE FROM public.deck_meta;');
    for (const [index, word] of words.entries()) {
      await this.query(
        'INSERT INTO public.words (id, word, pos, meaning, emoji, ipa, sort_order) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [word.id, word.word, word.pos, word.meaning, word.emoji, word.ipa, index],
      );
    }
    await this.query("INSERT INTO public.deck_meta (id, deck, content_hash) VALUES (1, 'test', $1)", [contentHash]);
  }
}
