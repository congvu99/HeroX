import type {
  CitadelAction,
  CitadelLearningStats,
  CitadelResponse,
  CitadelState,
  CitadelWord,
  OwnedItem,
  StoryBeatRecord,
  UpgradeTarget,
} from '../citadel-contract.js';
import type { HeroCombatStats } from '../combat/battle-types.js';
import { RING_LOADOUT_SLOTS } from '../combat/ring-options.js';
import {
  citadelStageFor,
  DAILY_CRYSTAL_RETENTION_BONUS,
  DAILY_CRYSTAL_STREAK_CAP,
  forgeLevelInfo,
  MAX_FORGE_LEVEL,
  SKILL_TIER_UPGRADES,
  type BuildingId,
} from '../data/citadel-catalog.js';
import { equipmentBonusAt, findEquipmentItem, MAX_ITEM_LEVEL, type EquipmentSlot } from '../data/equipment-catalog.js';
import { findOutfit } from '../data/outfit-catalog.js';
import { MAX_SKILL_TIER, type SkillTier } from '../data/skill-catalog.js';
import { heroLevelForLearned, heroStatsForLevel } from './level-curve.js';

/** Lý do từ chối một thao tác ở thành trì, kèm câu hiển thị cho người chơi. */
export const CITADEL_REJECTION_MESSAGES = {
  'not-enough-gold': 'Không đủ vàng',
  'not-enough-crystals': 'Không đủ pha lê',
  'not-enough-learned': 'Cần học thêm từ ở LingoBrain',
  'not-enough-mastered': 'Cần thêm từ đã thuộc (ôn tới khi nhớ lâu)',
  'max-level': 'Đã đạt cấp tối đa',
  'forge-level-too-low': 'Cần nâng lò rèn trước',
  'unknown-item': 'Trang bị không tồn tại',
  'not-owned': 'Chưa rèn trang bị này',
  'unknown-outfit': 'Ngoại trang không tồn tại',
  'outfit-locked': 'Ngoại trang chưa mở khoá',
  'invalid-loadout': `Vòng từ chỉ gắn tối đa ${RING_LOADOUT_SLOTS} từ khác nhau, đã học`,
  'already-claimed': 'Hôm nay đã nhận pha lê',
  'nothing-to-claim': 'Học ở LingoBrain để nhận pha lê hôm nay',
  'building-locked': 'Công trình chưa mở: tiếp tục cốt truyện để mở',
} as const;
export type CitadelRejection = keyof typeof CITADEL_REJECTION_MESSAGES;

export type UpgradeCheck =
  | { readonly ok: true; readonly goldCost: number; readonly crystalCost: number }
  | { readonly ok: false; readonly reason: CitadelRejection };

export type CitadelActionResult =
  | { readonly ok: true; readonly state: CitadelState }
  | { readonly ok: false; readonly reason: CitadelRejection };

export interface CitadelActionContext {
  readonly stats: CitadelLearningStats;
  /** Hôm nay theo giờ người chơi, `YYYY-MM-DD` (xem `localDayKey`). */
  readonly today: string;
  readonly learnedWordIds: ReadonlySet<string>;
  /** Công trình còn khoá theo cốt truyện (vd lò rèn trước khi cứu thợ rèn); thiếu nghĩa là không khoá. */
  readonly lockedBuildings?: ReadonlySet<string>;
}

const FORGE_BUILDING_ID: BuildingId = 'forge';

/** Nâng lò rèn và rèn trang bị đều làm ở lò rèn. */
function isForgeWork(target: UpgradeTarget): boolean {
  return target.kind === 'forge' || target.kind === 'item';
}

const MINUTE_MS = 60_000;
const DAY_KEY_LENGTH = 10;

/** Khoá ngày `YYYY-MM-DD` theo múi giờ người chơi (phút về phía đông UTC), cùng cách LingoBrain tính ngày. */
export function localDayKey(timeMs: number, utcOffsetMinutes: number): string {
  return new Date(timeMs + utcOffsetMinutes * MINUTE_MS).toISOString().slice(0, DAY_KEY_LENGTH);
}

function reject(reason: CitadelRejection): { readonly ok: false; readonly reason: CitadelRejection } {
  return { ok: false, reason };
}

function checkForgeUpgrade(state: CitadelState, stats: CitadelLearningStats): UpgradeCheck {
  const next = state.forgeLevel >= MAX_FORGE_LEVEL ? undefined : forgeLevelInfo(state.forgeLevel + 1);
  if (next === undefined) return reject('max-level');
  if (stats.learned < next.requiredLearned) return reject('not-enough-learned');
  if (state.gold < next.goldCost) return reject('not-enough-gold');
  return { ok: true, goldCost: next.goldCost, crystalCost: 0 };
}

function checkSkillUpgrade(current: SkillTier, state: CitadelState, stats: CitadelLearningStats): UpgradeCheck {
  if (current >= MAX_SKILL_TIER) return reject('max-level');
  const upgrade = SKILL_TIER_UPGRADES[(current + 1) as 2 | 3];
  if (stats.mastered < upgrade.requiredMastered) return reject('not-enough-mastered');
  if (state.crystals < upgrade.crystalCost) return reject('not-enough-crystals');
  return { ok: true, goldCost: 0, crystalCost: upgrade.crystalCost };
}

function checkItemUpgrade(itemId: string, state: CitadelState): UpgradeCheck {
  const item = findEquipmentItem(itemId);
  if (item === undefined) return reject('unknown-item');
  const owned = state.inventory.find((entry) => entry.itemId === itemId);
  if (owned === undefined) {
    if (state.forgeLevel < item.requiredForgeLevel) return reject('forge-level-too-low');
    if (state.gold < item.craftGoldCost) return reject('not-enough-gold');
    return { ok: true, goldCost: item.craftGoldCost, crystalCost: 0 };
  }
  if (owned.level >= MAX_ITEM_LEVEL) return reject('max-level');
  // Cấp trang bị không vượt cấp lò rèn.
  if (owned.level >= state.forgeLevel) return reject('forge-level-too-low');
  const cost = item.upgradeGoldCost * owned.level;
  if (state.gold < cost) return reject('not-enough-gold');
  return { ok: true, goldCost: cost, crystalCost: 0 };
}

/** Kiểm điều kiện nâng cấp và tính chi phí; không đổi trạng thái. */
export function canUpgrade(state: CitadelState, stats: CitadelLearningStats, target: UpgradeTarget): UpgradeCheck {
  switch (target.kind) {
    case 'forge':
      return checkForgeUpgrade(state, stats);
    case 'skill':
      return checkSkillUpgrade(state.skillTiers[target.skill], state, stats);
    case 'item':
      return checkItemUpgrade(target.itemId, state);
  }
}

function slotOf(itemId: string): EquipmentSlot | undefined {
  return findEquipmentItem(itemId)?.slot;
}

function upgradeItem(inventory: readonly OwnedItem[], itemId: string): OwnedItem[] {
  const owned = inventory.find((entry) => entry.itemId === itemId);
  if (owned !== undefined) {
    return inventory.map((entry) => (entry.itemId === itemId ? { ...entry, level: entry.level + 1 } : entry));
  }
  // Món mới rèn tự mặc nếu ô đó đang trống.
  const slot = slotOf(itemId);
  const slotTaken = inventory.some((entry) => entry.equipped && slotOf(entry.itemId) === slot);
  return [...inventory, { itemId, level: 1, equipped: !slotTaken }];
}

function applyUpgrade(state: CitadelState, stats: CitadelLearningStats, target: UpgradeTarget): CitadelActionResult {
  const check = canUpgrade(state, stats, target);
  if (!check.ok) return check;
  const paid: CitadelState = { ...state, gold: state.gold - check.goldCost, crystals: state.crystals - check.crystalCost };
  switch (target.kind) {
    case 'forge':
      return { ok: true, state: { ...paid, forgeLevel: state.forgeLevel + 1 } };
    case 'skill': {
      const tier = (state.skillTiers[target.skill] + 1) as SkillTier;
      return { ok: true, state: { ...paid, skillTiers: { ...state.skillTiers, [target.skill]: tier } } };
    }
    case 'item':
      return { ok: true, state: { ...paid, inventory: upgradeItem(state.inventory, target.itemId) } };
  }
}

function applyEquip(state: CitadelState, itemId: string): CitadelActionResult {
  if (!state.inventory.some((entry) => entry.itemId === itemId)) return reject('not-owned');
  const slot = slotOf(itemId);
  // Mỗi ô (vũ khí, giáp) chỉ mặc một món.
  const inventory = state.inventory.map((entry) =>
    slotOf(entry.itemId) === slot ? { ...entry, equipped: entry.itemId === itemId } : entry,
  );
  return { ok: true, state: { ...state, inventory } };
}

/** Ngoại trang đã mở khoá theo mốc từ đã học và đã thuộc. */
export function isOutfitUnlocked(outfitId: string, stats: Pick<CitadelLearningStats, 'learned' | 'mastered'>): boolean {
  const outfit = findOutfit(outfitId);
  return outfit !== undefined && stats.learned >= outfit.requiredLearned && stats.mastered >= outfit.requiredMastered;
}

function applyOutfit(state: CitadelState, stats: CitadelLearningStats, outfitId: string): CitadelActionResult {
  if (findOutfit(outfitId) === undefined) return reject('unknown-outfit');
  if (!isOutfitUnlocked(outfitId, stats)) return reject('outfit-locked');
  return { ok: true, state: { ...state, outfit: outfitId } };
}

/** Vòng từ hợp lệ: tối đa 4 từ, không trùng, đều là từ đã học. */
export function isValidLoadout(wordIds: readonly string[], learnedWordIds: ReadonlySet<string>): boolean {
  return (
    wordIds.length <= RING_LOADOUT_SLOTS &&
    new Set(wordIds).size === wordIds.length &&
    wordIds.every((id) => learnedWordIds.has(id))
  );
}

/** Pha lê nhận được hôm nay: chuỗi ngày học (tối đa 5) + thưởng tỉ lệ nhớ 30 ngày (≥ 70% / 80% / 90%). */
export function dailyCrystalReward(stats: Pick<CitadelLearningStats, 'streakDays' | 'retention30'>): number {
  const streakPart = Math.min(Math.max(0, Math.floor(stats.streakDays)), DAILY_CRYSTAL_STREAK_CAP);
  const retention = stats.retention30;
  const retentionPart =
    retention === null ? 0 : (DAILY_CRYSTAL_RETENTION_BONUS.find((entry) => retention >= entry.minRetention)?.crystals ?? 0);
  return streakPart + retentionPart;
}

/**
 * Đã nhận hôm nay khi ngày nhận gần nhất không trước hôm nay. So sánh "không trước" (thay vì "bằng") để đổi múi giờ
 * lùi lại không nhận thêm được lần nữa.
 */
export function hasClaimedCrystalsOn(state: Pick<CitadelState, 'lastCrystalClaimDay'>, today: string): boolean {
  return state.lastCrystalClaimDay !== null && state.lastCrystalClaimDay >= today;
}

function applyDailyCrystals(state: CitadelState, context: CitadelActionContext): CitadelActionResult {
  if (hasClaimedCrystalsOn(state, context.today)) return reject('already-claimed');
  const amount = dailyCrystalReward(context.stats);
  if (amount === 0) return reject('nothing-to-claim');
  return { ok: true, state: { ...state, crystals: state.crystals + amount, lastCrystalClaimDay: context.today } };
}

/** Áp một thao tác lên trạng thái thành trì; thuần, server và bản dev của client dùng chung. */
export function applyCitadelAction(
  state: CitadelState,
  context: CitadelActionContext,
  action: CitadelAction,
): CitadelActionResult {
  switch (action.type) {
    case 'upgrade':
      if (isForgeWork(action.target) && context.lockedBuildings?.has(FORGE_BUILDING_ID) === true) return reject('building-locked');
      return applyUpgrade(state, context.stats, action.target);
    case 'equip':
      return applyEquip(state, action.itemId);
    case 'outfit':
      return applyOutfit(state, context.stats, action.outfitId);
    case 'loadout':
      return isValidLoadout(action.wordIds, context.learnedWordIds)
        ? { ok: true, state: { ...state, loadout: [...action.wordIds] } }
        : reject('invalid-loadout');
    case 'daily-crystals':
      return applyDailyCrystals(state, context);
  }
}

/** Chỉ số cộng thêm từ trang bị đang mặc: vũ khí cộng sức chiêu, giáp cộng máu. */
export function equipmentStatBonus(inventory: readonly OwnedItem[]): HeroCombatStats {
  let power = 0;
  let maxHp = 0;
  for (const owned of inventory) {
    const item = owned.equipped ? findEquipmentItem(owned.itemId) : undefined;
    if (item === undefined) continue;
    if (item.slot === 'weapon') power += equipmentBonusAt(item, owned.level);
    else maxHp += equipmentBonusAt(item, owned.level);
  }
  return { maxHp, power };
}

/** Chỉ số vào trận: gốc theo số từ đã học + trang bị đang mặc. */
export function heroStatsWithGear(learned: number, inventory: readonly OwnedItem[]): HeroCombatStats {
  const base = heroStatsForLevel(heroLevelForLearned(learned));
  const bonus = equipmentStatBonus(inventory);
  return { maxHp: base.maxHp + bonus.maxHp, power: base.power + bonus.power };
}

export interface CitadelResponseInput {
  readonly state: CitadelState;
  readonly stats: CitadelLearningStats;
  readonly words: readonly CitadelWord[];
  readonly story: readonly StoryBeatRecord[];
  /** Hôm nay theo giờ người chơi, `YYYY-MM-DD`. */
  readonly today: string;
}

/** Dựng `CitadelResponse` từ trạng thái đã lưu và số liệu học: giai đoạn thành trì, chỉ số có trang bị, pha lê hôm nay. */
export function buildCitadelResponse(input: CitadelResponseInput): CitadelResponse {
  const { state, stats, words, story, today } = input;
  return {
    state,
    learning: stats,
    stage: citadelStageFor(stats.learned),
    heroStats: heroStatsWithGear(stats.learned, state.inventory),
    dailyCrystals: { amount: dailyCrystalReward(stats), claimedToday: hasClaimedCrystalsOn(state, today) },
    words,
    story,
  };
}
