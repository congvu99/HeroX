/** Công trình trong thành trì Lexhold. */
export const BUILDING_IDS = ['forge', 'arcane-tower', 'tailor', 'library'] as const;
export type BuildingId = (typeof BUILDING_IDS)[number];

export function isBuildingId(value: unknown): value is BuildingId {
  return typeof value === 'string' && (BUILDING_IDS as readonly string[]).includes(value);
}

export interface BuildingInfo {
  readonly id: BuildingId;
  readonly name: string;
  readonly description: string;
}

export const BUILDINGS: Readonly<Record<BuildingId, BuildingInfo>> = {
  forge: {
    id: 'forge',
    name: 'Lò Rèn',
    description: 'Rèn và nâng vũ khí, giáp. Lò rèn càng cao, trang bị càng mạnh.',
  },
  'arcane-tower': {
    id: 'arcane-tower',
    name: 'Tháp Phép',
    description: 'Nâng bậc chiêu bằng pha lê, chọn từ gắn vào vòng từ, xem kỹ năng di chuyển.',
  },
  tailor: {
    id: 'tailor',
    name: 'Xưởng May',
    description: 'Đổi ngoại trang của hiệp sĩ. Mẫu mới mở theo số từ đã học và đã thuộc.',
  },
  library: {
    id: 'library',
    name: 'Thư Viện',
    description: 'Đọc lại nhật ký hành trình, xem và nghe lại các từ đã thu.',
  },
};

export interface ForgeLevel {
  readonly level: number;
  /** Vàng để nâng từ cấp trước lên cấp này. */
  readonly goldCost: number;
  /** Số từ đã học cần có để nâng lên cấp này. */
  readonly requiredLearned: number;
}

/** Lò rèn có sẵn cấp 1. Cấp lò rèn là trần cấp của mọi trang bị. */
export const FORGE_LEVELS: readonly ForgeLevel[] = [
  { level: 1, goldCost: 0, requiredLearned: 0 },
  { level: 2, goldCost: 100, requiredLearned: 50 },
  { level: 3, goldCost: 300, requiredLearned: 150 },
  { level: 4, goldCost: 700, requiredLearned: 300 },
  { level: 5, goldCost: 1_500, requiredLearned: 600 },
];
export const BASE_FORGE_LEVEL = 1;
export const MAX_FORGE_LEVEL = 5;

export function forgeLevelInfo(level: number): ForgeLevel | undefined {
  return FORGE_LEVELS.find((entry) => entry.level === level);
}

export interface SkillTierUpgrade {
  readonly crystalCost: number;
  /** Số từ đã thuộc cần có. */
  readonly requiredMastered: number;
}

// Bậc chiêu đổi bằng pha lê (thưởng cho việc ôn đều) và cần từ đã thuộc: phải ôn tới thuộc mới mạnh lên được.
export const SKILL_TIER_UPGRADES: Readonly<Record<2 | 3, SkillTierUpgrade>> = {
  2: { crystalCost: 8, requiredMastered: 20 },
  3: { crystalCost: 20, requiredMastered: 100 },
};

/** Thành trì hồi sinh dần theo tổng số từ đã học. */
export const CITADEL_STAGES = ['ruined', 'rebuilding', 'restored'] as const;
export type CitadelStage = (typeof CITADEL_STAGES)[number];

export const CITADEL_STAGE_THRESHOLDS: Readonly<Record<CitadelStage, number>> = {
  ruined: 0,
  rebuilding: 150,
  restored: 500,
};

export const CITADEL_STAGE_NAMES: Readonly<Record<CitadelStage, string>> = {
  ruined: 'Đổ nát',
  rebuilding: 'Đang dựng lại',
  restored: 'Hồi sinh',
};

export function citadelStageFor(learned: number): CitadelStage {
  return CITADEL_STAGES.reduce<CitadelStage>(
    (current, stage) => (learned >= CITADEL_STAGE_THRESHOLDS[stage] ? stage : current),
    'ruined',
  );
}

// Pha lê mỗi ngày: chuỗi ngày học (tối đa 5) + thưởng theo tỉ lệ nhớ 30 ngày. Tối đa 8 viên/ngày.
export const DAILY_CRYSTAL_STREAK_CAP = 5;
/** Mốc tỉ lệ nhớ 30 ngày → số pha lê thưởng thêm, xét từ cao xuống. */
export const DAILY_CRYSTAL_RETENTION_BONUS: readonly { readonly minRetention: number; readonly crystals: number }[] = [
  { minRetention: 0.9, crystals: 3 },
  { minRetention: 0.8, crystals: 2 },
  { minRetention: 0.7, crystals: 1 },
];
