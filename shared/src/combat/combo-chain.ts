import type { PartOfSpeechGroup } from '../me-contract.js';
import type { WordChain } from '../data/word-chains.js';

/** Hai chiêu đúng cách nhau dưới 4 giây thì nối combo; tới đúng 4 giây là đứt. */
export const COMBO_WINDOW_MS = 4_000;
/** Số chiêu cùng từ loại liên tiếp để được thưởng combo cùng loại. */
export const SAME_POS_COMBO_LENGTH = 3;
export const SAME_POS_COMBO_MULTIPLIER = 1.3;
export const CHAIN_COMBO_MULTIPLIER = 1.6;
/** Combo chỉ hiện ra (sự kiện comboUp/comboBreak) từ chiêu thứ 2. */
export const MIN_VISIBLE_COMBO = 2;

export type ComboBonus = 'none' | 'same-pos' | 'chain';

/** Một chiêu trong combo: từ (đã chuẩn hoá, viết thường) và từ loại. */
export interface ComboLink {
  readonly word: string;
  readonly pos: PartOfSpeechGroup;
}

export interface ComboState {
  /** Số chiêu đúng liên tiếp trong cửa sổ. */
  readonly count: number;
  /** Các chiêu gần nhất dùng để dò chuỗi; xoá sau đòn kết liễu để chuỗi mới bắt đầu lại. */
  readonly links: readonly ComboLink[];
  readonly lastCastAtMs: number | null;
}

export interface ComboResult {
  readonly combo: ComboState;
  readonly count: number;
  readonly bonus: ComboBonus;
  readonly multiplier: number;
  /** Id chuỗi vừa hoàn thành (đòn kết liễu), `null` nếu không có. */
  readonly chainId: string | null;
}

export const EMPTY_COMBO: ComboState = { count: 0, links: [], lastCastAtMs: null };

/** Mốc combo hết hạn; `null` khi chưa có combo. `windowMs`: cửa sổ nối combo hiện tại (tăng tốc kéo dài thêm). */
export function comboExpiresAtMs(combo: ComboState, windowMs: number = COMBO_WINDOW_MS): number | null {
  return combo.lastCastAtMs === null || combo.count === 0 ? null : combo.lastCastAtMs + windowMs;
}

function endsWith(links: readonly ComboLink[], words: readonly string[]): boolean {
  if (words.length === 0 || links.length < words.length) return false;
  const offset = links.length - words.length;
  return words.every((word, index) => links[offset + index]?.word === word);
}

function findCompletedChain(links: readonly ComboLink[], chains: readonly WordChain[]): WordChain | undefined {
  return chains.find((chain) => endsWith(links, chain.words));
}

function hasSamePosRun(links: readonly ComboLink[]): boolean {
  if (links.length < SAME_POS_COMBO_LENGTH) return false;
  const tail = links.slice(-SAME_POS_COMBO_LENGTH);
  return tail.every((link) => link.pos === tail[0]?.pos);
}

function longestChainLength(chains: readonly WordChain[]): number {
  return chains.reduce((longest, chain) => Math.max(longest, chain.words.length), SAME_POS_COMBO_LENGTH);
}

/**
 * Thêm một chiêu đúng vào combo, tính hệ số thưởng. Chuỗi cụm hợp lệ thắng combo cùng loại.
 * Người gọi phải xử lý hết hạn (`comboExpiresAtMs`) trước khi gọi hàm này.
 */
export function extendCombo(
  combo: ComboState,
  link: ComboLink,
  atMs: number,
  chains: readonly WordChain[],
): ComboResult {
  const count = combo.count + 1;
  // Chỉ cần nhớ đủ dài cho chuỗi dài nhất, tránh mảng phình theo combo.
  const links = [...combo.links, link].slice(-longestChainLength(chains));
  const chain = findCompletedChain(links, chains);
  if (chain) {
    return {
      combo: { count, links: [], lastCastAtMs: atMs },
      count,
      bonus: 'chain',
      multiplier: CHAIN_COMBO_MULTIPLIER,
      chainId: chain.id,
    };
  }
  const samePos = hasSamePosRun(links);
  return {
    combo: { count, links, lastCastAtMs: atMs },
    count,
    bonus: samePos ? 'same-pos' : 'none',
    multiplier: samePos ? SAME_POS_COMBO_MULTIPLIER : 1,
    chainId: null,
  };
}

/** Từ kế tiếp để nối một chuỗi đang dở (ưu tiên đoạn đầu chuỗi dài nhất đã khớp); `null` nếu không có. */
export function nextChainWord(combo: ComboState, chains: readonly WordChain[]): string | null {
  let best: { readonly matched: number; readonly word: string } | null = null;
  for (const chain of chains) {
    for (let matched = chain.words.length - 1; matched > (best?.matched ?? 0); matched -= 1) {
      if (endsWith(combo.links, chain.words.slice(0, matched))) {
        best = { matched, word: chain.words[matched] as string };
        break;
      }
    }
  }
  return best?.word ?? null;
}
