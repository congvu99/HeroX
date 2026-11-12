import type { CreateHeroRequest, HeroGender, HeroState } from '@herox/shared';
import type { Queryable } from '../db/pool.js';

export interface HeroStore {
  findHero(userId: number): Promise<HeroState | null>;
  /** Tạo nhân vật lần đầu; `null` khi người chơi đã có nhân vật (không ghi đè). */
  createHero(userId: number, hero: CreateHeroRequest): Promise<HeroState | null>;
}

interface HeroRow {
  readonly name: string;
  readonly gender: HeroGender;
  readonly level_seen: number;
  readonly gold: number;
  readonly crystals: number;
  readonly outfit: string;
  readonly row_version: number;
}

const HERO_COLUMNS = 'name, gender, level_seen, gold, crystals, outfit, row_version';

function toHeroState(row: HeroRow): HeroState {
  return {
    name: row.name,
    gender: row.gender,
    levelSeen: row.level_seen,
    gold: row.gold,
    crystals: row.crystals,
    outfit: row.outfit,
    rowVersion: row.row_version,
  };
}

/** Nhân vật ở `herox.heroes`. */
export class PgHeroRepository implements HeroStore {
  constructor(private readonly db: Queryable) {}

  async findHero(userId: number): Promise<HeroState | null> {
    const result = await this.db.query<HeroRow>(`SELECT ${HERO_COLUMNS} FROM herox.heroes WHERE user_id = $1`, [userId]);
    const row = result.rows[0];
    return row === undefined ? null : toHeroState(row);
  }

  async createHero(userId: number, hero: CreateHeroRequest): Promise<HeroState | null> {
    const result = await this.db.query<HeroRow>(
      `INSERT INTO herox.heroes (user_id, name, gender) VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO NOTHING
       RETURNING ${HERO_COLUMNS}`,
      [userId, hero.name, hero.gender],
    );
    const row = result.rows[0];
    return row === undefined ? null : toHeroState(row);
  }
}
