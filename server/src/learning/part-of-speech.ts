import type { PartOfSpeechGroup } from '@herox/shared';

// `words.pos` của LingoBrain là chuỗi tự do, có thể liệt kê nhiều từ loại ("noun, verb").
// Phân bố đo từ words.json (bộ seed của bảng words): noun, phrase, phrasal verb, adjective, "noun, verb", verb...
const PART_OF_SPEECH_ALIASES: Readonly<Record<string, PartOfSpeechGroup>> = {
  v: 'verb',
  verb: 'verb',
  'phrasal verb': 'verb',
  'modal verb': 'verb',
  'auxiliary verb': 'verb',
  n: 'noun',
  noun: 'noun',
  adj: 'adj',
  adjective: 'adj',
  adv: 'adv',
  adverb: 'adv',
  prep: 'prep',
  preposition: 'prep',
};

/** Chuẩn hoá `pos` về nhóm HeroX; nhiều từ loại thì lấy từ loại đầu tiên (nghĩa chính). */
export function normalizePartOfSpeech(pos: string): PartOfSpeechGroup {
  const primary = pos.split(',')[0]?.trim().toLowerCase().replace(/\.$/, '') ?? '';
  return PART_OF_SPEECH_ALIASES[primary] ?? 'other';
}
