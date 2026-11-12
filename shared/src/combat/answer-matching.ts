/** Kết quả so câu gõ với từ đúng: khớp hẳn, gần đúng (lệch 1 ký tự ở từ dài), hoặc sai. */
export type AnswerMatch = 'exact' | 'near' | 'wrong';

// Cùng luật so khớp mờ của LingoBrain (eng/js/srs-scheduler.js normAnswer, fuzzyMatch), viết lại trong HeroX:
// từ từ 5 ký tự trở lên được lệch 1 ký tự; cụm từ so từng từ một.
const NEAR_MATCH_MIN_LENGTH = 5;
const NEAR_MATCH_MAX_DISTANCE = 1;
// Bàn phím iPhone tự đổi ' thành ’ (smart punctuation): coi như nhau để "don't" không bị chấm sai.
const CURLY_APOSTROPHE_PATTERN = /[‘’]/g;

/** Chữ thường, chỉ giữ a–z, 0–9, dấu nháy và một khoảng trắng giữa các từ. */
export function normalizeAnswer(text: string): string {
  return text
    .replace(CURLY_APOSTROPHE_PATTERN, "'")
    .toLowerCase()
    .replace(/[^a-z0-9' ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Khoảng cách Levenshtein (thêm, xoá, thay một ký tự). */
export function levenshteinDistance(source: string, target: string): number {
  const row = Array.from({ length: target.length + 1 }, (_, column) => column);
  for (let sourceIndex = 1; sourceIndex <= source.length; sourceIndex += 1) {
    let diagonal = row[0] ?? 0;
    row[0] = sourceIndex;
    for (let targetIndex = 1; targetIndex <= target.length; targetIndex += 1) {
      const above = row[targetIndex] ?? 0;
      const substitutionCost = source[sourceIndex - 1] === target[targetIndex - 1] ? 0 : 1;
      row[targetIndex] = Math.min(above + 1, (row[targetIndex - 1] ?? 0) + 1, diagonal + substitutionCost);
      diagonal = above;
    }
  }
  return row[target.length] ?? 0;
}

/** So câu người chơi gõ với từ đúng sau chuẩn hoá. */
export function matchAnswer(answer: string, target: string): AnswerMatch {
  const answerTokens = normalizeAnswer(answer).split(' ').filter(Boolean);
  const targetTokens = normalizeAnswer(target).split(' ').filter(Boolean);
  if (answerTokens.length === 0 || answerTokens.length !== targetTokens.length) return 'wrong';
  let isNear = false;
  for (const [index, targetToken] of targetTokens.entries()) {
    const answerToken = answerTokens[index] ?? '';
    if (answerToken === targetToken) continue;
    const allowsTypo =
      targetToken.length >= NEAR_MATCH_MIN_LENGTH &&
      levenshteinDistance(answerToken, targetToken) <= NEAR_MATCH_MAX_DISTANCE;
    if (!allowsTypo) return 'wrong';
    isNear = true;
  }
  return isNear ? 'near' : 'exact';
}
