import type { WordTier } from '@herox/shared';
import { MASTERED_INTERVAL_DAYS, type LearnedWordProgress } from '../learning/learning-stats.js';

/**
 * Ngưỡng hệ số dễ (ef) xếp nhóm "khó". ef bắt đầu 2.5, quên −0.2, "khó" −0.14, "dễ" +0.1
 * (eng/js/srs-scheduler.js applyGrade). < 2.2 ≈ đã quên 2 lần, hoặc quên 1 + "khó" 1 mà chưa gỡ bằng "dễ".
 */
export const HARD_EASE_THRESHOLD = 2.2;
/** Lượt chấm cuối ≤ 1 (quên hoặc "khó") thì coi là hay sai. */
const HARD_LAST_GRADE = 1;
/** Ôn thành công đến mức này trở xuống vẫn còn là từ mới (eng/js/srs-scheduler.js: 2 lượt đầu là learning). */
const NEW_WORD_MAX_REPS = 2;
const NEW_STATES: ReadonlySet<string> = new Set(['learning', 'relearn']);

/**
 * Xếp một từ đã học vào đúng một nhóm SRS. Xét lần lượt, gặp điều kiện đầu tiên thì dừng.
 * `missedInHerox` do caller tính (hay sai trong HeroX và chưa gỡ), `now` là mốc "bây giờ" (ms).
 */
export function classifyWordTier(progress: LearnedWordProgress, missedInHerox: boolean, now: number): WordTier {
  // Hay sai xếp trước mọi nhóm khác: ef thấp, lượt chấm cuối kém, hoặc vừa gõ sai trong HeroX.
  if (progress.ef < HARD_EASE_THRESHOLD || (progress.lastGrade !== null && progress.lastGrade <= HARD_LAST_GRADE) || missedInHerox) {
    return 'hard';
  }
  // Còn non: đang trong pha học lại, hoặc chưa ôn thành công đủ số lượt.
  if (NEW_STATES.has(progress.state) || progress.reps <= NEW_WORD_MAX_REPS) {
    return 'new';
  }
  // Đến hạn ôn lại.
  if (progress.due <= now) {
    return 'due';
  }
  // Đã thuộc: khoảng cách ôn ≥ 21 ngày.
  if (progress.ivl >= MASTERED_INTERVAL_DAYS) {
    return 'mastered';
  }
  return 'familiar';
}
