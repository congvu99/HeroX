import Phaser from 'phaser';
import { ARENA_CELL_PX, ARENA_ORIGIN, ARENA_TILE_SCALE, arenaCellCenter, type ArenaLayout } from '../battle/battle-arena-layout';
import { TILE_SIZE } from '../config/display';
import { mapAssetUrl } from '../maps/map-asset-urls';
import { DarkAtmosphere, type LightSource } from './dark-atmosphere';

const ATLAS_PATH = 'tilesets/chapter-1.png';
const ATLAS_TEXTURE_KEY = 'battle-arena-tiles';
const EMBER_TEXTURE_KEY = 'battle-arena-ember';
const EMBER_SIZE = 2;
const EMBER_COLOR = 0xffa040;
const GROUND_DEPTH = 0;
const DECOR_DEPTH = 1;
/** Hạt lửa trên nhân vật, dưới lớp tối (độ sâu 9000 của `DarkAtmosphere`). */
const EMBER_DEPTH = 50;
const EMBER_LIFESPAN_MS = 1800;
const EMBER_FREQUENCY_MS = 60;
const EMBER_RISE = { min: -40, max: -14 } as const;

const tileIndexFiles = import.meta.glob<Record<string, number>>('../../../assets/tilesets/chapter-1-tiles.json', {
  eager: true,
  import: 'default',
});
const TILE_INDEX: Readonly<Record<string, number>> = Object.values(tileIndexFiles)[0] ?? {};

/** Xếp atlas tile chương 1 vào hàng đợi tải (gọi ở `preload`). */
export function queueArenaTiles(scene: Phaser.Scene): void {
  if (scene.textures.exists(ATLAS_TEXTURE_KEY)) return;
  scene.load.spritesheet(ATLAS_TEXTURE_KEY, mapAssetUrl(ATLAS_PATH), { frameWidth: TILE_SIZE, frameHeight: TILE_SIZE });
}

export interface BattleArenaOptions {
  readonly lightingEnabled: boolean;
  /** Vùng sáng đi theo hiệp sĩ và quái (đọc toạ độ mỗi khung). */
  readonly actorLights: readonly { readonly source: LightSource; readonly radius: number }[];
}

/**
 * Sân trận: lưới tile vẽ một lần, lớp tối khoét sáng quanh nến/lò/dung nham và quanh nhân vật, tàn lửa ở hang trùm.
 * Thiếu atlas (lỗi tải) thì chỉ còn nền màu, trận vẫn chơi được.
 */
export class BattleArena {
  readonly atmosphere: DarkAtmosphere;

  constructor(scene: Phaser.Scene, layout: ArenaLayout, options: BattleArenaOptions) {
    if (scene.textures.exists(ATLAS_TEXTURE_KEY)) this.paintTiles(scene, layout);
    this.atmosphere = new DarkAtmosphere(scene, { enabled: options.lightingEnabled });
    for (const light of layout.lights) {
      this.atmosphere.addLight(arenaCellCenter(light.column, light.row), light.radius, light.flicker);
    }
    for (const light of options.actorLights) this.atmosphere.addLight(light.source, light.radius);
    if (layout.embers && options.lightingEnabled) this.addEmbers(scene, layout);
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
    const frame = TILE_INDEX[name];
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

