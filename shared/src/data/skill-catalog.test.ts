import { describe, expect, it } from 'vitest';
import { SKILL_KINDS } from '../combat/skill-kind.js';
import {
  advPrepWordCount,
  isMovementSkillUnlocked,
  MOVEMENT_SKILLS,
  SKILL_CATALOG,
  SKILL_TIERS,
  skillVariantFor,
} from './skill-catalog.js';

const NO_WORDS = { verb: 0, noun: 0, adj: 0, adv: 0, prep: 0, other: 0 };

describe('SKILL_CATALOG', () => {
  it('mỗi loại chiêu có đủ 3 bậc theo thứ tự, id không trùng', () => {
    const ids = new Set<string>();
    for (const kind of SKILL_KINDS) {
      expect(SKILL_CATALOG[kind].map((entry) => entry.tier)).toEqual([...SKILL_TIERS]);
      for (const entry of SKILL_CATALOG[kind]) {
        expect(entry.kind).toBe(kind);
        expect(entry.name.length).toBeGreaterThan(0);
        ids.add(entry.id);
      }
    }
    expect(ids.size).toBe(SKILL_KINDS.length * SKILL_TIERS.length);
  });
});

describe('skillVariantFor', () => {
  it('từ chưa thuộc dùng đúng bậc', () => {
    expect(skillVariantFor('attack', 1, false).id).toBe('attack-1');
    expect(skillVariantFor('guard', 3, false).id).toBe('guard-3');
  });

  it('từ đã thuộc hiện cao hơn một bậc, tối đa bậc 3', () => {
    expect(skillVariantFor('empower', 1, true).id).toBe('empower-2');
    expect(skillVariantFor('evade', 3, true).id).toBe('evade-3');
  });
});

describe('kỹ năng di chuyển', () => {
  it('đếm trạng từ + giới từ', () => {
    expect(advPrepWordCount({ ...NO_WORDS, adv: 3, prep: 4, verb: 50 })).toBe(7);
  });

  it('mở đúng mốc', () => {
    const dashNeeds = MOVEMENT_SKILLS.dash.requiredAdvPrepWords;
    expect(isMovementSkillUnlocked('dash', { ...NO_WORDS, adv: dashNeeds - 1 })).toBe(false);
    expect(isMovementSkillUnlocked('dash', { ...NO_WORDS, adv: dashNeeds - 1, prep: 1 })).toBe(true);
    expect(isMovementSkillUnlocked('blink', { ...NO_WORDS, adv: dashNeeds })).toBe(false);
    expect(isMovementSkillUnlocked('blink', { ...NO_WORDS, prep: MOVEMENT_SKILLS.blink.requiredAdvPrepWords })).toBe(true);
  });
});
