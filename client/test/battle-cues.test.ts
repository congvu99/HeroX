import { skillMoveById, STATUS_FX, type BattleEvent, type ComboTier, type SkillKind, type SkillMove } from '@herox/shared';
import { describe, expect, it } from 'vitest';
import { BattleCueMapper, showcaseBonusMsFor, type BattleCue } from '../src/battle/battle-cues';

function fxOf(cues: readonly BattleCue[]): string[] {
  return cues.flatMap((cue) => (cue.type === 'fx' ? [cue.fx] : []));
}

function textsOf(cues: readonly BattleCue[]): string[] {
  return cues.flatMap((cue) => (cue.type === 'floatText' ? [cue.text] : []));
}

function projectileOf(cues: readonly BattleCue[]): BattleCue | undefined {
  return cues.find((cue) => cue.type === 'projectile');
}

/** Chiêu thật trong bộ chiêu của shared; id sai thì test hỏng ngay thay vì lặng lẽ lùi về FX cũ. */
function moveById(id: string): SkillMove {
  const move = skillMoveById(id);
  if (move === undefined) throw new Error(`Không có chiêu ${id}`);
  return move;
}

function castOf(moveId: string, mastered = false): BattleEvent {
  const move = moveById(moveId);
  return { type: 'cast', wordId: 'w', skill: move.kind, accuracy: 'exact', mastered, moveId, comboTier: move.comboTier };
}

const SLASH = 'attack-1-slash';
const CLEAVE = 'attack-2-cleave';
const FIREBALL = 'attack-3-fireball';
const HAMMER = 'attack-4-hammer';
const METEOR = 'attack-5-meteor';
const TIER_ONE_MOVES: Readonly<Record<SkillKind, string>> = {
  attack: SLASH,
  guard: 'guard-1-shield',
  empower: 'empower-1-chains',
  evade: 'evade-1-dash',
};

const HIT = { type: 'hit', damage: 12, enemyHp: 30, finisher: false, shield: 0, evadeCharges: 0, enemyWeakenedHits: 0 } as const;

function enemyAttack(damage: number, absorbed: number, evaded = false): BattleEvent {
  return { type: 'enemyAttack', damage, absorbed, evaded, heroHp: 100, shield: 0, prevented: null };
}

describe('BattleCueMapper', () => {
  it('mỗi loại chiêu có hiệu ứng tung và trúng riêng', () => {
    const castFx = new Set<string>();
    for (const moveId of Object.values(TIER_ONE_MOVES)) {
      const mapper = new BattleCueMapper();
      const cast = fxOf(mapper.cuesFor(castOf(moveId)));
      const hit = fxOf(mapper.cuesFor(HIT));
      // Khiên có thêm hình khiên hiện quanh hiệp sĩ sau động tác niệm.
      expect(cast).toHaveLength(moveById(moveId).kind === 'guard' ? 2 : 1);
      expect(hit).toHaveLength(1);
      castFx.add(cast[0] ?? '');
    }
    expect(castFx.size).toBe(4);
  });

  it('chiêu dùng hiệu ứng tung/trúng của chiêu bốc được', () => {
    const mapper = new BattleCueMapper();
    const fireball = moveById(FIREBALL);
    expect(fxOf(mapper.cuesFor(castOf(FIREBALL)))).toEqual([fireball.castFx]);
    expect(fxOf(mapper.cuesFor(HIT))).toEqual([fireball.impactFx]);
  });

  it('atlas chiêu chưa sẵn sàng hoặc id lạ thì lùi về hiệu ứng biến thể cũ (từ đã thuộc lên bậc)', () => {
    const notReady = new BattleCueMapper(undefined, () => false);
    expect(fxOf(notReady.cuesFor(castOf(FIREBALL)))).toEqual(['attack-cast-1']);
    expect(fxOf(notReady.cuesFor(HIT))).toEqual(['attack-impact-1']);
    expect(fxOf(notReady.cuesFor(castOf(SLASH, true)))).toEqual(['attack-cast-2']);

    const unknown = new BattleCueMapper();
    const cues = unknown.cuesFor({ type: 'cast', wordId: 'w', skill: 'empower', accuracy: 'exact', mastered: false, moveId: 'nope', comboTier: 1 });
    expect(fxOf(cues)).toEqual(['empower-cast-1']);
    expect(projectileOf(cues)).toMatchObject({ tone: 'shadow' });
  });

  it('chỉ hiệu ứng chưa tải mới bị thay, hiệu ứng đã tải vẫn dùng của chiêu', () => {
    const fireball = moveById(FIREBALL);
    const mapper = new BattleCueMapper(undefined, (name) => name === fireball.castFx);
    expect(fxOf(mapper.cuesFor(castOf(FIREBALL)))).toEqual([fireball.castFx]);
    expect(fxOf(mapper.cuesFor(HIT))).toEqual(['attack-impact-1']);
  });

  it('luồng bay mang màu theo hệ chiêu; chém bậc 1 cận chiến, từ bậc 2 phóng kiếm khí', () => {
    const mapper = new BattleCueMapper();
    const slash = mapper.cuesFor(castOf(SLASH));
    expect(projectileOf(slash)).toBeUndefined();
    expect(mapper.cuesFor(HIT).every((cue) => cue.delayMs === 220)).toBe(true);

    expect(projectileOf(mapper.cuesFor(castOf(CLEAVE)))).toMatchObject({ from: 'hero', tone: 'physical', durationMs: 520 });
    expect(mapper.cuesFor(HIT).every((cue) => cue.delayMs === 520)).toBe(true);

    const fireball = mapper.cuesFor(castOf(FIREBALL));
    expect(projectileOf(fireball)).toMatchObject({ tone: 'fire' });
    // Phép bắn xa thì niệm, không lao lên chém.
    expect(fireball).toContainEqual({ type: 'actor', target: 'hero', action: 'cast' });

    expect(projectileOf(mapper.cuesFor(castOf('empower-2-miasma')))).toMatchObject({ tone: 'nature' });
    expect(projectileOf(mapper.cuesFor(castOf('guard-2-crystal')))).toBeUndefined();
  });

  it('bậc 3 hiện tên chiêu; bậc 4 thêm hào quang và phóng to hiệu ứng', () => {
    const mapper = new BattleCueMapper();
    expect(textsOf(mapper.cuesFor(castOf(CLEAVE)))).toEqual([]);
    const fireball = mapper.cuesFor(castOf(FIREBALL));
    expect(fireball).toContainEqual({ type: 'floatText', target: 'hero', text: moveById(FIREBALL).name, tone: 'skill' });
    expect(fxOf(fireball)).not.toContain('level-up');

    const hammer = mapper.cuesFor(castOf(HAMMER));
    expect(fxOf(hammer)).toEqual(['level-up', moveById(HAMMER).castFx]);
    const castFx = hammer.find((cue) => cue.type === 'fx' && cue.fx === moveById(HAMMER).castFx);
    expect(castFx).toMatchObject({ scale: 1.3 });
  });

  it('đòn trúng: bậc 4 rung mạnh, bậc 5 thêm khựng hình', () => {
    const mapper = new BattleCueMapper();
    mapper.cuesFor(castOf(FIREBALL));
    const normal = mapper.cuesFor(HIT);
    expect(normal).toContainEqual({ type: 'shake', strong: false, delayMs: 520 });
    expect(normal.some((cue) => cue.type === 'hitstop')).toBe(false);

    mapper.cuesFor(castOf(HAMMER));
    const grand = mapper.cuesFor(HIT);
    expect(grand).toContainEqual({ type: 'shake', strong: true, delayMs: 520 });
    expect(grand.some((cue) => cue.type === 'hitstop')).toBe(false);

    mapper.cuesFor(castOf(METEOR));
    const epic = mapper.cuesFor(HIT);
    expect(epic).toContainEqual({ type: 'shake', strong: true, delayMs: 520 });
    expect(epic).toContainEqual({ type: 'hitstop', durationMs: 80, delayMs: 520 });
  });

  it('chiêu né kèm động tác lướt hoặc thuấn bộ theo hiệu ứng chiêu', () => {
    const mapper = new BattleCueMapper();
    expect(mapper.cuesFor(castOf('evade-1-dash'))).toContainEqual({ type: 'heroMove', move: 'dash' });
    expect(mapper.cuesFor(castOf('evade-2-blink'))).toContainEqual({ type: 'heroMove', move: 'blink' });
    // Lùi về biến thể cũ: từ đã thuộc dùng thuấn bộ.
    const fallback = new BattleCueMapper(undefined, () => false);
    expect(fallback.cuesFor(castOf('evade-1-ripple', true))).toContainEqual({ type: 'heroMove', move: 'blink' });
  });

  it('đòn kết liễu dùng hiệu ứng riêng, rung mạnh và khựng hình', () => {
    const mapper = new BattleCueMapper();
    mapper.cuesFor(castOf(SLASH));
    const cues = mapper.cuesFor({ ...HIT, finisher: true });
    expect(fxOf(cues)).toEqual(['finisher']);
    expect(cues).toContainEqual({ type: 'shake', strong: true, delayMs: 220 });
    expect(cues).toContainEqual({ type: 'hitstop', durationMs: 80, delayMs: 220 });
  });

  it('chỉ đòn nặng mới khựng hình', () => {
    const mapper = new BattleCueMapper();
    expect(mapper.cuesFor(HIT).some((cue) => cue.type === 'hitstop')).toBe(false);
    expect(mapper.cuesFor({ ...HIT, finisher: true })).toContainEqual({ type: 'hitstop', durationMs: 80 });
  });

  it('trạng thái lên quái chờ chiêu trúng, lên hiệp sĩ hiện ngay dưới chân', () => {
    const mapper = new BattleCueMapper();
    mapper.cuesFor(castOf(FIREBALL));
    const burn = mapper.cuesFor({ type: 'statusApplied', target: 'enemy', status: 'burn', turns: 3 });
    expect(burn).toEqual([
      { type: 'fx', fx: STATUS_FX.burn, target: 'enemy', scale: 1, delayMs: 520 },
      { type: 'floatText', target: 'enemy', text: 'Bỏng!', tone: 'info', delayMs: 520 },
    ]);
    const haste = mapper.cuesFor({ type: 'statusApplied', target: 'hero', status: 'haste', turns: 3 });
    expect(haste).toEqual([
      { type: 'fx', fx: STATUS_FX.haste, target: 'hero', scale: 1, anchor: 'under', add: true },
      { type: 'floatText', target: 'hero', text: 'Tăng tốc!', tone: 'info' },
    ]);
    expect(textsOf(mapper.cuesFor({ type: 'statusApplied', target: 'enemy', status: 'curse', turns: 1 }))).toEqual(['Suy yếu!']);
    // Hồi máu / hút máu: chỉ hiệu ứng, số máu do sự kiện `heal` hiện.
    const heal = mapper.cuesFor({ type: 'statusApplied', target: 'hero', status: 'heal', turns: 0 });
    expect(fxOf(heal)).toEqual([STATUS_FX.heal]);
    expect(textsOf(heal)).toEqual([]);
  });

  it('đốt/độc ăn máu hiện sau số sát thương chính một nhịp', () => {
    const mapper = new BattleCueMapper();
    mapper.cuesFor(castOf(SLASH));
    const tick = mapper.cuesFor({ type: 'statusTick', status: 'poison', damage: 3, enemyHp: 20 });
    expect(fxOf(tick)).toEqual([STATUS_FX.poison]);
    expect(tick).toContainEqual({ type: 'floatText', target: 'enemy', text: '-3', tone: 'damage', delayMs: 460 });
    expect(tick.every((cue) => (cue.delayMs ?? 0) > 220)).toBe(true);
  });

  it('hết trạng thái: chỉ băng vỡ trên quái có chữ', () => {
    const mapper = new BattleCueMapper();
    mapper.cuesFor(castOf(SLASH));
    expect(mapper.cuesFor({ type: 'statusExpired', target: 'enemy', status: 'freeze' })).toEqual([
      { type: 'floatText', target: 'enemy', text: 'Băng vỡ!', tone: 'info', delayMs: 220 },
    ]);
    expect(mapper.cuesFor({ type: 'statusExpired', target: 'enemy', status: 'burn' })).toEqual([]);
    expect(mapper.cuesFor({ type: 'statusExpired', target: 'hero', status: 'haste' })).toEqual([]);
    // Sau khi sai, băng vỡ do quái tiêu lượt hiện ngay.
    mapper.cuesFor({ type: 'miss', wordId: 'w', reason: 'wrong' });
    expect(mapper.cuesFor({ type: 'statusExpired', target: 'enemy', status: 'freeze' })[0]?.delayMs).toBeUndefined();
  });

  it('hồi máu hiện số xanh ở hiệp sĩ; hồi 0 thì không hiện', () => {
    const mapper = new BattleCueMapper();
    expect(mapper.cuesFor({ type: 'heal', amount: 7, heroHp: 90, source: 'lifesteal' })).toEqual([
      { type: 'floatText', target: 'hero', text: '+7', tone: 'heal' },
    ]);
    expect(mapper.cuesFor({ type: 'heal', amount: 0, heroHp: 100, source: 'heal' })).toEqual([]);
  });

  it('quái choáng / đóng băng mất lượt: không lao lên, không đánh', () => {
    const mapper = new BattleCueMapper();
    for (const [prevented, text] of [
      ['stun', 'Choáng, mất lượt'],
      ['freeze', 'Đóng băng, mất lượt'],
    ] as const) {
      const cues = mapper.cuesFor({ type: 'enemyAttack', damage: 0, absorbed: 0, evaded: false, heroHp: 100, shield: 0, prevented });
      expect(cues).toEqual([
        { type: 'fx', fx: STATUS_FX[prevented], target: 'enemy', scale: 1 },
        { type: 'floatText', target: 'enemy', text, tone: 'info' },
      ]);
    }
  });

  it('băng tiêu vào lượt quái mất sau lượt sai: không hiện thêm chữ Băng vỡ', () => {
    const mapper = new BattleCueMapper();
    mapper.cuesFor({ type: 'miss', wordId: 'w', reason: 'wrong' });
    expect(mapper.cuesFor({ type: 'statusExpired', target: 'enemy', status: 'freeze' })).toEqual([]);
  });

  it('quái đánh: né, khiên đỡ hết, trúng đòn', () => {
    const mapper = new BattleCueMapper();
    expect(textsOf(mapper.cuesFor(enemyAttack(0, 0, true)))).toEqual(['Né!']);
    const blocked = mapper.cuesFor(enemyAttack(10, 10));
    expect(fxOf(blocked)).toEqual(['enemy-strike', 'guard-cast-1']);
    expect(textsOf(blocked)).toEqual(['Khiên đỡ']);
    const hit = mapper.cuesFor(enemyAttack(10, 4));
    expect(textsOf(hit)).toEqual(['-6']);
    // Quái lao xuống trước, đòn trúng hiệp sĩ phát sau đó.
    expect(hit[0]).toMatchObject({ type: 'actor', action: 'lunge' });
    expect(hit[0]?.delayMs).toBeUndefined();
    expect(hit.find((cue) => cue.type === 'fx')).toMatchObject({ fx: 'enemy-strike', delayMs: 260 });
  });

  it('động tác: chém khi tấn công, niệm khi đỡ/cường hoá, quái giật khi trúng, hiệp sĩ chỉ giật khi mất máu', () => {
    const mapper = new BattleCueMapper();
    const actionsOf = (cues: readonly BattleCue[]): string[] => cues.flatMap((cue) => (cue.type === 'actor' ? [`${cue.target}:${cue.action}`] : []));
    expect(actionsOf(mapper.cuesFor(castOf(TIER_ONE_MOVES.attack)))).toEqual(['hero:strike']);
    expect(actionsOf(mapper.cuesFor(castOf(TIER_ONE_MOVES.guard)))).toEqual(['hero:cast']);
    expect(actionsOf(mapper.cuesFor(castOf(TIER_ONE_MOVES.empower)))).toEqual(['hero:cast']);
    expect(actionsOf(mapper.cuesFor(castOf(TIER_ONE_MOVES.evade)))).toEqual([]);
    expect(actionsOf(mapper.cuesFor(HIT))).toEqual(['enemy:hurt']);
    expect(actionsOf(mapper.cuesFor(enemyAttack(10, 10)))).toEqual(['enemy:lunge']);
    expect(actionsOf(mapper.cuesFor(enemyAttack(10, 0)))).toEqual(['enemy:lunge', 'hero:hurt']);
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

  it('combo chạm ngưỡng lên bậc mới thì báo thêm bậc', () => {
    const mapper = new BattleCueMapper();
    const comboUp = (count: number): BattleCue[] => mapper.cuesFor({ type: 'comboUp', count, bonus: 'same-pos', multiplier: 1, chainId: null });
    expect(textsOf(comboUp(2))).toEqual(['Combo ×2', 'Bậc 2']);
    expect(textsOf(comboUp(4))).toEqual(['Combo ×4', 'Bậc 3']);
    expect(textsOf(comboUp(5))).toEqual(['Combo ×5']);
    expect(textsOf(comboUp(6))).toEqual(['Combo ×6', 'Bậc 4']);
    expect(comboUp(10)).toContainEqual({ type: 'floatText', target: 'hero', text: 'Bậc 5', tone: 'skill' });
    expect(textsOf(comboUp(11))).toEqual(['Combo ×11']);
  });

  it('thời gian xem chiêu cộng thêm theo bậc combo', () => {
    const bonuses = ([1, 2, 3, 4, 5] as const satisfies readonly ComboTier[]).map(showcaseBonusMsFor);
    expect(bonuses.slice(0, 3)).toEqual([0, 0, 0]);
    expect(bonuses[3]).toBeGreaterThan(0);
    expect(bonuses[4]).toBeGreaterThan(bonuses[3] ?? 0);
  });

  it('quái hiện, quái chết, thắng, thua', () => {
    const mapper = new BattleCueMapper();
    expect(fxOf(mapper.cuesFor({ type: 'enemySpawn', enemyIndex: 0, kind: 'imp', maxHp: 40, elite: false, boss: false }))).toEqual(['enemy-spawn']);
    expect(fxOf(mapper.cuesFor({ type: 'enemyDefeated', enemyIndex: 0, rewardGold: 8 }))).toEqual(['enemy-death']);
    expect(mapper.cuesFor({ type: 'victory', goldEarned: 8 })).toEqual([{ type: 'sound', sound: 'victory' }]);
    expect(mapper.cuesFor({ type: 'defeat' })).toEqual([{ type: 'sound', sound: 'defeat' }]);
    expect(mapper.cuesFor({ type: 'prompt', wordId: 'w', options: [], deadlineMs: 1 })).toEqual([]);
  });
});
