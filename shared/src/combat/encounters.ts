import type { EnemySpec } from './battle-types.js';

/** Mẫu quái ở cấp 1; chỉ số thật nhân theo cấp anh hùng. */
export interface EnemyTemplate {
  readonly kind: string;
  readonly baseHp: number;
  readonly baseAttack: number;
  readonly rewardGold: number;
}

export interface Encounter {
  readonly id: string;
  readonly enemies: readonly EnemyTemplate[];
  readonly promptTimeMs: number;
  readonly allowElite: boolean;
}

export const TUTORIAL_ENCOUNTER_ID = 'tutorial';
export const FIELD_ENCOUNTER_ID = 'ch1-field';

// Quái tăng chậm hơn anh hùng (máu +15%/cấp, đòn +10%/cấp so với sức chiêu +20%/cấp):
// học nhiều từ thì trận dễ dần, đúng tinh thần "học là mạnh".
const ENEMY_HP_GROWTH_PER_LEVEL = 0.15;
const ENEMY_ATTACK_GROWTH_PER_LEVEL = 0.1;

// Phase nội dung chương 1 thêm trận theo map và trùm; đây là hai trận nền để chạy logic.
export const ENCOUNTERS: readonly Encounter[] = [
  {
    id: TUTORIAL_ENCOUNTER_ID,
    enemies: [
      { kind: 'imp-scout', baseHp: 30, baseAttack: 8, rewardGold: 5 },
      { kind: 'imp-scout', baseHp: 30, baseAttack: 8, rewardGold: 5 },
    ],
    // Trận hướng dẫn cho nhiều thời gian và không có quái tinh anh.
    promptTimeMs: 15_000,
    allowElite: false,
  },
  {
    id: FIELD_ENCOUNTER_ID,
    enemies: [
      { kind: 'imp', baseHp: 40, baseAttack: 12, rewardGold: 8 },
      { kind: 'imp', baseHp: 40, baseAttack: 12, rewardGold: 8 },
      { kind: 'scarecrow-thrall', baseHp: 60, baseAttack: 15, rewardGold: 12 },
    ],
    promptTimeMs: 10_000,
    allowElite: true,
  },
];

export function findEncounter(id: string): Encounter | undefined {
  return ENCOUNTERS.find((encounter) => encounter.id === id);
}

/** Chỉ số quái của trận theo cấp anh hùng. */
export function scaleEncounterEnemies(encounter: Encounter, heroLevel: number): EnemySpec[] {
  const steps = Math.max(0, Math.floor(heroLevel) - 1);
  return encounter.enemies.map((template) => ({
    kind: template.kind,
    maxHp: Math.round(template.baseHp * (1 + ENEMY_HP_GROWTH_PER_LEVEL * steps)),
    attack: Math.round(template.baseAttack * (1 + ENEMY_ATTACK_GROWTH_PER_LEVEL * steps)),
    rewardGold: template.rewardGold,
  }));
}
