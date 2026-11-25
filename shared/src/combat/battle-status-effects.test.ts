import { describe, expect, it } from 'vitest';
import { battleSetup, battleWord, eventsOfType, play, start, typeAnswer, wrongAnswer, type Played } from '../../test/battle-fixtures.js';
import { skillMoveById } from '../data/skill-moves.js';
import type { BattleState, EnemyBattleState, HeroBattleState } from './battle-state.js';
import type { BattleWord, EnemySpec } from './battle-types.js';
import { COMBO_WINDOW_MS } from './combo-chain.js';
import {
  BURN_DAMAGE_RATIO,
  DAMAGE_OVER_TIME_TURNS,
  FREEZE_DAMAGE_BONUS,
  HASTE_COMBO_WINDOW_BONUS_MS,
  HEAL_MAX_HP_RATIO,
  POISON_MAX_HP_RATIO,
  type ActiveStatus,
  type EnemyStatusKind,
} from './status-effects.js';

const TOUGH_ENEMY: EnemySpec = { kind: 'imp', maxHp: 10_000, attack: 12, rewardGold: 8 };
const BOSS: EnemySpec = { kind: 'demon', maxHp: 10_000, attack: 12, rewardGold: 60, fireShield: { belowHpRatio: 0.01, minCombo: 3 } };
const STEP_MS = 500;
const VERB = battleWord('strike', 'verb');

function battle(word: BattleWord = VERB, enemy: EnemySpec = TOUGH_ENEMY): Played {
  return start(battleSetup({ words: [word], enemies: [enemy] }), []);
}

function withEnemy(played: Played, patch: Partial<EnemyBattleState>): Played {
  const state = played.state;
  if (state.enemy === null) throw new Error('không có quái');
  return { ...played, state: { ...state, enemy: { ...state.enemy, ...patch } } };
}

function withHero(played: Played, patch: Partial<HeroBattleState>): Played {
  return { ...played, state: { ...played.state, hero: { ...played.state.hero, ...patch } } };
}

function enemyStatus(kind: EnemyStatusKind, turns = 1, power = 1): ActiveStatus<EnemyStatusKind> {
  return { kind, turns, power };
}

function castTimes(played: Played, times: number): Played {
  let current = played;
  for (let i = 0; i < times; i += 1) current = play(current, typeAnswer(current.state), STEP_MS);
  return current;
}

function lastHit(played: Played): number {
  return eventsOfType(played.events, 'hit').at(-1)?.damage ?? -1;
}

function enemyOf(state: BattleState): EnemyBattleState {
  if (state.enemy === null) throw new Error('không có quái');
  return state.enemy;
}

describe('chiêu theo bậc combo', () => {
  it('mỗi đòn có chiêu đúng loại, bậc tăng theo combo 1 → 2 → 3 → 4 → 5', () => {
    const played = castTimes(battle(), 10);
    const casts = eventsOfType(played.events, 'cast');
    expect(casts.map((cast) => cast.comboTier)).toEqual([1, 2, 2, 3, 3, 4, 4, 4, 4, 5]);
    for (const cast of casts) {
      const move = skillMoveById(cast.moveId);
      expect(move?.kind).toBe('attack');
      expect(move?.comboTier).toBe(cast.comboTier);
    }
  });

  it('không lặp chiêu liền nhau trong cùng bậc', () => {
    const casts = eventsOfType(castTimes(battle(), 10).events, 'cast');
    for (let i = 1; i < casts.length; i += 1) expect(casts[i]?.moveId).not.toBe(casts[i - 1]?.moveId);
  });

  it('từ đã thuộc hiện chiêu cao hơn một bậc', () => {
    const played = castTimes(battle(battleWord('strike', 'verb', { mastered: true })), 1);
    expect(eventsOfType(played.events, 'cast')[0]?.comboTier).toBe(2);
  });

  it('combo bậc 4 trở lên luôn gây trạng thái', () => {
    const played = castTimes(battle(), 8);
    const fromTier4 = played.events.slice(played.events.findIndex((event) => event.type === 'cast' && event.comboTier === 4));
    expect(eventsOfType(fromTier4, 'statusApplied').length).toBeGreaterThanOrEqual(1);
  });
});

describe('trạng thái trên quái', () => {
  it('độc ăn 3% máu tối đa sau mỗi đòn đúng, hết sau 3 đòn', () => {
    let played = withEnemy(battle(), { statuses: [enemyStatus('poison', DAMAGE_OVER_TIME_TURNS)] });
    played = castTimes(played, DAMAGE_OVER_TIME_TURNS + 1);
    const ticks = eventsOfType(played.events, 'statusTick').filter((tick) => tick.status === 'poison');
    expect(ticks).toHaveLength(DAMAGE_OVER_TIME_TURNS);
    expect(ticks[0]?.damage).toBe(Math.round(TOUGH_ENEMY.maxHp * POISON_MAX_HP_RATIO));
    expect(eventsOfType(played.events, 'statusExpired').some((event) => event.status === 'poison')).toBe(true);
  });

  it('đốt ăn 10% sát thương của đòn vừa đánh', () => {
    const played = castTimes(withEnemy(battle(), { statuses: [enemyStatus('burn', DAMAGE_OVER_TIME_TURNS)] }), 1);
    const tick = eventsOfType(played.events, 'statusTick')[0];
    expect(tick?.damage).toBe(Math.max(1, Math.round(lastHit(played) * BURN_DAMAGE_RATIO)));
  });

  it('sát thương theo lượt không tự hạ quái', () => {
    const played = castTimes(withEnemy(battle(), { hp: 11, statuses: [enemyStatus('poison', 3, 100)] }), 1);
    // Đòn chiêu 10 máu còn 1; độc không được hạ tiếp.
    expect(enemyOf(played.state).hp).toBe(1);
  });

  it('đóng băng: đòn kế mạnh thêm 25% rồi vỡ', () => {
    const plain = castTimes(battle(), 1);
    const frozen = castTimes(withEnemy(battle(), { statuses: [enemyStatus('freeze')] }), 1);
    expect(lastHit(frozen)).toBe(Math.round(lastHit(plain) * (1 + FREEZE_DAMAGE_BONUS)));
    expect(enemyOf(frozen.state).statuses.some((status) => status.kind === 'freeze')).toBe(false);
  });

  it('choáng làm quái mất lượt đánh, tiêu trước lượt né', () => {
    let played = withHero(withEnemy(battle(), { statuses: [enemyStatus('stun')] }), { evadeCharges: 1 });
    played = play(played, wrongAnswer(), STEP_MS);
    const attack = eventsOfType(played.events, 'enemyAttack').at(-1);
    expect(attack).toMatchObject({ damage: 0, prevented: 'stun', evaded: false });
    expect(played.state.hero.evadeCharges).toBe(1);
    expect(played.state.hero.hp).toBe(played.state.hero.maxHp);
  });

  it('trùm không mất lượt vì choáng hay đóng băng', () => {
    let played = withEnemy(battle(VERB, BOSS), { statuses: [enemyStatus('stun'), enemyStatus('freeze')] });
    played = play(played, wrongAnswer(), STEP_MS);
    expect(eventsOfType(played.events, 'enemyAttack').at(-1)?.prevented).toBeNull();
    expect(played.state.hero.hp).toBeLessThan(played.state.hero.maxHp);
  });

  it('khiên lửa chặn đốt nhưng độc vẫn ăn', () => {
    let played = withEnemy(battle(VERB, BOSS), {
      shielded: true,
      statuses: [enemyStatus('burn', 3), enemyStatus('poison', 3)],
    });
    played = castTimes(played, 1);
    expect(eventsOfType(played.events, 'shieldBlocked')).toHaveLength(1);
    expect(eventsOfType(played.events, 'statusTick').map((tick) => tick.status)).toEqual(['poison']);
  });
});

describe('trạng thái trên hiệp sĩ', () => {
  it('tăng tốc kéo dài cửa sổ nối combo', () => {
    const hasted = withHero(castTimes(battle(), 1), { statuses: [{ kind: 'haste', turns: 3, power: 1 }] });
    const afterGap = play(hasted, null, COMBO_WINDOW_MS + HASTE_COMBO_WINDOW_BONUS_MS - 1);
    expect(eventsOfType(afterGap.events, 'comboBreak')).toHaveLength(0);
    const plain = play(castTimes(battle(), 1), null, COMBO_WINDOW_MS + 1);
    expect(plain.state.combo.count).toBe(0);
  });

  it('hồi máu không vượt máu tối đa', () => {
    const word = battleWord('castle', 'noun');
    let played = withHero(battle(word), { hp: 50 });
    played = castTimes(played, 10);
    const heals = eventsOfType(played.events, 'heal');
    expect(heals.length).toBeGreaterThan(0);
    expect(heals[0]?.amount).toBeLessThanOrEqual(Math.ceil(played.state.hero.maxHp * HEAL_MAX_HP_RATIO * 1.25));
    expect(played.state.hero.hp).toBeLessThanOrEqual(played.state.hero.maxHp);
  });
});
