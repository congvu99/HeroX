import {
  BASE_FORGE_LEVEL,
  BASE_SKILL_TIERS,
  DEFAULT_OUTFIT_ID,
  PART_OF_SPEECH_GROUPS,
  type CitadelLearningStats,
  type CitadelWord,
  type PartOfSpeechGroup,
} from '@herox/shared';
import { DEV_BATTLE_WORDS } from '../battle/dev-battle-fixture';
import type { DevCitadelSeed } from './citadel-gateway';

/**
 * Số liệu học thử: đủ để thấy thành trì "đang dựng lại", nâng lò rèn cấp 2-3 và mở vài ngoại trang;
 * vàng, pha lê dư để bấm thử mọi nút mà không cần chơi trận.
 */
const DEV_LEARNED = 160;
const DEV_MASTERED = 40;
const DEV_STREAK_DAYS = 3;
const DEV_RETENTION_30 = 0.85;
const DEV_GOLD = 2_000;
const DEV_CRYSTALS = 30;

function countByPos(words: readonly CitadelWord[]): Readonly<Record<PartOfSpeechGroup, number>> {
  const counts = Object.fromEntries(PART_OF_SPEECH_GROUPS.map((pos) => [pos, 0])) as Record<PartOfSpeechGroup, number>;
  for (const word of words) counts[word.pos] += 1;
  return counts;
}

/** Trạng thái thành trì cho dev chạy không có phiên LingoBrain; dùng lại bộ từ của trận thử. */
export function devCitadelSeed(): DevCitadelSeed {
  const words: CitadelWord[] = DEV_BATTLE_WORDS.map(({ id, word, meaning, emoji, pos, mastered }) => ({ id, word, meaning, emoji, ipa: '', pos, mastered }));
  const stats: CitadelLearningStats = {
    learned: DEV_LEARNED,
    mastered: DEV_MASTERED,
    streakDays: DEV_STREAK_DAYS,
    retention30: DEV_RETENTION_30,
    byPos: countByPos(words),
  };
  return {
    words,
    stats,
    state: {
      rowVersion: 1,
      gold: DEV_GOLD,
      crystals: DEV_CRYSTALS,
      outfit: DEFAULT_OUTFIT_ID,
      forgeLevel: BASE_FORGE_LEVEL,
      skillTiers: BASE_SKILL_TIERS,
      inventory: [],
      loadout: [],
      lastCrystalClaimDay: null,
    },
  };
}
