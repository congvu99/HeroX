import {
  BASE_SKILL_TIERS,
  findEncounter,
  FIELD_ENCOUNTER_ID,
  heroStatsForLevel,
  scaleEncounterEnemies,
  type BattleSetup,
  type BattleWord,
  type PartOfSpeechGroup,
} from '@herox/shared';

/** Cấp hiệp sĩ của trận thử. */
const DEV_HERO_LEVEL = 3;
const DEV_SEED = 20_261_112;

function fixtureWord(word: string, pos: PartOfSpeechGroup, meaning: string, emoji: string, extra: Partial<BattleWord> = {}): BattleWord {
  return { id: `dev-${word}`, word, meaning, emoji, pos, mastered: false, weak: false, ...extra };
}

/**
 * 20 từ thử cho trận chạy không cần server (chỉ ở dev): đủ 4 loại chiêu, có trọn hai chuỗi cụm
 * ("run away quickly", "fight back hard"), vài từ đã thuộc và từ yếu để thấy hiệu ứng bậc cao và quái tinh anh.
 */
export const DEV_BATTLE_WORDS: readonly BattleWord[] = [
  fixtureWord('run', 'verb', 'chạy', '🏃'),
  fixtureWord('away', 'adv', 'đi xa, rời khỏi', '👋'),
  fixtureWord('quickly', 'adv', 'một cách nhanh chóng', '⚡'),
  fixtureWord('fight', 'verb', 'chiến đấu', '⚔️'),
  fixtureWord('back', 'adv', 'lại, trở lại', '↩️'),
  fixtureWord('hard', 'adv', 'mạnh, dữ dội', '💥'),
  fixtureWord('strike', 'verb', 'đánh, tấn công', '🗡️', { mastered: true }),
  fixtureWord('protect', 'verb', 'bảo vệ', '🛡️'),
  fixtureWord('burn', 'verb', 'đốt cháy', '🔥', { weak: true }),
  fixtureWord('castle', 'noun', 'lâu đài', '🏰'),
  fixtureWord('gate', 'noun', 'cổng', '🚪'),
  fixtureWord('shield', 'noun', 'cái khiên', '🛡️', { mastered: true }),
  fixtureWord('stone', 'noun', 'hòn đá', '🪨'),
  fixtureWord('strong', 'adj', 'mạnh mẽ', '💪'),
  fixtureWord('brave', 'adj', 'dũng cảm', '🦁', { mastered: true }),
  fixtureWord('dark', 'adj', 'tối tăm', '🌑', { weak: true }),
  fixtureWord('bright', 'adj', 'sáng chói', '🌟'),
  fixtureWord('over', 'prep', 'bên trên, vượt qua', '🌉'),
  fixtureWord('behind', 'prep', 'phía sau', '🔙'),
  fixtureWord('slowly', 'adv', 'một cách chậm rãi', '🐢', { mastered: true }),
];

/** Setup trận thử theo trận `encounterId` (mặc định trận ngoài đồng chương 1); dùng khi dev chạy không có phiên LingoBrain. */
export function devBattleSetup(encounterId: string = FIELD_ENCOUNTER_ID): BattleSetup {
  const encounter = findEncounter(encounterId);
  if (encounter === undefined) throw new Error(`Thiếu trận ${encounterId}`);
  return {
    seed: DEV_SEED,
    encounterId: encounter.id,
    words: DEV_BATTLE_WORDS,
    loadout: ['dev-strike', 'dev-shield', 'dev-brave', 'dev-quickly'],
    hero: heroStatsForLevel(DEV_HERO_LEVEL),
    skillTiers: BASE_SKILL_TIERS,
    enemies: scaleEncounterEnemies(encounter, DEV_HERO_LEVEL),
    promptTimeMs: encounter.promptTimeMs,
    allowElite: encounter.allowElite,
  };
}
