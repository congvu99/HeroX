import type { EnemyTemplate } from '../../combat/encounters.js';

/**
 * Quái chương 4 (Vực Lửa). Chỉ số là mức cấp 1, trận nhân theo cấp anh hùng (`scaleEncounterEnemies`).
 * Chủ đề công việc và cảm xúc; địa ngục dung nham, trùm chuyên đảo nghĩa (cặp trái nghĩa).
 */
export const CHAPTER_4_ENEMIES = {
  fireImp: { kind: 'fire-imp', name: 'Tiểu Quỷ Lửa', baseHp: 130, baseAttack: 34, rewardGold: 30 },
  lavaHound: { kind: 'lava-hound', name: 'Chó Ngao Dung Nham', baseHp: 170, baseAttack: 40, rewardGold: 36 },
  /**
   * Trùm Chúa Quỷ Ngược Nghĩa. Còn ≤ 50% máu thì dựng khiên lửa:
   * chỉ chiêu trong combo từ 3 chiêu liên tiếp mới xuyên (nhấn tính từ buff/debuff, cặp trái nghĩa).
   */
  antonymDemon: {
    kind: 'antonym-demon',
    name: 'Chúa Quỷ Ngược Nghĩa',
    baseHp: 640,
    baseAttack: 46,
    rewardGold: 210,
    fireShield: { belowHpRatio: 0.5, minCombo: 3 },
  },
} as const satisfies Readonly<Record<string, EnemyTemplate>>;
