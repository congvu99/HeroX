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
  /**
   * Vừa học ở LingoBrain (lượt chấm đầu trong vài ngày qua): vào bộ từ trước và ra đề nhiều hơn để ôn ngay.
   * Tuỳ chọn vì setup trận cũ đã lưu không có trường này.
   */
  readonly fresh?: boolean;
  /** Lâu chưa gặp trong HeroX (hoặc chưa gặp lần nào): ra đề nhiều hơn một chút để không bị quên. Tuỳ chọn như `fresh`. */
  readonly stale?: boolean;
}

/** Khiên lửa pha 2 của trùm: dựng khi máu xuống tới ngưỡng, chỉ chiêu trong combo đủ dài mới xuyên qua. */
export interface FireShieldSpec {
  /** Máu còn ≤ tỉ lệ này của máu tối đa thì dựng khiên. */
  readonly belowHpRatio: number;
  /** Số chiêu đúng liên tiếp tối thiểu (tính cả chiêu đang tung) để xuyên khiên. */
  readonly minCombo: number;
}

/** Quái trong một trận, chỉ số đã nhân theo cấp anh hùng. */
export interface EnemySpec {
  readonly kind: string;
  readonly maxHp: number;
  /** Sát thương mỗi đòn đánh trả. */
  readonly attack: number;
  readonly rewardGold: number;
  /** Chỉ trùm có; setup lưu trước khi có trường này coi như không có khiên. */
  readonly fireShield?: FireShieldSpec;
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
