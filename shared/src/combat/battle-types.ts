import type { SkillTiers } from '../data/skill-catalog.js';
import type { PartOfSpeechGroup } from '../me-contract.js';

/** Một từ người chơi đã học, dùng làm đề và chiêu trong trận. */
export interface BattleWord {
  readonly id: string;
  readonly word: string;
  readonly meaning: string;
  readonly emoji: string;
  readonly pos: PartOfSpeechGroup;
  /** Đã thuộc (khoảng cách ôn ≥ 21 ngày): chiêu mạnh hơn. */
  readonly mastered: boolean;
  /** Hay sai (quên ở LingoBrain hoặc gõ sai trong HeroX): ra đề nhiều hơn, có thể sinh quái tinh anh. */
  readonly weak: boolean;
}

/** Quái trong một trận, chỉ số đã nhân theo cấp anh hùng. */
export interface EnemySpec {
  readonly kind: string;
  readonly maxHp: number;
  /** Sát thương mỗi đòn đánh trả. */
  readonly attack: number;
  readonly rewardGold: number;
}

export interface HeroCombatStats {
  readonly maxHp: number;
  /** Sát thương gốc của một chiêu trước khi nhân hệ số. */
  readonly power: number;
}

/** Mọi dữ liệu cần để dựng lại một trận; server cấp và lưu lúc bắt đầu, client và server chạy cùng một bản. */
export interface BattleSetup {
  /** Seed uint32 của bộ sinh ngẫu nhiên. */
  readonly seed: number;
  readonly encounterId: string;
  readonly words: readonly BattleWord[];
  /** Id từ người chơi gắn vào vòng từ (theo thứ tự ô). */
  readonly loadout: readonly string[];
  readonly hero: HeroCombatStats;
  /** Bậc từng loại chiêu lúc vào trận (tháp phép ở thành trì). */
  readonly skillTiers: SkillTiers;
  readonly enemies: readonly EnemySpec[];
  /** Thời gian trả lời mỗi đề; hết giờ tính như trả lời sai. */
  readonly promptTimeMs: number;
  readonly allowElite: boolean;
}

/** Gõ từ (bàn phím) hoặc chạm một ô của vòng từ (cảm ứng). */
export type BattleInput =
  | { readonly kind: 'type'; readonly text: string }
  | { readonly kind: 'ring'; readonly wordId: string };

export type BattleOutcome = 'ongoing' | 'victory' | 'defeat';
