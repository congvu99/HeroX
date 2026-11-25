import Phaser from 'phaser';
import { LIGHT_TEXTURE_SIZE, TEXTURE_KEYS } from './placeholder-textures';

/** Cấp quái quyết định hào quang sau lưng: quái thường không có, tinh anh cam, trùm đỏ tím. */
export type EnemyRank = 'normal' | 'elite' | 'boss';

const AURA_BY_RANK: Readonly<Record<Exclude<EnemyRank, 'normal'>, { color: number; scale: number }>> = {
  elite: { color: 0xff9a40, scale: 0.55 },
  boss: { color: 0xc040ff, scale: 0.85 },
};
const AURA = { alpha: 0.3, pulseAlpha: 0.55, pulseMs: 1300 } as const;
const BREATH = { scaleY: 1.03, ms: 1000 } as const;
/** Ngực quái so với chân, theo tỉ lệ chiều cao hình đang vẽ (sprite gốc chân chạm đáy). */
const CHEST_RATIO = 0.45;
const HURT = { flashScale: 0.45, flashAlpha: 0.85, flashMs: 220, sparks: 10, sparkLifeMs: 380, sparkSpeed: 220 } as const;
/** Thời gian quái tan thành tro, để container mờ bóng đổ cùng nhịp. */
export const ENEMY_DISSOLVE_MS = 650;
const DEATH = { ms: ENEMY_DISSOLVE_MS, rise: 18, ashMotes: 26, ashLifeMs: 1200, spread: 0.35 } as const;
const COLORS = { hurtFlash: 0xffffff, spark: 0xfff0c0, ash: 0x9a9088, ember: 0xffb060 } as const;
const EFFECT_DEPTH_OFFSET = 1;

/**
 * Hiệu ứng thân quái trong trận (ảnh tĩnh, chuyển động bằng tween): thở, hào quang theo cấp, loé sáng và tia văng
 * khi trúng đòn, tan thành tro khi chết. Bổ sung cho hiệu ứng pixelfx (trúng đòn, nổ khi chết) chứ không thay.
 */
export class EnemyBattleEffects {
  private readonly aura: Phaser.GameObjects.Image;
  private baseScale = 1;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly root: Phaser.GameObjects.Container,
    private readonly sprite: Phaser.GameObjects.Sprite,
  ) {
    this.aura = scene.add.image(0, 0, TEXTURE_KEYS.light).setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
    // Hào quang sau lưng quái: chèn dưới sprite trong cùng container để đi theo khi lao, giật.
    root.addAt(this.aura, root.getIndex(sprite));
  }

  /** Quái mới xuất hiện: đặt lại hình, bắt đầu thở và bật hào quang theo cấp. */
  show(rank: EnemyRank, scale: number): void {
    this.stop();
    this.baseScale = scale;
    this.sprite.setScale(scale).setAlpha(1).setY(0);
    this.scene.tweens.add({
      targets: this.sprite,
      scaleY: scale * BREATH.scaleY,
      duration: BREATH.ms,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
    if (rank === 'normal') return;
    const look = AURA_BY_RANK[rank];
    this.aura.setVisible(true).setY(this.chestY()).setTint(look.color).setScale(look.scale).setAlpha(AURA.alpha);
    this.scene.tweens.add({ targets: this.aura, alpha: AURA.pulseAlpha, duration: AURA.pulseMs, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  }

  /** Trúng đòn: quầng sáng trắng loé ở ngực và tia sáng văng ra (flash trắng của sprite do `BattleActors` lo). */
  hurt(): void {
    const chestY = this.chestY();
    const flash = this.scene.add
      .image(0, chestY, TEXTURE_KEYS.light)
      .setTint(COLORS.hurtFlash)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(HURT.flashScale * 0.5)
      .setAlpha(HURT.flashAlpha);
    this.root.add(flash);
    this.scene.tweens.add({
      targets: flash,
      scale: HURT.flashScale,
      alpha: 0,
      duration: HURT.flashMs,
      ease: 'Quad.easeOut',
      onComplete: () => flash.destroy(),
    });
    this.burst(chestY, {
      count: HURT.sparks,
      lifespan: HURT.sparkLifeMs,
      sizePx: 8,
      tint: [COLORS.spark, COLORS.hurtFlash],
      motion: { speed: { min: HURT.sparkSpeed / 2, max: HURT.sparkSpeed } },
    });
  }

  /** Chết: thôi thở, hình nhạt dần và bốc lên như tro, tro và tàn lửa bay lên. */
  defeat(): void {
    this.stop();
    this.sprite.setScale(this.baseScale);
    this.scene.tweens.add({ targets: this.sprite, alpha: 0, y: -DEATH.rise, duration: DEATH.ms, ease: 'Quad.easeIn' });
    const spreadX = this.sprite.displayWidth * DEATH.spread;
    const spreadY = this.sprite.displayHeight * DEATH.spread;
    this.burst(this.chestY(), {
      count: DEATH.ashMotes,
      lifespan: DEATH.ashLifeMs,
      sizePx: 6,
      tint: [COLORS.ash, COLORS.ash, COLORS.ember],
      motion: {
        speedX: { min: -25, max: 25 },
        speedY: { min: -80, max: -30 },
        x: { min: -spreadX, max: spreadX },
        y: { min: -spreadY, max: spreadY },
      },
    });
  }

  private stop(): void {
    this.scene.tweens.killTweensOf([this.sprite, this.aura]);
    this.aura.setVisible(false);
  }

  private chestY(): number {
    return -this.sprite.displayHeight * CHEST_RATIO;
  }

  /** Bắn một loạt hạt sáng (blend ADD) từ ngực quái, tự huỷ khi hạt cuối tắt. */
  private burst(chestY: number, options: BurstOptions): void {
    const scale = options.sizePx / LIGHT_TEXTURE_SIZE;
    const emitter = this.scene.add
      .particles(this.root.x, this.root.y + chestY, TEXTURE_KEYS.light, {
        ...options.motion,
        emitting: false,
        lifespan: options.lifespan,
        scale: { start: scale, end: 0 },
        alpha: { start: 1, end: 0 },
        tint: options.tint,
        blendMode: Phaser.BlendModes.ADD,
      })
      .setDepth(this.root.depth + EFFECT_DEPTH_OFFSET);
    emitter.explode(options.count);
    this.scene.time.delayedCall(options.lifespan, () => emitter.destroy());
  }
}

interface BurstOptions {
  readonly count: number;
  readonly lifespan: number;
  readonly sizePx: number;
  readonly tint: number[];
  /** Hướng bay và vùng toả của hạt (cấu hình emitter của Phaser). */
  readonly motion: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig;
}
