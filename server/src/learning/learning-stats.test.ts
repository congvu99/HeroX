import { describe, expect, it } from 'vitest';
import {
  computeLearningStats,
  listLearnedWords,
  UnsupportedProgressVersionError,
  type DeckWord,
} from './learning-stats.js';
import { readFixture } from '../../test/read-fixture.js';

const DAY_MS = 86_400_000;
// 2026-11-12 05:00 UTC = 12:00 giờ Việt Nam.
const NOW = Date.UTC(2026, 10, 12, 5, 0, 0);
const VIETNAM_UTC_OFFSET = { utcOffsetMinutes: 420 };

const deck = readFixture<DeckWord[]>('deck-words.json');

describe('computeLearningStats', () => {
  it('returns zeros for an empty payload', () => {
    expect(computeLearningStats(readFixture('progress-empty.json'), deck, NOW, VIETNAM_UTC_OFFSET)).toEqual({
      learned: 0,
      mastered: 0,
      byPos: { verb: 0, noun: 0, adj: 0, adv: 0, prep: 0, other: 0 },
      streakDays: 0,
      retention30: null,
      weakWords: [],
    });
  });

  it.each([[null], ['text'], [[]], [42]])('treats a non-object payload %j as empty', (payload) => {
    expect(computeLearningStats(payload, deck, NOW).learned).toBe(0);
  });

  it('counts every SRS state the same way as the LingoBrain progress tab', () => {
    const stats = computeLearningStats(readFixture('progress-all-states.json'), deck, NOW, VIETNAM_UTC_OFFSET);
    expect(stats.learned).toBe(5);
    expect(stats.mastered).toBe(2);
    expect(stats.byPos).toEqual({ verb: 2, noun: 1, adj: 1, adv: 1, prep: 0, other: 0 });
    expect(stats.retention30).toBe(0.75);
    expect(stats.weakWords).toEqual([
      { id: 'w-big', word: 'big', lapses: 3 },
      { id: 'w-run', word: 'run', lapses: 2 },
      { id: 'w-fast', word: 'fast', lapses: 1 },
    ]);
  });

  it('adds today to the stored streak when the player studied today', () => {
    const stats = computeLearningStats(readFixture('progress-all-states.json'), deck, NOW, VIETNAM_UTC_OFFSET);
    expect(stats.streakDays).toBe(5);
  });

  it('drops records older than the SRS epoch unless modified after it', () => {
    const stats = computeLearningStats(readFixture('progress-with-epoch.json'), deck, NOW);
    expect(stats.learned).toBe(2);
    expect(stats.mastered).toBe(1);
  });

  it('ignores progress for words no longer in the deck', () => {
    const stats = computeLearningStats(readFixture('progress-removed-words.json'), deck, NOW);
    expect(stats.learned).toBe(1);
    expect(stats.mastered).toBe(0);
    expect(stats.byPos.other).toBe(1);
    expect(stats.weakWords).toEqual([]);
  });

  it('reads malformed records defensively', () => {
    const payload = { v: 1, srs: { 'w-run': { state: 'review', ivl: 'thirty', lapses: -2, hist: 'none' }, 'w-cat': 'junk' } };
    const stats = computeLearningStats(payload, deck, NOW);
    expect(stats.learned).toBe(1);
    expect(stats.mastered).toBe(0);
    expect(stats.retention30).toBeNull();
    expect(stats.weakWords).toEqual([]);
  });

  it('rejects a payload version it does not understand', () => {
    expect(() => computeLearningStats({ v: 2 }, deck, NOW)).toThrow(UnsupportedProgressVersionError);
  });

  it('caps the weak word list', () => {
    const manyDeck: DeckWord[] = Array.from({ length: 15 }, (_, index) => ({
      id: `w-${index}`,
      word: `word${index}`,
      pos: 'noun',
      meaning: '',
      emoji: '',
      ipa: '',
    }));
    const srs = Object.fromEntries(manyDeck.map((word, index) => [word.id, { state: 'review', ivl: 3, lapses: index + 1 }]));
    const stats = computeLearningStats({ v: 1, srs }, manyDeck, NOW);
    expect(stats.weakWords).toHaveLength(10);
    expect(stats.weakWords[0]).toEqual({ id: 'w-14', word: 'word14', lapses: 15 });
  });
});

describe('streakDays', () => {
  const studiedAt = (time: number) => ({ 'w-run': { state: 'review', ivl: 3, last: time, hist: [{ t: time, g: 2 }] } });
  const dayData = (date: string, streak: number, done: Record<string, number> = {}) => ({
    data: { date, streak, done, history: {} },
    ts: 0,
  });

  it('rolls over a stored yesterday that was studied', () => {
    const yesterdayNoon = NOW - DAY_MS;
    const payload = { v: 1, srs: studiedAt(yesterdayNoon), day: dayData('2026-11-11', 3) };
    expect(computeLearningStats(payload, deck, NOW, VIETNAM_UTC_OFFSET).streakDays).toBe(4);
  });

  it('resets when the stored day was not studied', () => {
    const payload = { v: 1, srs: {}, day: dayData('2026-11-11', 3) };
    expect(computeLearningStats(payload, deck, NOW, VIETNAM_UTC_OFFSET).streakDays).toBe(0);
  });

  it('restarts at one after a gap, as LingoBrain does when rolling an older day', () => {
    const threeDaysAgo = NOW - 3 * DAY_MS;
    const payload = { v: 1, srs: studiedAt(threeDaysAgo), day: dayData('2026-11-09', 7) };
    expect(computeLearningStats(payload, deck, NOW, VIETNAM_UTC_OFFSET).streakDays).toBe(1);
  });

  it('counts a fully completed daily plan as a studied day', () => {
    const payload = {
      v: 1,
      srs: {},
      plan: { data: [{ id: 't1' }, { id: 't2' }], ts: 0 },
      day: dayData('2026-11-12', 2, { t1: NOW, t2: NOW }),
    };
    expect(computeLearningStats(payload, deck, NOW, VIETNAM_UTC_OFFSET).streakDays).toBe(3);
  });

  it('uses the default seven-task plan when the payload has no plan', () => {
    const partlyDone = { v: 1, srs: {}, day: dayData('2026-11-12', 2, { t1: NOW, t2: NOW }) };
    expect(computeLearningStats(partlyDone, deck, NOW, VIETNAM_UTC_OFFSET).streakDays).toBe(2);
  });

  it('decides "today" in the player time zone', () => {
    // 23:30 UTC ngày 11 = 06:30 ngày 12 giờ Việt Nam.
    const lateUtc = Date.UTC(2026, 10, 11, 23, 30, 0);
    const payload = { v: 1, srs: studiedAt(lateUtc), day: dayData('2026-11-12', 1) };
    expect(computeLearningStats(payload, deck, NOW, VIETNAM_UTC_OFFSET).streakDays).toBe(2);
    expect(computeLearningStats(payload, deck, NOW, { utcOffsetMinutes: 0 }).streakDays).toBe(1);
  });

  it('ignores reviews of words no longer in the deck, as the pruned LingoBrain client does', () => {
    const payload = {
      v: 1,
      srs: { 'w-removed': { state: 'review', ivl: 3, last: NOW - 3_600_000, hist: [{ t: NOW - 3_600_000, g: 2 }] } },
      day: dayData('2026-11-12', 2),
    };
    expect(computeLearningStats(payload, deck, NOW, VIETNAM_UTC_OFFSET).streakDays).toBe(2);
  });

  it('ignores grade entries outside 0..3', () => {
    const payload = {
      v: 1,
      srs: { 'w-run': { state: 'review', ivl: 3, hist: [{ t: NOW, g: 7 }, { t: NOW }] } },
      day: dayData('2026-11-12', 2),
    };
    const stats = computeLearningStats(payload, deck, NOW, VIETNAM_UTC_OFFSET);
    expect(stats.retention30).toBeNull();
    expect(stats.streakDays).toBe(2);
  });

  it('keeps the stored streak when the stored day is in the future', () => {
    const payload = { v: 1, srs: {}, day: dayData('2026-11-20', 6, { t1: NOW }) };
    expect(computeLearningStats(payload, deck, NOW, VIETNAM_UTC_OFFSET).streakDays).toBe(6);
  });
});

describe('listLearnedWords', () => {
  it('reads the earliest grade time as the study time, null when there is no grade', () => {
    const words = listLearnedWords(readFixture('progress-all-states.json'), deck);
    const byId = new Map(words.map((learned) => [learned.word.id, learned]));
    // w-run có hai lượt chấm; mốc học là lượt sớm hơn.
    expect(byId.get('w-run')?.firstStudiedAt).toBe(1791003600000);
    expect(byId.get('w-cat')?.firstStudiedAt).toBe(1794456000000);
    expect(byId.get('w-give-up')?.firstStudiedAt).toBeNull();
  });
});
