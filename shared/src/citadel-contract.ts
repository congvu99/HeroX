import type { HeroCombatStats } from './combat/battle-types.js';
import type { SkillKind } from './combat/skill-kind.js';
import type { CitadelStage } from './data/citadel-catalog.js';
import type { SkillTiers } from './data/skill-catalog.js';
import type { LearningStats, PartOfSpeechGroup } from './me-contract.js';

/** Một món trang bị người chơi đã rèn. */
export interface OwnedItem {
  readonly itemId: string;
  readonly level: number;
  readonly equipped: boolean;
}

/** Toàn bộ trạng thái thành trì của một người chơi, lưu ở schema `herox`. */
export interface CitadelState {
  /** Tăng sau mỗi lần ghi; request đổi trạng thái phải gửi kèm để chặn ghi đè giữa hai máy. */
  readonly rowVersion: number;
  readonly gold: number;
  readonly crystals: number;
  readonly outfit: string;
  readonly forgeLevel: number;
  readonly skillTiers: SkillTiers;
  readonly inventory: readonly OwnedItem[];
  /** Id từ gắn vào vòng từ, theo thứ tự ô. */
  readonly loadout: readonly string[];
  /** Ngày (theo giờ người chơi, `YYYY-MM-DD`) nhận pha lê gần nhất. */
  readonly lastCrystalClaimDay: string | null;
}

/** Chỉ số học từ mà luật thành trì cần. */
export type CitadelLearningStats = Pick<LearningStats, 'learned' | 'mastered' | 'streakDays' | 'retention30' | 'byPos'>;

/** Từ đã học hiển thị ở thư viện và bảng chọn vòng từ. */
export interface CitadelWord {
  readonly id: string;
  readonly word: string;
  readonly meaning: string;
  readonly emoji: string;
  readonly ipa: string;
  readonly pos: PartOfSpeechGroup;
  readonly mastered: boolean;
}

/** Một mốc truyện đã qua (nội dung truyện ở phase nội dung). */
export interface StoryBeatRecord {
  readonly chapter: number;
  readonly beat: string;
  readonly completedAt: string;
}

export interface DailyCrystalStatus {
  /** Số pha lê nhận được nếu nhận hôm nay. */
  readonly amount: number;
  readonly claimedToday: boolean;
}

/** Body trả về của mọi route thành trì: trạng thái mới nhất kèm số liệu hiển thị. */
export interface CitadelResponse {
  readonly state: CitadelState;
  readonly learning: CitadelLearningStats;
  readonly stage: CitadelStage;
  /** Chỉ số chiến đấu đã cộng trang bị đang mặc. */
  readonly heroStats: HeroCombatStats;
  readonly dailyCrystals: DailyCrystalStatus;
  readonly words: readonly CitadelWord[];
  readonly story: readonly StoryBeatRecord[];
}

export type UpgradeTarget =
  | { readonly kind: 'forge' }
  | { readonly kind: 'skill'; readonly skill: SkillKind }
  /** Rèn mới nếu chưa có, đã có thì nâng một cấp. */
  | { readonly kind: 'item'; readonly itemId: string };

/** Thao tác ở thành trì; route nào cũng gửi kèm `rowVersion` của trạng thái client đang thấy. */
export type CitadelAction =
  | { readonly type: 'upgrade'; readonly target: UpgradeTarget }
  | { readonly type: 'equip'; readonly itemId: string }
  | { readonly type: 'outfit'; readonly outfitId: string }
  | { readonly type: 'loadout'; readonly wordIds: readonly string[] }
  | { readonly type: 'daily-crystals' };

/** Body của `POST /herox/api/citadel/upgrade`. */
export interface UpgradeRequest {
  readonly rowVersion: number;
  readonly target: UpgradeTarget;
}

/** Body của `POST /herox/api/citadel/equip`. */
export interface EquipRequest {
  readonly rowVersion: number;
  readonly itemId: string;
}

/** Body của `POST /herox/api/citadel/outfit`. */
export interface OutfitRequest {
  readonly rowVersion: number;
  readonly outfitId: string;
}

/** Body của `POST /herox/api/citadel/loadout`. */
export interface LoadoutRequest {
  readonly rowVersion: number;
  readonly wordIds: readonly string[];
}

/** Body của `POST /herox/api/citadel/daily-crystals` (kèm `?utcOffset=` như `/me`). */
export interface DailyCrystalsRequest {
  readonly rowVersion: number;
}
