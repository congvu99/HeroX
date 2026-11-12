import Phaser from 'phaser';

/**
 * Lớp bóng tối toàn màn hình: tô tối rồi khoét vùng sáng bằng `destination-out`,
 * thêm quầng sáng cộng màu (ADD) ở nguồn lửa. Rẻ hơn pipeline đèn và chạy ổn trên iPhone.
 */
export class DarknessLayer {
  constructor(scene, { darkness = 0.82, tint = '6,3,12' } = {}) {
    this.scene = scene;
    this.darkness = darkness;
    this.tint = tint;
    this.lights = [];
    const { width, height } = scene.scale;
    const key = `darkness_${scene.sys.settings.key}`;
    if (scene.textures.exists(key)) scene.textures.remove(key);
    this.texture = scene.textures.createCanvas(key, width, height);
    this.image = scene.add.image(0, 0, key).setOrigin(0).setScrollFactor(0).setDepth(9000);
    ensureGlowTexture(scene);
  }

  /** `follow` là object có x, y (hero) hoặc toạ độ cố định; `flicker` làm lửa chập chờn. */
  addLight({ x, y, radius, follow = null, flicker = 0, glow = null }) {
    const light = { x, y, radius, follow, flicker, phase: Math.random() * 10 };
    if (glow) {
      light.glow = this.scene.add.image(x, y, 'glow').setBlendMode(Phaser.BlendModes.ADD)
        .setTint(glow.color).setAlpha(glow.alpha ?? 0.5).setScale(radius / 48).setDepth(8999);
    }
    this.lights.push(light);
    return light;
  }

  update(time) {
    const ctx = this.texture.getContext();
    const cam = this.scene.cameras.main;
    const { width, height } = this.texture;
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = `rgba(${this.tint},${this.darkness})`;
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'destination-out';
    for (const light of this.lights) {
      const worldX = light.follow ? light.follow.x : light.x;
      const worldY = light.follow ? light.follow.y - 16 : light.y;
      const wobble = light.flicker ? 1 + Math.sin(time / 90 + light.phase) * light.flicker : 1;
      const radius = light.radius * wobble * cam.zoom;
      const screenX = (worldX - cam.worldView.x) * cam.zoom;
      const screenY = (worldY - cam.worldView.y) * cam.zoom;
      const gradient = ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, radius);
      gradient.addColorStop(0, 'rgba(0,0,0,1)');
      gradient.addColorStop(0.55, 'rgba(0,0,0,0.75)');
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(screenX - radius, screenY - radius, radius * 2, radius * 2);
      if (light.glow) light.glow.setPosition(worldX, worldY).setScale((light.radius * wobble) / 48);
    }
    this.texture.refresh();
  }
}

function ensureGlowTexture(scene) {
  if (scene.textures.exists('glow')) return;
  const texture = scene.textures.createCanvas('glow', 96, 96);
  const ctx = texture.getContext();
  const gradient = ctx.createRadialGradient(48, 48, 0, 48, 48, 48);
  gradient.addColorStop(0, 'rgba(255,255,255,0.9)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 96, 96);
  texture.refresh();
}

/** Texture 2x2 cho hạt tàn lửa và mưa. */
export function ensurePixelTexture(scene, key, color, width = 2, height = 2) {
  if (scene.textures.exists(key)) return;
  const graphics = scene.make.graphics({ x: 0, y: 0 }, false);
  graphics.fillStyle(color, 1).fillRect(0, 0, width, height);
  graphics.generateTexture(key, width, height);
  graphics.destroy();
}
