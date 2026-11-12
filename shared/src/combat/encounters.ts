import { CHAPTER_1_ENEMIES } from '../data/enemies/chapter-1.js';
import type { EnemySpec, FireShieldSpec } from './battle-types.js';

/** Mẫu quái ở cấp 1; chỉ số thật nhân theo cấp anh hùng. */
export interface EnemyTemplate {
  readonly kind: string;
  /** Tên hiển thị trên HUD trận. */
  readonly name?: string;
  readonly baseHp: number;
  readonly baseAttack: number;
  readonly rewardGold: number;
  /** Chỉ trùm có: pha 2 dựng khiên lửa. */
  readonly fireShield?: FireShieldSpec;
}

export interface Encounter {
  readonly id: string;
  readonly enemies: readonly EnemyTemplate[];
  readonly promptTimeMs: number;
  readonly allowElite: boolean;
}

export const TUTORIAL_ENCOUNTER_ID = 'tutorial';
export const FIELD_ENCOUNTER_ID = 'ch1-field';
export const FIELD_ROAM_ENCOUNTER_ID = 'ch1-field-roam';
export const SMITHY_ENCOUNTER_ID = 'ch1-smithy';
export const SCARECROW_BOSS_ENCOUNTER_ID = 'ch1-boss';

// Quái tăng chậm hơn anh hùng (máu +15%/cấp, đòn +10%/cấp so với sức chiêu +20%/cấp):
// học nhiều từ thì trận dễ dần, đúng tinh thần "học là mạnh".
const ENEMY_HP_GROWTH_PER_LEVEL = 0.15;
const ENEMY_ATTACK_GROWTH_PER_LEVEL = 0.1;
const DEFAULT_PROMPT_TIME_MS = 10_000;

const { impScout, imp, skeleton, ghoul, scarecrowDemon } = CHAPTER_1_ENEMIES;

export const ENCOUNTERS: readonly Encounter[] = [
  {
    id: TUTORIAL_ENCOUNTER_ID,
    enemies: [impScout, impScout],
    // Trận hướng dẫn cho nhiều thời gian và không có quái tinh anh.
    promptTimeMs: 15_000,
    allowElite: false,
  },
  { id: FIELD_ENCOUNTER_ID, enemies: [imp, skeleton, ghoul], promptTimeMs: DEFAULT_PROMPT_TIME_MS, allowElite: true },
  // Trận lặp lại được ở góc cánh đồng để kiếm thêm vàng, ôn thêm từ.
  { id: FIELD_ROAM_ENCOUNTER_ID, enemies: [imp, skeleton], promptTimeMs: DEFAULT_PROMPT_TIME_MS, allowElite: true },
  { id: SMITHY_ENCOUNTER_ID, enemies: [ghoul, skeleton, ghoul], promptTimeMs: DEFAULT_PROMPT_TIME_MS, allowElite: true },
  // Trùm cho thêm thời gian vì pha 2 buộc người chơi giữ combo.
  { id: SCARECROW_BOSS_ENCOUNTER_ID, enemies: [imp, scarecrowDemon], promptTimeMs: 12_000, allowElite: false },
];

export function findEncounter(id: string): Encounter | undefined {
  return ENCOUNTERS.find((encounter) => encounter.id === id);
}

/** Chỉ số quái của trận theo cấp anh hùng. */
export function scaleEncounterEnemies(encounter: Encounter, heroLevel: number): EnemySpec[] {
  const steps = Math.max(0, Math.floor(heroLevel) - 1);
  return encounter.enemies.map((template) => {
    const spec: EnemySpec = {
      kind: template.kind,
      maxHp: Math.round(template.baseHp * (1 + ENEMY_HP_GROWTH_PER_LEVEL * steps)),
      attack: Math.round(template.baseAttack * (1 + ENEMY_ATTACK_GROWTH_PER_LEVEL * steps)),
      rewardGold: template.rewardGold,
    };
    return template.fireShield === undefined ? spec : { ...spec, fireShield: template.fireShield };
  });
}
