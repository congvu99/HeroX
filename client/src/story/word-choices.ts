import { STORY_CHAPTERS } from '@herox/shared';

/** Số lựa chọn chạm cho thử thách chữ thánh trên màn cảm ứng (1 đúng, còn lại là từ nhiễu). */
export const WORD_CHOICE_COUNT = 3;

/** Từ nhiễu lấy từ chính các từ truyện đã dạy, để người chơi phải nhớ nghĩa chứ không đoán bằng độ lạ của chữ. */
export function storyTaughtWords(): string[] {
  const words = new Set<string>();
  for (const chapter of STORY_CHAPTERS) {
    for (const line of chapter.dialogs.flatMap((dialog) => dialog.variants.flatMap((variant) => variant.lines))) {
      if (line.teach !== undefined) words.add(line.teach.word.toLowerCase());
    }
    for (const beat of chapter.beats) {
      if (beat.completion.kind === 'word') words.add(beat.completion.word.toLowerCase());
    }
  }
  return [...words].sort();
}

/**
 * Các lựa chọn cho thử thách chữ: đáp án và `count - 1` từ nhiễu khác đáp án, thứ tự tất định
 * (cùng đáp án luôn ra cùng thứ tự) để test được và không nhảy khi vẽ lại.
 */
export function buildWordChoices(answer: string, pool: readonly string[], count = WORD_CHOICE_COUNT): string[] {
  const normalized = answer.toLowerCase();
  const decoys = [...new Set(pool.map((word) => word.toLowerCase()))].filter((word) => word !== normalized).sort();
  const picked = decoys.slice(0, Math.max(0, count - 1));
  // Chèn đáp án ở vị trí phụ thuộc độ dài từ: không luôn đứng đầu.
  const slot = normalized.length % (picked.length + 1);
  return [...picked.slice(0, slot), normalized, ...picked.slice(slot)];
}
