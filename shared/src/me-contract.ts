/** Nhóm từ loại HeroX dùng để chia chiêu; chuỗi `pos` tự do của LingoBrain được chuẩn hoá về các nhóm này. */
export const PART_OF_SPEECH_GROUPS = ['verb', 'noun', 'adj', 'adv', 'prep', 'other'] as const;
export type PartOfSpeechGroup = (typeof PART_OF_SPEECH_GROUPS)[number];

/** Từ hay quên nhất (theo số lần quên ở LingoBrain), dùng làm mục tiêu luyện trong trận. */
export interface WeakWord {
  readonly id: string;
  readonly word: string;
  readonly lapses: number;
}

/** Chỉ số học từ tính từ tiến độ LingoBrain; cùng định nghĩa với tab Tiến bộ của LingoBrain. */
export interface LearningStats {
  /** Từ trong bộ đã học (state khác 'new'). */
  readonly learned: number;
  /** Từ đã học có khoảng cách ôn từ 21 ngày trở lên. */
  readonly mastered: number;
  readonly byPos: Readonly<Record<PartOfSpeechGroup, number>>;
  readonly streakDays: number;
  /** Tỉ lệ nhớ trong 30 ngày (0..1); `null` khi chưa có lượt ôn nào. */
  readonly retention30: number | null;
  readonly weakWords: readonly WeakWord[];
}

export const HERO_GENDERS = ['male', 'female'] as const;
export type HeroGender = (typeof HERO_GENDERS)[number];

export const HERO_NAME_MIN_LENGTH = 1;
export const HERO_NAME_MAX_LENGTH = 20;

/** Trạng thái nhân vật lưu ở schema `herox`; `null` trong `MeResponse` khi người chơi chưa tạo nhân vật. */
export interface HeroState {
  readonly name: string;
  readonly gender: HeroGender;
  readonly levelSeen: number;
  readonly gold: number;
  readonly crystals: number;
  readonly outfit: string;
  readonly rowVersion: number;
}

export interface MeResponse {
  readonly user: { readonly id: number; readonly username: string };
  readonly learning: LearningStats;
  readonly hero: HeroState | null;
}

/** Body của `PUT /herox/api/hero`: chỉ dùng lần đầu tạo nhân vật. */
export interface CreateHeroRequest {
  readonly name: string;
  readonly gender: HeroGender;
}

/** Body lỗi chung của API HeroX. */
export interface ApiErrorBody {
  readonly error: string;
}

// Ký tự điều khiển, ký tự định dạng vô hình (zero-width, đổi chiều chữ) làm tên hiển thị sai hoặc giả mạo;
// U+FFFD là dấu hiệu client gửi sai mã hoá UTF-8.
const HIDDEN_CHARACTER_PATTERN = /[\p{Cc}\p{Cf}\uFFFD]/u;

/**
 * Chuẩn hoá tên nhân vật (NFC, gộp khoảng trắng); trả `null` nếu sai độ dài hoặc chứa ký tự ẩn.
 * Độ dài đếm theo ký tự Unicode để tên tiếng Việt có dấu không bị tính gấp đôi.
 */
export function normalizeHeroName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const name = raw.normalize('NFC').replace(/\s+/g, ' ').trim();
  const length = [...name].length;
  if (length < HERO_NAME_MIN_LENGTH || length > HERO_NAME_MAX_LENGTH) return null;
  return HIDDEN_CHARACTER_PATTERN.test(name) ? null : name;
}

export function isHeroGender(value: unknown): value is HeroGender {
  return typeof value === 'string' && (HERO_GENDERS as readonly string[]).includes(value);
}
