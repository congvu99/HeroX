import { describe, expect, it } from 'vitest';
import { BattleCueMapper, type BattleCue } from '../src/battle/battle-cues';

function fxOf(cues: readonly BattleCue[]): string[] {
  return cues.flatMap((cue) => (cue.type === 'fx' ? [cue.fx] : []));
}

function textsOf(cues: readonly BattleCue[]): string[] {
  return cues.flatMap((cue) => (cue.type === 'floatText' ? [cue.text] : []));
}

const HIT = { type: 'hit', damage: 12, enemyHp: 30, finisher: false, shield: 0, evadeCharges: 0, enemyWeakenedHits: 0 } as const;

describe('BattleCueMapper', () => {
  it('mỗi loại chiêu có hiệu ứng tung và trúng riêng', () => {
    const castFx = new Set<string>();
    for (const skill of ['attack', 'guard', 'empower', 'evade'] as const) {
      const mapper = new BattleCueMapper();
      const cast = fxOf(mapper.cuesFor({ type: 'cast', wordId: 'w', skill, accuracy: 'exact', mastered: false }));
      const hit = fxOf(mapper.cuesFor(HIT));
      expect(cast).toHaveLength(1);
      expect(hit).toHaveLength(1);
      castFx.add(cast[0] ?? '');
    }
    expect(castFx.size).toBe(4);
  });

  it('từ đã thuộc dùng hiệu ứng bậc cao hơn', () => {
    const mapper = new BattleCueMapper();
    expect(fxOf(mapper.cuesFor({ type: 'cast', wordId: 'w', skill: 'attack', accuracy: 'exact', mastered: false }))).toEqual(['attack-cast-1']);
    expect(fxOf(mapper.cuesFor({ type: 'cast', wordId: 'w', skill: 'attack', accuracy: 'exact', mastered: true }))).toEqual(['attack-cast-2']);
    expect(fxOf(mapper.cuesFor(HIT))).toEqual(['attack-impact-2']);
  });

  it('chiêu né kèm động tác lướt (bậc 1) hoặc thuấn bộ (bậc cao)', () => {
    const mapper = new BattleCueMapper();
    const dash = mapper.cuesFor({ type: 'cast', wordId: 'w', skill: 'evade', accuracy: 'ring', mastered: false });
    expect(dash).toContainEqual({ type: 'heroMove', move: 'dash' });
    const blink = mapper.cuesFor({ type: 'cast', wordId: 'w', skill: 'evade', accuracy: 'ring', mastered: true });
    expect(blink).toContainEqual({ type: 'heroMove', move: 'blink' });
  });

  it('đòn kết liễu dùng hiệu ứng riêng và rung mạnh', () => {
    const mapper = new BattleCueMapper();
    mapper.cuesFor({ type: 'cast', wordId: 'w', skill: 'attack', accuracy: 'exact', mastered: false });
    const cues = mapper.cuesFor({ ...HIT, finisher: true });
    expect(fxOf(cues)).toEqual(['finisher']);
    expect(cues).toContainEqual({ type: 'shake', strong: true });
  });

  it('quái đánh: né, khiên đỡ hết, trúng đòn', () => {
    const mapper = new BattleCueMapper();
    const evaded = mapper.cuesFor({ type: 'enemyAttack', damage: 0, absorbed: 0, evaded: true, heroHp: 100, shield: 0 });
    expect(textsOf(evaded)).toEqual(['Né!']);
    const blocked = mapper.cuesFor({ type: 'enemyAttack', damage: 10, absorbed: 10, evaded: false, heroHp: 100, shield: 0 });
    expect(fxOf(blocked)).toEqual(['enemy-strike', 'guard-cast-1']);
    expect(textsOf(blocked)).toEqual(['Khiên đỡ']);
    const hit = mapper.cuesFor({ type: 'enemyAttack', damage: 10, absorbed: 4, evaded: false, heroHp: 94, shield: 0 });
    expect(textsOf(hit)).toEqual(['-6']);
    expect(hit.find((cue) => cue.type === 'fx')).toMatchObject({ fx: 'enemy-strike', mirrored: true });
  });

  it('động tác: chém khi tấn công, niệm khi đỡ/cường hoá, quái giật khi trúng, hiệp sĩ chỉ giật khi mất máu', () => {
    const mapper = new BattleCueMapper();
    const actionsOf = (cues: readonly BattleCue[]): string[] => cues.flatMap((cue) => (cue.type === 'actor' ? [`${cue.target}:${cue.action}`] : []));
    expect(actionsOf(mapper.cuesFor({ type: 'cast', wordId: 'w', skill: 'attack', accuracy: 'exact', mastered: false }))).toEqual(['hero:strike']);
    expect(actionsOf(mapper.cuesFor({ type: 'cast', wordId: 'w', skill: 'guard', accuracy: 'exact', mastered: false }))).toEqual(['hero:cast']);
    expect(actionsOf(mapper.cuesFor({ type: 'cast', wordId: 'w', skill: 'empower', accuracy: 'exact', mastered: false }))).toEqual(['hero:cast']);
    expect(actionsOf(mapper.cuesFor({ type: 'cast', wordId: 'w', skill: 'evade', accuracy: 'exact', mastered: false }))).toEqual([]);
    expect(actionsOf(mapper.cuesFor(HIT))).toEqual(['enemy:hurt']);
    expect(actionsOf(mapper.cuesFor({ type: 'enemyAttack', damage: 10, absorbed: 10, evaded: false, heroHp: 100, shield: 0 }))).toEqual(['enemy:lunge']);
    expect(actionsOf(mapper.cuesFor({ type: 'enemyAttack', damage: 10, absorbed: 0, evaded: false, heroHp: 90, shield: 0 }))).toEqual([
      'enemy:lunge',
      'hero:hurt',
    ]);
  });

  it('chỉ đòn kết liễu mới khựng hình', () => {
    const mapper = new BattleCueMapper();
    expect(mapper.cuesFor(HIT).some((cue) => cue.type === 'hitstop')).toBe(false);
    expect(mapper.cuesFor({ ...HIT, finisher: true })).toContainEqual({ type: 'hitstop', durationMs: 80 });
  });

  it('combo, chuỗi cụm, đứt chuỗi, sai, hết giờ có chữ báo', () => {
    const mapper = new BattleCueMapper();
    expect(textsOf(mapper.cuesFor({ type: 'comboUp', count: 3, bonus: 'same-pos', multiplier: 1.3, chainId: null }))).toEqual(['Combo ×3']);
    expect(textsOf(mapper.cuesFor({ type: 'comboUp', count: 3, bonus: 'chain', multiplier: 1.6, chainId: 'run-away-quickly' }))).toEqual([
      'Chuỗi thánh ngôn!',
    ]);
    expect(textsOf(mapper.cuesFor({ type: 'comboBreak', count: 4 }))).toEqual(['Đứt chuỗi ×4']);
    expect(textsOf(mapper.cuesFor({ type: 'miss', wordId: 'w', reason: 'wrong' }))).toEqual(['Sai từ']);
    expect(textsOf(mapper.cuesFor({ type: 'miss', wordId: 'w', reason: 'timeout' }))).toEqual(['Hết giờ']);
  });

  it('quái hiện, quái chết, thắng, thua', () => {
    const mapper = new BattleCueMapper();
    expect(fxOf(mapper.cuesFor({ type: 'enemySpawn', enemyIndex: 0, kind: 'imp', maxHp: 40, elite: false }))).toEqual(['enemy-spawn']);
    expect(fxOf(mapper.cuesFor({ type: 'enemyDefeated', enemyIndex: 0, rewardGold: 8 }))).toEqual(['enemy-death']);
    expect(mapper.cuesFor({ type: 'victory', goldEarned: 8 })).toEqual([{ type: 'sound', sound: 'victory' }]);
    expect(mapper.cuesFor({ type: 'defeat' })).toEqual([{ type: 'sound', sound: 'defeat' }]);
    expect(mapper.cuesFor({ type: 'prompt', wordId: 'w', options: [], deadlineMs: 1 })).toEqual([]);
  });
});
