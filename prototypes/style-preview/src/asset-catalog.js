/** Nạp asset và tạo hoạt ảnh dùng chung cho mọi scene. Số khung đọc từ manifest do tools/build_style_assets.py sinh. */
export const ASSET_BASE = './assets/';
export const HERO_ANIMS = ['walk', 'slash', 'spellcast', 'hurt', 'idle'];
export const SKELETON_ANIMS = ['walk', 'slash', 'hurt'];
export const DIRECTIONS = ['up', 'left', 'down', 'right']; // thứ tự hàng trong sheet LPC
export const MONSTERS = ['imp', 'red_devil', 'hellion', 'shadow_imp', 'fiend', 'balrug', 'cherub', 'ophan', 'monk'];
export const TILES = [
  'floor_cobble', 'floor_cobble2', 'floor_dirt', 'floor_dirt2', 'floor_hell', 'floor_hell2', 'lava', 'lava2',
  'wall_dark', 'wall_dark2', 'wall_brown', 'column', 'statue', 'altar', 'fountain_blood', 'door',
];

const FRAME_RATES = { walk: 10, slash: 14, spellcast: 10, hurt: 10, idle: 2 };

export async function loadManifest() {
  const response = await fetch(`${ASSET_BASE}manifest.json`);
  if (!response.ok) throw new Error('Thiếu manifest asset, chạy tools/build_style_assets.py trước');
  return response.json();
}

export function preloadAll(scene, manifest) {
  const cell = manifest.heroCell;
  for (const anim of HERO_ANIMS) {
    scene.load.spritesheet(`hero_${anim}`, `${ASSET_BASE}sprites/hero_${anim}.png`, { frameWidth: cell, frameHeight: cell });
  }
  for (const anim of SKELETON_ANIMS) {
    scene.load.spritesheet(`skeleton_${anim}`, `${ASSET_BASE}sprites/skeleton_${anim}.png`, { frameWidth: cell, frameHeight: cell });
  }
  for (const key of MONSTERS) scene.load.image(key, `${ASSET_BASE}monsters/${key}.png`);
  for (const key of TILES) scene.load.image(key, `${ASSET_BASE}tiles/${key}.png`);
  for (const [key, fx] of Object.entries(manifest.fx)) {
    scene.load.spritesheet(`fx_${key}`, `${ASSET_BASE}fx/${key}.png`, { frameWidth: fx.frameWidth, frameHeight: fx.frameHeight });
  }
}

/** Mỗi hoạt ảnh LPC có 4 hàng hướng (riêng hurt chỉ 1 hàng). */
function createDirectionalAnims(scene, prefix, anims, meta) {
  for (const anim of anims) {
    const { cols, rows } = meta[anim];
    for (let row = 0; row < rows; row++) {
      const dir = rows === 1 ? 'any' : DIRECTIONS[row];
      scene.anims.create({
        key: `${prefix}_${anim}_${dir}`,
        frames: scene.anims.generateFrameNumbers(`${prefix}_${anim}`, { start: row * cols, end: row * cols + cols - 1 }),
        frameRate: FRAME_RATES[anim],
        repeat: anim === 'walk' || anim === 'idle' ? -1 : 0,
      });
    }
  }
}

export function createAnimations(scene, manifest) {
  createDirectionalAnims(scene, 'hero', HERO_ANIMS, manifest.hero);
  createDirectionalAnims(scene, 'skeleton', SKELETON_ANIMS, manifest.skeleton);
  for (const [key, fx] of Object.entries(manifest.fx)) {
    scene.anims.create({
      key: `fx_${key}`,
      frames: scene.anims.generateFrameNumbers(`fx_${key}`, { start: 0, end: fx.frames - 1 }),
      frameRate: fx.fps,
      repeat: fx.loop ? -1 : 0,
    });
  }
}

/** Phát một hiệu ứng pixelfx tại (x, y) theo pivot gốc; hiệu ứng không lặp tự huỷ khi xong. */
export function playFx(scene, manifest, key, x, y, options = {}) {
  const fx = manifest.fx[key];
  const sprite = scene.add.sprite(x, y, `fx_${key}`);
  sprite.setOrigin(fx.pivot[0] / fx.frameWidth, fx.pivot[1] / fx.frameHeight);
  sprite.setDepth(options.depth ?? y + 1);
  if (options.flipX) sprite.setFlipX(true);
  if (options.scale) sprite.setScale(options.scale);
  sprite.play(`fx_${key}`);
  if (!fx.loop) sprite.once('animationcomplete', () => sprite.destroy());
  return sprite;
}
