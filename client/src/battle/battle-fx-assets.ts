import { SKILL_CATALOG, STATUS_FX, SYSTEM_FX, type SkillMove } from '@herox/shared';

/**
 * Hiệu ứng trận luôn nạp sẵn (lúc đi bản đồ và preload màn trận): hiệu ứng hệ thống, trạng thái và bộ chiêu cũ theo
 * bậc tháp phép. Bộ chiêu cũ là hình dự phòng khi atlas của chiêu trong bộ chiêu trận chưa tải xong.
 */
export function battleBaseFxNames(): string[] {
  const names = new Set<string>([...Object.values(SYSTEM_FX), ...Object.values(STATUS_FX)]);
  for (const variants of Object.values(SKILL_CATALOG)) {
    for (const variant of variants) names.add(variant.castFx).add(variant.impactFx);
  }
  return [...names];
}

/**
 * Hiệu ứng riêng của bộ chiêu trận (chưa có trong bộ nạp sẵn), xếp theo bậc combo tăng dần để chiêu bậc thấp — dùng
 * ngay đầu trận — tải trước.
 */
export function deckFxNames(deck: readonly SkillMove[]): string[] {
  const base = new Set(battleBaseFxNames());
  const names = new Set<string>();
  for (const move of [...deck].sort((a, b) => a.comboTier - b.comboTier)) {
    for (const fx of [move.castFx, move.impactFx]) if (!base.has(fx)) names.add(fx);
  }
  return [...names];
}
