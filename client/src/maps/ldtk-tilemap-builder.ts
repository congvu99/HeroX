import type Phaser from 'phaser';
import type { MapLevel, MapProject, MapTileLayer } from './ldtk-loader';

/** Layer tile có tên bắt đầu bằng tiền tố này vẽ đè lên hero (mái nhà, tán cây). */
const OVERHEAD_LAYER_PREFIX = 'Overhead';
/** Lớp nền nằm dưới mọi sprite (sprite dùng depth = toạ độ y chân, luôn ≥ 0). */
const GROUND_DEPTH_BASE = -1000;
/** Trên mọi sprite trong level, dưới lớp tối và UI. */
export const OVERHEAD_DEPTH = 5000;
const COLLISION_LAYER_NAME = '__collision';
/** Lớp con của cùng một layer LDtk nằm sát nhau, vẫn dưới layer kế tiếp (chênh 1). */
const STACK_DEPTH_STEP = 0.01;
const COLLISION_TILE_INDEX = 0;

export interface BuiltLevelMap {
  readonly tilemap: Phaser.Tilemaps.Tilemap;
  /** Layer ẩn, chỉ để va chạm Arcade; `null` khi level không có IntGrid `Collision`. */
  readonly collisionLayer: Phaser.Tilemaps.TilemapLayer | null;
  readonly collisionTilemap: Phaser.Tilemaps.Tilemap | null;
}

export interface TilemapBuildOptions {
  /** Khoá texture Phaser của ảnh tileset theo uid tileset LDtk. */
  readonly tilesetTextureKey: (tilesetUid: number) => string;
  /** Texture một ô bất kỳ kích thước lưới, dùng cho layer va chạm ẩn. */
  readonly collisionTextureKey: string;
}

function addTileLayer(
  tilemap: Phaser.Tilemaps.Tilemap,
  tileset: Phaser.Tilemaps.Tileset,
  layer: MapTileLayer,
  depth: number,
): void {
  // Tên layer Phaser phải duy nhất trong tilemap; lớp con tile chồng thêm hậu tố.
  const tilemapLayer = tilemap.createBlankLayer(
    layer.stackIndex === 0 ? layer.identifier : `${layer.identifier}#${layer.stackIndex}`,
    tileset,
    layer.offsetX,
    layer.offsetY,
    layer.widthCells,
    layer.heightCells,
    layer.gridSize,
    layer.gridSize,
  );
  if (!tilemapLayer) throw new Error(`Không tạo được layer "${layer.identifier}"`);
  for (const tile of layer.tiles) {
    const placed = tilemapLayer.putTileAt(tileset.firstgid + tile.tileIndex, tile.cellX, tile.cellY, false);
    placed.flipX = tile.flipX;
    placed.flipY = tile.flipY;
    placed.setAlpha(tile.alpha);
  }
  tilemapLayer.setAlpha(layer.opacity).setDepth(depth);
}

function buildCollisionLayer(
  scene: Phaser.Scene,
  level: MapLevel,
  textureKey: string,
): Pick<BuiltLevelMap, 'collisionLayer' | 'collisionTilemap'> {
  const grid = level.collision;
  if (!grid) return { collisionLayer: null, collisionTilemap: null };
  // Tilemap riêng để chỉ số tile va chạm không đụng gid của tileset đồ hoạ.
  const tilemap = scene.make.tilemap({
    tileWidth: grid.gridSize,
    tileHeight: grid.gridSize,
    width: grid.widthCells,
    height: grid.heightCells,
  });
  const tileset = tilemap.addTilesetImage(COLLISION_LAYER_NAME, textureKey, grid.gridSize, grid.gridSize);
  const layer = tileset ? tilemap.createBlankLayer(COLLISION_LAYER_NAME, tileset, grid.offsetX, grid.offsetY) : null;
  if (!layer) throw new Error('Không tạo được layer va chạm');
  for (let cellY = 0; cellY < grid.heightCells; cellY++) {
    for (let cellX = 0; cellX < grid.widthCells; cellX++) {
      if (grid.cells[cellY * grid.widthCells + cellX] === 1) layer.putTileAt(COLLISION_TILE_INDEX, cellX, cellY, false);
    }
  }
  layer.setCollision(COLLISION_TILE_INDEX).setVisible(false);
  return { collisionLayer: layer, collisionTilemap: tilemap };
}

/** Dựng các layer tile của level (từ dưới lên) và layer va chạm ẩn. Ảnh tileset phải nạp sẵn. */
export function buildLevelTilemap(
  scene: Phaser.Scene,
  project: MapProject,
  level: MapLevel,
  options: TilemapBuildOptions,
): BuiltLevelMap {
  const tilemap = scene.make.tilemap({
    tileWidth: project.gridSize,
    tileHeight: project.gridSize,
    width: Math.ceil(level.widthPx / project.gridSize),
    height: Math.ceil(level.heightPx / project.gridSize),
  });
  const tilesetsByUid = new Map<number, Phaser.Tilemaps.Tileset>();
  let nextFirstGid = 0;

  let layerOrder = -1;
  level.tileLayers.forEach((layer) => {
    if (layer.stackIndex === 0) layerOrder += 1;
    let tileset = tilesetsByUid.get(layer.tilesetUid);
    if (!tileset) {
      const def = project.tilesets.get(layer.tilesetUid);
      if (!def) throw new Error(`Layer "${layer.identifier}" dùng tileset ${layer.tilesetUid} không có trong project`);
      const created = tilemap.addTilesetImage(
        def.identifier,
        options.tilesetTextureKey(def.uid),
        def.tileGridSize,
        def.tileGridSize,
        def.padding,
        def.spacing,
        nextFirstGid,
      );
      if (!created) throw new Error(`Không nạp được ảnh tileset "${def.identifier}"`);
      nextFirstGid += created.total;
      tilesetsByUid.set(def.uid, created);
      tileset = created;
    }
    const base = layer.identifier.startsWith(OVERHEAD_LAYER_PREFIX) ? OVERHEAD_DEPTH : GROUND_DEPTH_BASE;
    const depth = base + layerOrder + layer.stackIndex * STACK_DEPTH_STEP;
    addTileLayer(tilemap, tileset, layer, depth);
  });

  return { tilemap, ...buildCollisionLayer(scene, level, options.collisionTextureKey) };
}
