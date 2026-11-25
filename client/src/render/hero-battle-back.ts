import Phaser from 'phaser';
import type { HeroBattleMove } from './hero-battle-animations';
import { LIGHT_TEXTURE_SIZE, TEXTURE_KEYS } from './placeholder-textures';
import { spriteAssetUrl } from './sprite-asset-urls';

/**
 * Hiệp sĩ nhìn từ lưng trong trận: một ảnh tĩnh (PixelLab), chuyển động và hiệu ứng làm bằng tween.
 * Dùng thay sheet LPC khi có file; animate của PixelLab bị giật khung nên không sinh nhiều khung.
 */
const HERO_BACK_PATH = 'sprites/hero/hero_battle_back.png';
const HERO_BACK_TEXTURE_KEY = 'hero-battle-back';

/** Ngực hiệp sĩ so với chân (ảnh 128 px, nhân vật chiếm gần hết chiều cao). */
const CHEST_Y = -56;
const COLORS = { aura: 0xffe2a0, cast: 0x9fd8ff, slash: 0xfff6d8 } as const;

const AURA = { scale: 0.62, alpha: 0.32, pulseAlpha: 0.5, pulseMs: 1400 } as const;
const BREATH = { scaleY: 1.025, ms: 1100 } as const;
// delayMs: vệt kiếm loé khi cú lao gần tới quái (lao 220 ms, TIMING.strikeLungeMs ở battle-actors).
const SLASH = { radius: 70, width: 10, arcDeg: 150, ms: 320, squashMs: 90, delayMs: 180 } as const;
const CAST = { flareScale: 1.25, flareMs: 260, ringScale: 1.6, ringMs: 520, motes: 18, moteLifeMs: 900 } as const;
const FALL = { ms: 600, sink: 10, alpha: 0.55, tint: 0x8a8aa0 } as const;
const EFFECT_DEPTH_OFFSET = 1;

/** Xếp ảnh hiệp sĩ dáng lưng vào hàng đợi tải (gọi ở `preload`); thiếu file thì bỏ qua. */
export function queueHeroBattleBack(scene: Phaser.Scene): void {
  const url = spriteAssetUrl(HERO_BACK_PATH);
  if (url !== undefined && !scene.textures.exists(HERO_BACK_TEXTURE_KEY)) scene.load.image(HERO_BACK_TEXTURE_KEY, url);
}

/** Khoá texture dáng lưng nếu đã tải, để `BattleActors` chọn giữa ảnh này và sheet LPC. */
export function heroBattleBackTexture(scene: Phaser.Scene): string | undefined {
  return scene.textures.exists(HERO_BACK_TEXTURE_KEY) ? HERO_BACK_TEXTURE_KEY : undefined;
}

/**
 * Diễn động tác cho ảnh tĩnh: thở và hào quang khi đứng, vệt kiếm khi chém, bùng sáng và hạt sáng khi niệm,
 * gục xuống khi thua. Hào quang nằm trong container của hiệp sĩ nên đi theo khi lao, giật, né.
 */
export class HeroBackEffects {
  private readonly aura: Phaser.GameObjects.Image;
  private fallen = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly root: Phaser.GameObjects.Container,
    private readonly sprite: Phaser.GameObjects.Sprite,
  ) {
    this.aura = scene.add
      .image(0, CHEST_Y, TEXTURE_KEYS.light)
      .setTint(COLORS.aura)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(AURA.scale)
      .setAlpha(AURA.alpha);
    // Hào quang sau lưng hiệp sĩ: chèn dưới sprite trong cùng container.
    root.addAt(this.aura, root.getIndex(sprite));
    this.startIdle();
  }

  play(move: HeroBattleMove): void {
    if (this.fallen) return;
    if (move === 'strike') this.strike();
    else if (move === 'cast') this.cast();
    else if (move === 'fall') this.fall();
  }

  private startIdle(): void {
    this.scene.tweens.add({ targets: this.sprite, scaleY: BREATH.scaleY, duration: BREATH.ms, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.scene.tweens.add({ targets: this.aura, alpha: AURA.pulseAlpha, duration: AURA.pulseMs, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  }

  /** Chém: nén người lấy đà rồi một vệt kiếm hình cung sáng loé trên đầu, mờ dần và nở ra. */
  private strike(): void {
    this.scene.tweens.add({ targets: this.sprite, scaleX: 1.08, duration: SLASH.squashMs, yoyo: true, ease: 'Quad.easeOut' });
    this.scene.time.delayedCall(SLASH.delayMs, () => this.drawSlashArc());
  }

  private drawSlashArc(): void {
    if (this.fallen) return;
    const arc = this.scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    const half = Phaser.Math.DegToRad(SLASH.arcDeg / 2);
    // Cung quay lên phía quái (hướng -90°).
    const start = -Math.PI / 2 - half;
    const end = -Math.PI / 2 + half;
    arc.lineStyle(SLASH.width, COLORS.slash, 1).beginPath().arc(0, 0, SLASH.radius, start, end).strokePath();
    arc.lineStyle(SLASH.width / 3, 0xffffff, 1).beginPath().arc(0, 0, SLASH.radius - SLASH.width / 2, start, end).strokePath();
    arc.setPosition(0, CHEST_Y - 10);
    this.root.add(arc);
    this.scene.tweens.add({
      targets: arc,
      alpha: 0,
      scale: 1.35,
      duration: SLASH.ms,
      ease: 'Quad.easeOut',
      onComplete: () => arc.destroy(),
    });
  }

  /** Niệm phép: hào quang bùng lên, một vòng sáng lan ra và hạt sáng bay lên quanh người. */
  private cast(): void {
    this.scene.tweens.add({
      targets: this.aura,
      scale: AURA.scale * CAST.flareScale,
      duration: CAST.flareMs,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
    const ring = this.scene.add
      .image(0, CHEST_Y, TEXTURE_KEYS.light)
      .setTint(COLORS.cast)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(0.2)
      .setAlpha(0.9);
    this.root.add(ring);
    this.scene.tweens.add({
      targets: ring,
      scale: CAST.ringScale,
      alpha: 0,
      duration: CAST.ringMs,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });
    this.emitMotes();
  }

  private emitMotes(): void {
    const moteScale = 10 / LIGHT_TEXTURE_SIZE;
    const motes = this.scene.add
      .particles(this.root.x, this.root.y + CHEST_Y, TEXTURE_KEYS.light, {
        emitting: false,
        lifespan: CAST.moteLifeMs,
        speedY: { min: -90, max: -40 },
        speedX: { min: -30, max: 30 },
        x: { min: -40, max: 40 },
        y: { min: -10, max: 50 },
        scale: { start: moteScale, end: 0 },
        alpha: { start: 1, end: 0 },
        tint: [COLORS.cast, COLORS.aura, 0xffffff],
        blendMode: Phaser.BlendModes.ADD,
      })
      .setDepth(this.root.depth + EFFECT_DEPTH_OFFSET);
    motes.explode(CAST.motes);
    this.scene.time.delayedCall(CAST.moteLifeMs, () => motes.destroy());
  }

  /** Thua: thôi thở, hào quang tắt, hiệp sĩ chùng xuống và tối màu. */
  private fall(): void {
    this.fallen = true;
    this.scene.tweens.killTweensOf([this.sprite, this.aura]);
    this.sprite.setScale(1).setTint(FALL.tint);
    this.scene.tweens.add({ targets: this.sprite, y: FALL.sink, alpha: FALL.alpha, duration: FALL.ms, ease: 'Quad.easeIn' });
    this.scene.tweens.add({ targets: this.aura, alpha: 0, duration: FALL.ms });
  }
}
