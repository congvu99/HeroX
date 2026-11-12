import {
  BASE_FORGE_LEVEL,
  BASE_SKILL_TIERS,
  isSkillTier,
  SKILL_KINDS,
  type BuildingId,
  type CitadelState,
  type OwnedItem,
  type SkillKind,
  type SkillTiers,
  type StoryBeatRecord,
} from '@herox/shared';
import type { Database, Queryable } from '../db/pool.js';

export type CitadelUpdate =
  | { readonly kind: 'updated'; readonly state: CitadelState }
  /** `rowVersion` client gửi đã cũ: máy khác (hoặc trận vừa chốt) đã ghi trước. */
  | { readonly kind: 'conflict' }
  | { readonly kind: 'missing' };

export interface CitadelStore {
  /** `null` khi người chơi chưa tạo nhân vật. */
  readCitadel(userId: number): Promise<CitadelState | null>;
  readStory(userId: number): Promise<StoryBeatRecord[]>;
  /**
   * Khoá dòng nhân vật, so `expectedRowVersion`, chạy `change` rồi ghi toàn bộ trạng thái mới trong một transaction.
   * `change` ném lỗi thì transaction rollback và lỗi lan ra ngoài.
   */
  updateCitadel(
    userId: number,
    expectedRowVersion: number,
    change: (state: CitadelState) => CitadelState,
  ): Promise<CitadelUpdate>;
}

interface HeroCitadelRow {
  readonly gold: number;
  readonly crystals: number;
  readonly outfit: string;
  readonly row_version: number;
  readonly last_crystal_claim_day: string | null;
}

const FORGE_BUILDING: BuildingId = 'forge';

function isSkillKind(value: string): value is SkillKind {
  return (SKILL_KINDS as readonly string[]).includes(value);
}

async function readHeroRow(db: Queryable, userId: number, lock: boolean): Promise<HeroCitadelRow | undefined> {
  const result = await db.query<HeroCitadelRow>(
    `SELECT gold, crystals, outfit, row_version, to_char(last_crystal_claim_day, 'YYYY-MM-DD') AS last_crystal_claim_day
     FROM herox.heroes WHERE user_id = $1${lock ? ' FOR UPDATE' : ''}`,
    [userId],
  );
  return result.rows[0];
}

async function readForgeLevel(db: Queryable, userId: number): Promise<number> {
  const result = await db.query<{ level: number }>(
    'SELECT level FROM herox.citadel_buildings WHERE user_id = $1 AND building = $2',
    [userId, FORGE_BUILDING],
  );
  return result.rows[0]?.level ?? BASE_FORGE_LEVEL;
}

async function readSkillTiers(db: Queryable, userId: number): Promise<SkillTiers> {
  const result = await db.query<{ skill: string; tier: number }>('SELECT skill, tier FROM herox.skill_tiers WHERE user_id = $1', [userId]);
  const tiers = { ...BASE_SKILL_TIERS };
  for (const row of result.rows) {
    if (isSkillKind(row.skill) && isSkillTier(row.tier)) tiers[row.skill] = row.tier;
  }
  return tiers;
}

async function readInventory(db: Queryable, userId: number): Promise<OwnedItem[]> {
  const result = await db.query<{ item_id: string; level: number; equipped: boolean }>(
    'SELECT item_id, level, equipped FROM herox.inventory WHERE user_id = $1 ORDER BY item_id',
    [userId],
  );
  return result.rows.map((row) => ({ itemId: row.item_id, level: row.level, equipped: row.equipped }));
}

async function readLoadout(db: Queryable, userId: number): Promise<string[]> {
  const result = await db.query<{ word_id: string }>('SELECT word_id FROM herox.skill_loadout WHERE user_id = $1 ORDER BY slot', [userId]);
  return result.rows.map((row) => row.word_id);
}

async function loadCitadel(db: Queryable, userId: number, lock: boolean): Promise<CitadelState | null> {
  // Khoá dòng nhân vật trước khi đọc bảng con để mọi request ghi của cùng người chơi xếp hàng.
  const hero = await readHeroRow(db, userId, lock);
  if (hero === undefined) return null;
  // Đọc lần lượt: cùng một kết nối không chạy song song nhiều câu (pg@9 bỏ hẳn), và giữ ít kết nối của pool.
  const forgeLevel = await readForgeLevel(db, userId);
  const skillTiers = await readSkillTiers(db, userId);
  const inventory = await readInventory(db, userId);
  const loadout = await readLoadout(db, userId);
  return {
    rowVersion: hero.row_version,
    gold: hero.gold,
    crystals: hero.crystals,
    outfit: hero.outfit,
    forgeLevel,
    skillTiers,
    inventory,
    loadout,
    lastCrystalClaimDay: hero.last_crystal_claim_day,
  };
}

async function writeCitadel(db: Queryable, userId: number, state: CitadelState): Promise<void> {
  await db.query(
    `UPDATE herox.heroes
     SET gold = $2, crystals = $3, outfit = $4, last_crystal_claim_day = $5::date,
         row_version = row_version + 1, updated_at = now()
     WHERE user_id = $1`,
    [userId, state.gold, state.crystals, state.outfit, state.lastCrystalClaimDay],
  );
  await db.query(
    `INSERT INTO herox.citadel_buildings (user_id, building, level) VALUES ($1, $2, $3)
     ON CONFLICT (user_id, building) DO UPDATE SET level = EXCLUDED.level`,
    [userId, FORGE_BUILDING, state.forgeLevel],
  );
  // Bảng con nhỏ (≤ 6 dòng mỗi bảng): xoá rồi ghi lại cho đơn giản và luôn khớp trạng thái mới.
  await db.query('DELETE FROM herox.skill_tiers WHERE user_id = $1', [userId]);
  const skills = Object.keys(state.skillTiers) as SkillKind[];
  await db.query(
    `INSERT INTO herox.skill_tiers (user_id, skill, tier)
     SELECT $1, entry.skill, entry.tier FROM unnest($2::text[], $3::int[]) AS entry (skill, tier)`,
    [userId, skills, skills.map((skill) => state.skillTiers[skill])],
  );
  await db.query('DELETE FROM herox.inventory WHERE user_id = $1', [userId]);
  await db.query(
    `INSERT INTO herox.inventory (user_id, item_id, level, equipped)
     SELECT $1, entry.item_id, entry.level, entry.equipped
     FROM unnest($2::text[], $3::int[], $4::boolean[]) AS entry (item_id, level, equipped)`,
    [
      userId,
      state.inventory.map((item) => item.itemId),
      state.inventory.map((item) => item.level),
      state.inventory.map((item) => item.equipped),
    ],
  );
  await db.query('DELETE FROM herox.skill_loadout WHERE user_id = $1', [userId]);
  await db.query(
    `INSERT INTO herox.skill_loadout (user_id, slot, word_id)
     SELECT $1, entry.slot - 1, entry.word_id FROM unnest($2::text[]) WITH ORDINALITY AS entry (word_id, slot)`,
    [userId, [...state.loadout]],
  );
}

/** Thành trì ở schema `herox`: cột tài nguyên của `heroes` và các bảng con. */
export class PgCitadelRepository implements CitadelStore {
  constructor(private readonly db: Database) {}

  /** Đọc trên một kết nối, cùng một snapshot: `rowVersion` luôn khớp với các bảng con trả kèm. */
  readCitadel(userId: number): Promise<CitadelState | null> {
    return this.db.transaction(async (tx) => {
      await tx.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY');
      return loadCitadel(tx, userId, false);
    });
  }

  async readStory(userId: number): Promise<StoryBeatRecord[]> {
    const result = await this.db.query<{ chapter: number; beat: string; completed_at: Date }>(
      'SELECT chapter, beat, completed_at FROM herox.story_progress WHERE user_id = $1 ORDER BY completed_at, chapter, beat',
      [userId],
    );
    return result.rows.map((row) => ({ chapter: row.chapter, beat: row.beat, completedAt: new Date(row.completed_at).toISOString() }));
  }

  updateCitadel(
    userId: number,
    expectedRowVersion: number,
    change: (state: CitadelState) => CitadelState,
  ): Promise<CitadelUpdate> {
    return this.db.transaction(async (tx): Promise<CitadelUpdate> => {
      const current = await loadCitadel(tx, userId, true);
      if (current === null) return { kind: 'missing' };
      if (current.rowVersion !== expectedRowVersion) return { kind: 'conflict' };
      await writeCitadel(tx, userId, change(current));
      // Đọc lại để trả đúng dạng chuẩn (thứ tự trang bị, ngày) như GET ở máy khác sẽ thấy.
      const saved = await loadCitadel(tx, userId, false);
      return saved === null ? { kind: 'missing' } : { kind: 'updated', state: saved };
    });
  }
}
