import {
  advPrepWordCount,
  canUpgrade,
  CITADEL_REJECTION_MESSAGES,
  EQUIPMENT_CATALOG,
  equipmentBonusAt,
  isMovementSkillUnlocked,
  isOutfitUnlocked,
  lockedBuildings,
  MOVEMENT_SKILL_IDS,
  MOVEMENT_SKILLS,
  OUTFIT_CATALOG,
  RING_LOADOUT_SLOTS,
  SKILL_KINDS,
  skillVariantFor,
  StoryProgress,
  type BuildingId,
  type CitadelResponse,
  type CitadelWord,
  type EquipmentItem,
  type MovementSkill,
  type OutfitVariant,
  type OwnedItem,
  type SkillKind,
  type SkillTier,
  type UpgradeCheck,
} from '@herox/shared';

/** Nút nâng cấp: nhãn, chi phí hiển thị, và lý do khoá (nếu có) để người chơi biết cần học thêm gì. */
export interface UpgradeOption {
  readonly label: string;
  readonly cost: string;
  readonly blockedReason: string | null;
}

export interface ForgeItemRow {
  readonly item: EquipmentItem;
  readonly owned: OwnedItem | null;
  /** Chỉ số hiện tại (chưa rèn thì là chỉ số cấp 1). */
  readonly bonus: number;
  readonly upgrade: UpgradeOption | null;
  readonly canEquip: boolean;
}

export interface SkillTierRow {
  readonly kind: SkillKind;
  readonly tier: SkillTier;
  readonly name: string;
  readonly upgrade: UpgradeOption | null;
}

export interface OutfitRow {
  readonly outfit: OutfitVariant;
  readonly unlocked: boolean;
  readonly selected: boolean;
}

export interface MovementSkillRow {
  readonly skill: MovementSkill;
  readonly unlocked: boolean;
  readonly progress: number;
}

function formatCost(check: UpgradeCheck & { ok: true }): string {
  const parts = [check.goldCost > 0 ? `${check.goldCost} vàng` : '', check.crystalCost > 0 ? `${check.crystalCost} pha lê` : ''];
  return parts.filter((part) => part !== '').join(' + ') || 'Miễn phí';
}

function toOption(label: string, check: UpgradeCheck): UpgradeOption | null {
  if (check.ok) return { label, cost: formatCost(check), blockedReason: null };
  // Đã tối đa thì không còn nút nâng.
  if (check.reason === 'max-level') return null;
  return { label, cost: '', blockedReason: CITADEL_REJECTION_MESSAGES[check.reason] };
}

/** Công trình còn khoá theo truyện (vd lò rèn tới khi cứu thợ rèn); server cũng chặn thao tác. */
export function isBuildingLocked(view: CitadelResponse, building: BuildingId): boolean {
  return lockedBuildings(new StoryProgress(view.story), view.state.forgeLevel).has(building);
}

export function forgeUpgradeOption(view: CitadelResponse): UpgradeOption | null {
  return toOption(`Nâng lò rèn lên cấp ${view.state.forgeLevel + 1}`, canUpgrade(view.state, view.learning, { kind: 'forge' }));
}

export function forgeItemRows(view: CitadelResponse): ForgeItemRow[] {
  return EQUIPMENT_CATALOG.map((item) => {
    const owned = view.state.inventory.find((entry) => entry.itemId === item.id) ?? null;
    const level = owned?.level ?? 1;
    const label = owned === null ? 'Rèn' : `Nâng lên cấp ${level + 1}`;
    const upgrade = toOption(label, canUpgrade(view.state, view.learning, { kind: 'item', itemId: item.id }));
    return { item, owned, bonus: equipmentBonusAt(item, level), upgrade, canEquip: owned !== null && !owned.equipped };
  });
}

export function skillTierRows(view: CitadelResponse): SkillTierRow[] {
  return SKILL_KINDS.map((kind) => {
    const tier = view.state.skillTiers[kind];
    const upgrade = toOption(`Lên bậc ${tier + 1}`, canUpgrade(view.state, view.learning, { kind: 'skill', skill: kind }));
    return { kind, tier, name: skillVariantFor(kind, tier, false).name, upgrade };
  });
}

export function outfitRows(view: CitadelResponse): OutfitRow[] {
  return OUTFIT_CATALOG.map((outfit) => ({
    outfit,
    unlocked: isOutfitUnlocked(outfit.id, view.learning),
    selected: outfit.id === view.state.outfit,
  }));
}

/** Kỹ năng di chuyển tự mở theo số trạng từ + giới từ đã học; tháp phép chỉ hiển thị tiến độ. */
export function movementSkillRows(view: CitadelResponse): MovementSkillRow[] {
  const progress = advPrepWordCount(view.learning.byPos);
  return MOVEMENT_SKILL_IDS.map((id) => ({
    skill: MOVEMENT_SKILLS[id],
    unlocked: isMovementSkillUnlocked(id, view.learning.byPos),
    progress,
  }));
}

/** Bật/tắt một từ trong vòng từ; đã đủ ô thì không thêm. */
export function toggleLoadoutWord(loadout: readonly string[], wordId: string): readonly string[] {
  if (loadout.includes(wordId)) return loadout.filter((id) => id !== wordId);
  return loadout.length >= RING_LOADOUT_SLOTS ? loadout : [...loadout, wordId];
}

/** Tìm theo từ tiếng Anh hoặc nghĩa tiếng Việt, không phân biệt hoa thường và dấu cách thừa. */
export function filterWords(words: readonly CitadelWord[], query: string): readonly CitadelWord[] {
  const needle = query.trim().toLocaleLowerCase('vi');
  if (needle === '') return words;
  return words.filter((word) => word.word.toLocaleLowerCase('en').includes(needle) || word.meaning.toLocaleLowerCase('vi').includes(needle));
}

/** Bản nháp vòng từ: bỏ từ không còn trong danh sách đã học, nếu không lần lưu nào cũng bị server từ chối. */
export function initialLoadoutDraft(saved: readonly string[], words: readonly CitadelWord[]): readonly string[] {
  const learned = new Set(words.map((word) => word.id));
  return saved.filter((id) => learned.has(id));
}

export function isSameLoadout(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((id, index) => right[index] === id);
}

/** Từ hiện để chọn vào vòng: từ đang chọn luôn đứng đầu, rồi tới từ khớp ô tìm, tối đa `limit` từ. */
export function loadoutCandidates(words: readonly CitadelWord[], draft: readonly string[], query: string, limit: number): readonly CitadelWord[] {
  const selected = new Set(draft);
  const chosen = words.filter((word) => selected.has(word.id));
  const others = filterWords(words, query).filter((word) => !selected.has(word.id));
  return [...chosen, ...others].slice(0, Math.max(limit, chosen.length));
}
