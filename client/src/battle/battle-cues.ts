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
/** Động tác nhân vật: hiệp sĩ chém/niệm, quái lao vào, ai trúng đòn thì giật lùi. */
export type ActorAction = 'strike' | 'cast' | 'lunge' | 'hurt';

/** Việc màn trận cần làm để thể hiện một sự kiện của `battle-state`; tách khỏi Phaser để test được. */
export type BattleCue = (
  | { readonly type: 'fx'; readonly fx: string; readonly target: CueTarget; readonly scale: number }
  /** Luồng sáng bay từ nhân vật `from` sang đối thủ, để thấy chiêu đi tới đâu trước khi trúng. */
  | { readonly type: 'projectile'; readonly from: CueTarget; readonly tone: ProjectileTone; readonly durationMs: number }
  | { readonly type: 'sound'; readonly sound: BattleSound }
  | { readonly type: 'floatText'; readonly target: CueTarget; readonly text: string; readonly tone: FloatTone }
  | { readonly type: 'heroMove'; readonly move: HeroMove }
  | { readonly type: 'actor'; readonly target: CueTarget; readonly action: ActorAction }
  /** Khựng hình ngắn khi đòn kết liễu trúng, cho cảm giác đòn nặng. */
  | { readonly type: 'hitstop'; readonly durationMs: number }
  | { readonly type: 'shake'; readonly strong: boolean }
) & {
  /** Chờ bao lâu (ms) mới phát, để đòn trúng khớp lúc chiêu bay tới / nhân vật lao tới. */
  readonly delayMs?: number;
};

export type ProjectileTone = 'holy' | 'curse';

const NORMAL_SCALE = 1;
const SHIELD_FX_SCALE = 1.6;
const FINISHER_HITSTOP_MS = 80;
/** Đòn chém: hiệp sĩ lao lên chạm quái thì mới trúng (khớp `strikeLungeMs` của battle-actors). */
const MELEE_IMPACT_DELAY_MS = 120;
/** Phép nguyền bay từ hiệp sĩ tới quái. */
const SPELL_FLIGHT_MS = 320;
/** Quái lao xuống chạm hiệp sĩ (khớp `enemyLungeMs`). */
const ENEMY_IMPACT_DELAY_MS = 150;

/** Bậc hoành tráng theo chuỗi đòn đúng: 0 thường, 1 từ đòn thứ 2, 2 từ đòn thứ 4. */
const RISING_STAGE = 1;
const GRAND_STAGE = 2;
const GRAND_STREAK = 4;
const GRAND_FX_SCALE_BONUS = 0.3;
const GUARD_FORM_DELAY_MS = 260;

function streakStage(streak: number): number {
  if (streak >= GRAND_STREAK) return GRAND_STAGE;
  return streak >= 2 ? RISING_STAGE : 0;
}

/** Chuỗi lên bậc thì chiêu bậc 1 mượn hình bậc 2 (`-1` → `-2`), chuỗi dài phóng to thêm. Chỉ đổi hình, không đổi sức mạnh. */
function escalate(variant: SkillVariant, stage: number): SkillVariant {
  if (stage === 0 || variant.kind === 'evade') return variant;
  const upgrade = (fx: string): string => fx.replace(/-1$/, '-2');
  const fxScale = stage >= GRAND_STAGE ? variant.fxScale + GRAND_FX_SCALE_BONUS : variant.fxScale;
  return { ...variant, castFx: upgrade(variant.castFx), impactFx: upgrade(variant.impactFx), fxScale };
}

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
  private impactDelayMs = 0;
  /** Số đòn đúng liên tiếp đã thấy, để chiêu càng về sau chuỗi càng hoành tráng. */
  private streak = 0;

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
        this.streak = event.count;
        return [
          { type: 'fx', fx: SYSTEM_FX.comboUp, target: 'hero', scale: NORMAL_SCALE },
          { type: 'floatText', target: 'hero', text: event.chainId === null ? `Combo ×${event.count}` : 'Chuỗi thánh ngôn!', tone: 'info' },
          { type: 'sound', sound: 'combo' },
        ];
      case 'hit':
        return this.hitCues(event.damage, event.finisher);
      case 'miss':
        this.streak = 0;
        return [
          { type: 'floatText', target: 'hero', text: event.reason === 'timeout' ? 'Hết giờ' : 'Sai từ', tone: 'bad' },
          { type: 'sound', sound: 'miss' },
        ];
      case 'comboBreak':
        this.streak = 0;
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
    const stage = streakStage(this.streak + 1);
    const variant = escalate(skillVariantFor(skill, this.tiers[skill], mastered), stage);
    this.lastVariant = variant;
    const cues: BattleCue[] = [
      { type: 'fx', fx: variant.castFx, target: 'hero', scale: variant.fxScale },
      { type: 'sound', sound: 'cast' },
    ];
    // Chuỗi dài: hào quang thánh quanh hiệp sĩ trước khi ra chiêu.
    if (stage >= GRAND_STAGE) cues.unshift({ type: 'fx', fx: SYSTEM_FX.levelUp, target: 'hero', scale: NORMAL_SCALE });
    if (skill === 'evade') cues.push({ type: 'heroMove', move: heroMoveFor(variant) });
    else cues.push({ type: 'actor', target: 'hero', action: skill === 'attack' ? 'strike' : 'cast' });
    // Khiên hiện dần quanh hiệp sĩ sau động tác niệm.
    if (skill === 'guard') cues.push({ type: 'fx', fx: variant.impactFx, target: 'hero', scale: variant.fxScale, delayMs: GUARD_FORM_DELAY_MS });
    if (skill === 'empower') cues.push({ type: 'projectile', from: 'hero', tone: 'curse', durationMs: SPELL_FLIGHT_MS });
    // Từ đòn thứ 2 của chuỗi, nhát chém phóng thêm kiếm khí sáng bay tới quái.
    if (skill === 'attack' && stage >= RISING_STAGE) cues.push({ type: 'projectile', from: 'hero', tone: 'holy', durationMs: SPELL_FLIGHT_MS });
    this.impactDelayMs = skill === 'empower' || stage >= RISING_STAGE ? SPELL_FLIGHT_MS : MELEE_IMPACT_DELAY_MS;
    return cues;
  }

  private hitCues(damage: number, finisher: boolean): BattleCue[] {
    const variant = this.lastVariant;
    const impact = finisher
      ? { fx: SYSTEM_FX.finisher, scale: NORMAL_SCALE }
      : { fx: variant?.impactFx ?? SYSTEM_FX.enemyStrike, scale: variant?.fxScale ?? NORMAL_SCALE };
    const cues: BattleCue[] = [
      { type: 'fx', fx: impact.fx, target: 'enemy', scale: impact.scale },
      { type: 'actor', target: 'enemy', action: 'hurt' },
      { type: 'floatText', target: 'enemy', text: `-${damage}`, tone: 'damage' },
      { type: 'sound', sound: finisher ? 'heavyHit' : 'hit' },
      { type: 'shake', strong: finisher },
    ];
    if (finisher) cues.push({ type: 'hitstop', durationMs: FINISHER_HITSTOP_MS });
    return withDelay(cues, this.impactDelayMs);
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
    const cues: BattleCue[] = [{ type: 'fx', fx: SYSTEM_FX.enemyStrike, target: 'hero', scale: NORMAL_SCALE }];
    if (absorbed > 0) cues.push({ type: 'fx', fx: SYSTEM_FX.shieldBlock, target: 'hero', scale: NORMAL_SCALE });
    const taken = damage - absorbed;
    if (taken > 0) cues.push({ type: 'actor', target: 'hero', action: 'hurt' });
    cues.push(
      { type: 'floatText', target: 'hero', text: taken > 0 ? `-${taken}` : 'Khiên đỡ', tone: taken > 0 ? 'bad' : 'info' },
      { type: 'sound', sound: 'enemyHit' },
      { type: 'shake', strong: false },
    );
    return [{ type: 'actor', target: 'enemy', action: 'lunge' }, ...withDelay(cues, ENEMY_IMPACT_DELAY_MS)];
  }
}

function withDelay(cues: readonly BattleCue[], delayMs: number): BattleCue[] {
  return delayMs > 0 ? cues.map((cue) => ({ ...cue, delayMs })) : [...cues];
}
