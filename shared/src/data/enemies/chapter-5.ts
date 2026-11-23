import type { EnemyTemplate } from '../../combat/encounters.js';

/**
 * Quái chương 5 (Thiên Cung Vỡ). Chỉ số là mức cấp 1, trận nhân theo cấp anh hùng (`scaleEncounterEnemies`).
 * Chủ đề tổng hợp; thiên thần sa ngã trên thiên cung đổ nát, trận cuối chỉ dùng từ đã thuộc.
 */
export const CHAPTER_5_ENEMIES = {
  muteCherub: { kind: 'mute-cherub', name: 'Tiểu Thiên Thần Câm', baseHp: 180, baseAttack: 44, rewardGold: 44 },
  brokenSeraph: { kind: 'broken-seraph', name: 'Seraph Gãy Cánh', baseHp: 230, baseAttack: 52, rewardGold: 52 },
  /**
   * Trùm Thiên Thần Sa Ngã Câm Lặng (hiệp sĩ Thánh Ngôn đời trước, bỏ ôn nên quên hết chữ).
   * Còn ≤ 50% máu thì dựng khiên câm lặng: chỉ chiêu trong combo từ 3 chiêu liên tiếp mới xuyên.
   */
  fallenAngel: {
    kind: 'fallen-angel',
    name: 'Thiên Thần Sa Ngã Câm Lặng',
    baseHp: 900,
    baseAttack: 60,
    rewardGold: 320,
    fireShield: { belowHpRatio: 0.5, minCombo: 3 },
  },
} as const satisfies Readonly<Record<string, EnemyTemplate>>;
