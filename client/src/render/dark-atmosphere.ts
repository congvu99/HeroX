import Phaser from 'phaser';
import { LIGHT_TEXTURE_SIZE, TEXTURE_KEYS } from './placeholder-textures';

/** Trên sprite và layer mái, dưới UI. */
const ATMOSPHERE_DEPTH = 9000;
const DARKNESS_COLOR = 0x05040a;
const DARKNESS_ALPHA = 0.72;
const VIGNETTE_RADIUS = 0.85;
const VIGNETTE_STRENGTH = 0.3;
/** Đuốc chập chờn nhẹ: biên độ theo tỉ lệ bán kính, tần số rad/ms. */
const FLICKER_AMPLITUDE = 0.06;
const FLICKER_SPEED = 0.012;
/** Lệch pha giữa các đuốc (rad) để chúng không chập chờn đồng loạt. */
const FLICKER_PHASE_STEP = 1.7;

export interface LightSource {
  readonly x: number;
  readonly y: number;
}

interface Light {
  readonly source: LightSource;
  readonly radius: number;
  readonly flicker: boolean;
  readonly phase: number;
}

export interface DarkAtmosphereOptions {
  /** Tắt khi mức chất lượng thấp (`platform/quality-settings.ts`). */
  readonly enabled: boolean;
}

/**
 * Không khí u tối kiểu Diablo cho góc nhìn top-down: một lớp tối phủ màn hình,
 * khoét vùng sáng mềm quanh hero và đuốc, cộng vignette ở camera (chỉ WebGL).
 */
export class DarkAtmosphere {
  private readonly overlay: Phaser.GameObjects.RenderTexture | null;
  private readonly lightBrush: Phaser.GameObjects.Image | null;
  private readonly lights: Light[] = [];
  private vignette: Phaser.Filters.Controller | null = null;
  private enabled: boolean;

  constructor(private readonly scene: Phaser.Scene, options: DarkAtmosphereOptions) {
    this.enabled = options.enabled;
    if (!options.enabled) {
      this.overlay = null;
      this.lightBrush = null;
      return;
    }
    const { width, height } = scene.scale.gameSize;
    this.overlay = scene.add.renderTexture(0, 0, width, height).setOrigin(0).setScrollFactor(0).setDepth(ATMOSPHERE_DEPTH);
    // Cọ tẩy không thêm vào display list, chỉ dùng để `erase`.
    this.lightBrush = new Phaser.GameObjects.Image(scene, 0, 0, TEXTURE_KEYS.light);
    const camera = scene.cameras.main;
    if (scene.renderer.type === Phaser.WEBGL) {
      this.vignette = camera.filters.external.addVignette(0.5, 0.5, VIGNETTE_RADIUS, VIGNETTE_STRENGTH);
    }
    // Vẽ ở POST_UPDATE (sau khi hero di chuyển). Camera follow chỉ cập nhật ở preRender nên vùng sáng dùng vị trí
    // camera của frame trước (lệch vài pixel khi cuộn); không vẽ được trong FOLLOW_UPDATE vì lệnh vẽ vào
    // RenderTexture giữa lúc camera đang render không hiện ra ở Phaser 4.
    scene.events.on(Phaser.Scenes.Events.POST_UPDATE, this.redraw);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.events.off(Phaser.Scenes.Events.POST_UPDATE, this.redraw);
      this.lightBrush?.destroy();
    });
  }

  /** Tắt giữa chừng khi máy tụt fps: bỏ lớp tối vẽ lại mỗi frame và vignette toàn màn hình. */
  disable(): void {
    if (!this.enabled) return;
    this.enabled = false;
    this.overlay?.setVisible(false);
    if (this.vignette !== null) {
      this.scene.cameras.main.filters.external.remove(this.vignette);
      this.vignette = null;
    }
  }

  addLight(source: LightSource, radius: number, flicker = false): void {
    this.lights.push({ source, radius, flicker, phase: this.lights.length * FLICKER_PHASE_STEP });
  }

  /** Chữ ký sự kiện POST_UPDATE của scene: (systems, time, delta). */
  private readonly redraw = (_systems: Phaser.Scenes.Systems, timeMs: number): void => {
    if (!this.enabled || !this.overlay || !this.lightBrush) return;
    const view = this.scene.cameras.main.worldView;
    this.overlay.clear().fill(DARKNESS_COLOR, DARKNESS_ALPHA);
    for (const light of this.lights) {
      const flickerScale = light.flicker ? 1 + Math.sin(timeMs * FLICKER_SPEED + light.phase) * FLICKER_AMPLITUDE : 1;
      this.lightBrush.setScale(((light.radius * 2) / LIGHT_TEXTURE_SIZE) * flickerScale);
      this.overlay.erase(this.lightBrush, light.source.x - view.x, light.source.y - view.y);
    }
    this.overlay.render();
  };
}
