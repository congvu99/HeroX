import Phaser from 'phaser';
import { findEncounter } from '@herox/shared';
import { isSolidCell, type CollisionGrid } from '../maps/ldtk-loader';
import type { DarkAtmosphere, LightSource } from '../render/dark-atmosphere';
import { monsterTextureFor } from '../render/battle-actors';
import type { Rect } from './movement-skills';
import { rectsOverlap } from './trigger-zones';

/** Bầy quái lang thang ở một level; chạm vào là vào trận `encounterId`. */
export interface RoamingSpawn {
  readonly encounterId: string;
  readonly count: number;
}

export interface RoamingMonstersOptions {
  readonly spawn: RoamingSpawn;
  readonly collision: CollisionGrid;
  /** Vùng không đặt quái (cổng, NPC, rương, cửa, vùng trận cố định, chỗ hero đứng). */
  readonly keepOut: readonly Rect[];
  /** Lớp tối của bản đồ: mỗi con quái có quầng sáng nhỏ để nhìn thấy trong sương. */
  readonly atmosphere: DarkAtmosphere | null;
}

/** Sprite quái 64 px thu về khoảng 1,2 ô bản đồ. */
const MONSTER_SCALE = 0.75;
const LIGHT_RADIUS = 44;
const LIGHT_OFFSET_Y = -18;
const KEEP_OUT_MARGIN = 64;
/** Quái chỉ đi quanh chỗ sinh ra, để không lạc tới cổng hay chắn lối NPC. */
const LEASH_PX = 56;
const STEP_PX = 24;
const STEP_MS = 900;
const IDLE_MS = { min: 1200, max: 2800 } as const;
const BOB_PX = 2;
const BOB_MS = 700;
const FADE_MS = 400;
const RESPAWN_MS = 30_000;
const PLACEMENT_TRIES = 200;
/** Hitbox chạm: thân dưới của quái. */
const TOUCH_HALF_WIDTH = 10;
const TOUCH_HEIGHT = 14;

interface Roamer {
  readonly sprite: Phaser.GameObjects.Image;
  readonly home: { readonly x: number; readonly y: number };
  readonly light: LightSource;
}

/**
 * Độ sâu theo chân (giống hero, cây, nhà) để quái đứng sau/trước đúng chỗ.
 * Quái lang thang trên bản đồ (chỉ để nhìn và chạm, không va chạm vật lý): đứng nhún, thỉnh thoảng bước quanh
 * chỗ sinh. Hero chạm thì trả `encounterId`; quái đó tan đi khi trận xong và sinh con mới sau một lúc.
 */
export class RoamingMonsters {
  private readonly roamers: Roamer[] = [];
  private readonly kinds: readonly string[];
  /** Quái đang giao chiến, gỡ khỏi bản đồ khi trận xong. */
  private engaged: Roamer | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly options: RoamingMonstersOptions,
  ) {
    this.kinds = findEncounter(options.spawn.encounterId)?.enemies.map((enemy) => enemy.kind) ?? [];
    for (let index = 0; index < options.spawn.count; index += 1) this.spawnOne();
  }

  get encounterId(): string {
    return this.options.spawn.encounterId;
  }

  /** Gọi mỗi frame với hitbox chân hero; trả `true` khi hero vừa chạm một con quái (con đó đứng yên chờ trận). */
  touch(heroBody: Rect): boolean {
    if (this.engaged !== null) return false;
    const hit = this.roamers.find((roamer) => rectsOverlap(heroBody, touchRect(roamer.sprite)));
    if (hit === undefined) return false;
    this.engaged = hit;
    this.scene.tweens.killTweensOf(hit.sprite);
    return true;
  }

  /** Trận xong (thắng, thua hay rời trận): quái đó tan đi, sinh con mới sau `RESPAWN_MS`. */
  releaseEngaged(): void {
    const roamer = this.engaged;
    if (roamer === null) return;
    this.engaged = null;
    this.roamers.splice(this.roamers.indexOf(roamer), 1);
    this.options.atmosphere?.removeLight(roamer.light);
    this.scene.tweens.add({ targets: roamer.sprite, alpha: 0, duration: FADE_MS, onComplete: () => roamer.sprite.destroy() });
    this.scene.time.delayedCall(RESPAWN_MS, () => this.spawnOne());
  }

  private spawnOne(): void {
    const kind = this.kinds[Math.floor(Math.random() * this.kinds.length)];
    const texture = kind === undefined ? undefined : monsterTextureFor(this.scene, kind);
    const home = this.pickHome();
    if (texture === undefined || home === null) return;
    const sprite = this.scene.add.image(home.x, home.y, texture).setOrigin(0.5, 1).setScale(MONSTER_SCALE).setDepth(home.y).setAlpha(0);
    this.scene.tweens.add({ targets: sprite, alpha: 1, duration: FADE_MS });
    const light: LightSource = {
      get x() {
        return sprite.x;
      },
      get y() {
        return sprite.y + LIGHT_OFFSET_Y;
      },
    };
    this.options.atmosphere?.addLight(light, LIGHT_RADIUS);
    const roamer: Roamer = { sprite, home, light };
    this.roamers.push(roamer);
    this.scheduleStep(roamer);
  }

  private pickHome(): { x: number; y: number } | null {
    const grid = this.options.collision;
    for (let attempt = 0; attempt < PLACEMENT_TRIES; attempt += 1) {
      const cellX = Math.floor(Math.random() * grid.widthCells);
      const cellY = Math.floor(Math.random() * grid.heightCells);
      const x = grid.offsetX + (cellX + 0.5) * grid.gridSize;
      const y = grid.offsetY + (cellY + 1) * grid.gridSize - 2;
      if (this.isWalkable(x, y) && !this.isKeptOut(x, y)) return { x, y };
    }
    return null;
  }

  private isWalkable(x: number, y: number): boolean {
    const grid = this.options.collision;
    return !isSolidCell(grid, Math.floor((x - grid.offsetX) / grid.gridSize), Math.floor((y - grid.offsetY) / grid.gridSize));
  }

  private isKeptOut(x: number, y: number): boolean {
    const area: Rect = { x: x - KEEP_OUT_MARGIN, y: y - KEEP_OUT_MARGIN, width: KEEP_OUT_MARGIN * 2, height: KEEP_OUT_MARGIN * 2 };
    if (this.options.keepOut.some((rect) => rectsOverlap(area, rect))) return true;
    return this.roamers.some((other) => Phaser.Math.Distance.Between(x, y, other.home.x, other.home.y) < KEEP_OUT_MARGIN);
  }

  /** Đứng nhún một lúc rồi bước một bước ngẫu nhiên trong dây buộc quanh chỗ sinh. */
  private scheduleStep(roamer: Roamer): void {
    const { sprite } = roamer;
    const restY = sprite.y;
    this.scene.tweens.add({ targets: sprite, y: restY - BOB_PX, duration: BOB_MS, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.scene.time.delayedCall(Phaser.Math.Between(IDLE_MS.min, IDLE_MS.max), () => {
      if (!sprite.active || this.engaged === roamer) return;
      this.scene.tweens.killTweensOf(sprite);
      sprite.setY(restY);
      const target = this.nextStep(roamer);
      sprite.setFlipX(target.x < sprite.x).setDepth(target.y);
      this.scene.tweens.add({ targets: sprite, x: target.x, y: target.y, duration: STEP_MS, ease: 'Sine.inOut', onComplete: () => this.scheduleStep(roamer) });
    });
  }

  private nextStep(roamer: Roamer): { x: number; y: number } {
    const { sprite, home } = roamer;
    const angle = Math.random() * Math.PI * 2;
    const x = Phaser.Math.Clamp(sprite.x + Math.cos(angle) * STEP_PX, home.x - LEASH_PX, home.x + LEASH_PX);
    const y = Phaser.Math.Clamp(sprite.y + Math.sin(angle) * STEP_PX, home.y - LEASH_PX, home.y + LEASH_PX);
    return this.isWalkable(x, y) ? { x, y } : home;
  }
}

function touchRect(sprite: Phaser.GameObjects.Image): Rect {
  return { x: sprite.x - TOUCH_HALF_WIDTH, y: sprite.y - TOUCH_HEIGHT, width: TOUCH_HALF_WIDTH * 2, height: TOUCH_HEIGHT };
}
