import {
  findEncounter,
  heroLevelForLearned,
  heroStatsWithGear,
  MIN_LEARNED_WORDS_FOR_BATTLE,
  scaleEncounterEnemies,
  SeededRandom,
  selectBattleWords,
  TUTORIAL_ENCOUNTER_ID,
  TUTORIAL_WORD_IDS,
  WORD_CHAINS,
  type BattleSetup,
  type BattleWord,
  type CitadelState,
  type Encounter,
} from '@herox/shared';
import { API_ERROR_CODES, HttpError } from '../http/http-error.js';
import type { DeckWord, LearnedWordProgress } from '../learning/learning-stats.js';
import { normalizePartOfSpeech } from '../learning/part-of-speech.js';

export interface BattlePreparationInput {
  readonly encounter: Encounter;
  readonly learnedWords: readonly LearnedWordProgress[];
  readonly deckWords: readonly DeckWord[];
  /** Số lần gõ sai trong HeroX theo id từ (`herox.word_misses`). */
  readonly wordMisses: ReadonlyMap<string, number>;
  /** Vòng từ, bậc chiêu và trang bị đang mặc ở thành trì. */
  readonly citadel: Pick<CitadelState, 'loadout' | 'skillTiers' | 'inventory'>;
  readonly seed: number;
}

export interface PreparedBattle {
  readonly setup: BattleSetup;
  readonly tutorial: boolean;
}

function toBattleWord(word: DeckWord, mastered: boolean, weak: boolean): BattleWord {
  return {
    id: word.id,
    word: word.word,
    meaning: word.meaning,
    emoji: word.emoji,
    pos: normalizePartOfSpeech(word.pos),
    mastered,
    weak,
  };
}

/**
 * Từ đã học, từ yếu đứng trước (hay quên ở LingoBrain + hay sai trong HeroX nhiều nhất trước).
 * Trận `masteredOnly` (trận cuối chương 5) chỉ lấy từ đã thuộc; nếu người chơi chưa có từ đã thuộc
 * nào thì lùi về toàn bộ từ đã học để vẫn dựng được trận (gate mastered ≥ 200 thường đã chặn trước đó).
 */
function learnedCandidates(input: BattlePreparationInput, masteredOnly: boolean): BattleWord[] {
  const source = masteredOnly ? input.learnedWords.filter((learned) => learned.mastered) : input.learnedWords;
  const pool = masteredOnly && source.length === 0 ? input.learnedWords : source;
  const scored = pool.map((learned) => {
    const weakness = learned.lapses + (input.wordMisses.get(learned.word.id) ?? 0);
    return { weakness, word: toBattleWord(learned.word, learned.mastered, weakness > 0) };
  });
  // sort ổn định: cùng mức yếu thì giữ thứ tự bộ từ.
  return scored.sort((a, b) => b.weakness - a.weakness).map(({ word }) => word);
}

function tutorialCandidates(deckWords: readonly DeckWord[]): BattleWord[] {
  const byId = new Map(deckWords.map((word) => [word.id, word]));
  const words = TUTORIAL_WORD_IDS.flatMap((id) => {
    const word = byId.get(id);
    return word === undefined ? [] : [toBattleWord(word, false, false)];
  });
  // Bộ từ LingoBrain đổi tới mức mất cả bộ từ hướng dẫn: không dựng được trận, báo tạm thời không phục vụ.
  if (words.length === 0) {
    throw new HttpError(503, 'Bộ từ LingoBrain chưa sẵn sàng, thử lại sau', API_ERROR_CODES.deckNotReady);
  }
  return words;
}

/**
 * Dựng setup trận từ dữ liệu học của người chơi. Thuần: cùng input + cùng seed → cùng setup.
 * Học chưa đủ 8 từ thì thay bằng trận hướng dẫn với bộ từ cố định của chương 1.
 */
export function prepareBattle(input: BattlePreparationInput): PreparedBattle {
  const tutorial = input.learnedWords.length < MIN_LEARNED_WORDS_FOR_BATTLE;
  const encounter = tutorial ? (findEncounter(TUTORIAL_ENCOUNTER_ID) ?? input.encounter) : input.encounter;
  const candidates = tutorial ? tutorialCandidates(input.deckWords) : learnedCandidates(input, input.encounter.masteredOnly ?? false);
  const level = heroLevelForLearned(input.learnedWords.length);
  const seed = input.seed >>> 0;
  const { loadout, skillTiers, inventory } = input.citadel;
  const words = selectBattleWords(candidates, loadout, WORD_CHAINS, new SeededRandom(seed));
  const poolIds = new Set(words.map((word) => word.id));
  return {
    tutorial,
    setup: {
      seed,
      encounterId: encounter.id,
      words,
      loadout: loadout.filter((id) => poolIds.has(id)),
      hero: heroStatsWithGear(input.learnedWords.length, inventory),
      skillTiers,
      enemies: scaleEncounterEnemies(encounter, level),
      promptTimeMs: encounter.promptTimeMs,
      allowElite: encounter.allowElite,
    },
  };
}
