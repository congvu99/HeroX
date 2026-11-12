import type { PartOfSpeechGroup } from '../me-contract.js';

/**
 * Loại chiêu theo từ loại:
 * động từ → tấn công; danh từ → khiên (triệu hồi vật chắn); tính từ → làm yếu quái;
 * trạng từ, giới từ → né (kỹ năng di chuyển). Từ loại khác coi như tấn công.
 */
export const SKILL_KINDS = ['attack', 'guard', 'empower', 'evade'] as const;
export type SkillKind = (typeof SKILL_KINDS)[number];

const SKILL_KIND_BY_PART_OF_SPEECH: Readonly<Record<PartOfSpeechGroup, SkillKind>> = {
  verb: 'attack',
  noun: 'guard',
  adj: 'empower',
  adv: 'evade',
  prep: 'evade',
  other: 'attack',
};

export function skillKindForPartOfSpeech(pos: PartOfSpeechGroup): SkillKind {
  return SKILL_KIND_BY_PART_OF_SPEECH[pos];
}
