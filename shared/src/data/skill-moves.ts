import type { ComboTier } from '../combat/combo-tier.js';
import type { SkillKind } from '../combat/skill-kind.js';
import type { StatusKind } from '../combat/status-effects.js';
import { SYSTEM_FX } from './skill-catalog.js';

/** Hệ của chiêu, quyết định màu luồng phép bay tới quái. */
export const SKILL_ELEMENTS = ['physical', 'holy', 'arcane', 'shadow', 'fire', 'ice', 'lightning', 'nature', 'water'] as const;
export type SkillElement = (typeof SKILL_ELEMENTS)[number];

/** Một chiêu cụ thể trong bộ chiêu: loại chiêu (theo từ loại) và bậc combo quyết định nhóm bốc ngẫu nhiên. */
export interface SkillMove {
  readonly id: string;
  readonly kind: SkillKind;
  readonly comboTier: ComboTier;
  readonly element: SkillElement;
  readonly name: string;
  /** Hiệu ứng ở hiệp sĩ lúc tung chiêu; tên trùng `name` trong `assets/fx/fx-manifest.json`. */
  readonly castFx: string;
  /** Hiệu ứng ở quái lúc trúng. */
  readonly impactFx: string;
  /** Chiêu bắn phép bay tới quái thay vì lao lên chém. */
  readonly ranged: boolean;
  /** Trạng thái chiêu có thể gây; tỉ lệ theo bậc combo (`STATUS_CHANCE_BY_COMBO_TIER`). */
  readonly status: StatusKind | null;
}

type MoveFields = Omit<SkillMove, 'id' | 'kind' | 'comboTier' | 'ranged' | 'status'> & {
  readonly ranged?: boolean;
  readonly status?: StatusKind;
};

function moves(kind: SkillKind, comboTier: ComboTier, list: Readonly<Record<string, MoveFields>>): SkillMove[] {
  return Object.entries(list).map(([slug, fields]) => ({
    id: `${kind}-${comboTier}-${slug}`,
    kind,
    comboTier,
    ranged: false,
    status: null,
    ...fields,
  }));
}

// Động từ → tấn công: chém, rồi lửa, sét, bóng tối, tới thiên thạch và thiên lôi ở combo 10+.
const ATTACK_MOVES: readonly SkillMove[] = [
  ...moves('attack', 1, {
    slash: { name: 'Lời Chém', element: 'physical', castFx: 'attack-cast-1', impactFx: 'attack-impact-1' },
    thrust: { name: 'Mũi Đâm Chữ', element: 'physical', castFx: 'melee-thrust', impactFx: 'impacts-hit-flash' },
    twin: { name: 'Song Trảm', element: 'physical', castFx: 'melee-double-slash', impactFx: 'attack-impact-1' },
    rising: { name: 'Hất Kiếm', element: 'physical', castFx: 'melee-uppercut', impactFx: 'guard-impact-1' },
  }),
  ...moves('attack', 2, {
    cleave: { name: 'Nhát Bổ Thánh Ngôn', element: 'physical', castFx: 'attack-cast-2', impactFx: 'attack-impact-2' },
    whirl: { name: 'Vũ Kiếm Xoáy', element: 'physical', castFx: 'melee-spin-slash', impactFx: 'attack-impact-1' },
    spark: { name: 'Thương Lôi', element: 'lightning', castFx: 'melee-spear-sweep', impactFx: 'lightning-zap-hit', status: 'stun' },
    flame: { name: 'Roi Lửa', element: 'fire', castFx: 'melee-whip-crack', impactFx: 'explosions-small-explosion', status: 'burn' },
  }),
  ...moves('attack', 3, {
    flurry: { name: 'Liên Trảm', element: 'physical', castFx: 'moves-sword-combo', impactFx: 'attack-impact-2' },
    fireball: { name: 'Hoả Cầu Ngôn', element: 'fire', castFx: 'fire-fireball', impactFx: 'explosions-small-explosion', ranged: true, status: 'burn' },
    chain: { name: 'Xích Lôi', element: 'lightning', castFx: 'lightning-chain-lightning', impactFx: 'lightning-zap-hit', ranged: true, status: 'stun' },
    reap: { name: 'Lưỡi Hái Bóng', element: 'shadow', castFx: 'melee-scythe-reap', impactFx: 'shadow-life-steal', status: 'lifesteal' },
  }),
  ...moves('attack', 4, {
    hammer: { name: 'Búa Phán Xét', element: 'physical', castFx: 'melee-hammer-smash', impactFx: 'impacts-ground-slam', status: 'stun' },
    lance: { name: 'Thương Băng', element: 'ice', castFx: 'moves-ice-lance-throw', impactFx: 'ice-shatter', ranged: true, status: 'freeze' },
    pillar: { name: 'Cột Lửa', element: 'fire', castFx: 'fire-flame-pillar', impactFx: 'fire-ring', ranged: true, status: 'burn' },
    bolt: { name: 'Sét Giáng', element: 'lightning', castFx: 'lightning-strike', impactFx: 'lightning-thunderclap', ranged: true, status: 'stun' },
    drain: { name: 'Rút Hồn', element: 'shadow', castFx: 'shadow-soul-drain', impactFx: 'shadow-dark-explosion', ranged: true, status: 'lifesteal' },
  }),
  ...moves('attack', 5, {
    meteor: { name: 'Thiên Thạch Ngôn', element: 'fire', castFx: 'fire-meteor', impactFx: 'fire-ring', ranged: true, status: 'burn' },
    thunder: { name: 'Thiên Lôi', element: 'lightning', castFx: 'moves-lightning-call', impactFx: 'lightning-thunderclap', ranged: true, status: 'stun' },
    judgment: { name: 'Phán Quyết Ánh Sáng', element: 'holy', castFx: 'moves-holy-smite', impactFx: 'holy-pillar', ranged: true, status: 'heal' },
    eclipse: { name: 'Nhật Thực', element: 'shadow', castFx: 'shadow-eclipse', impactFx: 'shadow-dark-explosion', ranged: true, status: 'lifesteal' },
  }),
];

// Danh từ → khiên: thánh quang hồi máu, băng làm quái đứng hình, đất đá làm choáng.
const GUARD_MOVES: readonly SkillMove[] = [
  ...moves('guard', 1, {
    shield: { name: 'Khiên Chữ', element: 'physical', castFx: 'guard-cast-1', impactFx: 'guard-impact-1' },
    thorns: { name: 'Khiên Gai', element: 'nature', castFx: 'nature-thorns', impactFx: 'guard-impact-1' },
    bubble: { name: 'Màn Bọt Nước', element: 'water', castFx: 'water-bubbles', impactFx: 'water-splash' },
  }),
  ...moves('guard', 2, {
    dome: { name: 'Vòm Thánh Quang', element: 'holy', castFx: 'guard-cast-2', impactFx: 'guard-impact-2', status: 'heal' },
    crystal: { name: 'Pha Lê Băng', element: 'ice', castFx: 'ice-crystal', impactFx: 'ice-snowflake-burst', status: 'freeze' },
    halo: { name: 'Hào Quang', element: 'holy', castFx: 'holy-halo', impactFx: 'guard-impact-2', status: 'heal' },
  }),
  ...moves('guard', 3, {
    orb: { name: 'Cầu Nước Hộ Thân', element: 'water', castFx: 'water-orb', impactFx: 'water-wave-crash', status: 'heal' },
    nova: { name: 'Băng Hoàn', element: 'ice', castFx: 'ice-frost-nova', impactFx: 'ice-freeze', status: 'freeze' },
    bloom: { name: 'Hoa Hồi Sinh', element: 'nature', castFx: 'nature-healing-bloom', impactFx: 'nature-thorns', status: 'heal' },
  }),
  ...moves('guard', 4, {
    hymn: { name: 'Thánh Ca', element: 'holy', castFx: 'holy-heal-aoe', impactFx: 'holy-feather-burst', status: 'heal' },
    spikes: { name: 'Tường Gai Băng', element: 'ice', castFx: 'ice-spikes', impactFx: 'ice-shatter', status: 'freeze' },
    bulwark: { name: 'Thành Đá', element: 'nature', castFx: 'nature-earth-spike', impactFx: 'impacts-ground-slam', status: 'stun' },
  }),
  ...moves('guard', 5, {
    fortress: { name: 'Thành Luỹ Thánh Ngôn', element: 'holy', castFx: 'holy-sunburst', impactFx: 'holy-pillar', status: 'heal' },
    blizzard: { name: 'Bão Tuyết Hộ Thân', element: 'ice', castFx: 'ice-blizzard-vortex', impactFx: 'ice-icicle-fall', status: 'freeze' },
    rebirth: { name: 'Phục Sinh', element: 'holy', castFx: 'holy-resurrection', impactFx: 'holy-feather-burst', status: 'heal' },
  }),
];

// Tính từ → làm yếu: nguyền, độc, băng giá, tới hố đen phong ấn ở combo 10+.
const EMPOWER_MOVES: readonly SkillMove[] = [
  ...moves('empower', 1, {
    chains: { name: 'Xiềng Ngôn', element: 'shadow', castFx: 'empower-cast-1', impactFx: 'empower-impact-1' },
    rune: { name: 'Vòng Ấn Chữ', element: 'arcane', castFx: 'arcane-rune-circle', impactFx: 'empower-impact-1' },
    spores: { name: 'Bào Tử', element: 'nature', castFx: 'nature-spore-burst', impactFx: 'nature-acid-splash' },
  }),
  ...moves('empower', 2, {
    seal: { name: 'Ấn Câm Lặng', element: 'shadow', castFx: 'empower-cast-2', impactFx: 'empower-impact-2', status: 'curse' },
    miasma: { name: 'Mây Độc', element: 'nature', castFx: 'nature-poison-cloud', impactFx: 'nature-toxic-puddle', status: 'poison' },
    roots: { name: 'Rễ Trói', element: 'nature', castFx: 'nature-root-snare', impactFx: 'nature-vine-whip', status: 'curse' },
  }),
  ...moves('empower', 3, {
    tendrils: { name: 'Xúc Tu Bóng', element: 'shadow', castFx: 'shadow-tendrils', impactFx: 'shadow-curse', status: 'curse' },
    frost: { name: 'Hàn Ấn', element: 'ice', castFx: 'ice-frost-breath', impactFx: 'ice-freeze', ranged: true, status: 'freeze' },
    acid: { name: 'Axit Ăn Mòn', element: 'nature', castFx: 'nature-acid-splash', impactFx: 'nature-toxic-puddle', ranged: true, status: 'poison' },
  }),
  ...moves('empower', 4, {
    skulls: { name: 'Sọ Vong Linh', element: 'shadow', castFx: 'shadow-necro-skulls', impactFx: 'shadow-flames', ranged: true, status: 'poison' },
    stasis: { name: 'Ngưng Thời', element: 'arcane', castFx: 'arcane-time-stop', impactFx: 'arcane-rune-circle', status: 'freeze' },
    void: { name: 'Cầu Hư Không', element: 'shadow', castFx: 'shadow-void-orb', impactFx: 'shadow-dark-explosion', ranged: true, status: 'curse' },
  }),
  ...moves('empower', 5, {
    abyss: { name: 'Phong Ấn Vực Sâu', element: 'shadow', castFx: 'shadow-black-hole', impactFx: 'empower-impact-2', status: 'curse' },
    starfall: { name: 'Mưa Sao Băng', element: 'arcane', castFx: 'arcane-star-fall', impactFx: 'explosions-implosion', ranged: true, status: 'stun' },
    blight: { name: 'Bão Lá Độc', element: 'nature', castFx: 'nature-leaf-storm', impactFx: 'nature-poison-cloud', ranged: true, status: 'poison' },
  }),
];

// Trạng từ, giới từ → né: lướt, thuấn bộ, rồi tăng tốc để nối combo dễ hơn.
const EVADE_MOVES: readonly SkillMove[] = [
  ...moves('evade', 1, {
    dash: { name: 'Bước Lướt', element: 'physical', castFx: SYSTEM_FX.dashDust, impactFx: 'attack-impact-1' },
    smoke: { name: 'Màn Khói', element: 'physical', castFx: 'explosions-smoke-bomb', impactFx: 'attack-impact-1' },
    ripple: { name: 'Bước Sóng', element: 'water', castFx: 'water-ripples', impactFx: 'water-splash' },
  }),
  ...moves('evade', 2, {
    blink: { name: 'Thuấn Bộ', element: 'arcane', castFx: SYSTEM_FX.blinkOut, impactFx: 'attack-impact-1', status: 'haste' },
    arc: { name: 'Tia Lướt', element: 'lightning', castFx: 'lightning-spark-arc', impactFx: 'lightning-zap-hit', status: 'haste' },
    strike: { name: 'Lướt Chém', element: 'physical', castFx: 'moves-dash-strike', impactFx: 'impacts-hit-flash', status: 'haste' },
  }),
  ...moves('evade', 3, {
    portal: { name: 'Cổng Dịch Chuyển', element: 'arcane', castFx: 'arcane-portal', impactFx: 'arcane-missiles', status: 'haste' },
    tornado: { name: 'Lốc Xoáy', element: 'nature', castFx: 'nature-tornado', impactFx: 'guard-impact-1', status: 'haste' },
    sphere: { name: 'Cầu Sét', element: 'lightning', castFx: 'lightning-ball-lightning', impactFx: 'lightning-electrified', ranged: true, status: 'stun' },
  }),
  ...moves('evade', 4, {
    phantom: { name: 'Bóng Ánh Sáng', element: 'holy', castFx: SYSTEM_FX.blinkOut, impactFx: 'attack-impact-2', status: 'haste' },
    cyclone: { name: 'Lốc Lửa', element: 'fire', castFx: 'fire-tornado', impactFx: 'fire-spirit-flame', status: 'haste' },
    whirlpool: { name: 'Xoáy Nước', element: 'water', castFx: 'water-whirlpool', impactFx: 'water-geyser', status: 'haste' },
  }),
  ...moves('evade', 5, {
    tempest: { name: 'Mây Bão', element: 'lightning', castFx: 'lightning-storm-cloud', impactFx: 'lightning-strike', status: 'stun' },
    timeflow: { name: 'Dòng Thời Gian', element: 'arcane', castFx: 'arcane-magic-circle-cast', impactFx: 'arcane-orb', status: 'haste' },
    ascension: { name: 'Thăng Thiên', element: 'holy', castFx: 'spawn-soul-rise', impactFx: 'holy-halo', status: 'haste' },
  }),
];

/** Hiệu ứng hiện trên mục tiêu lúc dính trạng thái (lặp với trạng thái kéo dài, chạy một lần với trạng thái tức thì). */
export const STATUS_FX: Readonly<Record<StatusKind, string>> = {
  burn: 'status-burning',
  poison: 'status-poisoned',
  freeze: 'status-frozen',
  stun: 'status-stunned',
  lifesteal: 'shadow-life-steal',
  heal: 'holy-heal',
  haste: 'status-haste',
  curse: 'status-cursed',
};

/** Toàn bộ chiêu trong trận, nhóm theo loại chiêu và bậc combo. */
export const SKILL_MOVES: readonly SkillMove[] = [...ATTACK_MOVES, ...GUARD_MOVES, ...EMPOWER_MOVES, ...EVADE_MOVES];

const MOVES_BY_ID: ReadonlyMap<string, SkillMove> = new Map(SKILL_MOVES.map((move) => [move.id, move]));

export function skillMoveById(id: string): SkillMove | undefined {
  return MOVES_BY_ID.get(id);
}

/** Các chiêu của một nhóm (loại chiêu + bậc combo). */
export function skillMovesFor(kind: SkillKind, comboTier: ComboTier): readonly SkillMove[] {
  return SKILL_MOVES.filter((move) => move.kind === kind && move.comboTier === comboTier);
}
