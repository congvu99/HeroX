import type Phaser from 'phaser';
import { spriteAssetUrl } from './sprite-asset-urls';

/**
 * Hoạt ảnh hiệp sĩ trong trận từ các sheet LPC ô 192 px (hàng lên/trái/xuống/phải, nhân vật 64 px ở giữa ô).
 * Thiếu sheet nào thì động tác đó bỏ qua, hero vẫn đứng bằng khung đi bộ.
 */
const LPC_CELL_SIZE = 192;
/** Hàng hướng lên (sheet LPC: lên=0): khung dọc hiệp sĩ đứng dưới, nhìn lên phía quái. */
const UP_ROW = 0;

/** `fall`: sheet LPC "hurt" là động tác ngã gục, chỉ dùng khi thua; trúng đòn thường do màn trận giật lùi và nháy đỏ. */
export type HeroBattleMove = 'idle' | 'strike' | 'cast' | 'fall';

interface SheetSpec {
  readonly path: string;
  readonly columns: number;
  /** Sheet chỉ có một hàng (LPC hurt chỉ vẽ một hướng). */
  readonly singleRow: boolean;
  readonly frameRate: number;
  readonly repeat: number;
}

const SHEETS: Readonly<Record<HeroBattleMove, SheetSpec>> = {
  idle: { path: 'sprites/hero/hero_idle.png', columns: 2, singleRow: false, frameRate: 2, repeat: -1 },
  strike: { path: 'sprites/hero/hero_slash.png', columns: 6, singleRow: false, frameRate: 18, repeat: 0 },
  cast: { path: 'sprites/hero/hero_spellcast.png', columns: 7, singleRow: false, frameRate: 16, repeat: 0 },
  fall: { path: 'sprites/hero/hero_hurt.png', columns: 6, singleRow: true, frameRate: 10, repeat: 0 },
};

const MOVES = Object.keys(SHEETS) as HeroBattleMove[];

function textureKey(move: HeroBattleMove): string {
  return `hero-battle:${move}`;
}

export function heroBattleAnimationKey(move: HeroBattleMove): string {
  return `hero-battle-anim:${move}`;
}

/** Xếp các sheet vào hàng đợi tải (gọi ở `preload`). */
export function queueHeroBattleSheets(scene: Phaser.Scene): void {
  for (const move of MOVES) {
    const url = spriteAssetUrl(SHEETS[move].path);
    if (url === undefined || scene.textures.exists(textureKey(move))) continue;
    scene.load.spritesheet(textureKey(move), url, { frameWidth: LPC_CELL_SIZE, frameHeight: LPC_CELL_SIZE });
  }
}

/** Tạo hoạt ảnh hướng phải cho các sheet đã tải; trả tập động tác dùng được. */
export function prepareHeroBattleAnimations(scene: Phaser.Scene): ReadonlySet<HeroBattleMove> {
  const available = new Set<HeroBattleMove>();
  for (const move of MOVES) {
    if (!scene.textures.exists(textureKey(move))) continue;
    available.add(move);
    const key = heroBattleAnimationKey(move);
    if (scene.anims.exists(key)) continue;
    const spec = SHEETS[move];
    const start = spec.singleRow ? 0 : UP_ROW * spec.columns;
    scene.anims.create({
      key,
      frames: scene.anims.generateFrameNumbers(textureKey(move), { start, end: start + spec.columns - 1 }),
      frameRate: spec.frameRate,
      repeat: spec.repeat,
    });
  }
  return available;
}
