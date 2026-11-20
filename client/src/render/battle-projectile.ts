import Phaser from 'phaser';
import type { ProjectileTone } from '../battle/battle-cues';
import type { ActorPoint } from './battle-actors';

const TEXTURE_KEY = 'battle-projectile-orb';
const ORB_RADIUS = 7;
const TRAIL_LIFESPAN_MS = 260;
const TRAIL_FREQUENCY_MS = 16;
const TONE_COLORS: Readonly<Record<ProjectileTone, number>> = { holy: 0xfff1c2, curse: 0xb070ff };

/** Luồng sáng có đuôi bay thẳng giữa hai nhân vật (khung dọc: dọc theo trục sân, không xoay sprite). */
export class BattleProjectiles {
  constructor(private readonly scene: Phaser.Scene, private readonly depth: number) {
    if (scene.textures.exists(TEXTURE_KEY)) return;
    const graphics = scene.make.graphics({}, false);
    graphics.fillStyle(0xffffff, 0.35).fillCircle(ORB_RADIUS * 2, ORB_RADIUS * 2, ORB_RADIUS * 2);
    graphics.fillStyle(0xffffff, 1).fillCircle(ORB_RADIUS * 2, ORB_RADIUS * 2, ORB_RADIUS);
    graphics.generateTexture(TEXTURE_KEY, ORB_RADIUS * 4, ORB_RADIUS * 4);
    graphics.destroy();
  }

  fire(from: ActorPoint, to: ActorPoint, tone: ProjectileTone, durationMs: number): void {
    const color = TONE_COLORS[tone];
    const orb = this.scene.add.image(from.x, from.y, TEXTURE_KEY).setTint(color).setBlendMode(Phaser.BlendModes.ADD).setDepth(this.depth);
    const trail = this.scene.add
      .particles(0, 0, TEXTURE_KEY, {
        follow: orb,
        lifespan: TRAIL_LIFESPAN_MS,
        frequency: TRAIL_FREQUENCY_MS,
        scale: { start: 0.6, end: 0 },
        alpha: { start: 0.8, end: 0 },
        tint: color,
        blendMode: Phaser.BlendModes.ADD,
      })
      .setDepth(this.depth - 1);
    this.scene.tweens.add({
      targets: orb,
      x: to.x,
      y: to.y,
      duration: durationMs,
      ease: 'Quad.easeIn',
      onComplete: () => {
        orb.destroy();
        trail.stop();
        this.scene.time.delayedCall(TRAIL_LIFESPAN_MS, () => trail.destroy());
      },
    });
  }
}
