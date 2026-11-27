import { describe, expect, it, vi } from 'vitest';
import type { MapLevel, MapProject, MapTile, MapTileLayer } from '../src/maps/ldtk-loader';

// Phaser thật cần canvas/WebGL: chỉ cần các hằng sự kiện mà SwayingTrees dùng.
vi.mock('phaser', () => ({ default: { Scenes: { Events: { POST_UPDATE: 'postupdate', SHUTDOWN: 'shutdown' } } } }));
vi.mock('../src/maps/ldtk-tilemap-builder', () => ({
  tilemapLayerName: (layer: { identifier: string; stackIndex: number }) => (layer.stackIndex === 0 ? layer.identifier : `${layer.identifier}#${layer.stackIndex}`),
}));

const { SwayingTrees } = await import('../src/render/swaying-trees');
const { treeImagePlacement } = await import('../src/render/tree-sway');

const TREE = 7;
const GRASS = 0;
const FIRST_GID = 100;
const LAYER_DEPTH = -999;

type Listener = (...args: unknown[]) => void;

function mapTile(cellX: number, cellY: number, tileIndex: number, flipX = false): MapTile {
  return { cellX, cellY, tileIndex, flipX, flipY: false, alpha: 0.8 };
}

function decorLayer(tiles: MapTile[]): MapTileLayer {
  return { identifier: 'Decor', tilesetUid: 1, gridSize: 32, widthCells: 10, heightCells: 10, offsetX: 16, offsetY: 8, opacity: 0.5, stackIndex: 0, tiles };
}

function project(relPath: string): MapProject {
  const tileset = { uid: 1, identifier: 'Chapter', relPath, tileGridSize: 32, padding: 0, spacing: 0 };
  return { tilesets: new Map([[1, tileset]]) } as unknown as MapProject;
}

function fakeImage(x: number, y: number): Record<string, unknown> {
  const image: Record<string, unknown> = { x, y, angle: 0, visible: true, destroyed: false };
  for (const name of ['setOrigin', 'setFlip', 'setAlpha', 'setDepth']) image[name] = vi.fn(() => image);
  image.setAngle = vi.fn((angle: number) => {
    image.angle = angle;
    return image;
  });
  image.setVisible = vi.fn((visible: boolean) => {
    image.visible = visible;
    return image;
  });
  image.destroy = vi.fn(() => {
    image.destroyed = true;
  });
  return image;
}

function fakeWorld(options: { withLayer?: boolean } = {}) {
  const listeners = new Map<string, Listener[]>();
  const images: Record<string, unknown>[] = [];
  const restoredTiles: Record<string, unknown>[] = [];
  const frames = new Set<string>();
  const tilemapLayer = {
    depth: LAYER_DEPTH,
    removeTileAt: vi.fn(),
    putTileAt: vi.fn(() => {
      const tile = { flipX: false, flipY: false, setAlpha: vi.fn() };
      restoredTiles.push(tile);
      return tile;
    }),
  };
  const texture = { has: (name: string) => frames.has(name), add: vi.fn((name: string) => frames.add(name)) };
  const scene = {
    events: {
      on: (event: string, listener: Listener) => listeners.set(event, [...(listeners.get(event) ?? []), listener]),
      once: (event: string, listener: Listener) => listeners.set(event, [...(listeners.get(event) ?? []), listener]),
      off: (event: string, listener: Listener) => listeners.set(event, (listeners.get(event) ?? []).filter((item) => item !== listener)),
    },
    textures: { get: () => texture },
    cameras: { main: { worldView: { x: 0, y: 0, right: 200, bottom: 200 } } },
    add: {
      image: (x: number, y: number) => {
        const image = fakeImage(x, y);
        images.push(image);
        return image;
      },
    },
  };
  const tilemap = {
    getTileset: () => ({ firstgid: FIRST_GID, getTileTextureCoordinates: () => ({ x: 64, y: 0 }) }),
    getLayer: () => (options.withLayer === false ? null : { tilemapLayer }),
  };
  const emit = (event: string, ...args: unknown[]) => {
    for (const listener of listeners.get(event) ?? []) listener(...args);
  };
  return { scene, tilemap, tilemapLayer, texture, images, restoredTiles, listeners, emit };
}

function create(world: ReturnType<typeof fakeWorld>, tiles: MapTile[], relPath = '../tilesets/chapter-1.png') {
  const level = { tileLayers: [decorLayer(tiles)] } as unknown as MapLevel;
  return new SwayingTrees(world.scene as never, {
    tilemap: world.tilemap as never,
    project: project(relPath),
    level,
    tilesetTextureKey: (uid) => `tileset-${uid}`,
  });
}

describe('treeImagePlacement', () => {
  it('gốc cây ở giữa cạnh đáy ô, alpha = alpha ô × opacity layer', () => {
    expect(treeImagePlacement({ layer: decorLayer([]), tile: mapTile(2, 3, TREE) })).toEqual({ x: 16 + 2.5 * 32, y: 8 + 4 * 32, alpha: 0.4 });
  });
});

describe('SwayingTrees', () => {
  it('tách đúng ô cây khỏi tilemap thành image cùng depth, frame cắt một lần cho mỗi loại cây', () => {
    const world = fakeWorld();
    create(world, [mapTile(1, 1, TREE, true), mapTile(2, 1, GRASS), mapTile(3, 1, TREE)]);
    expect(world.tilemapLayer.removeTileAt.mock.calls).toEqual([
      [1, 1, true, false],
      [3, 1, true, false],
    ]);
    expect(world.images).toHaveLength(2);
    expect(world.images[0]?.setDepth).toHaveBeenCalledWith(LAYER_DEPTH);
    expect(world.images[0]?.setFlip).toHaveBeenCalledWith(true, false);
    expect(world.images[0]?.setOrigin).toHaveBeenCalledWith(0.5, 1);
    expect(world.texture.add).toHaveBeenCalledTimes(1);
    expect(world.texture.add).toHaveBeenCalledWith('tree-sway-7', 0, 64, 0, 32, 32);
  });

  it('không có cây, tileset không thuộc atlas chương hoặc thiếu layer tilemap: không gỡ tile, không gắn listener', () => {
    const noTrees = fakeWorld();
    create(noTrees, [mapTile(0, 0, GRASS)]);
    const otherAtlas = fakeWorld();
    create(otherAtlas, [mapTile(0, 0, TREE)], '../tilesets/placeholder-dungeon.png');
    const noLayer = fakeWorld({ withLayer: false });
    create(noLayer, [mapTile(0, 0, TREE)]);
    for (const world of [noTrees, otherAtlas, noLayer]) {
      expect(world.tilemapLayer.removeTileAt).not.toHaveBeenCalled();
      expect(world.images).toHaveLength(0);
      expect(world.listeners.get('postupdate') ?? []).toHaveLength(0);
    }
  });

  it('mỗi khung nghiêng cây trong khung nhìn, ẩn cây ở xa', () => {
    const world = fakeWorld();
    create(world, [mapTile(1, 1, TREE), mapTile(9, 9, TREE)]);
    world.scene.cameras.main.worldView = { x: 0, y: 0, right: 100, bottom: 100 };
    world.emit('postupdate', {}, 1234);
    const [near, far] = world.images;
    expect(near?.visible).toBe(true);
    expect(near?.angle).not.toBe(0);
    expect(far?.visible).toBe(false);
    expect(far?.angle).toBe(0);
  });

  it('disable() trả tile gốc về tilemap, huỷ image, gỡ listener; gọi lại không làm gì', () => {
    const world = fakeWorld();
    const trees = create(world, [mapTile(1, 1, TREE, true)]);
    trees.disable();
    trees.disable();
    expect(world.tilemapLayer.putTileAt).toHaveBeenCalledTimes(1);
    expect(world.tilemapLayer.putTileAt).toHaveBeenCalledWith(FIRST_GID + TREE, 1, 1, false);
    expect(world.restoredTiles[0]?.flipX).toBe(true);
    expect(world.restoredTiles[0]?.setAlpha).toHaveBeenCalledWith(0.8);
    expect(world.images[0]?.destroyed).toBe(true);
    expect(world.listeners.get('postupdate')).toHaveLength(0);
  });
});
