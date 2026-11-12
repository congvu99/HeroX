import type { StoryBeatRecord } from '@herox/shared';
import type { Database, Queryable } from '../db/pool.js';

/** Dữ liệu server cần để quyết định có ghi một mốc truyện hay không. */
export interface StorySnapshot {
  readonly beats: readonly StoryBeatRecord[];
  /** Trận người chơi đã từng thắng (bằng chứng cho mốc loại `battle`). */
  readonly wonEncounterIds: ReadonlySet<string>;
}

export type BeatWrite =
  | { readonly kind: 'saved'; readonly beats: StoryBeatRecord[] }
  | { readonly kind: 'missing' };

export interface StoryStore {
  /** `null` khi người chơi chưa tạo nhân vật. */
  readStory(userId: number): Promise<StoryBeatRecord[] | null>;
  /**
   * Khoá dòng nhân vật, đọc tiến độ, chạy `decide` (ném lỗi để từ chối) rồi ghi mốc trong một transaction.
   * Ghi lại mốc đã có không đổi gì (gọi lặp an toàn khi client gửi lại).
   */
  completeBeat(userId: number, chapter: number, beat: string, decide: (snapshot: StorySnapshot) => void): Promise<BeatWrite>;
}

/** Mọi mốc đã xong theo thứ tự hoàn thành; dùng chung cho route truyện và thành trì. */
export async function readStoryBeats(db: Queryable, userId: number): Promise<StoryBeatRecord[]> {
  const result = await db.query<{ chapter: number; beat: string; completed_at: Date }>(
    'SELECT chapter, beat, completed_at FROM herox.story_progress WHERE user_id = $1 ORDER BY completed_at, chapter, beat',
    [userId],
  );
  return result.rows.map((row) => ({ chapter: row.chapter, beat: row.beat, completedAt: new Date(row.completed_at).toISOString() }));
}

async function heroExists(db: Queryable, userId: number, lock: boolean): Promise<boolean> {
  const result = await db.query(`SELECT 1 FROM herox.heroes WHERE user_id = $1${lock ? ' FOR UPDATE' : ''}`, [userId]);
  return result.rows.length > 0;
}

async function readWonEncounters(db: Queryable, userId: number): Promise<Set<string>> {
  const result = await db.query<{ encounter_id: string }>('SELECT encounter_id FROM herox.encounter_victories WHERE user_id = $1', [userId]);
  return new Set(result.rows.map((row) => row.encounter_id));
}

/** Tiến độ truyện ở schema `herox`: `story_progress` và bằng chứng thắng trận `encounter_victories`. */
export class PgStoryRepository implements StoryStore {
  constructor(private readonly db: Database) {}

  readStory(userId: number): Promise<StoryBeatRecord[] | null> {
    return this.db.transaction(async (tx) => {
      await tx.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY');
      if (!(await heroExists(tx, userId, false))) return null;
      return readStoryBeats(tx, userId);
    });
  }

  completeBeat(userId: number, chapter: number, beat: string, decide: (snapshot: StorySnapshot) => void): Promise<BeatWrite> {
    return this.db.transaction(async (tx): Promise<BeatWrite> => {
      // Khoá dòng nhân vật để hai máy cùng gửi mốc không đọc tiến độ cũ của nhau.
      if (!(await heroExists(tx, userId, true))) return { kind: 'missing' };
      const beats = await readStoryBeats(tx, userId);
      if (beats.some((record) => record.chapter === chapter && record.beat === beat)) return { kind: 'saved', beats };
      decide({ beats, wonEncounterIds: await readWonEncounters(tx, userId) });
      await tx.query(
        `INSERT INTO herox.story_progress (user_id, chapter, beat) VALUES ($1, $2, $3)
         ON CONFLICT (user_id, chapter, beat) DO NOTHING`,
        [userId, chapter, beat],
      );
      return { kind: 'saved', beats: await readStoryBeats(tx, userId) };
    });
  }
}
