import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CollisionGrid } from '../src/maps/ldtk-loader';

// Phaser thật cần canvas/WebGL: thay bằng đúng các hằng số và lớp mà GoldenHourAtmosphere dùng.
vi.mock('phaser', () => {
  class Rectangle {
    constructor(public x: number, public y: number, public width: number, public height: number) {}
    setSize(width: number, height: number): this {
      this.width = width;
      this.height = height;
      return this;
    }
  }
  return {
    default: {
      WEBGL: 2,
      BlendModes: { ADD: 1, MULTIPLY: 2 },
      Scenes: { Events: { POST_UPDATE: 'postupdate', SHUTDOWN: 'shutdown' } },
      Scale: { Events: { RESIZE: 'resize' } },
      Geom: { Rectangle },
    },
  };
});
vi.mock('../src/render/placeholder-textures', () => ({ LIGHT_TEXTURE_SIZE: 64, TEXTURE_KEYS: { light: 'light' } }));
vi.mock('../src/render/golden-hour-textures', () => ({
  SHAFT_TILE_WIDTH: 512,
  createToneTexture: vi.fn(),
  createSunWashTexture: vi.fn(),
  createShaftTexture: vi.fn(),
  createShadowTexture: vi.fn(() => true),
}));

const { GoldenHourAtmosphere } = await import('../src/render/golden-hour-atmosphere');
const textures = await import('../src/render/golden-hour-textures');

type Listener = (...args: unknown[]) => void;

class FakeEmitter {
  readonly listeners = new Map<string, Listener[]>();
  on(event: string, listener: Listener): this {
    this.listeners.set(event, [...(this.listeners.get(event) ?? []), listener]);
    return this;
  }
  once(event: string, listener: Listener): this {
    return this.on(event, listener);
  }
  off(event: string, listener: Listener): this {
    this.listeners.set(event, (this.listeners.get(event) ?? []).filter((item) => item !== listener));
    return this;
  }
  emit(event: string, ...args: unknown[]): void {
    for (const listener of this.listeners.get(event) ?? []) listener(...args);
  }
}

/** Game object giả: mọi setter trả về chính nó để gọi nối chuỗi như Phaser. */
function fakeObject(textureKey: string): Record<string, unknown> {
  const object: Record<string, unknown> = { textureKey, destroyed: false };
  for (const name of ['setOrigin', 'setScrollFactor', 'setDepth', 'setBlendMode', 'setAlpha', 'setTint', 'setDisplaySize', 'setScale', 'setVisible', 'setPosition', 'setSize']) {
    object[name] = vi.fn(() => object);
  }
  object.setTexture = vi.fn((key: string) => {
    object.textureKey = key;
    return object;
  });
  object.destroy = vi.fn(() => {
    object.destroyed = true;
  });
  return object;
}

function fakeScene() {
  const created: Record<string, unknown>[] = [];
  const keys = new Set<string>();
  const track = (key: string) => {
    const object = fakeObject(key);
    created.push(object);
    return object;
  };
  const graphics = { fillStyle: vi.fn(() => graphics), fillRect: vi.fn(() => graphics), generateTexture: vi.fn((key: string) => keys.add(key)), destroy: vi.fn() };
  const scene = {
    scale: Object.assign(new FakeEmitter(), { gameSize: { width: 400, height: 800 } }),
    events: new FakeEmitter(),
    renderer: { type: 1 },
    cameras: { main: { scrollX: 0, filters: { external: { addVignette: vi.fn(), remove: vi.fn() } } } },
    textures: { exists: (key: string) => keys.has(key), remove: vi.fn((key: string) => keys.delete(key)) },
    make: { graphics: () => graphics },
    add: {
      image: (_x: number, _y: number, key: string) => track(key),
      tileSprite: (_x: number, _y: number, _w: number, _h: number, key: string) => track(key),
      particles: (_x: number, _y: number, key: string) => track(key),
    },
  };
  return { scene, created, keys };
}

const COLLISION: CollisionGrid = { gridSize: 32, offsetX: 0, offsetY: 0, widthCells: 1, heightCells: 1, cells: Uint8Array.from([1]) };

describe('GoldenHourAtmosphere', () => {
  beforeEach(() => vi.clearAllMocks());

  it('enabled=false không tạo object, texture hay listener nào', () => {
    const { scene, created } = fakeScene();
    const atmosphere = new GoldenHourAtmosphere(scene as never, { enabled: false });
    atmosphere.addShadows(COLLISION, 32, 32);
    atmosphere.addWindowGlows([{ x: 0, y: 0, width: 10, height: 10, strength: 1 }]);
    expect(created).toHaveLength(0);
    expect(textures.createToneTexture).not.toHaveBeenCalled();
    expect(scene.scale.listeners.get('resize') ?? []).toHaveLength(0);
  });

  it('disable() huỷ mọi lớp phủ và gỡ bóng đổ', () => {
    const { scene, created, keys } = fakeScene();
    const atmosphere = new GoldenHourAtmosphere(scene as never, { enabled: true });
    atmosphere.addShadows(COLLISION, 32, 32);
    keys.add('golden-hour-shadow-sunny');
    atmosphere.disable();
    expect(created.length).toBeGreaterThan(0);
    expect(created.every((object) => object.destroyed)).toBe(true);
    expect(scene.textures.remove).toHaveBeenCalledWith('golden-hour-shadow-sunny');
  });

  it('không tạo được canvas bóng thì không thêm image bóng', () => {
    vi.mocked(textures.createShadowTexture).mockReturnValueOnce(false);
    const { scene, created } = fakeScene();
    const atmosphere = new GoldenHourAtmosphere(scene as never, { enabled: true });
    const before = created.length;
    atmosphere.addShadows(COLLISION, 32, 32);
    expect(created).toHaveLength(before);
  });

  it('đổi cỡ màn hình: chuyển object sang texture cỡ mới rồi gỡ texture cũ; SHUTDOWN bỏ listener', () => {
    const { scene, created, keys } = fakeScene();
    new GoldenHourAtmosphere(scene as never, { enabled: true });
    keys.add('golden-hour-tone-sunny-400x800');
    scene.scale.emit('resize', { width: 500, height: 900 });
    expect(created.some((object) => object.textureKey === 'golden-hour-tone-sunny-500x900')).toBe(true);
    expect(created.some((object) => object.textureKey === 'golden-hour-shafts-sunny-900')).toBe(true);
    expect(scene.textures.remove).toHaveBeenCalledWith('golden-hour-tone-sunny-400x800');
    scene.events.emit('shutdown');
    expect(scene.scale.listeners.get('resize')).toHaveLength(0);
  });
});
