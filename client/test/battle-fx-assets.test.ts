import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildBattleDeck, SKILL_MOVES, STATUS_FX, SYSTEM_FX, type SkillMove } from '@herox/shared';
import { battleBaseFxNames, deckFxNames } from '../src/battle/battle-fx-assets';

const FX_DIR = join(import.meta.dirname, '..', 'public', 'fx');
/** Trần dung lượng bộ nạp sẵn (đi bản đồ + preload trận) để máy yếu/mạng chậm vào trận nhanh. */
const BASE_FX_MAX_BYTES = 6 * 1024 * 1024;
/** Vài seed đại diện để phủ nhiều bộ chiêu khác nhau. */
const SAMPLE_SEEDS = [0, 1, 7, 42, 20_261_112, 987_654_321] as const;

const indexedNames = new Set(Object.keys((JSON.parse(readFileSync(join(FX_DIR, 'fx-index.json'), 'utf8')) as { effects: Record<string, unknown> }).effects));
const baseNames = battleBaseFxNames();

/** Bậc combo thấp nhất của chiêu trong bộ dùng hiệu ứng này. */
function lowestTierUsing(deck: readonly SkillMove[], fx: string): number {
  return Math.min(...deck.filter((move) => move.castFx === fx || move.impactFx === fx).map((move) => move.comboTier));
}

describe('battleBaseFxNames', () => {
  it('có đủ hiệu ứng hệ thống và trạng thái, không trùng lặp', () => {
    for (const fx of [...Object.values(SYSTEM_FX), ...Object.values(STATUS_FX)]) expect(baseNames).toContain(fx);
    expect(new Set(baseNames).size).toBe(baseNames.length);
  });

  it('mọi tên đều có atlas trong fx-index', () => {
    for (const name of baseNames) expect(indexedNames, name).toContain(name);
  });

  it(`tổng dung lượng png không quá ${BASE_FX_MAX_BYTES} byte`, () => {
    const totalBytes = baseNames.reduce((sum, name) => sum + statSync(join(FX_DIR, `${name}.png`)).size, 0);
    expect(totalBytes).toBeLessThanOrEqual(BASE_FX_MAX_BYTES);
  });
});

describe('deckFxNames', () => {
  it.each(SAMPLE_SEEDS)('seed %i: không trùng bộ nền, không trùng lặp, có atlas', (seed) => {
    const names = deckFxNames(buildBattleDeck(seed));
    const base = new Set(baseNames);
    expect(names.length).toBeGreaterThan(0);
    expect(new Set(names).size).toBe(names.length);
    for (const name of names) {
      expect(base.has(name), name).toBe(false);
      expect(indexedNames, name).toContain(name);
    }
  });

  it.each(SAMPLE_SEEDS)('seed %i: hiệu ứng của chiêu bậc thấp đứng trước', (seed) => {
    const deck = buildBattleDeck(seed);
    const tiers = deckFxNames(deck).map((fx) => lowestTierUsing(deck, fx));
    expect(tiers).toEqual([...tiers].sort((a, b) => a - b));
  });

  it('mọi hiệu ứng của danh mục chiêu đều có atlas (bộ chiêu nào cũng tải được)', () => {
    for (const name of deckFxNames(SKILL_MOVES)) expect(indexedNames, name).toContain(name);
  });
});
