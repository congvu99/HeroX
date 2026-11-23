import type { EnemyTemplate } from '../../combat/encounters.js';

/**
 * Quái chương 3 (Hầm Mộ Thánh). Chỉ số là mức cấp 1, trận nhân theo cấp anh hùng (`scaleEncounterEnemies`).
 * Chủ đề đồ vật và nơi chốn; undead trong hầm mộ, trùm là giám mục mất tên.
 */
export const CHAPTER_3_ENEMIES = {
  redCleric: { kind: 'red-cleric', name: 'Giáo Sĩ Áo Đỏ', baseHp: 95, baseAttack: 24, rewardGold: 20 },
  boneKnight: { kind: 'bone-knight', name: 'Xương Kỵ Sĩ', baseHp: 120, baseAttack: 28, rewardGold: 24 },
  /**
   * Trùm Giám Mục Mất Tên (undead). Còn ≤ 50% máu thì dựng khiên huyết:
   * chỉ chiêu trong combo từ 3 chiêu liên tiếp mới xuyên (nhấn danh từ triệu hồi, phá khiên).
   */
  namelessBishop: {
    kind: 'nameless-bishop',
    name: 'Giám Mục Mất Tên',
    baseHp: 460,
    baseAttack: 34,
    rewardGold: 140,
    fireShield: { belowHpRatio: 0.5, minCombo: 3 },
  },
} as const satisfies Readonly<Record<string, EnemyTemplate>>;
