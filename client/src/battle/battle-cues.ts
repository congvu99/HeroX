import {
  BASE_SKILL_TIERS,
  skillVariantFor,
  SYSTEM_FX,
  type BattleEvent,
  type SkillKind,
  type SkillTiers,
  type SkillVariant,
} from '@herox/shared';

export type CueTarget = 'hero' | 'enemy';
export type BattleSound = 'cast' | 'hit' | 'heavyHit' | 'enemyHit' | 'miss' | 'combo' | 'evade' | 'victory' | 'defeat';
export type HeroMove = 'dash' | 'blink';
export type FloatTone = 'damage' | 'info' | 'bad';

/** Việc màn trận cần làm để thể hiện một sự kiện của `battle-state`; tách khỏi Phaser để test được. */
export type BattleCue =
  /** `mirrored`: hiệu ứng vốn hướng sang phải (phía quái), lật lại khi đòn đi từ quái về phía hiệp sĩ. */
  | { readonly type: 'fx'; readonly fx: string; readonly target: CueTarget; readonly scale: number; readonly mirrored?: boolean }
  | { readonly type: 'sound'; readonly sound: BattleSound }
  | { readonly type: 'floatText'; readonly target: CueTarget; readonly text: string; readonly tone: FloatTone }
  | { readonly type: 'heroMove'; readonly move: HeroMove }
  | { readonly type: 'shake'; readonly strong: boolean };

const NORMAL_SCALE = 1;
const SHIELD_FX_SCALE = 1.6;

/** Né bằng thuấn bộ khi biến thể chiêu dùng hiệu ứng biến mất; còn lại là lướt. */
function heroMoveFor(variant: SkillVariant): HeroMove {
  return variant.castFx === SYSTEM_FX.blinkOut ? 'blink' : 'dash';
}

/**
 * Đổi sự kiện trận thành chuỗi cue hình/tiếng. Nhớ chiêu vừa tung để cú `hit` ngay sau dùng đúng hiệu ứng trúng
 * của chiêu đó (sự kiện `hit` không mang loại chiêu).
 */
export class BattleCueMapper {
  private lastVariant: SkillVariant | null = null;

  constructor(private readonly tiers: SkillTiers = BASE_SKILL_TIERS) {}

  cuesFor(event: BattleEvent): BattleCue[] {
    switch (event.type) {
      case 'enemySpawn':
        return [{ type: 'fx', fx: SYSTEM_FX.enemySpawn, target: 'enemy', scale: NORMAL_SCALE }];
      case 'prompt':
        return [];
      case 'cast':
        return this.castCues(event.skill, event.mastered);
      case 'comboUp':
        return [
          { type: 'fx', fx: SYSTEM_FX.comboUp, target: 'hero', scale: NORMAL_SCALE },
          { type: 'floatText', target: 'hero', text: event.chainId === null ? `Combo ×${event.count}` : 'Chuỗi thánh ngôn!', tone: 'info' },
          { type: 'sound', sound: 'combo' },
        ];
      case 'hit':
        return this.hitCues(event.damage, event.finisher);
      case 'miss':
        return [
          { type: 'floatText', target: 'hero', text: event.reason === 'timeout' ? 'Hết giờ' : 'Sai từ', tone: 'bad' },
          { type: 'sound', sound: 'miss' },
        ];
      case 'comboBreak':
        return [{ type: 'floatText', target: 'hero', text: `Đứt chuỗi ×${event.count}`, tone: 'bad' }];
      case 'enemyAttack':
        return this.enemyAttackCues(event.damage, event.absorbed, event.evaded);
      case 'enemyDefeated':
        return [
          { type: 'fx', fx: SYSTEM_FX.enemyDeath, target: 'enemy', scale: NORMAL_SCALE },
          { type: 'floatText', target: 'enemy', text: `+${event.rewardGold} vàng`, tone: 'info' },
        ];
      case 'enemyShieldUp':
        // Trùm dựng khiên lửa: đòn lẻ bị chặn, phải nối đủ combo đúng liên tiếp mới xuyên.
        return [
          { type: 'fx', fx: SYSTEM_FX.shieldBlock, target: 'enemy', scale: SHIELD_FX_SCALE },
          { type: 'floatText', target: 'enemy', text: `Khiên lửa! Cần combo ×${event.minCombo}`, tone: 'bad' },
          { type: 'shake', strong: true },
        ];
      case 'shieldBlocked':
        return [
          { type: 'fx', fx: SYSTEM_FX.shieldBlock, target: 'enemy', scale: NORMAL_SCALE },
          { type: 'floatText', target: 'enemy', text: `Khiên chặn · còn ${event.comboNeeded}`, tone: 'info' },
        ];
      case 'victory':
        return [{ type: 'sound', sound: 'victory' }];
      case 'defeat':
        return [{ type: 'sound', sound: 'defeat' }];
    }
  }

  private castCues(skill: SkillKind, mastered: boolean): BattleCue[] {
    const variant = skillVariantFor(skill, this.tiers[skill], mastered);
    this.lastVariant = variant;
    const cues: BattleCue[] = [
      { type: 'fx', fx: variant.castFx, target: 'hero', scale: variant.fxScale },
      { type: 'sound', sound: 'cast' },
    ];
    if (skill === 'evade') cues.push({ type: 'heroMove', move: heroMoveFor(variant) });
    return cues;
  }

  private hitCues(damage: number, finisher: boolean): BattleCue[] {
    const variant = this.lastVariant;
    const impact = finisher
      ? { fx: SYSTEM_FX.finisher, scale: NORMAL_SCALE }
      : { fx: variant?.impactFx ?? SYSTEM_FX.enemyStrike, scale: variant?.fxScale ?? NORMAL_SCALE };
    return [
      { type: 'fx', fx: impact.fx, target: 'enemy', scale: impact.scale },
      { type: 'floatText', target: 'enemy', text: `-${damage}`, tone: 'damage' },
      { type: 'sound', sound: finisher ? 'heavyHit' : 'hit' },
      { type: 'shake', strong: finisher },
    ];
  }

  private enemyAttackCues(damage: number, absorbed: number, evaded: boolean): BattleCue[] {
    if (evaded) {
      return [
        { type: 'fx', fx: SYSTEM_FX.dashDust, target: 'hero', scale: NORMAL_SCALE },
        { type: 'heroMove', move: 'dash' },
        { type: 'floatText', target: 'hero', text: 'Né!', tone: 'info' },
        { type: 'sound', sound: 'evade' },
      ];
    }
    const cues: BattleCue[] = [{ type: 'fx', fx: SYSTEM_FX.enemyStrike, target: 'hero', scale: NORMAL_SCALE, mirrored: true }];
    if (absorbed > 0) cues.push({ type: 'fx', fx: SYSTEM_FX.shieldBlock, target: 'hero', scale: NORMAL_SCALE });
    const taken = damage - absorbed;
    cues.push(
      { type: 'floatText', target: 'hero', text: taken > 0 ? `-${taken}` : 'Khiên đỡ', tone: taken > 0 ? 'bad' : 'info' },
      { type: 'sound', sound: 'enemyHit' },
      { type: 'shake', strong: false },
    );
    return cues;
  }
}
