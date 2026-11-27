import type { WordChain } from '../data/word-chains.js';
import { normalizeAnswer } from './answer-matching.js';
import type { BattleWord } from './battle-types.js';
import { nextChainWord, type ComboState } from './combo-chain.js';
import type { SeededRandom } from './seeded-random.js';
import { WORD_TIERS, type WordTier } from './word-tier.js';

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
/** Số đề gần nhất tối thiểu không được ra lại (bộ từ nhỏ). */
export const RECENT_PROMPT_MEMORY = 3;
/**
 * Phần trăm bộ từ của trận bị tạm khoá sau khi ra đề: bộ 40 từ thì 24 đề gần nhất không lặp, người chơi gặp
 * đủ từ trước khi một từ quay lại; vẫn chừa 40% để trọng số ưu tiên từ yếu, từ mới có chỗ chọn.
 */
export const RECENT_PROMPT_SHARE_PERCENT = 60;

/** Số đề gần nhất không ra lại, theo cỡ bộ từ của trận (ít nhất `RECENT_PROMPT_MEMORY`). */
export function recentPromptMemory(poolSize: number): number {
  return Math.max(RECENT_PROMPT_MEMORY, Math.floor((poolSize * RECENT_PROMPT_SHARE_PERCENT) / 100));
}

/** Cách trộn bộ từ theo loại trận: hạn ngạch phần trăm mỗi nhóm SRS, cộng lại đúng 100. */
export type WordMix = 'field' | 'boss';

/**
 * Hạn ngạch nhóm cho bộ từ mỗi trận (phần trăm số slot còn lại sau khi đã thêm vòng từ).
 * - field (trận thường): trải đều, nghiêng về từ mới + đến hạn để người chơi mở rộng và ôn kịp lịch.
 * - boss (trận trùm): nặng nhóm "khó" + "đến hạn" vì trùm là bài kiểm tra chỗ hay sai.
 */
export const WORD_MIX_QUOTAS: Record<WordMix, Record<WordTier, number>> = {
  field: { new: 30, due: 25, hard: 25, familiar: 15, mastered: 5 },
  boss: { hard: 40, due: 25, new: 15, familiar: 15, mastered: 5 },
};

/** Thứ tự dồn slot thừa khi một nhóm thiếu từ: ưu tiên ôn (đến hạn, khó) trước mở rộng. */
const SPILL_ORDER: readonly WordTier[] = ['due', 'hard', 'new', 'familiar', 'mastered'];

/** Từ vừa học chiếm tối đa chừng này phần trăm bộ từ (sau vòng từ), để vẫn còn chỗ cho ôn từ khó, đến hạn. */
export const FRESH_POOL_SHARE_PERCENT = 50;

// Trọng số ra đề cộng dồn: từ hay sai/vừa sai và từ vừa học ra nhiều gấp 3, từ lâu chưa gặp gấp 2;
// từ vừa học mà hay sai ra gấp 5. Ôn đúng chỗ hổng và củng cố từ mới trước khi quên.
const BASE_WORD_WEIGHT = 1;
const WEAK_WORD_BONUS = 2;
const FRESH_WORD_BONUS = 2;
const STALE_WORD_BONUS = 1;
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

/** Chia `total` slot theo phần trăm `quotas`, dùng largest-remainder để tổng khớp đúng `total`. */
function allocateQuota(quotas: Record<WordTier, number>, total: number): Record<WordTier, number> {
  const exact = WORD_TIERS.map((tier) => ({ tier, value: (total * (quotas[tier] ?? 0)) / 100 }));
  const allocation = Object.fromEntries(exact.map(({ tier, value }) => [tier, Math.floor(value)])) as Record<WordTier, number>;
  let assigned = WORD_TIERS.reduce((sum, tier) => sum + allocation[tier], 0);
  // Phần dư lớn nhất nhận slot lẻ còn lại, để tổng đúng `total`.
  const byRemainder = [...exact].sort((a, b) => b.value - Math.floor(b.value) - (a.value - Math.floor(a.value)));
  for (const { tier } of byRemainder) {
    if (assigned >= total) break;
    allocation[tier] += 1;
    assigned += 1;
  }
  return allocation;
}

/**
 * Chọn tối đa `limit` từ cho trận theo hạn ngạch nhóm. Thuần, không cần rng (`buckets` đã được sắp thứ tự ưu tiên).
 * Trước hết thêm từ vòng từ (luôn có mặt), rồi từ vừa học (tối đa FRESH_POOL_SHARE_PERCENT), rồi chia số slot còn lại theo `WORD_MIX_QUOTAS[mix]`, lấy từ đầu mỗi nhóm;
 * slot thừa do nhóm thiếu từ dồn theo `SPILL_ORDER`. Từ chuỗi cụm chỉ vào bộ nếu tự nó thuộc một nhóm — không kéo thêm.
 */
export function selectBattleWords(
  buckets: Record<WordTier, readonly BattleWord[]>,
  mix: WordMix,
  loadout: readonly string[],
  limit: number = BATTLE_POOL_SIZE,
): BattleWord[] {
  const byId = new Map(WORD_TIERS.flatMap((tier) => buckets[tier].map((word) => [word.id, word] as const)));
  const selected = new Map<string, BattleWord>();
  const cursors = Object.fromEntries(WORD_TIERS.map((tier) => [tier, 0])) as Record<WordTier, number>;
  const add = (word: BattleWord | undefined): boolean => {
    if (word === undefined || selected.has(word.id) || selected.size >= limit) return false;
    selected.set(word.id, word);
    return true;
  };

  // Vòng từ luôn vào bộ trước (người chơi tự chọn các từ này để lên combo).
  for (const id of loadout) add(byId.get(id));
  addFreshWords(buckets, add, Math.floor(((limit - selected.size) * FRESH_POOL_SHARE_PERCENT) / 100));

  // Lấy từ tiếp theo chưa chọn của một nhóm; `null` khi nhóm đã cạn.
  const takeFrom = (tier: WordTier): BattleWord | null => {
    const bucket = buckets[tier];
    while (cursors[tier] < bucket.length) {
      const word = bucket[cursors[tier]] as BattleWord;
      cursors[tier] += 1;
      if (!selected.has(word.id)) return word;
    }
    return null;
  };

  const remaining = Math.max(0, limit - selected.size);
  const quota = allocateQuota(WORD_MIX_QUOTAS[mix], remaining);
  // Vòng từ có thể đã chiếm chỗ của một nhóm; đếm phần còn thiếu để dồn cho đủ.
  for (const tier of WORD_TIERS) {
    for (let taken = 0; taken < quota[tier]; taken += 1) {
      if (!add(takeFrom(tier) ?? undefined)) break;
    }
  }
  // Slot còn trống (nhóm thiếu từ) dồn theo thứ tự ưu tiên ôn.
  let progressed = true;
  while (selected.size < limit && progressed) {
    progressed = false;
    for (const tier of SPILL_ORDER) {
      if (selected.size >= limit) break;
      if (add(takeFrom(tier) ?? undefined)) progressed = true;
    }
  }
  return [...selected.values()];
}

/** Thêm tối đa `max` từ vừa học, theo thứ tự nhóm rồi thứ tự ưu tiên trong nhóm (đã xếp sẵn ở `buckets`). */
function addFreshWords(
  buckets: Record<WordTier, readonly BattleWord[]>,
  add: (word: BattleWord) => boolean,
  max: number,
): void {
  let added = 0;
  for (const tier of WORD_TIERS) {
    for (const word of buckets[tier]) {
      if (added >= max) return;
      if (word.fresh === true && add(word)) added += 1;
    }
  }
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
    BASE_WORD_WEIGHT +
    (word.weak || retry.has(word.id) ? WEAK_WORD_BONUS : 0) +
    (word.fresh === true ? FRESH_WORD_BONUS : 0) +
    (word.stale === true ? STALE_WORD_BONUS : 0);
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
