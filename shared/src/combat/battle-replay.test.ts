import { describe, expect, it } from 'vitest';
import { battleSetup, promptWord, TEST_CHAIN, TEST_ENEMY } from '../../test/battle-fixtures.js';
import {
  isInputTooFast,
  MAX_BATTLE_DURATION_MS,
  MAX_BATTLE_LOG_ENTRIES,
  MAX_TYPED_ANSWER_LENGTH,
  MIN_REACTION_MS,
  replayBattle,
  stepRecorded,
  type BattleLog,
  type BattleLogEntry,
} from './battle-replay.js';
import { BattleFrameClock } from './battle-frame-clock.js';
import { createBattle, step, type BattleState } from './battle-state.js';
import { SeededRandom } from './seeded-random.js';
import type { BattleSetup } from './battle-types.js';

const setup = battleSetup({ enemies: [TEST_ENEMY, TEST_ENEMY], hero: { maxHp: 100, power: 20 } });
const chains = [TEST_CHAIN];

/** Chơi như client thật: chờ `thinkMs` sau mỗi đề rồi gõ đúng, ghi log theo `elapsedMs` lúc áp dụng. */
function playHonestly(battle: BattleSetup, thinkMs: number, wrongEvery = 0): { log: BattleLog; state: BattleState } {
  let state = createBattle(battle, chains).state;
  const entries: BattleLogEntry[] = [];
  for (let turn = 1; turn <= 50 && state.outcome === 'ongoing'; turn += 1) {
    state = step(state, null, thinkMs).state;
    if (state.outcome !== 'ongoing') break;
    const text = wrongEvery > 0 && turn % wrongEvery === 0 ? 'zzzz' : promptWord(state).word;
    entries.push({ atMs: state.elapsedMs, kind: 'type', text });
    state = step(state, { kind: 'type', text }, 0).state;
  }
  return { log: { entries, endedAtMs: state.elapsedMs + 500 }, state };
}

describe('replayBattle', () => {
  it('reproduces an honest battle exactly (same seed + same log = same result)', () => {
    const { log, state } = playHonestly(setup, 1_800, 4);
    const first = replayBattle(setup, log, chains);
    const second = replayBattle(setup, log, chains);
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(first.state.outcome).toBe('victory');
    expect(first.state.goldEarned).toBe(state.goldEarned);
    expect([...first.state.misses]).toEqual([...state.misses]);
    expect([...first.state.misses].length).toBeGreaterThan(0);
    expect(second.state.rngState).toBe(first.state.rngState);
  });

  it('accepts ring taps on a shown option', () => {
    let state = createBattle(setup, chains).state;
    state = step(state, null, 2_000).state;
    const wordId = state.prompt?.wordId ?? '';
    const result = replayBattle(setup, { entries: [{ atMs: 2_000, kind: 'ring', wordId }], endedAtMs: 2_000 }, chains);
    // Đề có thể là chiêu hỗ trợ (sát thương thấp hơn) nên chỉ kiểm quái có mất máu.
    expect(result.ok && result.state.enemy !== null && result.state.enemy.hp < result.state.enemy.maxHp).toBe(true);
  });

  it('reports a battle the player left early as still ongoing', () => {
    const result = replayBattle(setup, { entries: [], endedAtMs: 3_000 }, chains);
    expect(result).toMatchObject({ ok: true, state: { outcome: 'ongoing', elapsedMs: 3_000 } });
  });

  it('counts timeouts until the reported end', () => {
    const result = replayBattle(setup, { entries: [], endedAtMs: 25_000 }, chains);
    expect(result.ok && [...result.state.misses.values()].reduce((sum, count) => sum + count, 0)).toBe(2);
  });

  it('rejects answers faster than a human can react', () => {
    const { log } = playHonestly(setup, MIN_REACTION_MS - 1);
    expect(replayBattle(setup, log, chains)).toEqual({ ok: false, violation: 'too-fast', entryIndex: 0 });
  });

  it('accepts answers right at the reaction limit', () => {
    const { log } = playHonestly(setup, MIN_REACTION_MS);
    expect(replayBattle(setup, log, chains)).toMatchObject({ ok: true, state: { outcome: 'victory' } });
  });

  it('rejects a ring tap on a word that was not offered (e.g. a word never learned)', () => {
    const log: BattleLog = { entries: [{ atMs: 1_000, kind: 'ring', wordId: 'w-not-learned' }], endedAtMs: 1_000 };
    expect(replayBattle(setup, log, chains)).toEqual({ ok: false, violation: 'unknown-option', entryIndex: 0 });
  });

  it('rejects entries out of order or with invalid times', () => {
    const entries: BattleLogEntry[] = [
      { atMs: 2_000, kind: 'type', text: 'zzzz' },
      { atMs: 1_000, kind: 'type', text: 'zzzz' },
    ];
    expect(replayBattle(setup, { entries, endedAtMs: 3_000 }, chains)).toEqual({ ok: false, violation: 'out-of-order', entryIndex: 1 });
    expect(replayBattle(setup, { entries: [{ atMs: Number.NaN, kind: 'type', text: 'a' }], endedAtMs: 0 }, chains)).toMatchObject({
      violation: 'out-of-order',
    });
    expect(replayBattle(setup, { entries: [], endedAtMs: -1 }, chains)).toMatchObject({ violation: 'out-of-order', entryIndex: null });
  });

  it('rejects input after the battle ended', () => {
    const { log } = playHonestly(setup, 1_000);
    const lastAt = log.entries.at(-1)?.atMs ?? 0;
    const tampered: BattleLog = { entries: [...log.entries, { atMs: lastAt + 1_000, kind: 'type', text: 'run' }], endedAtMs: lastAt + 2_000 };
    expect(replayBattle(setup, tampered, chains)).toMatchObject({ ok: false, violation: 'input-after-end' });
  });

  it('rejects overlong battles, logs and answers', () => {
    expect(replayBattle(setup, { entries: [], endedAtMs: MAX_BATTLE_DURATION_MS + 1 }, chains)).toMatchObject({ violation: 'too-long' });
    const late: BattleLogEntry = { atMs: MAX_BATTLE_DURATION_MS + 1, kind: 'type', text: 'a' };
    expect(replayBattle(battleSetup({ hero: { maxHp: 1_000_000, power: 1 } }), { entries: [late], endedAtMs: late.atMs }, chains)).toMatchObject({
      violation: 'too-long',
      entryIndex: 0,
    });
    const flood = Array.from({ length: MAX_BATTLE_LOG_ENTRIES + 1 }, (_, index): BattleLogEntry => ({ atMs: index, kind: 'type', text: 'a' }));
    expect(replayBattle(setup, { entries: flood, endedAtMs: 0 }, chains)).toMatchObject({ violation: 'too-many-entries' });
    const longText: BattleLogEntry = { atMs: 1_000, kind: 'type', text: 'a'.repeat(MAX_TYPED_ANSWER_LENGTH + 1) };
    expect(replayBattle(setup, { entries: [longText], endedAtMs: 1_000 }, chains)).toMatchObject({ violation: 'answer-too-long' });
  });
});

describe('isInputTooFast', () => {
  it('is true during the first 150 ms of a prompt and false once the battle is over', () => {
    const { state } = createBattle(setup, chains);
    expect(isInputTooFast(state)).toBe(true);
    expect(isInputTooFast(step(state, null, MIN_REACTION_MS).state)).toBe(false);
    expect(isInputTooFast({ ...state, prompt: null })).toBe(false);
  });
});

describe('stepRecorded', () => {
  /** Người chơi giả lập chạy theo khung hình `frameMs` (có thể lẻ như game loop thật), bấm vào thời điểm ngẫu nhiên — kể cả sát lúc đề hết giờ. */
  function playFrames(seed: number, frameMs: number): { log: BattleLog; state: BattleState; dropped: number } {
    const battle = battleSetup({ seed, promptTimeMs: 2_000, enemies: [TEST_ENEMY, TEST_ENEMY], allowElite: true });
    const behaviour = new SeededRandom(seed * 7 + 1);
    let state = createBattle(battle, chains).state;
    const entries: BattleLogEntry[] = [];
    let dropped = 0;
    const clock = new BattleFrameClock();
    for (let frame = 0; frame < 3_000 && state.outcome === 'ongoing'; frame += 1) {
      let input = null;
      if (behaviour.chance(0.05) && state.prompt !== null) {
        const options = state.prompt.options;
        input = behaviour.chance(0.5)
          ? { kind: 'ring' as const, wordId: behaviour.pick(options) ?? '' }
          : { kind: 'type' as const, text: behaviour.chance(0.7) ? promptWord(state).word : 'zzzz' };
      }
      const result = stepRecorded(state, input, clock.advance(frameMs));
      if (input !== null && result.logEntry === null) dropped += 1;
      if (result.logEntry !== null) entries.push(result.logEntry);
      state = result.state;
    }
    return { log: { entries, endedAtMs: state.elapsedMs }, state, dropped };
  }

  it.each([
    ['16 ms', 16],
    ['60 FPS (1000/60 ms)', 1_000 / 60],
    ['144 FPS (1000/144 ms)', 1_000 / 144],
  ])('always produces logs the server replays to the same result at %s frames', (_label, frameMs) => {
    let totalDropped = 0;
    for (let seed = 1; seed <= 40; seed += 1) {
      const { log, state, dropped } = playFrames(seed, frameMs);
      totalDropped += dropped;
      // Server chỉ nhận thời điểm nguyên ms.
      expect(log.entries.every((entry) => Number.isSafeInteger(entry.atMs))).toBe(true);
      expect(Number.isSafeInteger(log.endedAtMs)).toBe(true);
      const replay = replayBattle(state.setup, log, chains);
      expect(replay.ok, `seed ${seed}`).toBe(true);
      if (!replay.ok) return;
      expect(replay.state.outcome).toBe(state.outcome);
      expect(replay.state.goldEarned).toBe(state.goldEarned);
      expect([...replay.state.misses]).toEqual([...state.misses]);
      expect(replay.state.rngState).toBe(state.rngState);
    }
    // Có input bị bỏ vì tới sớm hơn 150 ms: chứng tỏ kịch bản thật sự chạm tới tình huống đó.
    expect(totalDropped).toBeGreaterThan(0);
  });

  it('drops an input that lands within 150 ms of a new prompt instead of logging it', () => {
    const { state } = createBattle(setup, chains);
    const result = stepRecorded(state, { kind: 'type', text: promptWord(state).word }, MIN_REACTION_MS - 1);
    expect(result.logEntry).toBeNull();
    expect(result.state.enemy?.hp).toBe(state.enemy?.hp);
    expect(result.state.elapsedMs).toBe(MIN_REACTION_MS - 1);
  });

  it('logs an accepted input at the time it was applied', () => {
    const { state } = createBattle(setup, chains);
    const result = stepRecorded(state, { kind: 'type', text: 'zzzz' }, 1_000);
    expect(result.logEntry).toEqual({ atMs: 1_000, kind: 'type', text: 'zzzz' });
    expect(result.events.map((event) => event.type)).toContain('miss');
  });
});
