import Phaser from 'phaser';
import type { CollisionGrid } from '../maps/ldtk-loader';
import { flickerScale, solidRuns, type WorldGlow } from './golden-hour-layout';
import {
  BACKDROP_TILE_SIZE,
  createBackdropTexture,
  createShadowTexture,
  createShaftTexture,
  createSunWashTexture,
  createToneTexture,
  SHAFT_TILE_WIDTH,
} from './golden-hour-textures';
import type { WeatherSpec } from './ambient-weather';
import { LIGHTING_PRESETS, type LightingPreset } from './lighting-presets';
import { LIGHT_TEXTURE_SIZE, TEXTURE_KEYS } from './placeholder-textures';
import type { LightSource, SceneAtmosphere } from './scene-atmosphere';

/** Trên sprite và layer mái, dưới UI: tông màu → tia nắng → quầng sáng ấm. */
const TONE_DEPTH = 9000;
const SHAFT_DEPTH = 9001;
const GLOW_DEPTH = 9002;
const DUST_DEPTH = 9003;
/** Bóng đổ nằm trên mọi layer nền (≥ -1000) và dưới mọi sprite (depth = y chân ≥ 0). */
const SHADOW_DEPTH = -1;
/** Nền parallax nằm dưới mọi layer tile (layer nền bắt đầu từ -1000). */
const BACKDROP_DEPTH = -2000;

const TEXTURE = {
  tone: 'golden-hour-tone',
  sunWash: 'golden-hour-sun-wash',
  shafts: 'golden-hour-shafts',
  dust: 'golden-hour-dust',
  weather: 'golden-hour-weather',
  shadow: 'golden-hour-shadow',
  backdrop: 'golden-hour-backdrop',
} as const;

/** Mật độ hạt dưới ngưỡng này thì không phát (máy quá yếu): tránh emitter chạy mà gần như không thấy hạt. */
const MIN_WEATHER_DENSITY = 0.05;

/** Hạt lửa đuốc: ngọn nhỏ liu riu bốc lên quanh một điểm (khác dải tàn lửa đáy sân của BattleArena). */
const FLAME_TEXTURE = 'golden-hour-flame';
const FLAME_COLOR = 0xffb050;
const FLAME_SIZE = 2;
const FLAME_FREQUENCY_MS = 90;
const FLAME_LIFESPAN_MS = 900;
/** Bán kính miệng đuốc để hạt toả nhẹ quanh tâm quầng sáng (px). */
const FLAME_SPREAD_PX = 5;
const FLAME_RISE = { min: -34, max: -16 } as const;
const FLAME_DRIFT_X = { min: -5, max: 5 } as const;

/** Tia nắng cuộn theo camera chậm hơn bản đồ (parallax) và trôi chậm (px/ms). */
const SHAFT_PARALLAX = 0.35;
const SHAFT_DRIFT_PX_PER_MS = 0.004;

/**
 * Nền xa cuộn theo camera chậm hơn lớp chơi để tạo chiều sâu; lộ ra ở dải trống quanh level khi khung nhìn lớn hơn
 * level (màn dọc). Hệ số nhỏ và alpha thấp để nền không giành mắt với bản đồ.
 */
const BACKDROP_PARALLAX = 0.3;
const BACKDROP_ALPHA = 0.55;

/** Bụi lấp lánh: hạt trắng, màu theo preset (tint); ít hạt để rẻ trên iPhone. */
const DUST_COLOR = 0xffffff;
const DUST_SIZE = 2;
const DUST_FREQUENCY_MS = 220;
const DUST_LIFESPAN_MS = 4200;
/** Hạt trôi chéo xuống nhẹ (px/s) và tắt dần trong đời sống. */
const DUST_SPEED_X = { min: -4, max: 6 } as const;
const DUST_SPEED_Y = { min: 2, max: 8 } as const;
const DUST_ALPHA = { start: 0.9, end: 0 } as const;

/** Quầng cửa sổ toả rộng hơn ô kính. */
const WINDOW_GLOW_SPREAD = 2.4;

/** Đuốc chập chờn nhẹ: biên độ theo tỉ lệ bán kính, tần số rad/ms, lệch pha giữa các đuốc (rad). */
const FLICKER_AMPLITUDE = 0.06;
const FLICKER_SPEED = 0.012;
const FLICKER_PHASE_STEP = 1.7;

/** Vignette chỉ đủ dồn mắt vào giữa; độ đậm theo preset. */
const VIGNETTE_RADIUS = 0.9;

interface Light {
  readonly source: LightSource;
  readonly radius: number;
  readonly flicker: boolean;
  readonly phase: number;
  readonly image: Phaser.GameObjects.Image;
}

export interface GoldenHourAtmosphereOptions {
  /** Tắt khi mức chất lượng thấp (`platform/quality-settings.ts`): art Kenney tự sáng, không cần lớp phủ. */
  readonly enabled: boolean;
  /** Kiểu ánh sáng (nắng, hoàng hôn, trăng); mặc định nắng giờ vàng. */
  readonly preset?: LightingPreset;
}

interface ScreenKeys {
  readonly tone: string;
  readonly sunWash: string;
  readonly shafts: string;
}

const SCREEN_LAYERS = ['tone', 'sunWash', 'shafts'] as const;

/**
 * Ánh sáng giờ vàng: dải màu chiều tà nhân lên cảnh, tia nắng chéo có bụi, bóng nhà, cửa sổ phát sáng, quầng ấm
 * quanh hero/đuốc, vignette nhẹ. Phần tĩnh vẽ một lần; mỗi khung chỉ dời quầng sáng động và cuộn tia nắng.
 */
export class GoldenHourAtmosphere implements SceneAtmosphere {
  private readonly lights: Light[] = [];
  private readonly objects: Phaser.GameObjects.GameObject[] = [];
  private readonly preset: LightingPreset;
  private screenKeys: ScreenKeys | null = null;
  private tone: Phaser.GameObjects.Image | null = null;
  private sunWash: Phaser.GameObjects.Image | null = null;
  private shafts: Phaser.GameObjects.TileSprite | null = null;
  private backdrop: Phaser.GameObjects.TileSprite | null = null;
  private dustZone: Phaser.Geom.Rectangle | null = null;
  private vignette: Phaser.Filters.Controller | null = null;
  private shadow: Phaser.GameObjects.Image | null = null;
  private enabled: boolean;

  constructor(private readonly scene: Phaser.Scene, options: GoldenHourAtmosphereOptions) {
    this.enabled = options.enabled;
    this.preset = options.preset ?? LIGHTING_PRESETS.sunny;
    if (!options.enabled) return;
    const { width, height } = scene.scale.gameSize;
    this.addScreenLayers(width, height);
    if (scene.renderer.type === Phaser.WEBGL) {
      this.vignette = scene.cameras.main.filters.external.addVignette(0.5, 0.5, VIGNETTE_RADIUS, this.preset.vignetteStrength);
    }
    scene.events.on(Phaser.Scenes.Events.POST_UPDATE, this.update);
    scene.scale.on(Phaser.Scale.Events.RESIZE, this.resize);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.events.off(Phaser.Scenes.Events.POST_UPDATE, this.update);
      scene.scale.off(Phaser.Scale.Events.RESIZE, this.resize);
      // Huỷ image trước khi gỡ texture để không còn object trỏ vào texture đã huỷ.
      this.removeShadow();
    });
  }

  /** Cửa sổ, cửa, cổng phát sáng theo world (vẽ một lần lúc dựng bản đồ). */
  addWindowGlows(glows: readonly WorldGlow[]): void {
    if (!this.enabled) return;
    for (const glow of glows) {
      const image = this.scene.add
        .image(glow.x + glow.width / 2, glow.y + glow.height / 2, TEXTURE_KEYS.light)
        .setDisplaySize(glow.width * WINDOW_GLOW_SPREAD, glow.height * WINDOW_GLOW_SPREAD)
        .setTint(this.preset.windowGlowTint)
        .setAlpha(this.preset.windowGlowAlpha * glow.strength)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(GLOW_DEPTH);
      this.objects.push(image);
    }
  }

  /** Bóng đổ của ô chắn (nhà, tường, cây), bake một texture cỡ level. */
  addShadows(collision: CollisionGrid, levelWidth: number, levelHeight: number): void {
    if (!this.enabled) return;
    this.removeShadow();
    // Canvas cỡ level có thể không cấp được (giới hạn bộ nhớ canvas iOS): bỏ bóng thay vì hiện texture lỗi.
    const size = { width: levelWidth, height: levelHeight };
    if (!createShadowTexture(this.scene, this.shadowKey, size, solidRuns(collision), this.preset)) return;
    this.shadow = this.scene.add.image(0, 0, this.shadowKey).setOrigin(0).setAlpha(this.preset.shadowAlpha).setDepth(SHADOW_DEPTH);
  }

  private get shadowKey(): string {
    return `${TEXTURE.shadow}-${this.preset.name}`;
  }

  private removeShadow(): void {
    // Khoá texture chung toàn game theo preset: sân trận cùng preset với bản đồ (vd `sunny`) không được gỡ
    // texture bóng của bản đồ đang tạm dừng, nên chỉ gỡ khi chính instance này đã dựng bóng.
    if (this.shadow === null) return;
    this.shadow.destroy();
    this.shadow = null;
    if (this.scene.textures.exists(this.shadowKey)) this.scene.textures.remove(this.shadowKey);
  }

  /** Tắt giữa chừng khi máy tụt fps: bỏ mọi lớp phủ, art Kenney vẫn đọc rõ. */
  disable(): void {
    if (!this.enabled) return;
    this.enabled = false;
    for (const object of this.objects) object.destroy();
    this.objects.length = 0;
    this.removeShadow();
    for (const light of this.lights) light.image.setVisible(false);
    this.tone = null;
    this.sunWash = null;
    this.shafts = null;
    this.backdrop = null;
    this.dustZone = null;
    if (this.vignette !== null) {
      this.scene.cameras.main.filters.external.remove(this.vignette);
      this.vignette = null;
    }
  }

  addLight(source: LightSource, radius: number, flicker = false): void {
    // Quality thấp từ đầu: không tạo image ẩn vô ích cho hero, đuốc, quái.
    if (!this.enabled) return;
    const image = this.scene.add
      .image(source.x, source.y, TEXTURE_KEYS.light)
      .setTint(this.preset.warmLightTint)
      .setAlpha(this.preset.warmLightAlpha)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(GLOW_DEPTH)
      .setScale((radius * 2) / LIGHT_TEXTURE_SIZE)
      .setVisible(this.enabled);
    this.lights.push({ source, radius, flicker, phase: this.lights.length * FLICKER_PHASE_STEP, image });
  }

  /** Gỡ vùng sáng đã thêm bằng đúng đối tượng `source` (vật sáng biến mất khỏi bản đồ). */
  removeLight(source: LightSource): void {
    const index = this.lights.findIndex((light) => light.source === source);
    if (index < 0) return;
    this.lights[index]?.image.destroy();
    this.lights.splice(index, 1);
  }

  private addScreenLayers(width: number, height: number): void {
    const { scene } = this;
    const keys = this.createScreenTextures(width, height);
    this.screenKeys = keys;
    const fixed = <T extends Phaser.GameObjects.Image | Phaser.GameObjects.TileSprite>(object: T, depth: number, blend: Phaser.BlendModes): T => {
      object.setOrigin(0).setScrollFactor(0).setDepth(depth).setBlendMode(blend);
      this.objects.push(object);
      return object;
    };
    this.tone = fixed(scene.add.image(0, 0, keys.tone), TONE_DEPTH, Phaser.BlendModes.MULTIPLY);
    this.sunWash = fixed(scene.add.image(0, 0, keys.sunWash), TONE_DEPTH, Phaser.BlendModes.ADD);
    this.shafts = fixed(scene.add.tileSprite(0, 0, width, height, keys.shafts), SHAFT_DEPTH, Phaser.BlendModes.ADD).setAlpha(this.preset.shaftAlpha);
    this.addDust(width, height);
  }

  /**
   * Key kèm preset và cỡ màn hình (tia sáng chỉ kèm chiều cao vì rộng cố định `SHAFT_TILE_WIDTH`).
   * `disable()` không gỡ các texture này: scene khác cùng preset có thể đang dùng chung key.
   */
  private createScreenTextures(width: number, height: number): ScreenKeys {
    const { scene, preset } = this;
    const keys: ScreenKeys = {
      tone: `${TEXTURE.tone}-${preset.name}-${width}x${height}`,
      sunWash: `${TEXTURE.sunWash}-${preset.name}-${width}x${height}`,
      shafts: `${TEXTURE.shafts}-${preset.name}-${height}`,
    };
    createToneTexture(scene, keys.tone, width, height, preset);
    createSunWashTexture(scene, keys.sunWash, width, height, preset);
    createShaftTexture(scene, keys.shafts, height, preset);
    return keys;
  }

  /** Đổi cỡ màn hình: dựng texture cỡ mới, chuyển object sang rồi mới gỡ texture cũ. */
  private readonly resize = (gameSize: Phaser.Structs.Size): void => {
    const previous = this.screenKeys;
    if (!this.enabled || previous === null) return;
    const { width, height } = gameSize;
    const keys = this.createScreenTextures(width, height);
    this.screenKeys = keys;
    this.tone?.setTexture(keys.tone);
    this.sunWash?.setTexture(keys.sunWash);
    this.shafts?.setTexture(keys.shafts).setSize(width, height);
    this.backdrop?.setSize(width, height);
    this.dustZone?.setSize(width, height);
    for (const name of SCREEN_LAYERS) {
      const oldKey = previous[name];
      if (oldKey !== keys[name] && this.scene.textures.exists(oldKey)) this.scene.textures.remove(oldKey);
    }
  };

  private addDust(width: number, height: number): void {
    const { scene } = this;
    if (!scene.textures.exists(TEXTURE.dust)) {
      const graphics = scene.make.graphics({}, false);
      graphics.fillStyle(DUST_COLOR).fillRect(0, 0, DUST_SIZE, DUST_SIZE);
      graphics.generateTexture(TEXTURE.dust, DUST_SIZE, DUST_SIZE);
      graphics.destroy();
    }
    this.dustZone = new Phaser.Geom.Rectangle(0, 0, width, height);
    const dust = scene.add
      .particles(0, 0, TEXTURE.dust, {
        emitZone: { type: 'random', source: this.dustZone, quantity: 1 },
        lifespan: DUST_LIFESPAN_MS,
        speedX: { ...DUST_SPEED_X },
        speedY: { ...DUST_SPEED_Y },
        alpha: { ...DUST_ALPHA },
        frequency: DUST_FREQUENCY_MS,
        blendMode: Phaser.BlendModes.ADD,
        tint: this.preset.dustTint,
      })
      .setScrollFactor(0)
      .setDepth(DUST_DEPTH);
    this.objects.push(dust);
  }

  /**
   * Hạt môi trường theo `WeatherSpec` (lá, tro, đốm sáng): lớp bổ sung cạnh bụi, tái dùng khuôn emitter của bụi.
   * Không truyền `zone` thì phủ cả màn (scrollFactor 0); truyền `zone` (world) thì phát trong vùng đó (sân trận).
   * `densityScale` là hệ số mật độ caller truyền sẵn (thường là `particleDensity` của quality) để máy yếu phát thưa;
   * dưới ngưỡng thì bỏ hẳn emitter.
   */
  addWeather(spec: WeatherSpec | null, zone?: Phaser.Geom.Rectangle, densityScale = 1): void {
    if (!this.enabled || spec === null || densityScale < MIN_WEATHER_DENSITY) return;
    const { scene } = this;
    const textureKey = `${TEXTURE.weather}-${spec.kind}-${spec.size}`;
    if (!scene.textures.exists(textureKey)) {
      const graphics = scene.make.graphics({}, false);
      graphics.fillStyle(DUST_COLOR).fillRect(0, 0, spec.size, spec.size);
      graphics.generateTexture(textureKey, spec.size, spec.size);
      graphics.destroy();
    }
    // Máy yếu: giữ nguyên hình hạt, chỉ phát thưa hơn bằng cách giãn tần số theo nghịch đảo mật độ.
    const frequency = spec.frequencyMs / densityScale;
    const emitZone = zone ?? new Phaser.Geom.Rectangle(0, 0, scene.scale.gameSize.width, scene.scale.gameSize.height);
    const particles = scene.add
      .particles(0, 0, textureKey, {
        emitZone: { type: 'random', source: emitZone, quantity: 1 },
        lifespan: spec.lifespanMs,
        speedX: { ...spec.speedX },
        speedY: { ...spec.speedY },
        alpha: { ...spec.alpha },
        frequency,
        blendMode: Phaser.BlendModes.ADD,
        tint: spec.tint,
      })
      .setDepth(DUST_DEPTH);
    // Phủ màn khi không có zone (map/dải nền); có zone world thì cuộn theo bản đồ (sân trận).
    if (zone === undefined) particles.setScrollFactor(0);
    this.objects.push(particles);
  }

  /**
   * Nền xa parallax phủ màn (scrollFactor 0), dịch hoạ tiết theo camera với hệ số `BACKDROP_PARALLAX` mỗi khung.
   * Nằm dưới mọi layer tile nên chỉ thấy ở phần màn không có tile; caller guard `ambientWeatherEnabled`, tắt theo `disable()`.
   */
  addParallaxBackdrop(): void {
    if (!this.enabled || this.backdrop !== null) return;
    const { scene } = this;
    const key = `${TEXTURE.backdrop}-${this.preset.name}`;
    createBackdropTexture(scene, key, this.preset);
    const { width, height } = scene.scale.gameSize;
    this.backdrop = scene.add.tileSprite(0, 0, width, height, key).setOrigin(0).setScrollFactor(0).setDepth(BACKDROP_DEPTH).setAlpha(BACKDROP_ALPHA);
    this.objects.push(this.backdrop);
  }

  /** Gỡ nền parallax khi người chơi bật giảm chuyển động giữa chừng (các lớp ánh sáng tĩnh vẫn giữ). */
  removeParallaxBackdrop(): void {
    const backdrop = this.backdrop;
    if (backdrop === null) return;
    this.backdrop = null;
    const index = this.objects.indexOf(backdrop);
    if (index >= 0) this.objects.splice(index, 1);
    backdrop.destroy();
  }

  /**
   * Hạt lửa bốc lên tại một điểm (ngọn đuốc), trùng tâm quầng sáng; blend ADD, tắt dần.
   * `densityScale` nhân `particleDensity` để máy yếu phát thưa; dưới ngưỡng thì bỏ. Tắt theo `disable()` như hạt khác.
   */
  addFlame(source: LightSource, densityScale = 1): void {
    if (!this.enabled || densityScale < MIN_WEATHER_DENSITY) return;
    const { scene } = this;
    if (!scene.textures.exists(FLAME_TEXTURE)) {
      const graphics = scene.make.graphics({}, false);
      graphics.fillStyle(FLAME_COLOR).fillRect(0, 0, FLAME_SIZE, FLAME_SIZE);
      graphics.generateTexture(FLAME_TEXTURE, FLAME_SIZE, FLAME_SIZE);
      graphics.destroy();
    }
    const zone = new Phaser.Geom.Rectangle(source.x - FLAME_SPREAD_PX, source.y - FLAME_SPREAD_PX, FLAME_SPREAD_PX * 2, FLAME_SPREAD_PX * 2);
    const flame = scene.add
      .particles(0, 0, FLAME_TEXTURE, {
        emitZone: { type: 'random', source: zone, quantity: 1 },
        lifespan: FLAME_LIFESPAN_MS,
        speedX: { ...FLAME_DRIFT_X },
        speedY: { ...FLAME_RISE },
        alpha: { start: 1, end: 0 },
        frequency: FLAME_FREQUENCY_MS / densityScale,
        blendMode: Phaser.BlendModes.ADD,
      })
      .setDepth(GLOW_DEPTH);
    this.objects.push(flame);
  }

  /** Chữ ký sự kiện POST_UPDATE của scene: (systems, time, delta). */
  private readonly update = (_systems: Phaser.Scenes.Systems, timeMs: number): void => {
    if (!this.enabled) return;
    const camera = this.scene.cameras.main;
    if (this.shafts !== null) {
      this.shafts.tilePositionX = (camera.scrollX * SHAFT_PARALLAX + timeMs * SHAFT_DRIFT_PX_PER_MS) % SHAFT_TILE_WIDTH;
    }
    if (this.backdrop !== null) {
      this.backdrop.tilePositionX = (camera.scrollX * BACKDROP_PARALLAX) % BACKDROP_TILE_SIZE;
      this.backdrop.tilePositionY = (camera.scrollY * BACKDROP_PARALLAX) % BACKDROP_TILE_SIZE;
    }
    for (const light of this.lights) {
      const scale = light.flicker ? flickerScale(timeMs, light.phase, FLICKER_AMPLITUDE, FLICKER_SPEED) : 1;
      light.image.setPosition(light.source.x, light.source.y).setScale(((light.radius * 2) / LIGHT_TEXTURE_SIZE) * scale);
    }
  };
}
