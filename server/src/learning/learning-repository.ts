import type { Queryable } from '../db/pool.js';
import { API_ERROR_CODES, HttpError } from '../http/http-error.js';
import type { DeckWord } from './learning-stats.js';

export interface LearningSource {
  /** `progress.data` của người dùng; `null` khi chưa có dòng tiến độ. */
  readProgressData(userId: number): Promise<unknown>;
  /** Bộ từ hiện hành theo thứ tự của LingoBrain. */
  readDeckWords(): Promise<readonly DeckWord[]>;
}

interface DeckCache {
  readonly contentHash: string;
  readonly words: readonly DeckWord[];
}

/** Đọc tiến độ và bộ từ LingoBrain (chỉ SELECT); bộ từ cache trong RAM, làm mới khi `deck_meta.content_hash` đổi. */
export class PgLearningRepository implements LearningSource {
  private cache: DeckCache | undefined;
  // Single-flight: nhiều request cùng lúc thấy hash mới chỉ dựng lại bộ từ một lần.
  private pendingLoad: Promise<DeckCache> | undefined;

  constructor(private readonly db: Queryable) {}

  async readProgressData(userId: number): Promise<unknown> {
    const result = await this.db.query<{ data: unknown }>('SELECT data FROM public.progress WHERE user_id = $1', [userId]);
    return result.rows[0]?.data ?? null;
  }

  async readDeckWords(): Promise<readonly DeckWord[]> {
    const result = await this.db.query<{ content_hash: string }>('SELECT content_hash FROM public.deck_meta WHERE id = 1');
    const contentHash = result.rows[0]?.content_hash;
    // Chưa seed bộ từ: trả số 0 sẽ sai lệch với LingoBrain, nên báo tạm thời không phục vụ được.
    if (contentHash === undefined) {
      throw new HttpError(503, 'Bộ từ LingoBrain chưa sẵn sàng, thử lại sau', API_ERROR_CODES.deckNotReady);
    }
    if (this.cache?.contentHash === contentHash) return this.cache.words;
    this.pendingLoad ??= this.loadDeck(contentHash).finally(() => {
      this.pendingLoad = undefined;
    });
    return (await this.pendingLoad).words;
  }

  private async loadDeck(contentHash: string): Promise<DeckCache> {
    const result = await this.db.query<DeckWord>(
      'SELECT id, word, pos, meaning, emoji, ipa FROM public.words ORDER BY sort_order',
    );
    const cache: DeckCache = { contentHash, words: result.rows };
    this.cache = cache;
    return cache;
  }
}
