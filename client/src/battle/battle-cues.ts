import {
  BASE_SKILL_TIERS,
  comboTierFor,
  skillMoveById,
  skillVariantFor,
  STATUS_FX,
  SYSTEM_FX,
  type BattleEvent,
  type ComboTier,
  type PreventingStatusKind,
  type SkillElement,
  type SkillKind,
  type SkillTiers,
  type StatusKind,
} from '@herox/shared';

export type CueTarget = 'hero' | 'enemy';
export type BattleSound = 'cast' | 'hit' | 'heavyHit' | 'enemyHit' | 'miss' | 'combo' | 'evade' | 'victory' | 'defeat';
export type HeroMove = 'dash' | 'blink';
/** `heal`: chữ hồi máu; `skill`: tên chiêu / bậc combo, chữ lớn. */
export type FloatTone = 'damage' | 'info' | 'bad' | 'heal' | 'skill';
/** Động tác nhân vật: hiệp sĩ chém/niệm, quái lao vào, ai trúng đòn thì giật lùi. */
export type ActorAction = 'strike' | 'cast' | 'lunge' | 'hurt';

/**
 * Chỗ đặt hiệu ứng pixelfx theo loại chiêu:
 * - `body` (mặc định): ngang thân nhân vật, vẽ trên sprite — dùng cho hiệu ứng trúng ở quái.
 * - `under`: dưới/sau sprite hiệp sĩ (hào quang, khiên, tụ phép) để nhân vật đứng trong vầng sáng, không bị che mặt.
 * - `front`: phía trước hiệp sĩ, hướng lên quái (kiếm khí) — vẫn trên sprite nhưng lệch ra trước.
 */
export type FxAnchor = 'body' | 'under' | 'front';

/** Việc màn trận cần làm để thể hiện một sự kiện của `battle-state`; tách khỏi Phaser để test được. */
export type BattleCue = (
  | {
      readonly type: 'fx';
      readonly fx: string;
      readonly target: CueTarget;
      readonly scale: number;
      /** Chỗ đặt hiệu ứng; bỏ trống = `body` (hành vi cũ, dùng cho hiệu ứng ở quái). */
      readonly anchor?: FxAnchor;
      /** Bật pha trộn cộng sáng (ADD) cho hiệu ứng sáng để hoà vào cảnh thay vì che nhân vật. */
      readonly add?: boolean;
    }
  /** Luồng sáng bay từ nhân vật `from` sang đối thủ, để thấy chiêu đi tới đâu trước khi trúng. */
  | { readonly type: 'projectile'; readonly from: CueTarget; readonly tone: ProjectileTone; readonly durationMs: number }
  | { readonly type: 'sound'; readonly sound: BattleSound }
  | { readonly type: 'floatText'; readonly target: CueTarget; readonly text: string; readonly tone: FloatTone }
  | { readonly type: 'heroMove'; readonly move: HeroMove }
  | { readonly type: 'actor'; readonly target: CueTarget; readonly action: ActorAction }
  /** Khựng hình ngắn khi đòn nặng trúng (kết liễu, chiêu bậc cao nhất). */
  | { readonly type: 'hitstop'; readonly durationMs: number }
  | { readonly type: 'shake'; readonly strong: boolean }
) & {
  /** Chờ bao lâu (ms) mới phát, để đòn trúng khớp lúc chiêu bay tới / nhân vật lao tới. */
  readonly delayMs?: number;
};

/** Màu luồng phép bay theo hệ của chiêu. */
export type ProjectileTone = SkillElement;

const NORMAL_SCALE = 1;
const SHIELD_FX_SCALE = 1.6;
/** Hiệu ứng đốt/độc ăn máu theo lượt nhỏ hơn hiệu ứng lúc dính, để không lấn đòn chính. */
const STATUS_TICK_FX_SCALE = 0.6;
const FINISHER_HITSTOP_MS = 80;
const EPIC_HITSTOP_MS = 80;
/** Đòn chém: hiệp sĩ lao lên chạm quái thì mới trúng (khớp `strikeLungeMs` của battle-actors). */
const MELEE_IMPACT_DELAY_MS = 220;
/** Phép / kiếm khí bay từ hiệp sĩ tới quái. */
const SPELL_FLIGHT_MS = 520;
/** Quái lao xuống chạm hiệp sĩ (khớp `enemyLungeMs`). */
const ENEMY_IMPACT_DELAY_MS = 260;
const GUARD_FORM_DELAY_MS = 260;
/** Đốt/độc hiện sau số sát thương chính một nhịp, để hai số không chồng nhau. */
const STATUS_TICK_DELAY_MS = 240;

/** Bậc combo: từ bậc 2 nhát chém phóng kiếm khí, bậc 3 hiện tên chiêu, bậc 4 hào quang + rung mạnh, bậc 5 khựng hình. */
const SWORD_WAVE_COMBO_TIER: ComboTier = 2;
const NAMED_COMBO_TIER: ComboTier = 3;
const GRAND_COMBO_TIER: ComboTier = 4;
const EPIC_COMBO_TIER: ComboTier = 5;
const BASE_COMBO_TIER: ComboTier = 1;

/** Chiêu bậc combo cao phóng hiệu ứng to hơn; chỉ đổi hình, không đổi sức mạnh. */
const FX_SCALE_BONUS_BY_TIER: Readonly<Record<ComboTier, number>> = { 1: 0, 2: 0, 3: 0, 4: 0.3, 5: 0.5 };

const GRAND_SHOWCASE_BONUS_MS = 200;
const EPIC_SHOWCASE_BONUS_MS = 400;
const SHOWCASE_BONUS_MS_BY_TIER: Readonly<Record<ComboTier, number>> = {
  1: 0,
  2: 0,
  3: 0,
  4: GRAND_SHOWCASE_BONUS_MS,
  5: EPIC_SHOWCASE_BONUS_MS,
};

/** Hệ dùng khi không tra được chiêu (id lạ): giữ màu cũ — kiếm khí sáng thánh, phép nguyền tím. */
const FALLBACK_ELEMENT_BY_KIND: Readonly<Record<SkillKind, SkillElement>> = {
  attack: 'holy',
  guard: 'holy',
  empower: 'shadow',
  evade: 'physical',
};

/** Chữ báo lúc dính trạng thái; hồi máu / hút máu không có chữ vì sự kiện `heal` đã hiện số máu hồi. */
const STATUS_LABELS: Readonly<Record<StatusKind, string | null>> = {
  burn: 'Bỏng!',
  poison: 'Trúng độc!',
  freeze: 'Đóng băng!',
  stun: 'Choáng!',
  haste: 'Tăng tốc!',
  curse: 'Suy yếu!',
  heal: null,
  lifesteal: null,
};

const PREVENTED_LABELS: Readonly<Record<PreventingStatusKind, string>> = {
  stun: 'Choáng, mất lượt',
  freeze: 'Đóng băng, mất lượt',
};

const FREEZE_BROKEN_LABEL = 'Băng vỡ!';

/** Thời gian xem chiêu cộng thêm theo bậc combo, để chiêu lớn kịp phô diễn trước đề kế. */
export function showcaseBonusMsFor(tier: ComboTier): number {
  return SHOWCASE_BONUS_MS_BY_TIER[tier];
}

type CastEvent = Extract<BattleEvent, { type: 'cast' }>;
type EnemyAttackEvent = Extract<BattleEvent, { type: 'enemyAttack' }>;

/** Hình ảnh đã chốt cho một lần tung chiêu: FX của chiêu bốc được, hoặc FX biến thể cũ khi chưa sẵn sàng. */
interface CastPlan {
  readonly skill: SkillKind;
  readonly tier: ComboTier;
  readonly castFx: string;
  readonly impactFx: string;
  readonly fxScale: number;
  readonly element: SkillElement;
  readonly ranged: boolean;
  /** Tên chiêu; null khi không tra được chiêu. */
  readonly moveName: string | null;
}

function resolveCastPlan(event: CastEvent, tiers: SkillTiers, isFxReady: (name: string) => boolean): CastPlan {
  const fallback = skillVariantFor(event.skill, tiers[event.skill], event.mastered);
  const found = skillMoveById(event.moveId);
  // Id lệch loại chiêu coi như không tra được, để không vẽ khiên cho đòn chém.
  const move = found?.kind === event.skill ? found : undefined;
  const pickFx = (moveFx: string | undefined, fallbackFx: string): string =>
    moveFx !== undefined && isFxReady(moveFx) ? moveFx : fallbackFx;
  return {
    skill: event.skill,
    tier: event.comboTier,
    castFx: pickFx(move?.castFx, fallback.castFx),
    impactFx: pickFx(move?.impactFx, fallback.impactFx),
    // Cỡ hiệu ứng vẫn theo bậc tháp phép (biến thể cũ), bậc combo cao phóng to thêm.
    fxScale: fallback.fxScale + FX_SCALE_BONUS_BY_TIER[event.comboTier],
    element: move?.element ?? FALLBACK_ELEMENT_BY_KIND[event.skill],
    ranged: move?.ranged ?? false,
    moveName: move?.name ?? null,
  };
}

/** Chiêu có luồng bay tới quái: phép bắn xa, phép làm yếu, hoặc nhát chém từ bậc 2 phóng kiếm khí. */
function fliesToEnemy(plan: CastPlan): boolean {
  if (plan.ranged || plan.skill === 'empower') return true;
  return plan.skill === 'attack' && plan.tier >= SWORD_WAVE_COMBO_TIER;
}

/** Né: thuấn bộ khi chiêu dùng hiệu ứng biến mất, còn lại lướt. Tấn công cận chiến thì chém, còn lại niệm. */
function heroMotionCue(plan: CastPlan): BattleCue {
  if (plan.skill === 'evade') return { type: 'heroMove', move: plan.castFx === SYSTEM_FX.blinkOut ? 'blink' : 'dash' };
  const strikes = plan.skill === 'attack' && !plan.ranged;
  return { type: 'actor', target: 'hero', action: strikes ? 'strike' : 'cast' };
}

/**
 * Chỗ đặt hiệu ứng niệm chiêu của hiệp sĩ, để chiêu không đè lên mặt nhân vật:
 * - attack: kiếm khí ra phía trước, hướng lên quái, cộng sáng.
 * - empower: vầng phép tụ dưới/sau chân, cộng sáng.
 * - guard/evade: giữ mặc định (khiên có hiệu ứng riêng; né là thuấn bộ/lướt, không phải vầng sáng).
 */
function castFxPlacement(skill: SkillKind): { anchor?: FxAnchor; add?: boolean } {
  if (skill === 'attack') return { anchor: 'front', add: true };
  if (skill === 'empower') return { anchor: 'under', add: true };
  return {};
}

function hitstopMsFor(finisher: boolean, tier: ComboTier): number {
  if (finisher) return FINISHER_HITSTOP_MS;
  return tier >= EPIC_COMBO_TIER ? EPIC_HITSTOP_MS : 0;
}

/** Combo vừa chạm ngưỡng lên bậc mới (từ bậc 2), để báo người chơi chiêu sắp mạnh hơn. */
function reachedNewTier(count: number): ComboTier | null {
  const tier = comboTierFor(count);
  return tier >= SWORD_WAVE_COMBO_TIER && tier > comboTierFor(count - 1) ? tier : null;
}

/**
 * Đổi sự kiện trận thành chuỗi cue hình/tiếng. Nhớ chiêu vừa tung để cú `hit` và trạng thái ngay sau dùng đúng
 * hiệu ứng và nhịp trúng của chiêu đó (các sự kiện này không mang loại chiêu).
 */
export class BattleCueMapper {
  private lastCast: CastPlan | null = null;
  private impactDelayMs = 0;
  /** Sự kiện gần nhất là lượt sai: băng hết lúc này là băng bị tiêu vào lượt quái mất, chữ "mất lượt" đã đủ. */
  private afterMiss = false;

  /** `isFxReady`: atlas hiệu ứng đã tải chưa; chưa thì lùi về hiệu ứng của biến thể chiêu cũ. */
  constructor(
    private readonly tiers: SkillTiers = BASE_SKILL_TIERS,
    private readonly isFxReady: (name: string) => boolean = () => true,
  ) {}

  cuesFor(event: BattleEvent): BattleCue[] {
    switch (event.type) {
      case 'enemySpawn':
        return [{ type: 'fx', fx: SYSTEM_FX.enemySpawn, target: 'enemy', scale: NORMAL_SCALE }];
      case 'prompt':
        return [];
      case 'cast':
        return this.castCues(event);
      case 'comboUp':
        return comboUpCues(event.count, event.chainId);
      case 'hit':
        return this.hitCues(event.damage, event.finisher);
      case 'miss':
        // Lượt kế không có chiêu bay: trạng thái do quái đánh (băng vỡ, mất lượt) hiện ngay.
        this.impactDelayMs = 0;
        this.afterMiss = true;
        return [
          { type: 'floatText', target: 'hero', text: event.reason === 'timeout' ? 'Hết giờ' : 'Sai từ', tone: 'bad' },
          { type: 'sound', sound: 'miss' },
        ];
      case 'comboBreak':
        return [{ type: 'floatText', target: 'hero', text: `Đứt chuỗi ×${event.count}`, tone: 'bad' }];
      case 'statusApplied':
        return this.statusAppliedCues(event.target, event.status);
      case 'statusTick':
        return this.statusTickCues(event.status, event.damage);
      case 'statusExpired':
        return this.statusExpiredCues(event.target, event.status);
      case 'heal':
        return event.amount > 0 ? [{ type: 'floatText', target: 'hero', text: `+${event.amount}`, tone: 'heal' }] : [];
      case 'enemyAttack':
        return enemyAttackCues(event);
      case 'enemyDefeated':
        return [
          { type: 'fx', fx: SYSTEM_FX.enemyDeath, target: 'enemy', scale: NORMAL_SCALE },
          { type: 'floatText', target: 'enemy', text: `+${event.rewardGold} vàng`, tone: 'info' },
        ];
      case 'enemyShieldUp':
        return enemyShieldUpCues(event.minCombo);
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

  private castCues(event: CastEvent): BattleCue[] {
    this.afterMiss = false;
    const plan = resolveCastPlan(event, this.tiers, this.isFxReady);
    const flies = fliesToEnemy(plan);
    this.lastCast = plan;
    this.impactDelayMs = flies ? SPELL_FLIGHT_MS : MELEE_IMPACT_DELAY_MS;
    const cues: BattleCue[] = [];
    // Chiêu bậc cao: hào quang thánh quanh hiệp sĩ trước khi ra chiêu.
    if (plan.tier >= GRAND_COMBO_TIER) cues.push({ type: 'fx', fx: SYSTEM_FX.levelUp, target: 'hero', scale: NORMAL_SCALE, anchor: 'under', add: true });
    cues.push(
      { type: 'fx', fx: plan.castFx, target: 'hero', scale: plan.fxScale, ...castFxPlacement(plan.skill) },
      { type: 'sound', sound: 'cast' },
      heroMotionCue(plan),
    );
    if (plan.moveName !== null && plan.tier >= NAMED_COMBO_TIER) cues.push({ type: 'floatText', target: 'hero', text: plan.moveName, tone: 'skill' });
    // Khiên hiện dần quanh hiệp sĩ sau động tác niệm.
    if (plan.skill === 'guard') cues.push({ type: 'fx', fx: plan.impactFx, target: 'hero', scale: plan.fxScale, anchor: 'under', add: true, delayMs: GUARD_FORM_DELAY_MS });
    if (flies) cues.push({ type: 'projectile', from: 'hero', tone: plan.element, durationMs: SPELL_FLIGHT_MS });
    return cues;
  }

  private hitCues(damage: number, finisher: boolean): BattleCue[] {
    const plan = this.lastCast;
    const tier = plan?.tier ?? BASE_COMBO_TIER;
    const heavy = finisher || tier >= GRAND_COMBO_TIER;
    const impact = finisher
      ? { fx: SYSTEM_FX.finisher, scale: NORMAL_SCALE }
      : { fx: plan?.impactFx ?? SYSTEM_FX.enemyStrike, scale: plan?.fxScale ?? NORMAL_SCALE };
    const cues: BattleCue[] = [
      { type: 'fx', fx: impact.fx, target: 'enemy', scale: impact.scale },
      { type: 'actor', target: 'enemy', action: 'hurt' },
      { type: 'floatText', target: 'enemy', text: `-${damage}`, tone: 'damage' },
      { type: 'sound', sound: heavy ? 'heavyHit' : 'hit' },
      { type: 'shake', strong: heavy },
    ];
    const hitstopMs = hitstopMsFor(finisher, tier);
    if (hitstopMs > 0) cues.push({ type: 'hitstop', durationMs: hitstopMs });
    return withDelay(cues, this.impactDelayMs);
  }

  /** Trạng thái lên quái chờ cùng nhịp đòn trúng, để không hiện trước khi chiêu tới; lên hiệp sĩ thì hiện ngay. */
  private statusAppliedCues(target: CueTarget, status: StatusKind): BattleCue[] {
    const label = STATUS_LABELS[status];
    const fx: BattleCue =
      target === 'hero'
        ? { type: 'fx', fx: STATUS_FX[status], target, scale: NORMAL_SCALE, anchor: 'under', add: true }
        : { type: 'fx', fx: STATUS_FX[status], target, scale: NORMAL_SCALE };
    const cues: BattleCue[] = label === null ? [fx] : [fx, { type: 'floatText', target, text: label, tone: 'info' }];
    return target === 'enemy' ? withDelay(cues, this.impactDelayMs) : cues;
  }

  private statusTickCues(status: StatusKind, damage: number): BattleCue[] {
    return withDelay(
      [
        { type: 'fx', fx: STATUS_FX[status], target: 'enemy', scale: STATUS_TICK_FX_SCALE },
        { type: 'floatText', target: 'enemy', text: `-${damage}`, tone: 'damage' },
      ],
      this.impactDelayMs + STATUS_TICK_DELAY_MS,
    );
  }

  private statusExpiredCues(target: CueTarget, status: StatusKind): BattleCue[] {
    if (target !== 'enemy' || status !== 'freeze' || this.afterMiss) return [];
    return withDelay([{ type: 'floatText', target: 'enemy', text: FREEZE_BROKEN_LABEL, tone: 'info' }], this.impactDelayMs);
  }
}

function comboUpCues(count: number, chainId: string | null): BattleCue[] {
  const cues: BattleCue[] = [
    { type: 'fx', fx: SYSTEM_FX.comboUp, target: 'hero', scale: NORMAL_SCALE, anchor: 'under', add: true },
    { type: 'floatText', target: 'hero', text: chainId === null ? `Combo ×${count}` : 'Chuỗi thánh ngôn!', tone: 'info' },
    { type: 'sound', sound: 'combo' },
  ];
  const newTier = reachedNewTier(count);
  if (newTier !== null) cues.push({ type: 'floatText', target: 'hero', text: `Bậc ${newTier}`, tone: 'skill' });
  return cues;
}

function enemyShieldUpCues(minCombo: number): BattleCue[] {
  // Trùm dựng khiên lửa: đòn lẻ bị chặn, phải nối đủ combo đúng liên tiếp mới xuyên.
  return [
    { type: 'fx', fx: SYSTEM_FX.shieldBlock, target: 'enemy', scale: SHIELD_FX_SCALE },
    { type: 'floatText', target: 'enemy', text: `Khiên lửa! Cần combo ×${minCombo}`, tone: 'bad' },
    { type: 'shake', strong: true },
  ];
}

function enemyAttackCues(event: EnemyAttackEvent): BattleCue[] {
  if (event.prevented !== null) {
    // Quái choáng / đóng băng mất lượt: không lao lên, chỉ hiện trạng thái đang giữ nó.
    return [
      { type: 'fx', fx: STATUS_FX[event.prevented], target: 'enemy', scale: NORMAL_SCALE },
      { type: 'floatText', target: 'enemy', text: PREVENTED_LABELS[event.prevented], tone: 'info' },
    ];
  }
  if (event.evaded) {
    return [
      { type: 'fx', fx: SYSTEM_FX.dashDust, target: 'hero', scale: NORMAL_SCALE },
      { type: 'heroMove', move: 'dash' },
      { type: 'floatText', target: 'hero', text: 'Né!', tone: 'info' },
      { type: 'sound', sound: 'evade' },
    ];
  }
  const cues: BattleCue[] = [{ type: 'fx', fx: SYSTEM_FX.enemyStrike, target: 'hero', scale: NORMAL_SCALE }];
  if (event.absorbed > 0) cues.push({ type: 'fx', fx: SYSTEM_FX.shieldBlock, target: 'hero', scale: NORMAL_SCALE });
  const taken = event.damage - event.absorbed;
  if (taken > 0) cues.push({ type: 'actor', target: 'hero', action: 'hurt' });
  cues.push(
    { type: 'floatText', target: 'hero', text: taken > 0 ? `-${taken}` : 'Khiên đỡ', tone: taken > 0 ? 'bad' : 'info' },
    { type: 'sound', sound: 'enemyHit' },
    { type: 'shake', strong: false },
  );
  return [{ type: 'actor', target: 'enemy', action: 'lunge' }, ...withDelay(cues, ENEMY_IMPACT_DELAY_MS)];
}

function withDelay(cues: readonly BattleCue[], delayMs: number): BattleCue[] {
  return delayMs > 0 ? cues.map((cue) => ({ ...cue, delayMs })) : [...cues];
}
