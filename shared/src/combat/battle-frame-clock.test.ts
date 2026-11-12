import { describe, expect, it } from 'vitest';
import { BattleFrameClock } from './battle-frame-clock.js';
import { createBattle, step } from './battle-state.js';
import { battleSetup } from '../../test/battle-fixtures.js';

describe('BattleFrameClock', () => {
  it('turns fractional frame deltas into whole milliseconds without drifting from real time', () => {
    const clock = new BattleFrameClock();
    const steps = Array.from({ length: 600 }, () => clock.advance(1_000 / 60));
    expect(steps.every((ms) => Number.isInteger(ms))).toBe(true);
    // 600 khung 60 FPS = 10 giây thật; sai số dồn chỉ do làm tròn số thực.
    expect(Math.abs(steps.reduce((sum, ms) => sum + ms, 0) - 10_000)).toBeLessThanOrEqual(1);
  });

  it('ignores negative and non-finite deltas', () => {
    const clock = new BattleFrameClock();
    expect([clock.advance(-5), clock.advance(Number.NaN), clock.advance(Number.POSITIVE_INFINITY), clock.advance(2.5)]).toEqual([0, 0, 0, 2]);
  });
});

describe('step with fractional time', () => {
  it('keeps battle time in whole milliseconds by flooring the step', () => {
    const { state } = createBattle(battleSetup());
    expect(step(state, null, 16.9).state.elapsedMs).toBe(16);
  });
});
