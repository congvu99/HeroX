/** Phần dùng chung giữa màn khám phá và màn trận: ghép nền ô 32px, dựng hero. */
export const TILE = 32;
const HERO_FOOT_ORIGIN_Y = 126 / 192; // chân nhân vật LPC nằm ở hàng 126 của ô 192

/** Ghép mọi ô nền vào một canvas texture: 1 draw call thay vì hàng trăm sprite. */
export function paintTiles(scene, key, grid) {
  const rows = grid.length;
  const cols = grid[0].length;
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const texture = scene.textures.createCanvas(key, cols * TILE, rows * TILE);
  const ctx = texture.getContext();
  ctx.imageSmoothingEnabled = false;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const tileKey = grid[row][col];
      if (tileKey) ctx.drawImage(scene.textures.get(tileKey).getSourceImage(), col * TILE, row * TILE);
    }
  }
  texture.refresh();
  return scene.add.image(0, 0, key).setOrigin(0).setDepth(-10);
}

/** Phủ màu lên nền (ánh trăng lạnh, ánh lửa ấm) để các nguồn tile khác nhau về chung một tông. */
export function gradeTiles(scene, width, height, color, alpha) {
  return scene.add.rectangle(0, 0, width, height, color, alpha).setOrigin(0).setDepth(-9);
}

export function createHero(scene, x, y) {
  const hero = scene.add.sprite(x, y, 'hero_walk', 0).setOrigin(0.5, HERO_FOOT_ORIGIN_Y);
  hero.facing = 'down';
  hero.standStill = () => {
    hero.anims.stop();
    hero.setTexture('hero_walk', rowStartFrame(scene, hero.facing));
  };
  hero.standStill();
  return hero;
}

function rowStartFrame(scene, facing) {
  const { cols } = scene.registry.get('manifest').hero.walk;
  return ['up', 'left', 'down', 'right'].indexOf(facing) * cols;
}

/** Bóng elip dưới chân để nhân vật "đứng" trên nền thay vì trôi nổi. */
export function addShadow(scene, target, width = 22) {
  const shadow = scene.add.ellipse(target.x, target.y, width, width * 0.4, 0x000000, 0.45).setDepth(-5);
  const follow = () => {
    if (target.active) shadow.setPosition(target.x, target.y);
    else shadow.destroy();
  };
  scene.events.on('update', follow);
  scene.events.once('shutdown', () => scene.events.off('update', follow));
  target.once('destroy', () => scene.events.off('update', follow));
  return shadow;
}
