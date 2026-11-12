import { describe, expect, it } from 'vitest';
import { battleSetup, battleWord, eventsOfType, play, start, typeAnswer, wrongAnswer, type Played } from '../../test/battle-fixtures.js';
import type { EnemySpec } from './battle-types.js';

const BOSS: EnemySpec = { kind: 'scarecrow-demon', maxHp: 100, attack: 5, rewardGold: 60, fireShield: { belowHpRatio: 0.5, minCombo: 3 } };
const QUICK_MS = 200;

function bossBattle(): Played {
  return start(battleSetup({ words: [battleWord('strike', 'verb')], enemies: [BOSS] }), []);
}

function castTimes(played: Played, times: number): Played {
  let next = played;
  for (let index = 0; index < times; index += 1) next = play(next, typeAnswer(next.state), QUICK_MS);
  return next;
}

describe('fire shield of the scarecrow boss', () => {
  it('raises the shield once HP drops to the threshold and breaks the running combo', () => {
    // 10 + 10 + 13 + 13 + 13 (x1.3 từ chiêu cùng loại thứ 3) → còn 41 máu ≤ 50%.
    const played = castTimes(bossBattle(), 5);
    expect(played.state.enemy).toMatchObject({ hp: 41, shielded: true });
    expect(eventsOfType(played.events, 'enemyShieldUp')).toEqual([{ type: 'enemyShieldUp', enemyIndex: 0, minCombo: 3 }]);
    expect(played.state.combo.count).toBe(0);
  });

  it('blocks casts until a new combo of 3 is built, then the third cast pierces', () => {
    const shielded = castTimes(bossBattle(), 5);
    const twoBlocked = castTimes(shielded, 2);
    expect(eventsOfType(twoBlocked.events, 'shieldBlocked').map((event) => event.comboNeeded)).toEqual([2, 1]);
    expect(twoBlocked.state.enemy?.hp).toBe(41);
    const pierced = castTimes(twoBlocked, 1);
    expect(pierced.state.enemy?.hp).toBe(41 - 13);
  });

  it('needs the combo rebuilt after a miss', () => {
    const shielded = castTimes(bossBattle(), 5);
    const built = castTimes(shielded, 2);
    const missed = play(built, wrongAnswer(), QUICK_MS);
    const afterMiss = castTimes(missed, 1);
    expect(eventsOfType(afterMiss.events, 'shieldBlocked').at(-1)?.comboNeeded).toBe(2);
    expect(afterMiss.state.enemy?.hp).toBe(41);
  });

  it('leaves enemies without a fire shield untouched', () => {
    const played = castTimes(start(battleSetup({ words: [battleWord('strike', 'verb')], enemies: [{ kind: 'imp', maxHp: 1_000, attack: 5, rewardGold: 8 }] }), []), 6);
    expect(eventsOfType(played.events, 'enemyShieldUp')).toHaveLength(0);
    expect(played.state.enemy?.shielded).toBe(false);
  });
});
