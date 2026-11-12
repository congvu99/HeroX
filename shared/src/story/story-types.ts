/** Cách hoàn thành một mốc truyện; server kiểm điều kiện theo loại này. */
export type BeatCompletion =
  /** Nghe hết một đoạn hội thoại. */
  | { readonly kind: 'dialog' }
  /** Thắng trận `encounterId` (server tra `herox.encounter_victories`). */
  | { readonly kind: 'battle'; readonly encounterId: string }
  /** Nhặt vật phẩm ở rương có `itemId` trên map. */
  | { readonly kind: 'collect'; readonly itemId: string }
  /** Gõ lại chữ thánh bị quỷ xoá; server so đáp án đã chuẩn hoá. */
  | { readonly kind: 'word'; readonly word: string; readonly meaning: string; readonly emoji: string };

export interface StoryBeat {
  readonly id: string;
  readonly chapter: number;
  /** Việc cần làm, hiện ở bảng nhiệm vụ. */
  readonly objective: string;
  /** Mốc phải xong trước; server từ chối nếu thiếu. */
  readonly requires: readonly string[];
  readonly completion: BeatCompletion;
  /** Hội thoại tự mở khi đủ điều kiện mà mốc chưa xong (mở đầu, kết chương). */
  readonly autoDialogId?: string;
}

/** Nhóm mốc hiện thành một dòng nhiệm vụ. */
export interface StoryQuest {
  readonly id: string;
  readonly title: string;
  /** Theo thứ tự làm; dòng nhiệm vụ hiện mục tiêu của mốc đầu tiên chưa xong. */
  readonly beats: readonly string[];
}

export type SpeakerId = 'narrator' | 'hero' | 'keeper' | 'villager' | 'smith' | 'scarecrow';

/** Từ tiếng Anh được dạy trong câu thoại: hiện kèm nghĩa để người chơi để ý. */
export interface TaughtWord {
  readonly word: string;
  readonly meaning: string;
}

export interface DialogLine {
  readonly speaker: SpeakerId;
  readonly text: string;
  readonly teach?: TaughtWord;
}

/** Một phiên bản hội thoại; chọn phiên bản đầu tiên khớp trạng thái truyện. */
export interface DialogVariant {
  /** Mọi mốc này đã xong. */
  readonly requires?: readonly string[];
  /** Mốc này chưa xong. */
  readonly unless?: string;
  readonly lines: readonly DialogLine[];
  /** Xong hội thoại thì ghi mốc này (mốc loại `dialog` hoặc `word`: thử thách gõ chữ hiện sau câu cuối). */
  readonly completesBeat?: string;
  /** Xong hội thoại thì vào trận này (trận trùm, trận cứu thợ rèn). */
  readonly startsEncounter?: string;
}

export interface DialogScript {
  readonly id: string;
  readonly variants: readonly DialogVariant[];
}

/** Trận đặt trên map: điều kiện mở và câu báo khi chưa đủ điều kiện. */
export interface EncounterGate {
  readonly encounterId: string;
  readonly requires: readonly string[];
  readonly lockedMessage: string;
}

/** Cổng sang level khác bị khoá theo truyện hoặc theo mốc mở chương. */
export interface LevelGate {
  readonly levelId: string;
  readonly requires: readonly string[];
  /** Chương của vùng; cần đủ số từ theo `CHAPTER_UNLOCKS`. */
  readonly chapter?: number;
  readonly lockedMessage: string;
}

/** Toàn bộ nội dung truyện một chương; chỉ là dữ liệu, sửa thoại không cần đụng code. */
export interface StoryChapter {
  readonly chapter: number;
  readonly title: string;
  readonly beats: readonly StoryBeat[];
  readonly quests: readonly StoryQuest[];
  readonly dialogs: readonly DialogScript[];
  readonly encounterGates: readonly EncounterGate[];
  readonly levelGates: readonly LevelGate[];
  /** Mốc mở công trình ở Lexhold (vd cứu thợ rèn mở lò rèn). */
  readonly buildingUnlocks: Readonly<Record<string, string>>;
  /** Mốc kết chương. */
  readonly finalBeat: string;
}
