import { describe, expect, it } from 'vitest';
import type { WordTier } from '@herox/shared';
import type { DeckWord, LearnedWordProgress } from '../learning/learning-stats.js';
import { classifyWordTier, HARD_EASE_THRESHOLD } from './word-tier-classifier.js';

const NOW = Date.UTC(2026, 10, 25, 5, 0, 0);
const DAY_MS = 86_400_000;

function deckWord(id: string): DeckWord {
  return { id, word: id, pos: 'noun', meaning: `nghĩa ${id}`, emoji: '⭐', ipa: '' };
}

// Mặc định là một từ quen khoẻ mạnh: không rơi vào nhóm nào trước `familiar`.
function progress(overrides: Partial<Omit<LearnedWordProgress, 'word'>> = {}): LearnedWordProgress {
  return {
    word: deckWord('w'),
    mastered: false,
    lapses: 0,
    state: 'review',
    ivl: 10,
    ef: 2.5,
    due: NOW + 5 * DAY_MS,
    reps: 5,
    lastGrade: 2,
    ...overrides,
  };
}

describe('classifyWordTier', () => {
  const cases: ReadonlyArray<readonly [string, Partial<Omit<LearnedWordProgress, 'word'>>, boolean, WordTier]> = [
    ['ef thấp → hard', { ef: HARD_EASE_THRESHOLD - 0.01 }, false, 'hard'],
    ['lượt chấm cuối là quên → hard', { lastGrade: 0 }, false, 'hard'],
    ['lượt chấm cuối là "khó" → hard', { lastGrade: 1 }, false, 'hard'],
    ['gõ sai trong HeroX → hard', {}, true, 'hard'],
    ['đang học lại → new', { state: 'relearn' }, false, 'new'],
    ['mới ôn ≤ 2 lượt → new', { reps: 2 }, false, 'new'],
    ['đến hạn → due', { due: NOW - DAY_MS }, false, 'due'],
    ['đã thuộc (ivl ≥ 21) → mastered', { ivl: 21 }, false, 'mastered'],
    ['còn lại → familiar', {}, false, 'familiar'],
  ];

  it.each(cases)('%s', (_label, overrides, missed, expected) => {
    expect(classifyWordTier(progress(overrides), missed, NOW)).toBe(expected);
  });

  it('ưu tiên hard khi vừa đến hạn vừa ef thấp', () => {
    expect(classifyWordTier(progress({ ef: 2.0, due: NOW - DAY_MS }), false, NOW)).toBe('hard');
  });

  it('ưu tiên due hơn mastered khi đã thuộc nhưng đến hạn', () => {
    expect(classifyWordTier(progress({ ivl: 30, due: NOW - DAY_MS }), false, NOW)).toBe('due');
  });

  it('lastGrade = null (hist rỗng) không tự xếp hard', () => {
    expect(classifyWordTier(progress({ lastGrade: null }), false, NOW)).toBe('familiar');
  });
});
