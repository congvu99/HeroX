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
  WORD_TIERS,
  type BattleSetup,
  type BattleWord,
  type CitadelState,
  type Encounter,
  type WordMix,
  type WordTier,
} from '@herox/shared';
import type { WordExposure } from './battle-repository.js';
import { classifyWordTier } from './word-tier-classifier.js';
import { API_ERROR_CODES, HttpError } from '../http/http-error.js';
import type { DeckWord, LearnedWordProgress } from '../learning/learning-stats.js';
import { normalizePartOfSpeech } from '../learning/part-of-speech.js';

/** Số lần trả lời đúng liên tiếp trong HeroX đủ để một từ hết bị coi là "hay sai". */
export const WEAK_CLEAR_STREAK = 2;
/** Từ gặp trong khoảng này (12 giờ) coi là "vừa gặp": xếp sau để giãn lịch ra đề. */
export const EXPOSURE_COOLDOWN_MS = 12 * 60 * 60_000;
/** Từ có lượt chấm đầu ở LingoBrain trong khoảng này (3 ngày) coi là "vừa học": vào trận trước, ra đề nhiều hơn. */
export const FRESH_STUDY_WINDOW_MS = 3 * 24 * 60 * 60_000;
/** Từ chưa gặp trong HeroX quá khoảng này (7 ngày), hoặc chưa gặp lần nào, coi là "lâu chưa gặp". */
export const STALE_EXPOSURE_MS = 7 * 24 * 60 * 60_000;

export interface BattlePreparationInput {
  readonly encounter: Encounter;
  readonly learnedWords: readonly LearnedWordProgress[];
  readonly deckWords: readonly DeckWord[];
  /** Số lần gõ sai trong HeroX theo id từ (`herox.word_misses`). */
  readonly wordMisses: ReadonlyMap<string, number>;
  /** Lịch sử gặp từ trong HeroX theo id từ (`herox.word_exposures`). */
  readonly exposures: ReadonlyMap<string, WordExposure>;
  /** Vòng từ, bậc chiêu và trang bị đang mặc ở thành trì. */
  readonly citadel: Pick<CitadelState, 'loadout' | 'skillTiers' | 'inventory'>;
  readonly seed: number;
  /** Mốc "bây giờ" (ms) để xếp nhóm "đến hạn" và tính thời gian nghỉ của từ vừa gặp. */
  readonly now: number;
}

export interface PreparedBattle {
  readonly setup: BattleSetup;
  readonly tutorial: boolean;
}

/** Một ứng viên đã xếp nhóm, kèm các khoá dùng để sắp thứ tự ưu tiên trong nhóm. */
interface TierCandidate {
  readonly word: BattleWord;
  readonly tier: WordTier;
  /** Đã gặp gần đây (trong EXPOSURE_COOLDOWN_MS): xếp sau. */
  readonly recentlySeen: boolean;
  /** Gặp lần cuối cách đây bao lâu (ms); dùng để xếp từ lâu chưa gặp lên trước. */
  readonly sinceLastSeenMs: number;
  /**
   * Mức ưu tiên ôn trong nhóm (lớn hơn = lên trước): nhóm khó dùng độ yếu, nhóm đến hạn dùng độ quá hạn,
   * nhóm mới dùng mốc học (học gần nhất trước).
   */
  readonly tierPriority: number;
}

/** Cờ ưu tiên ra đề của một từ; mặc định tắt hết (trận hướng dẫn). */
interface WordFlags {
  readonly mastered: boolean;
  readonly weak: boolean;
  readonly fresh: boolean;
  readonly stale: boolean;
}

const NO_FLAGS: WordFlags = { mastered: false, weak: false, fresh: false, stale: false };

function toBattleWord(word: DeckWord, flags: WordFlags): BattleWord {
  return {
    id: word.id,
    word: word.word,
    meaning: word.meaning,
    emoji: word.emoji,
    pos: normalizePartOfSpeech(word.pos),
    ...flags,
  };
}

function emptyBuckets(): Record<WordTier, BattleWord[]> {
  const buckets = {} as Record<WordTier, BattleWord[]>;
  for (const tier of WORD_TIERS) buckets[tier] = [];
  return buckets;
}

/** Mức ưu tiên ôn trong nhóm: "khó" theo độ yếu, "đến hạn" theo độ quá hạn, "mới" theo mốc học gần nhất, còn lại 0. */
function tierPriorityOf(tier: WordTier, learned: LearnedWordProgress, weakness: number, now: number): number {
  if (tier === 'hard') return weakness;
  if (tier === 'due') return Math.max(0, now - learned.due);
  if (tier === 'new') return learned.firstStudiedAt ?? 0;
  return 0;
}

/** Vừa học ở LingoBrain: lượt chấm đầu nằm trong FRESH_STUDY_WINDOW_MS tính tới `now`. */
function isFreshlyStudied(learned: LearnedWordProgress, now: number): boolean {
  return learned.firstStudiedAt !== null && now - learned.firstStudiedAt <= FRESH_STUDY_WINDOW_MS;
}

/** Xếp mỗi từ đã học vào một nhóm; nguồn `masteredOnly` lọc trước (xem `learnedSource`). */
function classifyCandidates(input: BattlePreparationInput, source: readonly LearnedWordProgress[]): TierCandidate[] {
  return source.map((learned) => {
    const missesInHerox = input.wordMisses.get(learned.word.id) ?? 0;
    const exposure = input.exposures.get(learned.word.id);
    const correctStreak = exposure?.correctStreak ?? 0;
    // Hay sai trong HeroX: có gõ sai và chưa gỡ bằng đủ số lần đúng liên tiếp.
    const missedInHerox = missesInHerox > 0 && correctStreak < WEAK_CLEAR_STREAK;
    const tier = classifyWordTier(learned, missedInHerox, input.now);
    const weakness = learned.lapses + missesInHerox;
    const sinceLastSeenMs = exposure === undefined ? Number.POSITIVE_INFINITY : input.now - exposure.lastSeenAtMs;
    return {
      word: toBattleWord(learned.word, {
        mastered: learned.mastered,
        weak: tier === 'hard',
        fresh: isFreshlyStudied(learned, input.now),
        stale: sinceLastSeenMs > STALE_EXPOSURE_MS,
      }),
      tier,
      recentlySeen: sinceLastSeenMs < EXPOSURE_COOLDOWN_MS,
      sinceLastSeenMs,
      tierPriority: tierPriorityOf(tier, learned, weakness, input.now),
    };
  });
}

/**
 * Xếp thứ tự ưu tiên trong một nhóm (tất định theo seed): từ lâu chưa gặp lên trước,
 * trong đó theo mức ưu tiên ôn của nhóm; từ vừa gặp xuống sau, gặp lâu nhất trước.
 * `rng.shuffle` trộn trước để các từ cùng khoá không luôn ra theo một thứ tự cố định giữa các trận.
 */
function orderWithinTier(candidates: readonly TierCandidate[], rng: SeededRandom): BattleWord[] {
  return rng
    .shuffle(candidates)
    .sort((a, b) => {
      if (a.recentlySeen !== b.recentlySeen) return a.recentlySeen ? 1 : -1;
      if (a.recentlySeen) return b.sinceLastSeenMs - a.sinceLastSeenMs; // vừa gặp: gặp lâu nhất trước
      // Chưa gặp gần đây: ưu tiên ôn cao hơn trước; bằng nhau thì từ lâu chưa gặp (hoặc chưa gặp lần nào) trước.
      if (a.tierPriority !== b.tierPriority) return b.tierPriority - a.tierPriority;
      return compareLongestUnseenFirst(a.sinceLastSeenMs, b.sinceLastSeenMs);
    })
    .map((candidate) => candidate.word);
}

/** So sánh để từ lâu chưa gặp lên trước; `Infinity` (chưa gặp lần nào) đứng đầu, tránh `Infinity - Infinity = NaN`. */
function compareLongestUnseenFirst(a: number, b: number): number {
  if (a === b) return 0;
  return a > b ? -1 : 1;
}

/** Nguồn từ đã học sau khi lọc theo `masteredOnly`; lùi về toàn bộ khi chưa có từ đã thuộc nào. */
function learnedSource(input: BattlePreparationInput): readonly LearnedWordProgress[] {
  if (input.encounter.masteredOnly !== true) return input.learnedWords;
  const mastered = input.learnedWords.filter((learned) => learned.mastered);
  return mastered.length > 0 ? mastered : input.learnedWords;
}

/** Dựng các nhóm từ đã sắp thứ tự cho `selectBattleWords`. */
function buildBuckets(input: BattlePreparationInput, rng: SeededRandom): Record<WordTier, BattleWord[]> {
  const candidates = classifyCandidates(input, learnedSource(input));
  const byTier = emptyBuckets();
  const grouped = new Map<WordTier, TierCandidate[]>(WORD_TIERS.map((tier) => [tier, []]));
  for (const candidate of candidates) grouped.get(candidate.tier)?.push(candidate);
  for (const tier of WORD_TIERS) byTier[tier] = orderWithinTier(grouped.get(tier) ?? [], rng);
  return byTier;
}

function tutorialBuckets(deckWords: readonly DeckWord[]): Record<WordTier, BattleWord[]> {
  const byId = new Map(deckWords.map((word) => [word.id, word]));
  const words = TUTORIAL_WORD_IDS.flatMap((id) => {
    const word = byId.get(id);
    return word === undefined ? [] : [toBattleWord(word, NO_FLAGS)];
  });
  // Bộ từ LingoBrain đổi tới mức mất cả bộ từ hướng dẫn: không dựng được trận, báo tạm thời không phục vụ.
  if (words.length === 0) {
    throw new HttpError(503, 'Bộ từ LingoBrain chưa sẵn sàng, thử lại sau', API_ERROR_CODES.deckNotReady);
  }
  // Trận hướng dẫn: 8 từ cố định dồn vào một nhóm để giữ nguyên bộ từ như trước.
  const buckets = emptyBuckets();
  buckets.new = words;
  return buckets;
}

/**
 * Dựng setup trận từ dữ liệu học của người chơi. Thuần: cùng input + cùng seed → cùng setup.
 * Học chưa đủ 8 từ thì thay bằng trận hướng dẫn với bộ từ cố định của chương 1.
 */
export function prepareBattle(input: BattlePreparationInput): PreparedBattle {
  const tutorial = input.learnedWords.length < MIN_LEARNED_WORDS_FOR_BATTLE;
  const encounter = tutorial ? (findEncounter(TUTORIAL_ENCOUNTER_ID) ?? input.encounter) : input.encounter;
  const seed = input.seed >>> 0;
  const rng = new SeededRandom(seed);
  const buckets = tutorial ? tutorialBuckets(input.deckWords) : buildBuckets(input, rng);
  const mix: WordMix = encounter.wordMix ?? 'field';
  const level = heroLevelForLearned(input.learnedWords.length);
  const { loadout, skillTiers, inventory } = input.citadel;
  const words = selectBattleWords(buckets, mix, loadout);
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
