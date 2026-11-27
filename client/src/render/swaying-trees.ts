import Phaser from 'phaser';
import type { MapLevel, MapProject, MapTile, MapTileLayer } from '../maps/ldtk-loader';
import { tilemapLayerName } from '../maps/ldtk-tilemap-builder';
import { tileIndexForAtlas } from './chapter-tile-names';
import { swayAngle, swayPhase, treeImagePlacement, treeIndicesFor, treeTilesInLayers, type TreeTile } from './tree-sway';

/** Frame cắt từ atlas tileset cho từng loại tile cây, đặt tên theo chỉ số atlas. */
const TREE_FRAME_PREFIX = 'tree-sway-';
/** Cây ngoài khung nhìn quá khoảng này thì ẩn và không tính góc: image không tự cull theo camera như tilemap. */
const CULL_MARGIN_PX = 64;

interface SwayingTree {
  readonly image: Phaser.GameObjects.Image;
  readonly phase: number;
  /** Đủ thông tin để đặt lại đúng tile gốc khi tắt hiệu ứng. */
  readonly tilemapLayer: Phaser.Tilemaps.TilemapLayer;
  readonly gid: number;
  readonly tile: MapTile;
}

export interface SwayingTreesSource {
  readonly tilemap: Phaser.Tilemaps.Tilemap;
  readonly project: MapProject;
  readonly level: MapLevel;
  /** Khoá texture Phaser của ảnh tileset theo uid tileset LDtk (cùng hàm đã dùng khi dựng tilemap). */
  readonly tilesetTextureKey: (tilesetUid: number) => string;
}

/**
 * Cây trên bản đồ đung đưa theo gió: tách ô cây (`tree_*`) khỏi tilemap tĩnh thành image riêng cùng depth với layer
 * gốc (vẫn nằm dưới hero), rồi mỗi khung nghiêng quanh gốc cây (origin đáy) theo `swayAngle`.
 * Chỉ tạo khi quality cho phép; `disable()` trả tile về tilemap và huỷ image, chi phí về như chưa bật.
 */
export class SwayingTrees {
  private readonly trees: SwayingTree[] = [];

  constructor(private readonly scene: Phaser.Scene, source: SwayingTreesSource) {
    for (const layer of source.level.tileLayers) {
      const indices = treeIndicesForLayer(source.project, layer);
      for (const tree of treeTilesInLayers([layer], indices)) {
        const detached = this.detachTree(source, tree);
        if (detached !== null) this.trees.push(detached);
      }
    }
    if (this.trees.length === 0) return;
    scene.events.on(Phaser.Scenes.Events.POST_UPDATE, this.update);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.events.off(Phaser.Scenes.Events.POST_UPDATE, this.update));
  }

  /** Quality hạ giữa chừng: đặt tile cây lại vào tilemap như lúc dựng, huỷ image để máy yếu không phải vẽ thêm. */
  disable(): void {
    if (this.trees.length === 0) return;
    this.scene.events.off(Phaser.Scenes.Events.POST_UPDATE, this.update);
    for (const { image, tilemapLayer, gid, tile } of this.trees) {
      const restored = tilemapLayer.putTileAt(gid, tile.cellX, tile.cellY, false);
      restored.flipX = tile.flipX;
      restored.flipY = tile.flipY;
      restored.setAlpha(tile.alpha);
      image.destroy();
    }
    this.trees.length = 0;
  }

  /** Gỡ tile cây khỏi layer tilemap và đặt image cùng hình, cùng depth vào đúng ô; trả `null` (giữ tile) nếu không cắt được frame. */
  private detachTree(source: SwayingTreesSource, tree: TreeTile): SwayingTree | null {
    const { layer, tile } = tree;
    const def = source.project.tilesets.get(layer.tilesetUid);
    const tileset = def === undefined ? null : source.tilemap.getTileset(def.identifier);
    const tilemapLayer = source.tilemap.getLayer(tilemapLayerName(layer))?.tilemapLayer;
    if (def === undefined || tileset === null || tilemapLayer === undefined) return null;
    const textureKey = source.tilesetTextureKey(def.uid);
    const frameName = `${TREE_FRAME_PREFIX}${tile.tileIndex}`;
    const gid = tileset.firstgid + tile.tileIndex;
    const texture = this.scene.textures.get(textureKey);
    if (!texture.has(frameName)) {
      const coordinates = tileset.getTileTextureCoordinates(gid) as { x: number; y: number } | null;
      if (coordinates === null) return null;
      texture.add(frameName, 0, coordinates.x, coordinates.y, def.tileGridSize, def.tileGridSize);
    }
    tilemapLayer.removeTileAt(tile.cellX, tile.cellY, true, false);
    const placement = treeImagePlacement(tree);
    // Giữ cỡ frame gốc như cách Phaser vẽ tile (canh đáy ô), không ép về cỡ lưới layer.
    const image = this.scene.add
      .image(placement.x, placement.y, textureKey, frameName)
      .setOrigin(0.5, 1)
      .setFlip(tile.flipX, tile.flipY)
      .setAlpha(placement.alpha)
      .setDepth(tilemapLayer.depth);
    return { image, phase: swayPhase(tile.cellX, tile.cellY), tilemapLayer, gid, tile };
  }

  /** Chữ ký sự kiện POST_UPDATE của scene: (systems, time, delta). */
  private readonly update = (_systems: Phaser.Scenes.Systems, timeMs: number): void => {
    const view = this.scene.cameras.main.worldView;
    const left = view.x - CULL_MARGIN_PX;
    const right = view.right + CULL_MARGIN_PX;
    const top = view.y - CULL_MARGIN_PX;
    const bottom = view.bottom + CULL_MARGIN_PX;
    for (const { image, phase } of this.trees) {
      const inView = image.x >= left && image.x <= right && image.y >= top && image.y <= bottom;
      image.setVisible(inView);
      if (inView) image.setAngle(swayAngle(timeMs, phase));
    }
  };
}

/** Chỉ layer dùng atlas chương (có bảng tên tile) mới có cây nhận diện được; layer khác trả tập rỗng. */
function treeIndicesForLayer(project: MapProject, layer: MapTileLayer): ReadonlySet<number> {
  const relPath = project.tilesets.get(layer.tilesetUid)?.relPath;
  const table = relPath === undefined ? undefined : tileIndexForAtlas(relPath);
  return table === undefined ? new Set() : treeIndicesFor(table);
}
