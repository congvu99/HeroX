import Phaser from 'phaser';
import { ARENA_ORIGIN } from '../battle/battle-arena-layout';
import type { ActorAction, HeroMove } from '../battle/battle-cues';
import { LOGICAL_WIDTH } from '../config/display';
import { heroBattleAnimationKey, prepareHeroBattleAnimations, type HeroBattleMove } from './hero-battle-animations';
import { prepareHeroLook } from './hero-sprite';
import { TEXTURE_KEYS } from './placeholder-textures';
import { spriteAssetUrl } from './sprite-asset-urls';

export interface ActorPoint {
  readonly x: number;
  readonly y: number;
}

/** Chân hiệp sĩ (dưới) và quái (trên) trên sân dọc (pixel logic); dải giữa để hiệu ứng chiêu bay dọc. */
// Giữa khung theo chiều ngang (cùng tâm với thẻ đề HUD); chiều dọc tính theo góc lưới sân.
// Hiệp sĩ đứng trên mép dock: đề + vòng từ 3 hàng chiếm khoảng 345 px đáy khung, chân thấp hơn sẽ bị che.
export const HERO_FEET: ActorPoint = { x: LOGICAL_WIDTH / 2, y: ARENA_ORIGIN.y + 388 };
export const ENEMY_FEET: ActorPoint = { x: LOGICAL_WIDTH / 2, y: ARENA_ORIGIN.y + 168 };

/** Sprite 64 px phóng số nguyên ×2 để pixel đều; trùm 128 px phóng ×1.5 cho khỏi tràn sân. */
const ACTOR_SCALE = 2;
const BOSS_SCALE = 1.5;
const ACTOR_DEPTH = 10;
const SHADOW = { width: 64, height: 14, color: 0x000000, alpha: 0.45 } as const;

/** Loại quái → file sprite trong `assets/sprites/monsters`; quái trinh sát dùng chung hình tiểu quỷ. */
const MONSTER_SPRITES: Readonly<Record<string, string>> = {
  'imp-scout': 'imp',
  imp: 'imp',
  skeleton: 'skeleton',
  ghoul: 'ghoul',
  'scarecrow-demon': 'scarecrow-demon',
};
const BOSS_KINDS: ReadonlySet<string> = new Set(['scarecrow-demon']);

const ELITE_TINT = 0xffa060;
/** Khiên lửa của trùm: quái ánh cam đỏ tới khi bị xuyên. */
const FIRE_SHIELD_TINT = 0xff5a1f;
const HURT_TINT = 0xff6060;
const HIT_FLASH_COLOR = 0xffffff;

const TIMING = {
  enemyFadeMs: 400,
  strikeLungeMs: 220,
  strikeReturnMs: 320,
  strikeHoldMs: 360,
  knockbackMs: 120,
  flashMs: 70,
  hurtTintMs: 160,
  enemyLungeMs: 260,
  dashMs: 110,
  blinkHiddenMs: 260,
  bobMs: 900,
} as const;
// Khung dọc: hiệp sĩ ở dưới, quái ở trên. strikeLunge/enemyLunge là khoảng lao dọc; dash là khoảng hiệp sĩ né lùi xuống.
const DISTANCE = { strikeLunge: 120, knockback: 12, enemyLunge: 90, dash: 34, bob: 3 } as const;

const MONSTER_KEY_PREFIX = 'monster:';

function monsterTextureKey(file: string): string {
  return `${MONSTER_KEY_PREFIX}${file}`;
}

/** Khoá loader của sprite quái, để bản đồ bỏ qua lỗi tải quái (quái lang thang chỉ là trang trí phụ). */
export function isMonsterTextureKey(key: string): boolean {
  return key.startsWith(MONSTER_KEY_PREFIX);
}

/** Khoá texture sprite của loại quái đã tải; `undefined` khi loại đó chưa có sprite hoặc chưa tải xong. */
export function monsterTextureFor(scene: Phaser.Scene, kind: string): string | undefined {
  const file = MONSTER_SPRITES[kind];
  const key = file === undefined ? undefined : monsterTextureKey(file);
  return key !== undefined && scene.textures.exists(key) ? key : undefined;
}

/** Xếp sprite quái vào hàng đợi tải (gọi ở `preload`); thiếu file thì dùng hình tạm vẽ bằng canvas. */
export function queueMonsterSprites(scene: Phaser.Scene): void {
  for (const file of new Set(Object.values(MONSTER_SPRITES))) {
    const url = spriteAssetUrl(`sprites/monsters/${file}.png`);
    if (url !== undefined && !scene.textures.exists(monsterTextureKey(file))) scene.load.image(monsterTextureKey(file), url);
  }
}

type EnemyTint = 'none' | 'elite' | 'shield';
const TINT_COLORS: Readonly<Record<Exclude<EnemyTint, 'none'>, number>> = { elite: ELITE_TINT, shield: FIRE_SHIELD_TINT };

/**
 * Hiệp sĩ và quái trên sân: mỗi bên một container (vị trí, động tác lao/giật) chứa bóng đổ và sprite (nhún khi đứng).
 * Động tác ngắn và không chặn gì: logic trận đã chốt kết quả, phần này chỉ diễn lại.
 */
export class BattleActors {
  private readonly heroRoot: Phaser.GameObjects.Container;
  private readonly hero: Phaser.GameObjects.Sprite;
  private readonly enemyRoot: Phaser.GameObjects.Container;
  private readonly enemy: Phaser.GameObjects.Sprite;
  private readonly heroMoves: ReadonlySet<HeroBattleMove>;
  private enemyTint: EnemyTint = 'none';

  constructor(private readonly scene: Phaser.Scene) {
    const look = prepareHeroLook(scene);
    this.heroMoves = prepareHeroBattleAnimations(scene);
    this.hero = scene.add.sprite(0, 0, look.textureKey, 'up').setOrigin(0.5, look.feetY / look.frameSize).setScale(ACTOR_SCALE);
    this.heroRoot = scene.add.container(HERO_FEET.x, HERO_FEET.y, [this.shadow(), this.hero]).setDepth(ACTOR_DEPTH);
    this.enemy = scene.add.sprite(0, 0, TEXTURE_KEYS.enemy).setOrigin(0.5, 1).setScale(ACTOR_SCALE);
    this.enemyRoot = scene.add.container(ENEMY_FEET.x, ENEMY_FEET.y, [this.shadow(), this.enemy]).setDepth(ACTOR_DEPTH).setAlpha(0);
    this.hero.on(Phaser.Animations.Events.ANIMATION_COMPLETE, this.returnHeroToIdle);
    this.playHero('idle');
  }

  /** Điểm sáng đi theo nhân vật (ngang ngực), cho quầng sáng của sân. */
  get heroLight(): ActorPoint {
    const root = this.heroRoot;
    return { get x() { return root.x; }, get y() { return root.y - 40; } };
  }

  get enemyLight(): ActorPoint {
    const root = this.enemyRoot;
    return { get x() { return root.x; }, get y() { return root.y - 40; } };
  }

  showEnemy(kind: string, elite: boolean): void {
    this.scene.tweens.killTweensOf([this.enemyRoot, this.enemy]);
    const file = MONSTER_SPRITES[kind];
    const textureKey = file === undefined ? undefined : monsterTextureKey(file);
    const hasSprite = textureKey !== undefined && this.scene.textures.exists(textureKey);
    this.enemy.setTexture(hasSprite ? textureKey : TEXTURE_KEYS.enemy).setScale(BOSS_KINDS.has(kind) ? BOSS_SCALE : ACTOR_SCALE).setY(0);
    this.enemyRoot.setPosition(ENEMY_FEET.x, ENEMY_FEET.y).setAlpha(0);
    this.setEnemyTint(elite ? 'elite' : 'none');
    this.scene.tweens.add({ targets: this.enemyRoot, alpha: 1, duration: TIMING.enemyFadeMs });
    this.scene.tweens.add({ targets: this.enemy, y: -DISTANCE.bob, duration: TIMING.bobMs, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  }

  /** Màu nền của quái theo trạng thái: tinh anh, khiên lửa, thường. */
  setEnemyState(elite: boolean, shielded: boolean): void {
    let tint: EnemyTint = 'none';
    if (shielded) tint = 'shield';
    else if (elite) tint = 'elite';
    if (tint !== this.enemyTint) this.setEnemyTint(tint);
  }

  defeatEnemy(): void {
    this.scene.tweens.killTweensOf(this.enemy);
    this.scene.tweens.add({ targets: this.enemyRoot, alpha: 0, duration: TIMING.enemyFadeMs / 2 });
  }

  act(target: 'hero' | 'enemy', action: ActorAction): void {
    if (target === 'hero') this.heroAct(action);
    else this.enemyAct(action);
  }

  /** Né: lướt lùi rồi về chỗ, hoặc tan biến rồi hiện lại (thuấn bộ); `onBlinkIn` để phát hiệu ứng hiện ra. */
  moveHero(move: HeroMove, onBlinkIn: () => void): void {
    this.scene.tweens.killTweensOf(this.heroRoot);
    this.heroRoot.setPosition(HERO_FEET.x, HERO_FEET.y).setAlpha(1);
    if (move === 'dash') {
      // Né: hiệp sĩ lướt lùi xuống (ra xa quái ở trên) rồi về chỗ.
      this.scene.tweens.add({ targets: this.heroRoot, y: HERO_FEET.y + DISTANCE.dash, duration: TIMING.dashMs, yoyo: true, ease: 'Quad.easeOut' });
      return;
    }
    this.heroRoot.setAlpha(0);
    this.scene.time.delayedCall(TIMING.blinkHiddenMs, () => {
      onBlinkIn();
      this.heroRoot.setAlpha(1);
    });
  }

  /** Hiệp sĩ gục ngã khi thua (sheet LPC "hurt"). */
  fall(): void {
    this.scene.tweens.killTweensOf(this.heroRoot);
    this.heroRoot.setPosition(HERO_FEET.x, HERO_FEET.y);
    if (this.heroMoves.has('fall')) this.hero.play(heroBattleAnimationKey('fall'));
    else this.hero.setTint(HURT_TINT);
  }

  /** Khựng hình: dừng mọi chuyển động trên sân trong chốc lát rồi chạy tiếp. */
  hitstop(durationMs: number): void {
    const { tweens } = this.scene;
    tweens.timeScale = 0;
    this.hero.anims.pause();
    this.scene.time.delayedCall(durationMs, () => {
      tweens.timeScale = 1;
      this.hero.anims.resume();
    });
  }

  private heroAct(action: ActorAction): void {
    if (action === 'strike') this.heroStrike();
    else if (action === 'cast') this.playHero('cast');
    else if (action === 'hurt') this.heroHurt();
  }

  private heroStrike(): void {
    this.scene.tweens.killTweensOf(this.heroRoot);
    this.heroRoot.setPosition(HERO_FEET.x, HERO_FEET.y).setAlpha(1);
    this.playHero('strike');
    // Lao lên phía quái (y giảm) rồi trở về chỗ.
    this.scene.tweens.chain({
      targets: this.heroRoot,
      tweens: [
        { y: HERO_FEET.y - DISTANCE.strikeLunge, duration: TIMING.strikeLungeMs, ease: 'Quad.easeOut' },
        { y: HERO_FEET.y, duration: TIMING.strikeReturnMs, delay: TIMING.strikeHoldMs, ease: 'Quad.easeInOut' },
      ],
    });
  }

  private heroHurt(): void {
    this.hero.setTint(HURT_TINT);
    this.scene.time.delayedCall(TIMING.hurtTintMs, () => this.hero.clearTint());
    // Hiệp sĩ trúng đòn: giật lùi xuống (ra xa quái).
    this.knockback(this.heroRoot, DISTANCE.knockback);
  }

  private enemyAct(action: ActorAction): void {
    if (action === 'hurt') {
      this.enemy.setTint(HIT_FLASH_COLOR).setTintMode(Phaser.TintModes.FILL);
      this.scene.time.delayedCall(TIMING.flashMs, () => this.setEnemyTint(this.enemyTint));
      // Quái trúng đòn: giật lùi lên (ra xa hiệp sĩ).
      this.knockback(this.enemyRoot, -DISTANCE.knockback);
    } else if (action === 'lunge') {
      // Quái lao xuống phía hiệp sĩ (y tăng) rồi về chỗ.
      this.scene.tweens.add({ targets: this.enemyRoot, y: ENEMY_FEET.y + DISTANCE.enemyLunge, duration: TIMING.enemyLungeMs, yoyo: true, ease: 'Quad.easeIn' });
    }
  }

  /** Giật lùi dọc: offset dương đẩy xuống, âm đẩy lên (khung dọc). */
  private knockback(root: Phaser.GameObjects.Container, offset: number): void {
    const home = root === this.heroRoot ? HERO_FEET.y : ENEMY_FEET.y;
    this.scene.tweens.add({ targets: root, y: home + offset, duration: TIMING.knockbackMs, yoyo: true, ease: 'Quad.easeOut' });
  }

  private setEnemyTint(tint: EnemyTint): void {
    this.enemyTint = tint;
    this.enemy.clearTint().setTintMode(Phaser.TintModes.MULTIPLY);
    if (tint !== 'none') this.enemy.setTint(TINT_COLORS[tint]);
  }

  private playHero(move: HeroBattleMove): void {
    if (this.heroMoves.has(move)) this.hero.play(heroBattleAnimationKey(move), true);
  }

  /** Chém, niệm xong thì về dáng đứng; ngã gục thì nằm yên. */
  private readonly returnHeroToIdle = (animation: Phaser.Animations.Animation): void => {
    if (animation.key !== heroBattleAnimationKey('fall')) this.playHero('idle');
  };

  private shadow(): Phaser.GameObjects.Ellipse {
    return this.scene.add.ellipse(0, 0, SHADOW.width, SHADOW.height, SHADOW.color, SHADOW.alpha);
  }
}
