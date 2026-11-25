import { describe, expect, it } from 'vitest';
import { SKILL_MOVES, skillMovesFor, type SkillMove } from '../data/skill-moves.js';
import { COMBO_TIERS } from './combo-tier.js';
import { SeededRandom } from './seeded-random.js';
import { SKILL_KINDS } from './skill-kind.js';
import { buildBattleDeck, DECK_MOVES_PER_GROUP, initialMoveRngState, pickSkillMove, rollMoveStatus, SkillMoveCatalogError } from './skill-move-picker.js';

describe('SKILL_MOVES', () => {
  it('mỗi loại chiêu có ít nhất 3 chiêu ở mỗi bậc combo, id không trùng', () => {
    for (const kind of SKILL_KINDS) {
      for (const tier of COMBO_TIERS) expect(skillMovesFor(kind, tier).length).toBeGreaterThanOrEqual(3);
    }
    expect(new Set(SKILL_MOVES.map((move) => move.id)).size).toBe(SKILL_MOVES.length);
  });

  it('bậc 1 không gây trạng thái, bậc 4–5 chiêu nào cũng có trạng thái', () => {
    for (const move of SKILL_MOVES) {
      if (move.comboTier === 1) expect(move.status).toBeNull();
      if (move.comboTier >= 4) expect(move.status).not.toBeNull();
    }
  });
});

describe('pickSkillMove', () => {
  it('không bốc lặp chiêu vừa dùng của cùng loại', () => {
    const rng = new SeededRandom(7);
    let last: string | undefined;
    for (let i = 0; i < 1_000; i += 1) {
      const move = pickSkillMove('attack', 3, last, rng);
      expect(move.id).not.toBe(last);
      expect(move.kind).toBe('attack');
      expect(move.comboTier).toBe(3);
      last = move.id;
    }
  });

  it('bốc đủ mọi chiêu trong nhóm', () => {
    const rng = new SeededRandom(11);
    const seen = new Set<string>();
    let last: string | undefined;
    for (let i = 0; i < 200; i += 1) {
      last = pickSkillMove('guard', 5, last, rng).id;
      seen.add(last);
    }
    expect(seen.size).toBe(skillMovesFor('guard', 5).length);
  });

  it('cùng seed cho cùng dãy chiêu', () => {
    const sequence = (seed: number): string[] => {
      const rng = new SeededRandom(initialMoveRngState(seed));
      return Array.from({ length: 20 }, (_, i) => pickSkillMove('empower', ((i % 5) + 1) as 1, undefined, rng).id);
    };
    expect(sequence(42)).toEqual(sequence(42));
    expect(sequence(42)).not.toEqual(sequence(43));
  });

  it('nhóm chỉ có một chiêu thì dùng lại chiêu đó; thiếu bậc thì lùi về bậc thấp hơn', () => {
    const only: SkillMove = { ...(skillMovesFor('attack', 1)[0] as SkillMove) };
    const rng = new SeededRandom(1);
    expect(pickSkillMove('attack', 1, only.id, rng, [only]).id).toBe(only.id);
    expect(pickSkillMove('attack', 5, undefined, rng, [only]).id).toBe(only.id);
    expect(() => pickSkillMove('guard', 1, undefined, rng, [only])).toThrow(SkillMoveCatalogError);
  });
});

describe('rollMoveStatus', () => {
  const burning = SKILL_MOVES.find((move) => move.status === 'burn') as SkillMove;

  it('bậc 1 không bao giờ gây trạng thái, bậc 4 luôn gây, bậc 5 mạnh thêm 25%', () => {
    const rng = new SeededRandom(3);
    expect(rollMoveStatus(burning, 1, rng)).toBeNull();
    expect(rollMoveStatus(burning, 4, rng)).toEqual({ kind: 'burn', power: 1 });
    expect(rollMoveStatus(burning, 5, rng)).toEqual({ kind: 'burn', power: 1.25 });
  });

  it('bậc 2 gây trạng thái khoảng 25% số lần', () => {
    const rng = new SeededRandom(5);
    const hits = Array.from({ length: 4_000 }, () => rollMoveStatus(burning, 2, rng)).filter((roll) => roll !== null).length;
    expect(hits / 4_000).toBeGreaterThan(0.22);
    expect(hits / 4_000).toBeLessThan(0.28);
  });
});

describe('buildBattleDeck', () => {
  it('mỗi nhóm có đúng 2 chiêu, tất định theo seed, seed khác cho bộ khác', () => {
    const deck = buildBattleDeck(99);
    for (const kind of SKILL_KINDS) {
      for (const tier of COMBO_TIERS) {
        expect(deck.filter((move) => move.kind === kind && move.comboTier === tier)).toHaveLength(DECK_MOVES_PER_GROUP);
      }
    }
    expect(buildBattleDeck(99)).toEqual(deck);
    const seeds = Array.from({ length: 30 }, (_, seed) => buildBattleDeck(seed).map((move) => move.id).join());
    expect(new Set(seeds).size).toBeGreaterThan(20);
  });
});
