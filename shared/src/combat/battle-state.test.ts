import { describe, expect, it } from 'vitest';
import {
  battleSetup,
  battleWord,
  eventsOfType,
  play,
  promptWord,
  start,
  TEST_CHAIN,
  TEST_ENEMY,
  typeAnswer,
  wrongAnswer,
  type Played,
} from '../../test/battle-fixtures.js';
import type { BattleWord } from './battle-types.js';
import { createBattle, ELITE_HP_MULTIPLIER, InvalidBattleSetupError, step } from './battle-state.js';
import { COMBO_WINDOW_MS } from './combo-chain.js';
import { RECENT_PROMPT_MEMORY } from './word-pool.js';

const STRONG_ENEMY = { ...TEST_ENEMY, maxHp: 10_000 };
const ONE_SECOND = 1_000;

/** Từ mà một đề cụ thể được ép thành, dùng bộ từ một từ để đề luôn là từ đó. */
function singleWordBattle(word: BattleWord, overrides: Parameters<typeof battleSetup>[0] = {}): Played {
  return start(battleSetup({ words: [word], enemies: [STRONG_ENEMY], ...overrides }), []);
}

function hitDamage(played: Played): number {
  return eventsOfType(played.events, 'hit').at(-1)?.damage ?? -1;
}

describe('createBattle', () => {
  it('spawns the first enemy and shows a prompt from the learned pool', () => {
    const { state, events } = start();
    expect(events.map((event) => event.type)).toEqual(['enemySpawn', 'prompt']);
    expect(state.enemy).toMatchObject({ index: 0, hp: 40, maxHp: 40, elite: false });
    expect(state.hero).toEqual({ hp: 100, maxHp: 100, shield: 0, evadeCharges: 0 });
    expect(state.prompt?.options).toHaveLength(6);
    expect(state.prompt?.options).toContain(state.prompt?.wordId);
    expect(state.prompt?.deadlineMs).toBe(10_000);
  });

  it.each([
    ['an empty word pool', { words: [] }],
    ['no enemy', { enemies: [] }],
    ['a non-positive prompt time', { promptTimeMs: 0 }],
    ['a non-positive hero HP', { hero: { maxHp: 0, power: 10 } }],
    ['an enemy without HP', { enemies: [{ ...TEST_ENEMY, maxHp: 0 }] }],
  ])('rejects a setup with %s', (_case, overrides) => {
    expect(() => createBattle(battleSetup(overrides))).toThrow(InvalidBattleSetupError);
  });

  it('uses the built-in chapter 1 chains by default', () => {
    expect(createBattle(battleSetup()).state.index.chains.map((chain) => chain.id)).toContain('run-away-quickly');
  });
});

describe('typing a word', () => {
  it('deals 100% for an exact answer and 80% for a near answer', () => {
    const word = battleWord('quickly', 'verb');
    const exact = play(singleWordBattle(word), { kind: 'type', text: 'Quickly' }, ONE_SECOND);
    expect(hitDamage(exact)).toBe(10);
    expect(eventsOfType(exact.events, 'cast')[0]).toMatchObject({ accuracy: 'exact', skill: 'attack', mastered: false });
    const near = play(singleWordBattle(word, { hero: { maxHp: 100, power: 100 } }), { kind: 'type', text: 'quikly' }, ONE_SECOND);
    expect(hitDamage(near)).toBe(80);
  });

  it('deals 70% when picking the right ring option', () => {
    const word = battleWord('strike', 'verb');
    const played = play(singleWordBattle(word, { hero: { maxHp: 100, power: 100 } }), { kind: 'ring', wordId: word.id }, ONE_SECOND);
    expect(hitDamage(played)).toBe(70);
    expect(eventsOfType(played.events, 'cast')[0]?.accuracy).toBe('ring');
  });

  it('makes a mastered word 25% stronger', () => {
    const word = battleWord('strike', 'verb', { mastered: true });
    const played = play(singleWordBattle(word, { hero: { maxHp: 100, power: 100 } }), { kind: 'type', text: 'strike' }, ONE_SECOND);
    expect(hitDamage(played)).toBe(125);
  });

  it('wins after defeating every enemy and earns their gold', () => {
    let played = start(battleSetup({ enemies: [TEST_ENEMY, TEST_ENEMY], hero: { maxHp: 100, power: 100 } }));
    for (let turn = 0; turn < 10 && played.state.outcome === 'ongoing'; turn += 1) {
      played = play(played, typeAnswer(played.state), ONE_SECOND);
    }
    expect(played.state.outcome).toBe('victory');
    expect(played.state.prompt).toBeNull();
    expect(eventsOfType(played.events, 'enemyDefeated').map((event) => event.enemyIndex)).toEqual([0, 1]);
    expect(eventsOfType(played.events, 'victory')).toEqual([{ type: 'victory', goldEarned: 16 }]);
    expect(played.state.goldEarned).toBe(16);
  });

  it('ignores input and time once the battle is over', () => {
    let played = start(battleSetup({ hero: { maxHp: 100, power: 100 } }));
    played = play(played, typeAnswer(played.state), ONE_SECOND);
    expect(played.state.outcome).toBe('victory');
    const after = step(played.state, wrongAnswer(), 60_000);
    expect(after.state).toBe(played.state);
    expect(after.events).toEqual([]);
  });
});

describe('skills by part of speech', () => {
  it('a noun raises a shield that absorbs the next enemy hit', () => {
    const noun = battleWord('castle', 'noun');
    let played = singleWordBattle(noun, { hero: { maxHp: 100, power: 10 } });
    played = play(played, { kind: 'type', text: 'castle' }, ONE_SECOND);
    expect(played.state.hero.shield).toBe(5);
    expect(hitDamage(played)).toBe(6);
    played = play(played, wrongAnswer(), ONE_SECOND);
    expect(eventsOfType(played.events, 'enemyAttack').at(-1)).toMatchObject({ damage: 12, absorbed: 5, heroHp: 93, shield: 0 });
  });

  it('an adjective weakens the next enemy hit', () => {
    const adjective = battleWord('strong', 'adj');
    let played = play(singleWordBattle(adjective), { kind: 'type', text: 'strong' }, ONE_SECOND);
    expect(played.state.enemy?.weakenedHits).toBe(1);
    played = play(played, wrongAnswer(), ONE_SECOND);
    expect(eventsOfType(played.events, 'enemyAttack').at(-1)).toMatchObject({ damage: 6, heroHp: 94 });
    expect(played.state.enemy?.weakenedHits).toBe(0);
  });

  it('an adverb or preposition dodges the next enemy hit', () => {
    const preposition = battleWord('over', 'prep');
    let played = play(singleWordBattle(preposition), { kind: 'type', text: 'over' }, ONE_SECOND);
    played = play(played, { kind: 'type', text: 'over' }, ONE_SECOND);
    expect(played.state.hero.evadeCharges).toBe(1);
    played = play(played, wrongAnswer(), ONE_SECOND);
    expect(eventsOfType(played.events, 'enemyAttack').at(-1)).toMatchObject({ evaded: true, damage: 0, heroHp: 100 });
    expect(played.state.hero.evadeCharges).toBe(0);
  });
});

describe('missing a word', () => {
  it('a wrong answer records the miss, the enemy strikes back and a new prompt appears', () => {
    let played = start();
    const missed = promptWord(played.state);
    played = play(played, wrongAnswer(), ONE_SECOND);
    expect(eventsOfType(played.events, 'miss')).toEqual([{ type: 'miss', wordId: missed.id, reason: 'wrong' }]);
    expect(played.state.hero.hp).toBe(88);
    expect(played.state.misses.get(missed.id)).toBe(1);
    expect(played.state.retryWordIds).toContain(missed.id);
    expect(eventsOfType(played.events, 'prompt')).toHaveLength(2);
  });

  it('a wrong ring option counts as a miss', () => {
    let played = start();
    const wrongOption = played.state.prompt?.options.find((id) => id !== played.state.prompt?.wordId) ?? '';
    played = play(played, { kind: 'ring', wordId: wrongOption }, ONE_SECOND);
    expect(eventsOfType(played.events, 'miss')).toHaveLength(1);
  });

  it('running out of time counts as a miss at the deadline', () => {
    let played = start(battleSetup({ promptTimeMs: 5_000 }));
    played = play(played, null, 12_000);
    expect(eventsOfType(played.events, 'miss').map((event) => event.reason)).toEqual(['timeout', 'timeout']);
    expect(played.state.prompt?.shownAtMs).toBe(10_000);
    expect(played.state.elapsedMs).toBe(12_000);
  });

  it('answering correctly removes the word from the retry list', () => {
    const word = battleWord('strike', 'verb');
    let played = play(singleWordBattle(word), wrongAnswer(), ONE_SECOND);
    expect(played.state.retryWordIds).toEqual([word.id]);
    played = play(played, { kind: 'type', text: 'strike' }, ONE_SECOND);
    expect(played.state.retryWordIds).toEqual([]);
  });

  it('loses when hero HP reaches 0', () => {
    let played = start(battleSetup({ hero: { maxHp: 30, power: 1 }, enemies: [STRONG_ENEMY] }));
    for (let turn = 0; turn < 5 && played.state.outcome === 'ongoing'; turn += 1) {
      played = play(played, wrongAnswer(), ONE_SECOND);
    }
    expect(played.state.outcome).toBe('defeat');
    expect(played.state.hero.hp).toBe(0);
    expect(played.state.prompt).toBeNull();
    expect(eventsOfType(played.events, 'defeat')).toHaveLength(1);
  });
});

describe('word results', () => {
  const word = battleWord('strike', 'verb');

  it('counts a prompt shown and a correct answer as a trailing correct', () => {
    const played = play(singleWordBattle(word), { kind: 'type', text: 'strike' }, ONE_SECOND);
    const result = played.state.wordResults.get(word.id);
    // Đề đầu + đề sau khi đánh trúng (quái 10_000 máu vẫn sống) = 2 lần hiện; 1 lần đúng.
    expect(result?.prompted).toBe(2);
    expect(result?.trailingCorrect).toBe(1);
    expect(result?.missed).toBe(false);
  });

  it('marks missed and resets the trailing correct on a wrong answer', () => {
    let played = play(singleWordBattle(word), { kind: 'type', text: 'strike' }, ONE_SECOND);
    played = play(played, wrongAnswer(), ONE_SECOND);
    const result = played.state.wordResults.get(word.id);
    expect(result?.missed).toBe(true);
    expect(result?.trailingCorrect).toBe(0);
  });

  it('resets the trailing correct on a timeout', () => {
    let played = play(singleWordBattle(word), { kind: 'type', text: 'strike' }, ONE_SECOND);
    played = play(played, null, 20_000);
    expect(played.state.wordResults.get(word.id)?.missed).toBe(true);
    expect(played.state.wordResults.get(word.id)?.trailingCorrect).toBe(0);
  });
});

describe('combos', () => {
  const verbs = [battleWord('strike', 'verb'), battleWord('fight', 'verb'), battleWord('protect', 'verb'), battleWord('climb', 'verb')];

  it('three casts of the same part of speech within the window give x1.3', () => {
    let played = start(battleSetup({ words: verbs, enemies: [STRONG_ENEMY], hero: { maxHp: 100, power: 100 } }), []);
    for (let cast = 0; cast < 3; cast += 1) played = play(played, typeAnswer(played.state), ONE_SECOND);
    expect(eventsOfType(played.events, 'hit').map((event) => event.damage)).toEqual([100, 100, 130]);
    expect(eventsOfType(played.events, 'comboUp').map((event) => [event.count, event.bonus])).toEqual([
      [2, 'none'],
      [3, 'same-pos'],
    ]);
  });

  it('a gap of 4 seconds breaks the combo', () => {
    let played = start(battleSetup({ words: verbs, enemies: [STRONG_ENEMY] }), []);
    played = play(played, typeAnswer(played.state), ONE_SECOND);
    played = play(played, typeAnswer(played.state), ONE_SECOND);
    played = play(played, typeAnswer(played.state), COMBO_WINDOW_MS);
    expect(eventsOfType(played.events, 'comboBreak')).toEqual([{ type: 'comboBreak', count: 2 }]);
    expect(played.state.combo.count).toBe(1);
  });

  it('a wrong word breaks the combo', () => {
    let played = start(battleSetup({ words: verbs, enemies: [STRONG_ENEMY] }), []);
    played = play(played, typeAnswer(played.state), ONE_SECOND);
    played = play(played, typeAnswer(played.state), ONE_SECOND);
    played = play(played, wrongAnswer(), ONE_SECOND);
    expect(eventsOfType(played.events, 'comboBreak')).toHaveLength(1);
    expect(played.state.combo.count).toBe(0);
  });

  function playChain(enemyMaxHp: number): { played: Played; prompts: string[] } {
    const chainWords = TEST_CHAIN.words.map((word) => battleWord(word, word === 'run' ? 'verb' : 'adv'));
    const setupFor = (seed: number) =>
      battleSetup({ seed, words: chainWords, enemies: [{ ...TEST_ENEMY, maxHp: enemyMaxHp }], hero: { maxHp: 100, power: 100 } });
    // Chọn seed có đề đầu là "run" để chuỗi bắt đầu ngay; sau đó chuỗi tự nối.
    const seed = Array.from({ length: 50 }, (_, index) => index).find(
      (candidate) => promptWord(createBattle(setupFor(candidate), [TEST_CHAIN]).state).word === 'run',
    );
    let played = start(setupFor(seed ?? 0), [TEST_CHAIN]);
    const prompts: string[] = [];
    for (let cast = 0; cast < 3 && played.state.outcome === 'ongoing'; cast += 1) {
      prompts.push(promptWord(played.state).word);
      played = play(played, typeAnswer(played.state), ONE_SECOND);
    }
    return { played, prompts };
  }

  it('a valid phrase chain gives x1.6 and a finisher', () => {
    const { played, prompts } = playChain(1_000);
    expect(prompts).toEqual(['run', 'away', 'quickly']);
    // run 100 (tấn công) · away 60 (né) · quickly 60 × 1.6 = 96, quái còn 744 > 25% nên không bị kết liễu.
    expect(eventsOfType(played.events, 'hit').map((event) => [event.damage, event.finisher])).toEqual([
      [100, false],
      [60, false],
      [96, true],
    ]);
    expect(eventsOfType(played.events, 'comboUp').at(-1)).toMatchObject({ bonus: 'chain', chainId: 'run-away-quickly', multiplier: 1.6 });
    expect(played.state.enemy?.hp).toBe(744);
  });

  it('the finisher executes an enemy left at 25% HP or less', () => {
    // 300 − 100 − 60 = 140; đòn kết liễu 96 để lại 44 ≤ 75 nên hạ luôn.
    const { played } = playChain(300);
    expect(eventsOfType(played.events, 'hit').at(-1)).toMatchObject({ damage: 140, enemyHp: 0, finisher: true });
    expect(played.state.outcome).toBe('victory');
  });
});

describe('elite enemies', () => {
  const weak = battleWord('brave', 'adj', { weak: true });

  function findEliteSeed(): number {
    for (let seed = 0; seed < 100; seed += 1) {
      const { state } = createBattle(battleSetup({ seed, allowElite: true, words: [...battleSetup().words, weak] }), []);
      if (state.enemy?.elite === true) return seed;
    }
    throw new Error('Không có seed nào sinh quái tinh anh');
  }

  it('sometimes turns a weak word into an elite with double HP and reward that opens on that word', () => {
    const seed = findEliteSeed();
    const { state, events } = createBattle(battleSetup({ seed, allowElite: true, words: [...battleSetup().words, weak] }), []);
    expect(state.enemy).toMatchObject({ elite: true, maxHp: TEST_ENEMY.maxHp * ELITE_HP_MULTIPLIER, rewardGold: 16 });
    expect(state.prompt?.wordId).toBe(weak.id);
    expect(eventsOfType([...events], 'enemySpawn')[0]?.elite).toBe(true);
  });

  it('opens a later elite on a weak word that was not just asked, when one is available', () => {
    const weakWords = [weak, battleWord('gate', 'noun', { weak: true })];
    const words = [...battleSetup().words.filter((word) => word.word !== 'gate'), ...weakWords];
    let checkedSpawns = 0;
    for (let seed = 0; seed < 60; seed += 1) {
      const setup = battleSetup({ seed, allowElite: true, words, enemies: Array.from({ length: 6 }, () => TEST_ENEMY), hero: { maxHp: 1_000, power: 200 } });
      let played = start(setup, []);
      for (let turn = 0; turn < 30 && played.state.outcome === 'ongoing'; turn += 1) played = play(played, typeAnswer(played.state), 500);
      const promptIds: string[] = [];
      for (const [index, event] of played.events.entries()) {
        if (event.type === 'prompt') promptIds.push(event.wordId);
        if (event.type !== 'enemySpawn' || !event.elite || event.enemyIndex === 0) continue;
        const recent = promptIds.slice(-RECENT_PROMPT_MEMORY);
        if (weakWords.every((word) => recent.includes(word.id))) continue;
        const opening = played.events.slice(index).find((next) => next.type === 'prompt');
        expect(opening?.type === 'prompt' && recent.includes(opening.wordId), `seed ${seed}`).toBe(false);
        checkedSpawns += 1;
      }
    }
    expect(checkedSpawns).toBeGreaterThan(0);
  });

  it('never spawns an elite when elites are disabled or no word is weak', () => {
    for (let seed = 0; seed < 50; seed += 1) {
      expect(createBattle(battleSetup({ seed, allowElite: false, words: [weak] }), []).state.enemy?.elite).toBe(false);
      expect(createBattle(battleSetup({ seed, allowElite: true }), []).state.enemy?.elite).toBe(false);
    }
  });
});

describe('determinism', () => {
  type Action = 'answer' | 'wrong' | 'wait';
  // Kịch bản cố định: trả lời đúng nhanh, sai, để hết giờ, và một quãng nghỉ làm đứt combo.
  const SCRIPT: readonly { readonly gapMs: number; readonly action: Action }[] = [
    { gapMs: 1_200, action: 'answer' },
    { gapMs: 900, action: 'answer' },
    { gapMs: 2_100, action: 'wrong' },
    { gapMs: 25_000, action: 'wait' },
    { gapMs: 700, action: 'answer' },
    { gapMs: 5_000, action: 'answer' },
    { gapMs: 1_000, action: 'answer' },
    { gapMs: 800, action: 'wrong' },
    { gapMs: 1_300, action: 'answer' },
    { gapMs: 1_100, action: 'answer' },
  ];

  function runInChunks(seed: number, chunkMs: number): Played {
    const weak = battleWord('brave', 'adj', { weak: true });
    let played = start(battleSetup({ seed, allowElite: true, words: [...battleSetup().words, weak], enemies: [TEST_ENEMY, TEST_ENEMY, STRONG_ENEMY] }));
    let at = 0;
    for (const { gapMs, action } of SCRIPT) {
      at += gapMs;
      while (played.state.outcome === 'ongoing' && played.state.elapsedMs + chunkMs < at) played = play(played, null, chunkMs);
      played = play(played, null, at - played.state.elapsedMs);
      if (action === 'wait' || played.state.outcome !== 'ongoing') continue;
      played = play(played, action === 'answer' ? typeAnswer(played.state) : wrongAnswer(), 0);
    }
    return play(played, null, 30_000);
  }

  it('gives the same result for the same seed and inputs however time is chunked', () => {
    for (const seed of [1, 2, 3, 99, 2026]) {
      const oneShot = runInChunks(seed, 1_000_000);
      const perFrame = runInChunks(seed, 16);
      expect(perFrame.events).toEqual(oneShot.events);
      expect(perFrame.state.rngState).toBe(oneShot.state.rngState);
      expect(perFrame.state.hero).toEqual(oneShot.state.hero);
    }
  });

  it('never mutates the state passed in', () => {
    const { state } = start();
    const snapshot = JSON.stringify({ ...state, index: null, misses: [...state.misses] });
    step(state, wrongAnswer(), 20_000);
    expect(JSON.stringify({ ...state, index: null, misses: [...state.misses] })).toBe(snapshot);
  });

  it('treats a negative or invalid time step as zero', () => {
    const { state } = start();
    expect(step(state, null, -500).state.elapsedMs).toBe(0);
    expect(step(state, null, Number.NaN).state.elapsedMs).toBe(0);
  });
});
