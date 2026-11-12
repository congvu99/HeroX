export const EQUIPMENT_SLOTS = ['weapon', 'armor'] as const;
export type EquipmentSlot = (typeof EQUIPMENT_SLOTS)[number];

export interface EquipmentItem {
  readonly id: string;
  readonly slot: EquipmentSlot;
  readonly name: string;
  readonly description: string;
  /** Cấp lò rèn cần có để rèn món này. */
  readonly requiredForgeLevel: number;
  readonly craftGoldCost: number;
  /** Vàng nâng từ cấp L lên L + 1 = `upgradeGoldCost × L`. */
  readonly upgradeGoldCost: number;
  /** Chỉ số ở cấp 1: vũ khí cộng sức chiêu, giáp cộng máu. */
  readonly baseBonus: number;
  readonly bonusPerLevel: number;
}

/** Cấp tối đa của một món; thực tế còn bị chặn bởi cấp lò rèn. */
export const MAX_ITEM_LEVEL = 5;

export const EQUIPMENT_CATALOG: readonly EquipmentItem[] = [
  {
    id: 'pilgrim-sword',
    slot: 'weapon',
    name: 'Kiếm Hành Hương',
    description: 'Thanh kiếm thép thô, khắc một dòng kinh đã mờ.',
    requiredForgeLevel: 1,
    craftGoldCost: 40,
    upgradeGoldCost: 30,
    baseBonus: 2,
    bonusPerLevel: 1,
  },
  {
    id: 'templar-longsword',
    slot: 'weapon',
    name: 'Trường Kiếm Thánh Điện',
    description: 'Lưỡi dài tôi trong nước thánh, chữ khắc sáng lên khi chém.',
    requiredForgeLevel: 3,
    craftGoldCost: 300,
    upgradeGoldCost: 80,
    baseBonus: 6,
    bonusPerLevel: 2,
  },
  {
    id: 'seraph-blade',
    slot: 'weapon',
    name: 'Lưỡi Thiên Thần',
    description: 'Rèn từ mảnh cánh thép của thiên thần sa trận, nặng như một lời thề.',
    requiredForgeLevel: 5,
    craftGoldCost: 1_000,
    upgradeGoldCost: 200,
    baseBonus: 12,
    bonusPerLevel: 3,
  },
  {
    id: 'pilgrim-mail',
    slot: 'armor',
    name: 'Áo Xích Hành Hương',
    description: 'Áo lưới xích vá nhiều lớp, đủ đỡ móng vuốt quỷ nhỏ.',
    requiredForgeLevel: 1,
    craftGoldCost: 40,
    upgradeGoldCost: 30,
    baseBonus: 15,
    bonusPerLevel: 5,
  },
  {
    id: 'templar-plate',
    slot: 'armor',
    name: 'Giáp Tấm Thánh Điện',
    description: 'Giáp tấm trắng viền đỏ, khắc thập tự trên ngực.',
    requiredForgeLevel: 3,
    craftGoldCost: 300,
    upgradeGoldCost: 80,
    baseBonus: 40,
    bonusPerLevel: 10,
  },
  {
    id: 'seraph-plate',
    slot: 'armor',
    name: 'Giáp Thiên Thần',
    description: 'Giáp phát ánh sáng mờ, quỷ đứng gần cũng thấy nóng rát.',
    requiredForgeLevel: 5,
    craftGoldCost: 1_000,
    upgradeGoldCost: 200,
    baseBonus: 80,
    bonusPerLevel: 15,
  },
];

export function findEquipmentItem(itemId: string): EquipmentItem | undefined {
  return EQUIPMENT_CATALOG.find((item) => item.id === itemId);
}

/** Chỉ số món đồ cộng thêm ở `level`. */
export function equipmentBonusAt(item: EquipmentItem, level: number): number {
  return item.baseBonus + item.bonusPerLevel * (Math.max(1, level) - 1);
}
