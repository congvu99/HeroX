import type { BattleWord } from './battle-types.js';
import type { SeededRandom } from './seeded-random.js';

/** Số ô của vòng từ. */
export const RING_SIZE = 6;
/** Số ô lấy từ các từ người chơi gắn sẵn; phần còn lại là đáp án và từ nhiễu. */
export const RING_LOADOUT_SLOTS = 4;

/**
 * Các lựa chọn của vòng từ (id từ, đã xáo): tối đa 4 từ trong vòng gắn sẵn, đáp án đúng (nếu chưa có),
 * rồi từ nhiễu ưu tiên cùng từ loại với đáp án để không đoán được bằng loại chiêu.
 */
export function buildRingOptions(
  answer: BattleWord,
  words: readonly BattleWord[],
  loadout: readonly string[],
  rng: SeededRandom,
): string[] {
  const known = new Set(words.map((word) => word.id));
  const loadoutIds = [...new Set(loadout)]
    .filter((id) => known.has(id) && id !== answer.id)
    .slice(0, RING_LOADOUT_SLOTS);
  const options = [...loadoutIds, answer.id];
  const taken = new Set(options);
  const others = words.filter((word) => !taken.has(word.id));
  const samePos = rng.shuffle(others.filter((word) => word.pos === answer.pos));
  const otherPos = rng.shuffle(others.filter((word) => word.pos !== answer.pos));
  for (const word of [...samePos, ...otherPos]) {
    if (options.length >= RING_SIZE) break;
    options.push(word.id);
  }
  return rng.shuffle(options);
}
