import type { WordChain } from '../data/word-chains.js';
import { normalizeAnswer } from './answer-matching.js';
import type { BattleWord } from './battle-types.js';
import { nextChainWord, type ComboState } from './combo-chain.js';
import type { SeededRandom } from './seeded-random.js';

/** Dưới số từ đã học này, người chơi vào trận hướng dẫn với bộ từ cố định của chương 1. */
export const MIN_LEARNED_WORDS_FOR_BATTLE = 8;
/** Bộ từ trận hướng dẫn (id trong bộ từ LingoBrain), đủ 4 loại chiêu. */
export const TUTORIAL_WORD_IDS: readonly string[] = [
  'strike',
  'protect',
  'fire',
  'guard',
  'strong',
  'brave',
  'quickly',
  'away',
];
/** Số từ tối đa mang vào một trận (giữ setup nhỏ khi người chơi đã học hàng nghìn từ). */
export const BATTLE_POOL_SIZE = 40;
/** Không ra lại một từ trong số đề gần nhất này. */
export const RECENT_PROMPT_MEMORY = 3;

const MAX_WEAK_WORDS_IN_POOL = 12;
const MAX_CHAINS_IN_POOL = 6;
// Từ yếu và từ vừa sai trong trận ra đề nhiều gấp 3 để người chơi ôn đúng chỗ hổng.
const WEAK_WORD_WEIGHT = 3;
const NORMAL_WORD_WEIGHT = 1;
// Thỉnh thoảng mở đầu một chuỗi cụm, hoặc giữ cùng từ loại, để combo đạt được mà không lộ quy luật.
const CHAIN_START_CHANCE = 0.3;
const SAME_POS_FOLLOW_CHANCE = 0.4;

function wordKey(word: BattleWord): string {
  return normalizeAnswer(word.word);
}

/** Các chuỗi mà mọi từ đều có trong bộ từ của trận. */
export function availableChains(words: readonly BattleWord[], chains: readonly WordChain[]): WordChain[] {
  const known = new Set(words.map(wordKey));
  return chains.filter((chain) => chain.words.every((word) => known.has(word)));
}

/**
 * Chọn tối đa `limit` từ cho trận: từ trong vòng từ, rồi từ yếu (theo thứ tự ưu tiên của `candidates`),
 * rồi trọn bộ từ của vài chuỗi cụm (để có combo kết liễu), cuối cùng bù ngẫu nhiên.
 */
export function selectBattleWords(
  candidates: readonly BattleWord[],
  loadout: readonly string[],
  chains: readonly WordChain[],
  rng: SeededRandom,
  limit: number = BATTLE_POOL_SIZE,
): BattleWord[] {
  const byId = new Map(candidates.map((word) => [word.id, word]));
  const byKey = new Map(candidates.map((word) => [wordKey(word), word]));
  const selected = new Map<string, BattleWord>();
  const add = (word: BattleWord | undefined): void => {
    if (word && selected.size < limit) selected.set(word.id, word);
  };

  for (const id of loadout) add(byId.get(id));
  candidates.filter((word) => word.weak).slice(0, MAX_WEAK_WORDS_IN_POOL).forEach(add);
  const chainCandidates = rng.shuffle(availableChains(candidates, chains)).slice(0, MAX_CHAINS_IN_POOL);
  for (const chain of chainCandidates) {
    const missing = chain.words.filter((word) => !selected.has(byKey.get(word)?.id ?? ''));
    if (selected.size + missing.length <= limit) missing.forEach((word) => add(byKey.get(word)));
  }
  rng.shuffle(candidates.filter((word) => !selected.has(word.id))).forEach(add);
  return [...selected.values()];
}

export interface PromptContext {
  readonly words: readonly BattleWord[];
  readonly recentWordIds: readonly string[];
  /** Từ vừa sai trong trận, ra lại nhiều hơn. */
  readonly retryWordIds: readonly string[];
  readonly combo: ComboState;
  readonly chains: readonly WordChain[];
}

function excludeRecent(context: PromptContext): readonly BattleWord[] {
  const recent = new Set(context.recentWordIds);
  const fresh = context.words.filter((word) => !recent.has(word.id));
  if (fresh.length > 0) return fresh;
  // Bộ từ quá nhỏ: chỉ tránh lặp đúng đề vừa ra.
  const lastId = context.recentWordIds.at(-1);
  const notLast = context.words.filter((word) => word.id !== lastId);
  return notLast.length > 0 ? notLast : context.words;
}

function pickWeighted(words: readonly BattleWord[], retry: ReadonlySet<string>, rng: SeededRandom): BattleWord {
  const weightOf = (word: BattleWord): number =>
    word.weak || retry.has(word.id) ? WEAK_WORD_WEIGHT : NORMAL_WORD_WEIGHT;
  const total = words.reduce((sum, word) => sum + weightOf(word), 0);
  let roll = rng.next() * total;
  for (const word of words) {
    roll -= weightOf(word);
    if (roll < 0) return word;
  }
  return words[words.length - 1] as BattleWord;
}

/** Chọn từ ra đề tiếp theo: nối chuỗi đang dở, đôi khi mở chuỗi mới hoặc giữ cùng từ loại, còn lại bốc có trọng số. */
export function pickPromptWord(context: PromptContext, rng: SeededRandom): BattleWord {
  if (context.words.length === 0) throw new Error('Bộ từ của trận rỗng');
  const candidates = excludeRecent(context);

  const continuation = nextChainWord(context.combo, context.chains);
  const chainNext = continuation === null ? undefined : candidates.find((word) => wordKey(word) === continuation);
  if (chainNext) return chainNext;

  if (rng.chance(CHAIN_START_CHANCE)) {
    const heads = new Set(context.chains.map((chain) => chain.words[0]));
    const head = rng.pick(candidates.filter((word) => heads.has(wordKey(word))));
    if (head) return head;
  }

  const lastPos = context.combo.links.at(-1)?.pos;
  let pool = candidates;
  if (lastPos !== undefined && rng.chance(SAME_POS_FOLLOW_CHANCE)) {
    const samePos = candidates.filter((word) => word.pos === lastPos);
    if (samePos.length > 0) pool = samePos;
  }
  return pickWeighted(pool, new Set(context.retryWordIds), rng);
}
