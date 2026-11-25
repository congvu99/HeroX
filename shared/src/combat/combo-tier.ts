/** Bậc chiêu theo độ dài combo: chuỗi đúng càng dài, chiêu bốc ra càng hoành tráng. */
export const COMBO_TIERS = [1, 2, 3, 4, 5] as const;
export type ComboTier = (typeof COMBO_TIERS)[number];
export const MAX_COMBO_TIER: ComboTier = 5;

// Số chiêu đúng liên tiếp tối thiểu để vào từng bậc: 1, 2–3, 4–5, 6–9, 10+.
const COMBO_TIER_THRESHOLDS: Readonly<Record<ComboTier, number>> = { 1: 1, 2: 2, 3: 4, 4: 6, 5: 10 };

/** Bậc combo của chiêu thứ `count` trong chuỗi (tính cả chiêu đang tung); `count` < 1 coi như chiêu lẻ. */
export function comboTierFor(count: number): ComboTier {
  for (let tier = MAX_COMBO_TIER; tier > 1; tier -= 1) {
    if (count >= COMBO_TIER_THRESHOLDS[tier]) return tier;
  }
  return 1;
}

/** Nâng bậc thêm `steps`, không vượt bậc cao nhất (từ đã thuộc hiện chiêu cao hơn một bậc). */
export function raiseComboTier(tier: ComboTier, steps: number): ComboTier {
  return Math.min(MAX_COMBO_TIER, tier + steps) as ComboTier;
}
