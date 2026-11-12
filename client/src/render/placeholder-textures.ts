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
} as const;

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

/** Đổ nát: tường gãy, không mái; đang dựng: giàn gỗ, mái dở; hồi sinh: mái đỏ, cửa sáng nến. */
function paintBuilding(context: CanvasRenderingContext2D, stage: CitadelStage): void {
  const width = BUILDING_TEXTURE_WIDTH;
  const height = BUILDING_TEXTURE_HEIGHT;
  context.fillStyle = '#3a3440';
  if (stage === 'ruined') {
    context.fillRect(4, 28, 24, height - 28);
    context.fillRect(40, 40, 20, height - 40);
    context.fillRect(70, 22, 22, height - 22);
    context.fillStyle = '#25212b';
    context.fillRect(30, height - 10, 36, 10);
    return;
  }
  context.fillRect(4, 18, width - 8, height - 18);
  context.fillStyle = '#1b1720';
  context.fillRect(width / 2 - 10, height - 24, 20, 24);
  if (stage === 'rebuilding') {
    context.fillStyle = '#7a5a34';
    for (let x = 6; x < width; x += 18) context.fillRect(x, 4, 3, height - 4);
    context.fillRect(4, 10, width - 8, 3);
    context.fillStyle = '#7a141c';
    context.fillRect(4, 14, width / 2, 6);
    return;
  }
  context.fillStyle = '#7a141c';
  context.fillRect(0, 6, width, 14);
  context.fillStyle = '#e8c66a';
  context.fillRect(width / 2 - 8, height - 22, 16, 22);
  context.fillRect(14, 28, 10, 10);
  context.fillRect(width - 24, 28, 10, 10);
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
  createCanvasTexture(scene, TEXTURE_KEYS.collisionTile, TILE_SIZE, TILE_SIZE, (context) => {
    context.fillStyle = '#ff00ff';
    context.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
  });
}
