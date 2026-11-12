import type { PartOfSpeechGroup } from '../src/me-contract.js';
import { createBattle, step, type BattleEvent, type BattleState } from '../src/combat/battle-state.js';
import type { BattleInput, BattleSetup, BattleWord, EnemySpec } from '../src/combat/battle-types.js';
import { BASE_SKILL_TIERS } from '../src/data/skill-catalog.js';
import type { WordChain } from '../src/data/word-chains.js';

/** Từ test tổng hợp (không phải dữ liệu người dùng). */
export function battleWord(word: string, pos: PartOfSpeechGroup, overrides: Partial<BattleWord> = {}): BattleWord {
  return { id: `w-${word.replace(/ /g, '-')}`, word, meaning: `nghĩa của ${word}`, emoji: '⭐', pos, mastered: false, weak: false, ...overrides };
}

export const TEST_WORDS: readonly BattleWord[] = [
  battleWord('run', 'verb'),
  battleWord('away', 'adv'),
  battleWord('quickly', 'adv'),
  battleWord('strike', 'verb'),
  battleWord('protect', 'verb'),
  battleWord('fight', 'verb'),
  battleWord('castle', 'noun'),
  battleWord('gate', 'noun'),
  battleWord('strong', 'adj'),
  battleWord('brave', 'adj'),
  battleWord('over', 'prep'),
  battleWord('hello', 'other'),
];

export const TEST_CHAIN: WordChain = { id: 'run-away-quickly', words: ['run', 'away', 'quickly'] };

export const TEST_ENEMY: EnemySpec = { kind: 'imp', maxHp: 40, attack: 12, rewardGold: 8 };

export function battleSetup(overrides: Partial<BattleSetup> = {}): BattleSetup {
  return {
    seed: 12345,
    encounterId: 'test',
    words: TEST_WORDS,
    loadout: [],
    hero: { maxHp: 100, power: 10 },
    skillTiers: BASE_SKILL_TIERS,
    enemies: [TEST_ENEMY],
    promptTimeMs: 10_000,
    allowElite: false,
    ...overrides,
  };
}

export function wordOf(state: BattleState, wordId: string): BattleWord {
  const word = state.index.wordsById.get(wordId);
  if (word === undefined) throw new Error(`Không có từ ${wordId}`);
  return word;
}

/** Từ đang ra đề. */
export function promptWord(state: BattleState): BattleWord {
  if (state.prompt === null) throw new Error('Không có đề');
  return wordOf(state, state.prompt.wordId);
}

export function typeAnswer(state: BattleState): BattleInput {
  return { kind: 'type', text: promptWord(state).word };
}

export function wrongAnswer(): BattleInput {
  return { kind: 'type', text: 'zzzz' };
}

export interface Played {
  readonly state: BattleState;
  readonly events: BattleEvent[];
}

export function start(setup: BattleSetup = battleSetup(), chains: readonly WordChain[] = [TEST_CHAIN]): Played {
  const result = createBattle(setup, chains);
  return { state: result.state, events: [...result.events] };
}

/** Chơi tiếp `played` bằng một input sau `dtMs`, gom sự kiện. */
export function play(played: Played, input: BattleInput | null, dtMs: number): Played {
  const result = step(played.state, input, dtMs);
  return { state: result.state, events: [...played.events, ...result.events] };
}

export function eventsOfType<T extends BattleEvent['type']>(events: readonly BattleEvent[], type: T): Extract<BattleEvent, { type: T }>[] {
  return events.filter((event): event is Extract<BattleEvent, { type: T }> => event.type === type);
}
