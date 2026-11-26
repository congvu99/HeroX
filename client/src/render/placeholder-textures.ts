import type Phaser from 'phaser';
import { CITADEL_STAGES, type CitadelStage } from '@herox/shared';
import { HERO_FRAME_SIZE, TILE_SIZE } from '../config/display';
import type { Facing } from '../input/movement-vector';

/** Texture tạm vẽ bằng canvas; thay bằng sprite LPC/DCSS khi có asset thật. */
export const TEXTURE_KEYS = {
  hero: 'placeholder-hero',
  npc: 'placeholder-npc',
  chest: 'placeholder-chest',
  enemy: 'placeholder-enemy',
  light: 'light-radial',
  collisionTile: 'collision-tile',
  portal: 'placeholder-portal',
} as const;

/** Cổng không gian: vòm đá cổ bao lõi năng lượng xoáy; khớp entity Portal trong LDtk (1×2 ô). */
const PORTAL_TEXTURE_WIDTH = TILE_SIZE;
const PORTAL_TEXTURE_HEIGHT = TILE_SIZE * 2;
/** Vẽ ở độ phân giải gấp đôi cho nét, Phaser thu về đúng kích thước entity. */
const PORTAL_SUPERSAMPLE = 2;

/** Công trình ở Lexhold đổi hình theo giai đoạn hồi sinh của thành trì. */
export const BUILDING_TEXTURE_KEYS: Readonly<Record<CitadelStage, string>> = {
  ruined: 'placeholder-building-ruined',
  rebuilding: 'placeholder-building-rebuilding',
  restored: 'placeholder-building-restored',
};
/** Khớp kích thước entity Building trong LDtk (3×2 ô). */
const BUILDING_TEXTURE_WIDTH = TILE_SIZE * 3;
const BUILDING_TEXTURE_HEIGHT = TILE_SIZE * 2;

/** Frame hero đặt tên theo hướng; thứ tự giống hàng sprite LPC (lên, trái, xuống, phải). */
const HERO_FACING_ORDER: readonly Facing[] = ['up', 'left', 'down', 'right'];
export const LIGHT_TEXTURE_SIZE = 256;

type Painter = (context: CanvasRenderingContext2D) => void;

function createCanvasTexture(scene: Phaser.Scene, key: string, width: number, height: number, paint: Painter): Phaser.Textures.CanvasTexture | null {
  if (scene.textures.exists(key)) return null;
  const texture = scene.textures.createCanvas(key, width, height);
  if (!texture) throw new Error(`Không tạo được texture ${key}`);
  paint(texture.getContext());
  texture.refresh();
  return texture;
}

function paintHeroFrame(context: CanvasRenderingContext2D, originX: number, facing: Facing): void {
  const centerX = originX + HERO_FRAME_SIZE / 2;
  // Thân đặt ở nửa dưới khung như LPC: chân chạm đáy khung.
  context.fillStyle = '#9aa3b5';
  context.fillRect(centerX - 9, 30, 18, 26);
  context.fillStyle = '#d8c7a0';
  context.fillRect(centerX - 7, 18, 14, 14);
  context.fillStyle = '#c9302c';
  context.fillRect(centerX - 9, 40, 18, 4);
  // Chấm mắt cho biết hướng nhìn; quay lưng thì không thấy mắt.
  const eyeShiftX: Record<Facing, number | null> = { up: null, down: 0, left: -4, right: 4 };
  const shift = eyeShiftX[facing];
  if (shift !== null) {
    context.fillStyle = '#111111';
    context.fillRect(centerX - 2 + shift, 23, 4, 3);
  }
  context.fillStyle = '#3a3a48';
  context.fillRect(centerX - 8, 56, 6, 6);
  context.fillRect(centerX + 2, 56, 6, 6);
}

/** Bảng màu Kenney Tiny Town (nét phẳng, viền tối) cho công trình. */
const BUILDING_PALETTE = {
  outline: '#3b2a24',
  stone: '#a8a29a',
  stoneShade: '#7d776f',
  wood: '#c98b4f',
  woodShade: '#8a5a2b',
  roof: '#e0743a',
  roofShade: '#b5532a',
  door: '#6b4226',
  windowLit: '#ffd86b',
  grass: '#5da84b',
} as const;

/** Khối chữ nhật có viền 2px tối như tile Kenney. */
function fillOutlinedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, fill: string): void {
  context.fillStyle = BUILDING_PALETTE.outline;
  context.fillRect(x, y, width, height);
  context.fillStyle = fill;
  context.fillRect(x + 2, y + 2, width - 4, height - 4);
}

/** Tường ván gỗ: thân gỗ sáng, vạch ván ngang tối. */
function paintWoodWall(context: CanvasRenderingContext2D, top: number): void {
  const width = BUILDING_TEXTURE_WIDTH;
  const height = BUILDING_TEXTURE_HEIGHT;
  fillOutlinedRect(context, 8, top, width - 16, height - top, BUILDING_PALETTE.wood);
  context.fillStyle = BUILDING_PALETTE.woodShade;
  for (let y = top + 8; y < height - 2; y += 8) context.fillRect(10, y, width - 20, 2);
}

function paintDoor(context: CanvasRenderingContext2D): void {
  fillOutlinedRect(context, BUILDING_TEXTURE_WIDTH / 2 - 9, BUILDING_TEXTURE_HEIGHT - 22, 18, 22, BUILDING_PALETTE.door);
}

/** Mái ngói cam: các dải ngói so le, phủ từ mép trái tới `roofWidth`. */
function paintRoof(context: CanvasRenderingContext2D, roofWidth: number): void {
  fillOutlinedRect(context, 2, 6, roofWidth, 22, BUILDING_PALETTE.roof);
  context.fillStyle = BUILDING_PALETTE.roofShade;
  context.fillRect(4, 14, roofWidth - 4, 2);
  context.fillRect(4, 21, roofWidth - 4, 2);
}

function paintRuinedBuilding(context: CanvasRenderingContext2D): void {
  const height = BUILDING_TEXTURE_HEIGHT;
  // Tường đá gãy khúc, không mái; đá vụn rơi dưới chân.
  fillOutlinedRect(context, 6, 30, 22, height - 30, BUILDING_PALETTE.stone);
  fillOutlinedRect(context, 40, 44, 18, height - 44, BUILDING_PALETTE.stone);
  fillOutlinedRect(context, 68, 24, 22, height - 24, BUILDING_PALETTE.stone);
  context.fillStyle = BUILDING_PALETTE.stoneShade;
  context.fillRect(8, 42, 18, 2);
  context.fillRect(70, 38, 18, 2);
  fillOutlinedRect(context, 30, height - 8, 10, 8, BUILDING_PALETTE.stoneShade);
  fillOutlinedRect(context, 58, height - 6, 8, 6, BUILDING_PALETTE.stoneShade);
}

function paintRebuildingBuilding(context: CanvasRenderingContext2D): void {
  paintWoodWall(context, 26);
  paintDoor(context);
  // Mái mới lợp một nửa; giàn giáo gỗ dựng quanh.
  paintRoof(context, BUILDING_TEXTURE_WIDTH / 2);
  context.fillStyle = BUILDING_PALETTE.woodShade;
  for (const x of [4, 46, 88]) context.fillRect(x, 4, 4, BUILDING_TEXTURE_HEIGHT - 4);
  context.fillRect(BUILDING_TEXTURE_WIDTH / 2, 10, BUILDING_TEXTURE_WIDTH / 2 - 4, 3);
}

function paintRestoredBuilding(context: CanvasRenderingContext2D): void {
  const width = BUILDING_TEXTURE_WIDTH;
  fillOutlinedRect(context, width - 26, 0, 10, 14, BUILDING_PALETTE.stone);
  paintWoodWall(context, 26);
  paintRoof(context, width - 4);
  paintDoor(context);
  // Cửa sổ sáng đèn cho thấy thành trì đã có người ở lại.
  fillOutlinedRect(context, 16, 34, 14, 12, BUILDING_PALETTE.windowLit);
  fillOutlinedRect(context, width - 30, 34, 14, 12, BUILDING_PALETTE.windowLit);
  context.fillStyle = BUILDING_PALETTE.grass;
  context.fillRect(10, BUILDING_TEXTURE_HEIGHT - 4, 20, 4);
  context.fillRect(width - 30, BUILDING_TEXTURE_HEIGHT - 4, 20, 4);
}

/** Bảng màu cổng không gian: đá cổ viền tối, lõi năng lượng tím-lam với tâm sáng trắng. */
const PORTAL_PALETTE = {
  stoneOutline: '#2a2320',
  stone: '#7b7168',
  stoneShade: '#554d47',
  stoneLit: '#9a8f84',
  voidDeep: '#1a0f33',
  energyOuter: '#5a2a9c',
  energyMid: '#8a4fe0',
  energyInner: '#c89bff',
  core: '#f2e9ff',
} as const;

/** Trụ đá hai bên và vòm trên: khung đá cổ bao quanh lõi portal. */
function paintPortalFrame(context: CanvasRenderingContext2D, width: number, height: number): void {
  const pillar = Math.round(width * 0.2);
  const archTop = Math.round(height * 0.14);
  // Nền trụ + vòm vẽ bằng khối viền tối như công trình Kenney.
  const block = (x: number, y: number, w: number, h: number, fill: string): void => {
    context.fillStyle = PORTAL_PALETTE.stoneOutline;
    context.fillRect(x, y, w, h);
    context.fillStyle = fill;
    context.fillRect(x + 2, y + 2, w - 4, h - 4);
  };
  block(0, archTop, pillar, height - archTop, PORTAL_PALETTE.stone);
  block(width - pillar, archTop, pillar, height - archTop, PORTAL_PALETTE.stone);
  block(0, 0, width, archTop + 4, PORTAL_PALETTE.stone);
  // Mặt trong trụ bắt sáng từ lõi.
  context.fillStyle = PORTAL_PALETTE.stoneLit;
  context.fillRect(pillar - 3, archTop, 3, height - archTop);
  context.fillRect(width - pillar, archTop, 3, height - archTop);
  // Vết nứt tối trên vòm.
  context.fillStyle = PORTAL_PALETTE.stoneShade;
  context.fillRect(Math.round(width * 0.45), 2, 2, archTop);
}

/** Lõi năng lượng: oval tối sâu rồi loang sáng dần ra tâm trắng, chấm hạt sáng. */
function paintPortalCore(context: CanvasRenderingContext2D, width: number, height: number): void {
  const cx = width / 2;
  const cy = height / 2;
  const radiusX = width * 0.3;
  const radiusY = height * 0.38;
  const layers: readonly [number, string][] = [
    [1, PORTAL_PALETTE.voidDeep],
    [0.82, PORTAL_PALETTE.energyOuter],
    [0.58, PORTAL_PALETTE.energyMid],
    [0.34, PORTAL_PALETTE.energyInner],
    [0.16, PORTAL_PALETTE.core],
  ];
  for (const [scale, fill] of layers) {
    context.fillStyle = fill;
    context.beginPath();
    context.ellipse(cx, cy, radiusX * scale, radiusY * scale, 0, 0, Math.PI * 2);
    context.fill();
  }
  // Hạt sáng rải trong lõi gợi bụi sao bị cuốn.
  context.fillStyle = PORTAL_PALETTE.core;
  const motes: readonly [number, number][] = [[-0.12, -0.2], [0.14, -0.05], [-0.06, 0.18], [0.1, 0.24]];
  for (const [dx, dy] of motes) {
    context.fillRect(Math.round(cx + dx * width), Math.round(cy + dy * height), 2, 2);
  }
}

/** Cổng không gian: khung đá cổ ôm lõi năng lượng xoáy phát sáng. */
function paintPortal(context: CanvasRenderingContext2D, width: number, height: number): void {
  paintPortalCore(context, width, height);
  paintPortalFrame(context, width, height);
}

/** Đổ nát: tường đá gãy, không mái; đang dựng: giàn gỗ, mái cam dở; hồi sinh: mái cam đủ, cửa sổ sáng. */
function paintBuilding(context: CanvasRenderingContext2D, stage: CitadelStage): void {
  const painters: Record<CitadelStage, Painter> = {
    ruined: paintRuinedBuilding,
    rebuilding: paintRebuildingBuilding,
    restored: paintRestoredBuilding,
  };
  painters[stage](context);
}

/** Tạo toàn bộ texture tạm; gọi lại nhiều lần an toàn (bỏ qua khoá đã có). */
export function createPlaceholderTextures(scene: Phaser.Scene): void {
  const hero = createCanvasTexture(scene, TEXTURE_KEYS.hero, HERO_FRAME_SIZE * HERO_FACING_ORDER.length, HERO_FRAME_SIZE, (context) => {
    HERO_FACING_ORDER.forEach((facing, index) => paintHeroFrame(context, index * HERO_FRAME_SIZE, facing));
  });
  HERO_FACING_ORDER.forEach((facing, index) => {
    hero?.add(facing, 0, index * HERO_FRAME_SIZE, 0, HERO_FRAME_SIZE, HERO_FRAME_SIZE);
  });

  createCanvasTexture(scene, TEXTURE_KEYS.npc, TILE_SIZE, TILE_SIZE * 2, (context) => {
    context.fillStyle = '#5b4a7a';
    context.fillRect(8, 22, 16, 40);
    context.fillStyle = '#e8d9a8';
    context.fillRect(10, 8, 12, 14);
  });
  createCanvasTexture(scene, TEXTURE_KEYS.chest, TILE_SIZE, TILE_SIZE, (context) => {
    context.fillStyle = '#7a4a1e';
    context.fillRect(4, 10, 24, 20);
    context.fillStyle = '#d9a13b';
    context.fillRect(4, 16, 24, 3);
    context.fillRect(14, 16, 4, 8);
  });
  // Quỷ tạm: thân đỏ thẫm, sừng, mắt vàng; chân chạm đáy khung như hero.
  createCanvasTexture(scene, TEXTURE_KEYS.enemy, HERO_FRAME_SIZE, HERO_FRAME_SIZE, (context) => {
    const centerX = HERO_FRAME_SIZE / 2;
    context.fillStyle = '#6b1d24';
    context.fillRect(centerX - 12, 28, 24, 30);
    context.fillStyle = '#8f2a33';
    context.fillRect(centerX - 9, 14, 18, 16);
    context.fillStyle = '#d9c7a0';
    context.fillRect(centerX - 11, 8, 4, 8);
    context.fillRect(centerX + 7, 8, 4, 8);
    context.fillStyle = '#ffcc33';
    context.fillRect(centerX - 6, 19, 3, 3);
    context.fillRect(centerX + 3, 19, 3, 3);
    context.fillStyle = '#3a0d12';
    context.fillRect(centerX - 10, 56, 7, 6);
    context.fillRect(centerX + 3, 56, 7, 6);
  });
  createCanvasTexture(scene, TEXTURE_KEYS.light, LIGHT_TEXTURE_SIZE, LIGHT_TEXTURE_SIZE, (context) => {
    const radius = LIGHT_TEXTURE_SIZE / 2;
    const gradient = context.createRadialGradient(radius, radius, 0, radius, radius, radius);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.45, 'rgba(255,255,255,0.75)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, LIGHT_TEXTURE_SIZE, LIGHT_TEXTURE_SIZE);
  });
  for (const stage of CITADEL_STAGES) {
    createCanvasTexture(scene, BUILDING_TEXTURE_KEYS[stage], BUILDING_TEXTURE_WIDTH, BUILDING_TEXTURE_HEIGHT, (context) => paintBuilding(context, stage));
  }
  createCanvasTexture(
    scene,
    TEXTURE_KEYS.portal,
    PORTAL_TEXTURE_WIDTH * PORTAL_SUPERSAMPLE,
    PORTAL_TEXTURE_HEIGHT * PORTAL_SUPERSAMPLE,
    (context) => paintPortal(context, PORTAL_TEXTURE_WIDTH * PORTAL_SUPERSAMPLE, PORTAL_TEXTURE_HEIGHT * PORTAL_SUPERSAMPLE),
  );
  createCanvasTexture(scene, TEXTURE_KEYS.collisionTile, TILE_SIZE, TILE_SIZE, (context) => {
    context.fillStyle = '#ff00ff';
    context.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
  });
}
