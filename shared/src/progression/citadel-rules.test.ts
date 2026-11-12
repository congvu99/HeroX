import { describe, expect, it } from 'vitest';
import type { CitadelLearningStats, CitadelState } from '../citadel-contract.js';
import { citadelStageFor, FORGE_LEVELS, SKILL_TIER_UPGRADES } from '../data/citadel-catalog.js';
import { EQUIPMENT_CATALOG, findEquipmentItem } from '../data/equipment-catalog.js';
import { DEFAULT_OUTFIT_ID, OUTFIT_CATALOG } from '../data/outfit-catalog.js';
import { BASE_SKILL_TIERS } from '../data/skill-catalog.js';
import {
  applyCitadelAction,
  buildCitadelResponse,
  canUpgrade,
  dailyCrystalReward,
  equipmentStatBonus,
  heroStatsWithGear,
  isOutfitUnlocked,
  localDayKey,
  type CitadelActionContext,
} from './citadel-rules.js';
import { heroLevelForLearned, heroStatsForLevel } from './level-curve.js';

const TODAY = '2026-11-12';

/** Catalog thiếu mục mà test cần thì hỏng ngay, không để `undefined` lọt vào phép so. */
function present<T>(value: T | undefined): T {
  if (value === undefined) throw new Error('Catalog thiếu mục test cần');
  return value;
}

function citadel(overrides: Partial<CitadelState> = {}): CitadelState {
  return {
    rowVersion: 1,
    gold: 0,
    crystals: 0,
    outfit: DEFAULT_OUTFIT_ID,
    forgeLevel: 1,
    skillTiers: BASE_SKILL_TIERS,
    inventory: [],
    loadout: [],
    lastCrystalClaimDay: null,
    ...overrides,
  };
}

function stats(overrides: Partial<CitadelLearningStats> = {}): CitadelLearningStats {
  return {
    learned: 0,
    mastered: 0,
    streakDays: 0,
    retention30: null,
    byPos: { verb: 0, noun: 0, adj: 0, adv: 0, prep: 0, other: 0 },
    ...overrides,
  };
}

function context(overrides: Partial<CitadelActionContext> = {}): CitadelActionContext {
  return { stats: stats(), today: TODAY, learnedWordIds: new Set(['a', 'b', 'c', 'd', 'e']), ...overrides };
}

describe('canUpgrade: forge', () => {
  const level2 = present(FORGE_LEVELS[1]);

  it('rejects without enough learned words, then without enough gold, with the reason', () => {
    expect(canUpgrade(citadel({ gold: 10_000 }), stats({ learned: 0 }), { kind: 'forge' })).toEqual({
      ok: false,
      reason: 'not-enough-learned',
    });
    expect(canUpgrade(citadel({ gold: 0 }), stats({ learned: 1_000 }), { kind: 'forge' })).toEqual({
      ok: false,
      reason: 'not-enough-gold',
    });
  });

  it('charges the catalog gold cost when both conditions hold', () => {
    const state = citadel({ gold: level2.goldCost });
    expect(canUpgrade(state, stats({ learned: level2.requiredLearned }), { kind: 'forge' })).toEqual({
      ok: true,
      goldCost: level2.goldCost,
      crystalCost: 0,
    });
    const result = applyCitadelAction(state, context({ stats: stats({ learned: 1_000 }) }), {
      type: 'upgrade',
      target: { kind: 'forge' },
    });
    expect(result).toMatchObject({ ok: true, state: { forgeLevel: 2, gold: 0 } });
  });

  it('stops at the max level', () => {
    expect(canUpgrade(citadel({ forgeLevel: 5, gold: 99_999 }), stats({ learned: 9_999 }), { kind: 'forge' })).toEqual({
      ok: false,
      reason: 'max-level',
    });
  });
});

describe('canUpgrade: skill tiers', () => {
  const tier2 = SKILL_TIER_UPGRADES[2];

  it('needs mastered words, then crystals', () => {
    expect(canUpgrade(citadel({ crystals: 99 }), stats({ mastered: 0 }), { kind: 'skill', skill: 'attack' })).toEqual({
      ok: false,
      reason: 'not-enough-mastered',
    });
    expect(canUpgrade(citadel({ crystals: 0 }), stats({ mastered: 999 }), { kind: 'skill', skill: 'attack' })).toEqual({
      ok: false,
      reason: 'not-enough-crystals',
    });
  });

  it('raises only the chosen skill kind and spends crystals', () => {
    const result = applyCitadelAction(
      citadel({ crystals: tier2.crystalCost + 1 }),
      context({ stats: stats({ mastered: tier2.requiredMastered }) }),
      { type: 'upgrade', target: { kind: 'skill', skill: 'guard' } },
    );
    expect(result).toMatchObject({ ok: true, state: { crystals: 1, skillTiers: { ...BASE_SKILL_TIERS, guard: 2 } } });
  });

  it('caps at tier 3', () => {
    const maxed = citadel({ crystals: 999, skillTiers: { ...BASE_SKILL_TIERS, evade: 3 } });
    expect(canUpgrade(maxed, stats({ mastered: 999 }), { kind: 'skill', skill: 'evade' })).toEqual({ ok: false, reason: 'max-level' });
  });
});

describe('canUpgrade: equipment', () => {
  const sword = findEquipmentItem('pilgrim-sword');
  const longsword = findEquipmentItem('templar-longsword');

  it('crafts a new item and equips it when the slot is empty', () => {
    const result = applyCitadelAction(citadel({ gold: 100 }), context(), {
      type: 'upgrade',
      target: { kind: 'item', itemId: 'pilgrim-sword' },
    });
    expect(result).toMatchObject({
      ok: true,
      state: { gold: 100 - (sword?.craftGoldCost ?? 0), inventory: [{ itemId: 'pilgrim-sword', level: 1, equipped: true }] },
    });
  });

  it('does not auto-equip over an item already worn in that slot', () => {
    const state = citadel({ gold: 9_999, forgeLevel: 3, inventory: [{ itemId: 'pilgrim-sword', level: 1, equipped: true }] });
    const result = applyCitadelAction(state, context(), { type: 'upgrade', target: { kind: 'item', itemId: 'templar-longsword' } });
    expect(result.ok && result.state.inventory).toEqual([
      { itemId: 'pilgrim-sword', level: 1, equipped: true },
      { itemId: 'templar-longsword', level: 1, equipped: false },
    ]);
  });

  it('rejects unknown items, items above the forge level, and item levels above the forge level', () => {
    const rich = citadel({ gold: 99_999 });
    expect(canUpgrade(rich, stats(), { kind: 'item', itemId: 'nope' })).toEqual({ ok: false, reason: 'unknown-item' });
    expect(longsword?.requiredForgeLevel).toBeGreaterThan(1);
    expect(canUpgrade(rich, stats(), { kind: 'item', itemId: 'templar-longsword' })).toEqual({ ok: false, reason: 'forge-level-too-low' });
    const owned = citadel({ gold: 99_999, inventory: [{ itemId: 'pilgrim-sword', level: 1, equipped: true }] });
    expect(canUpgrade(owned, stats(), { kind: 'item', itemId: 'pilgrim-sword' })).toEqual({ ok: false, reason: 'forge-level-too-low' });
  });

  it('charges upgrade cost × current level', () => {
    const owned = citadel({ gold: 99_999, forgeLevel: 3, inventory: [{ itemId: 'pilgrim-sword', level: 2, equipped: true }] });
    expect(canUpgrade(owned, stats(), { kind: 'item', itemId: 'pilgrim-sword' })).toEqual({
      ok: true,
      goldCost: (sword?.upgradeGoldCost ?? 0) * 2,
      crystalCost: 0,
    });
  });

  it('equips one item per slot', () => {
    const state = citadel({
      inventory: [
        { itemId: 'pilgrim-sword', level: 1, equipped: true },
        { itemId: 'templar-longsword', level: 1, equipped: false },
        { itemId: 'pilgrim-mail', level: 1, equipped: true },
      ],
    });
    const result = applyCitadelAction(state, context(), { type: 'equip', itemId: 'templar-longsword' });
    expect(result.ok && result.state.inventory.map((item) => [item.itemId, item.equipped])).toEqual([
      ['pilgrim-sword', false],
      ['templar-longsword', true],
      ['pilgrim-mail', true],
    ]);
    expect(applyCitadelAction(citadel(), context(), { type: 'equip', itemId: 'pilgrim-sword' })).toEqual({
      ok: false,
      reason: 'not-owned',
    });
  });

  it('adds equipped bonuses to the base stats of the hero level', () => {
    const inventory = [
      { itemId: 'pilgrim-sword', level: 3, equipped: true },
      { itemId: 'pilgrim-mail', level: 1, equipped: true },
      { itemId: 'seraph-plate', level: 1, equipped: false },
    ];
    expect(equipmentStatBonus(inventory)).toEqual({ power: 2 + 1 * 2, maxHp: 15 });
    const base = heroStatsForLevel(heroLevelForLearned(50));
    expect(heroStatsWithGear(50, inventory)).toEqual({ power: base.power + 4, maxHp: base.maxHp + 15 });
  });

  it('keeps every catalog item reachable within the forge levels', () => {
    for (const item of EQUIPMENT_CATALOG) expect(FORGE_LEVELS.some((level) => level.level === item.requiredForgeLevel)).toBe(true);
  });
});

describe('outfits', () => {
  it('unlocks by learned and mastered milestones, never by gold', () => {
    const lastOutfit = present(OUTFIT_CATALOG.at(-1));
    expect(lastOutfit).toBeDefined();
    const id = lastOutfit.id;
    expect(isOutfitUnlocked(DEFAULT_OUTFIT_ID, stats())).toBe(true);
    expect(applyCitadelAction(citadel({ gold: 99_999 }), context(), { type: 'outfit', outfitId: id })).toEqual({
      ok: false,
      reason: 'outfit-locked',
    });
    const veteran = stats({ learned: lastOutfit.requiredLearned, mastered: lastOutfit.requiredMastered });
    expect(applyCitadelAction(citadel(), context({ stats: veteran }), { type: 'outfit', outfitId: id })).toMatchObject({
      ok: true,
      state: { outfit: id, gold: 0 },
    });
    expect(applyCitadelAction(citadel(), context(), { type: 'outfit', outfitId: 'ghost' })).toEqual({ ok: false, reason: 'unknown-outfit' });
  });
});

describe('loadout', () => {
  it('accepts up to 4 distinct learned words', () => {
    expect(applyCitadelAction(citadel(), context(), { type: 'loadout', wordIds: ['a', 'b', 'c', 'd'] })).toMatchObject({
      ok: true,
      state: { loadout: ['a', 'b', 'c', 'd'] },
    });
    expect(applyCitadelAction(citadel(), context(), { type: 'loadout', wordIds: [] })).toMatchObject({ ok: true, state: { loadout: [] } });
  });

  it.each([
    ['too many words', ['a', 'b', 'c', 'd', 'e']],
    ['duplicates', ['a', 'a']],
    ['a word not learned yet', ['a', 'zzz']],
  ])('rejects %s', (_case, wordIds) => {
    expect(applyCitadelAction(citadel(), context(), { type: 'loadout', wordIds })).toEqual({ ok: false, reason: 'invalid-loadout' });
  });
});

describe('daily crystals', () => {
  it('rewards the study streak (capped) plus a 30-day retention bonus', () => {
    expect(dailyCrystalReward({ streakDays: 0, retention30: null })).toBe(0);
    expect(dailyCrystalReward({ streakDays: 3, retention30: 0.5 })).toBe(3);
    expect(dailyCrystalReward({ streakDays: 30, retention30: 0.75 })).toBe(6);
    expect(dailyCrystalReward({ streakDays: 2, retention30: 0.95 })).toBe(5);
  });

  it('can be claimed once per local day', () => {
    const studying = context({ stats: stats({ streakDays: 2, retention30: 0.85 }) });
    const first = applyCitadelAction(citadel(), studying, { type: 'daily-crystals' });
    expect(first).toMatchObject({ ok: true, state: { crystals: 4, lastCrystalClaimDay: TODAY } });
    if (!first.ok) return;
    expect(applyCitadelAction(first.state, studying, { type: 'daily-crystals' })).toEqual({ ok: false, reason: 'already-claimed' });
    // Lùi múi giờ về hôm qua cũng không nhận thêm được.
    expect(applyCitadelAction(first.state, { ...studying, today: '2026-11-11' }, { type: 'daily-crystals' })).toEqual({
      ok: false,
      reason: 'already-claimed',
    });
    expect(applyCitadelAction(first.state, { ...studying, today: '2026-11-13' }, { type: 'daily-crystals' })).toMatchObject({ ok: true });
  });

  it('refuses an empty claim instead of burning the day', () => {
    expect(applyCitadelAction(citadel(), context(), { type: 'daily-crystals' })).toEqual({ ok: false, reason: 'nothing-to-claim' });
  });

  it('computes the local day from the UTC offset', () => {
    const lateEveningUtc = Date.UTC(2026, 10, 11, 20, 0, 0);
    expect(localDayKey(lateEveningUtc, 0)).toBe('2026-11-11');
    expect(localDayKey(lateEveningUtc, 420)).toBe('2026-11-12');
  });
});

describe('citadel stage', () => {
  it('rebuilds as more words are learned', () => {
    expect(citadelStageFor(0)).toBe('ruined');
    expect(citadelStageFor(149)).toBe('ruined');
    expect(citadelStageFor(150)).toBe('rebuilding');
    expect(citadelStageFor(500)).toBe('restored');
  });
});

describe('buildCitadelResponse', () => {
  it('derives stage, geared hero stats and today crystal status from stored state', () => {
    const state = citadel({ lastCrystalClaimDay: TODAY, inventory: [{ itemId: 'pilgrim-sword', level: 2, equipped: true }] });
    const learning = stats({ learned: 160, streakDays: 2, retention30: 0.95 });
    const response = buildCitadelResponse({ state, stats: learning, words: [], story: [], today: TODAY });
    expect(response.stage).toBe('rebuilding');
    expect(response.heroStats).toEqual(heroStatsWithGear(160, state.inventory));
    expect(response.dailyCrystals).toEqual({ amount: 5, claimedToday: true });
    expect(buildCitadelResponse({ state, stats: learning, words: [], story: [], today: '2026-11-13' }).dailyCrystals.claimedToday).toBe(false);
  });
});
