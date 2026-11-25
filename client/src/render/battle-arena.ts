import Phaser from 'phaser';
import {
  ARENA_CELL_PX,
  ARENA_ORIGIN,
  ARENA_THEMES,
  ARENA_TILE_SCALE,
  arenaCellCenter,
  type ArenaLayout,
  type ArenaThemeId,
} from '../battle/battle-arena-layout';
import { LOGICAL_HEIGHT, LOGICAL_WIDTH, MAX_VIEW_HEIGHT, MAX_VIEW_WIDTH, TILE_SIZE } from '../config/display';
import { hasMapAsset, mapAssetUrl } from '../maps/map-asset-urls';
import { CHAPTER_1_TILE_INDEX } from './chapter-1-tile-data';
import { GoldenHourAtmosphere } from './golden-hour-atmosphere';
import { lightingForArena } from './lighting-presets';
import type { LightSource } from './scene-atmosphere';

const ATLAS_PATH = 'tilesets/chapter-1.png';
const ATLAS_TEXTURE_KEY = 'battle-arena-tiles';
/**
 * Nền sân trận (PixelLab): ưu tiên nền riêng của theme (`battle-<theme>`), rồi nền chung (`battle-arena`).
 * Không có nền nào thì vẽ lưới tile như cũ.
 */
const SHARED_BACKDROP = 'battle-arena';
const BACKDROP_KEY_PREFIX = 'battle-backdrop:';

function backdropPath(name: string): string {
  return `backgrounds/${name}.png`;
}

function backdropTextureKey(name: string): string {
  return `${BACKDROP_KEY_PREFIX}${name}`;
}

/** Tên các nền có trong bản build: nền theme trước, nền chung cuối. */
const BACKDROP_NAMES: readonly string[] = [...ARENA_THEMES.map((theme) => `battle-${theme}`), SHARED_BACKDROP].filter(
  (name) => hasMapAsset(backdropPath(name)),
);
const EMBER_TEXTURE_KEY = 'battle-arena-ember';
const EMBER_SIZE = 2;
const EMBER_COLOR = 0xffa040;
/** Lớp nền tràn phủ phần khung nhìn ngoài sân (màn rộng/cao hơn 360×780); tối hơn để sân chính vẫn nổi. */
const BACKDROP_BLEED_DEPTH = -1;
const BACKDROP_BLEED_TINT = 0x8a8a8a;
const GROUND_DEPTH = 0;
const DECOR_DEPTH = 1;
/** Hạt lửa trên nhân vật, dưới lớp ánh sáng giờ vàng (độ sâu 9000 của `GoldenHourAtmosphere`). */
const EMBER_DEPTH = 50;
const EMBER_LIFESPAN_MS = 1800;
const EMBER_FREQUENCY_MS = 60;
const EMBER_RISE = { min: -40, max: -14 } as const;

/** Xếp atlas tile chương 1 và nền sân (nếu có) vào hàng đợi tải (gọi ở `preload`). */
export function queueArenaTiles(scene: Phaser.Scene): void {
  if (!scene.textures.exists(ATLAS_TEXTURE_KEY)) {
    scene.load.spritesheet(ATLAS_TEXTURE_KEY, mapAssetUrl(ATLAS_PATH), { frameWidth: TILE_SIZE, frameHeight: TILE_SIZE });
  }
  // Nền là tuỳ chọn: chỉ tải file có trong bản build (vài ảnh nhỏ, tải hết để khỏi phụ thuộc trận nào).
  for (const name of BACKDROP_NAMES) {
    const key = backdropTextureKey(name);
    if (!scene.textures.exists(key)) scene.load.image(key, mapAssetUrl(backdropPath(name)));
  }
}

/** Khoá texture nền dùng cho theme: nền riêng nếu đã tải, rồi nền chung; `undefined` khi không có. */
function backdropFor(scene: Phaser.Scene, theme: ArenaThemeId): string | undefined {
  return [`battle-${theme}`, SHARED_BACKDROP].map(backdropTextureKey).find((key) => scene.textures.exists(key));
}

export interface BattleArenaOptions {
  readonly lightingEnabled: boolean;
  /** Vùng sáng đi theo hiệp sĩ và quái (đọc toạ độ mỗi khung). */
  readonly actorLights: readonly { readonly source: LightSource; readonly radius: number }[];
}

/**
 * Sân trận: lưới tile vẽ một lần, ánh sáng giờ vàng với quầng ấm quanh cửa sổ/lò/cờ hiệu và quanh nhân vật, tàn lửa ở hầm trùm.
 * Thiếu atlas (lỗi tải) thì chỉ còn nền màu, trận vẫn chơi được.
 */
export class BattleArena {
  readonly atmosphere: GoldenHourAtmosphere;

  constructor(scene: Phaser.Scene, layout: ArenaLayout, options: BattleArenaOptions) {
    // Có nền thì vẽ nền (một ảnh phủ cả sân); thiếu thì vẽ lưới tile như cũ.
    const backdrop = backdropFor(scene, layout.theme);
    if (backdrop !== undefined) this.paintBackdrop(scene, backdrop);
    else if (scene.textures.exists(ATLAS_TEXTURE_KEY)) this.paintTiles(scene, layout);
    this.atmosphere = new GoldenHourAtmosphere(scene, { enabled: options.lightingEnabled, preset: lightingForArena(layout.theme) });
    for (const light of layout.lights) {
      this.atmosphere.addLight(arenaCellCenter(light.column, light.row), light.radius, light.flicker);
    }
    for (const light of options.actorLights) this.atmosphere.addLight(light.source, light.radius);
    if (layout.embers && options.lightingEnabled) this.addEmbers(scene, layout);
  }

  /** Vẽ nền chung: ảnh 192x352 phóng theo ARENA_TILE_SCALE, gốc trên-trái tại ARENA_ORIGIN, dưới nhân vật. */
  private paintBackdrop(scene: Phaser.Scene, textureKey: string): void {
    this.paintBackdropBleed(scene, textureKey);
    scene.add
      .image(ARENA_ORIGIN.x, ARENA_ORIGIN.y, textureKey)
      .setOrigin(0, 0)
      .setScale(ARENA_TILE_SCALE)
      .setDepth(GROUND_DEPTH);
  }

  /**
   * Cùng ảnh nền phóng phủ khung nhìn lớn nhất, căn giữa khung thiết kế: khung nhìn đổi cỡ (xoay máy, thanh Safari)
   * không phải vẽ lại.
   */
  private paintBackdropBleed(scene: Phaser.Scene, textureKey: string): void {
    const source = scene.textures.get(textureKey).getSourceImage();
    if (source.width <= 0 || source.height <= 0) return;
    const scale = Math.max(MAX_VIEW_WIDTH / source.width, MAX_VIEW_HEIGHT / source.height);
    scene.add
      .image(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2, textureKey)
      .setScale(scale)
      .setTint(BACKDROP_BLEED_TINT)
      .setDepth(BACKDROP_BLEED_DEPTH);
  }

  private paintTiles(scene: Phaser.Scene, layout: ArenaLayout): void {
    layout.cells.forEach((row, rowIndex) => {
      row.forEach((cell, column) => {
        const at = arenaCellCenter(column, rowIndex);
        this.addTile(scene, cell.ground, at, GROUND_DEPTH);
        if (cell.decor !== null) this.addTile(scene, cell.decor, at, DECOR_DEPTH);
      });
    });
  }

  private addTile(scene: Phaser.Scene, name: string, at: LightSource, depth: number): void {
    const frame = CHAPTER_1_TILE_INDEX[name];
    if (frame === undefined) return;
    scene.add.image(at.x, at.y, ATLAS_TEXTURE_KEY, frame).setScale(ARENA_TILE_SCALE).setDepth(depth);
  }

  private addEmbers(scene: Phaser.Scene, layout: ArenaLayout): void {
    if (!scene.textures.exists(EMBER_TEXTURE_KEY)) {
      const graphics = scene.make.graphics({}, false);
      graphics.fillStyle(EMBER_COLOR).fillRect(0, 0, EMBER_SIZE, EMBER_SIZE);
      graphics.generateTexture(EMBER_TEXTURE_KEY, EMBER_SIZE, EMBER_SIZE);
      graphics.destroy();
    }
    // Tàn lửa bốc lên từ hàng dung nham dưới cùng.
    const lastRow = layout.cells.length - 1;
    const width = (layout.cells[0]?.length ?? 0) * ARENA_CELL_PX;
    const zone = new Phaser.Geom.Rectangle(ARENA_ORIGIN.x, arenaCellCenter(0, lastRow).y - ARENA_CELL_PX / 2, width, ARENA_CELL_PX);
    scene.add
      .particles(0, 0, EMBER_TEXTURE_KEY, {
        emitZone: { type: 'random', source: zone, quantity: 1 },
        lifespan: EMBER_LIFESPAN_MS,
        speedY: EMBER_RISE,
        speedX: { min: -6, max: 6 },
        alpha: { start: 1, end: 0 },
        frequency: EMBER_FREQUENCY_MS,
        blendMode: Phaser.BlendModes.ADD,
      })
      .setDepth(EMBER_DEPTH);
  }
}

