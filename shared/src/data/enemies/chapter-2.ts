import type { EnemyTemplate } from '../../combat/encounters.js';

/**
 * Quái chương 2 (Rừng Tro). Chỉ số là mức cấp 1, trận nhân theo cấp anh hùng (`scaleEncounterEnemies`).
 * Chủ đề thiên nhiên và động từ di chuyển; quái nhanh, buộc người chơi giữ nhịp gõ.
 */
export const CHAPTER_2_ENEMIES = {
  ashWolf: { kind: 'ash-wolf', name: 'Sói Tro', baseHp: 70, baseAttack: 18, rewardGold: 14 },
  ashSprite: { kind: 'ash-sprite', name: 'U Linh Tro', baseHp: 60, baseAttack: 16, rewardGold: 13 },
  /**
   * Trùm Hươu Quỷ Tro. Còn ≤ 50% máu thì dựng khiên tro nóng:
   * chỉ chiêu trong combo từ 3 chiêu liên tiếp mới xuyên (nhấn kỹ năng di chuyển, giữ nhịp).
   */
  ashStag: {
    kind: 'ash-stag',
    name: 'Hươu Quỷ Tro',
    baseHp: 320,
    baseAttack: 24,
    rewardGold: 90,
    fireShield: { belowHpRatio: 0.5, minCombo: 3 },
  },
} as const satisfies Readonly<Record<string, EnemyTemplate>>;
