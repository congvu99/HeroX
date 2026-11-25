import { BASE_SKILL_TIERS, type BattleSetup, type WordResult } from '@herox/shared';
import type { Database } from '../db/pool.js';

/** Lịch sử gặp một từ trong HeroX, đọc khi dựng trận sau. */
export interface WordExposure {
  /** Chuỗi trả lời đúng liên tiếp tới lần gặp gần nhất. */
  readonly correctStreak: number;
  readonly lastSeenAtMs: number;
}

export interface StoredBattle {
  readonly setup: BattleSetup;
  readonly startedAtMs: number;
  /** Trận đã chốt thưởng; route trả 409 mà không cần chạy lại log. */
  readonly settled: boolean;
}

export interface BattleSettlement {
  readonly userId: number;
  readonly battleId: string;
  /** Vàng cộng cho nhân vật (0 khi thua hoặc rời trận). */
  readonly goldEarned: number;
  readonly misses: ReadonlyMap<string, number>;
  /** Kết quả gặp từng từ trong trận, ghi vào `herox.word_exposures`. */
  readonly wordResults: ReadonlyMap<string, WordResult>;
  readonly settledAtMs: number;
  /** Trận vừa thắng: ghi vào lịch sử thắng để mở mốc truyện; `null` khi thua hoặc rời trận. */
  readonly wonEncounterId: string | null;
}

export interface BattleStore {
  readWordMisses(userId: number): Promise<Map<string, number>>;
  /** Lịch sử gặp từ trong HeroX theo id từ (`herox.word_exposures`). */
  readWordExposures(userId: number): Promise<Map<string, WordExposure>>;
  /** Lưu trận mới và bỏ mọi trận trước đó của người chơi: mỗi người chỉ có một trận mở. */
  createBattle(userId: number, battleId: string, setup: BattleSetup, startedAtMs: number): Promise<void>;
  findBattle(userId: number, battleId: string): Promise<StoredBattle | null>;
  /** Ghi thưởng, từ sai và lịch sử gặp từ trong một transaction; `false` khi trận đã được chốt trước đó. */
  settleBattle(settlement: BattleSettlement): Promise<boolean>;
}

interface BattleRow {
  /** JSON đã lưu; trận cũ có thể thiếu `skillTiers`. */
  readonly setup: Omit<BattleSetup, 'skillTiers'> & Partial<Pick<BattleSetup, 'skillTiers'>>;
  readonly started_at_ms: number;
  readonly settled: boolean;
}

/** Trận và từ sai ở schema `herox`. */
export class PgBattleRepository implements BattleStore {
  constructor(private readonly db: Database) {}

  async readWordMisses(userId: number): Promise<Map<string, number>> {
    const result = await this.db.query<{ word_id: string; misses: number }>(
      'SELECT word_id, misses FROM herox.word_misses WHERE user_id = $1',
      [userId],
    );
    return new Map(result.rows.map((row) => [row.word_id, row.misses]));
  }

  async readWordExposures(userId: number): Promise<Map<string, WordExposure>> {
    const result = await this.db.query<{ word_id: string; correct_streak: number; last_seen_at_ms: number }>(
      `SELECT word_id, correct_streak, (extract(epoch FROM last_seen_at) * 1000)::float8 AS last_seen_at_ms
       FROM herox.word_exposures WHERE user_id = $1`,
      [userId],
    );
    return new Map(result.rows.map((row) => [row.word_id, { correctStreak: row.correct_streak, lastSeenAtMs: row.last_seen_at_ms }]));
  }

  createBattle(userId: number, battleId: string, setup: BattleSetup, startedAtMs: number): Promise<void> {
    return this.db.transaction(async (tx) => {
      // Khoá dòng nhân vật để hai request bắt đầu trận song song không cùng để lại hai trận mở.
      await tx.query('SELECT 1 FROM herox.heroes WHERE user_id = $1 FOR UPDATE', [userId]);
      // Chỉ giữ một trận mở: mở nhiều trận song song rồi nộp hàng loạt sẽ nhân vàng nhận được.
      await tx.query('DELETE FROM herox.battles WHERE user_id = $1', [userId]);
      await tx.query(
        `INSERT INTO herox.battles (user_id, battle_id, encounter_id, setup, started_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, battleId, setup.encounterId, JSON.stringify(setup), new Date(startedAtMs)],
      );
    });
  }

  async findBattle(userId: number, battleId: string): Promise<StoredBattle | null> {
    const result = await this.db.query<BattleRow>(
      `SELECT battle.setup, (extract(epoch FROM battle.started_at) * 1000)::float8 AS started_at_ms,
              EXISTS (
                SELECT 1 FROM herox.battle_rewards reward
                WHERE reward.user_id = battle.user_id AND reward.battle_id = battle.battle_id
              ) AS settled
       FROM herox.battles battle WHERE battle.user_id = $1 AND battle.battle_id = $2`,
      [userId, battleId],
    );
    const row = result.rows[0];
    if (row === undefined) return null;
    // Trận cấp trước khi có bậc chiêu lưu setup thiếu `skillTiers`; khi đó mọi chiêu đều ở bậc gốc.
    const setup: BattleSetup = { ...row.setup, skillTiers: row.setup.skillTiers ?? BASE_SKILL_TIERS };
    return { setup, startedAtMs: row.started_at_ms, settled: row.settled };
  }

  settleBattle(settlement: BattleSettlement): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      // Khoá chính của battle_rewards chặn chốt một trận hai lần, kể cả hai request gửi cùng lúc.
      const claimed = await tx.query(
        `INSERT INTO herox.battle_rewards (user_id, battle_id, claimed_at) VALUES ($1, $2, $3)
         ON CONFLICT (user_id, battle_id) DO NOTHING
         RETURNING battle_id`,
        [settlement.userId, settlement.battleId, new Date(settlement.settledAtMs)],
      );
      if (claimed.rows.length === 0) return false;

      if (settlement.misses.size > 0) {
        await tx.query(
          `INSERT INTO herox.word_misses (user_id, word_id, misses, last_miss_at)
           SELECT $1, miss.word_id, miss.misses, $4
           FROM unnest($2::text[], $3::int[]) AS miss (word_id, misses)
           ON CONFLICT (user_id, word_id) DO UPDATE
           SET misses = herox.word_misses.misses + EXCLUDED.misses, last_miss_at = EXCLUDED.last_miss_at`,
          [settlement.userId, [...settlement.misses.keys()], [...settlement.misses.values()], new Date(settlement.settledAtMs)],
        );
      }
      if (settlement.wordResults.size > 0) {
        const wordIds = [...settlement.wordResults.keys()];
        const results = [...settlement.wordResults.values()];
        // Ghép `missed` qua CTE `incoming` để nhánh cập nhật phân biệt: từ sai → chuỗi đúng đặt lại bằng
        // `trailingCorrect` cuối trận (0 nếu lần cuối vẫn sai); từ không sai → cộng dồn `trailingCorrect` vào chuỗi cũ.
        await tx.query(
          `WITH incoming AS (
             SELECT word_id, prompted, trailing_correct, missed
             FROM unnest($2::text[], $3::int[], $4::int[], $5::bool[]) AS t (word_id, prompted, trailing_correct, missed)
           )
           INSERT INTO herox.word_exposures (user_id, word_id, seen_count, correct_streak, last_seen_at)
           SELECT $1, incoming.word_id, incoming.prompted, incoming.trailing_correct, $6 FROM incoming
           ON CONFLICT (user_id, word_id) DO UPDATE
           SET seen_count = herox.word_exposures.seen_count + EXCLUDED.seen_count,
               correct_streak = CASE
                 WHEN (SELECT missed FROM incoming WHERE incoming.word_id = EXCLUDED.word_id)
                 THEN EXCLUDED.correct_streak
                 ELSE herox.word_exposures.correct_streak + EXCLUDED.correct_streak
               END,
               last_seen_at = EXCLUDED.last_seen_at`,
          [
            settlement.userId,
            wordIds,
            results.map((result) => result.prompted),
            results.map((result) => result.trailingCorrect),
            results.map((result) => result.missed),
            new Date(settlement.settledAtMs),
          ],
        );
      }
      if (settlement.wonEncounterId !== null) {
        await tx.query(
          `INSERT INTO herox.encounter_victories (user_id, encounter_id, first_won_at) VALUES ($1, $2, $3)
           ON CONFLICT (user_id, encounter_id) DO NOTHING`,
          [settlement.userId, settlement.wonEncounterId, new Date(settlement.settledAtMs)],
        );
      }
      if (settlement.goldEarned > 0) {
        await tx.query(
          `UPDATE herox.heroes
           SET gold = gold + $2, row_version = row_version + 1, updated_at = now()
           WHERE user_id = $1`,
          [settlement.userId, settlement.goldEarned],
        );
      }
      return true;
    });
  }
}
