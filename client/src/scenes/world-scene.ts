import Phaser from 'phaser';
import { citadelStageFor, FIELD_ROAM_ENCOUNTER_ID, MOVEMENT_SKILL_IDS, SYSTEM_FX, type BuildingId, type CitadelStage, type MeResponse, type MovementSkillId } from '@herox/shared';
import { FxPlayer, isFxAssetKey, queueFxAssets } from '../fx/fx-player';
import { InputController } from '../input/input-controller';
import { facingFromVector, type Facing, type MovementVector } from '../input/movement-vector';
import {
  findEntities,
  findSpawn,
  LdtkFormatError,
  parseLdtkLevel,
  resolveAssetPath,
  type MapEntity,
  type MapLevel,
  type MapLevelRef,
} from '../maps/ldtk-loader';
import { buildLevelTilemap } from '../maps/ldtk-tilemap-builder';
import { mapAssetUrl } from '../maps/map-asset-urls';
import type { QualityController } from '../platform/quality-settings';
import { CHAPTER_1_ATLAS_FILE, CHAPTER_1_TILE_GLOW, CHAPTER_1_TILE_INDEX } from '../render/chapter-1-tile-data';
import { GoldenHourAtmosphere } from '../render/golden-hour-atmosphere';
import { lightingForLevel } from '../render/lighting-presets';
import { findTileGlows, glowByTileIndex } from '../render/golden-hour-layout';
import { prepareHeroLook, queueHeroSheet, walkAnimationKey, type HeroLook } from '../render/hero-sprite';
import { chestTextureKey, npcTextureKey, queuePropSprites } from '../render/prop-sprites';
import { BUILDING_TEXTURE_KEYS, TEXTURE_KEYS } from '../render/placeholder-textures';
import {
  DASH_SPEED,
  facingVector,
  findBlinkDestination,
  isAreaWalkable,
  MovementSkillState,
  unlockedMovementSkills,
  type Point,
  type Rect,
} from '../world/movement-skills';
import { QuestTracker } from '../story/quest-tracker';
import { DevStoryBackend, StoryJournal } from '../story/story-journal';
import { WorldStory, type StoryHost } from '../story/world-story';
import { RoamingMonsters, type RoamingSpawn } from '../world/roaming-monsters';
import { buildingDoorRect, interactionRect, TriggerZones } from '../world/trigger-zones';
import { queueArenaTiles } from '../render/battle-arena';
import { isMonsterTextureKey, queueMonsterSprites } from '../render/battle-actors';
import { queueHeroBattleSheets } from '../render/hero-battle-animations';
import type { BattleSceneData } from './battle-scene';
import type { CitadelSceneData } from './citadel-scene';
import { REGISTRY_KEYS, SCENE_KEYS, type LoadedMapProject } from './scene-keys';
import type { UiScene } from './ui-scene';

export interface WorldSceneData {
  readonly levelId?: string;
  readonly spawnId?: string;
}

type PortalEntity = Extract<MapEntity, { kind: 'Portal' }>;
/** Tên hiển thị khi dev vào map thử chưa có nhân vật. */
const DEV_HERO_NAME = 'Hiệp sĩ';
/** Rương đã mở tối đi để người chơi biết không cần ghé lại. */
const OPENED_CHEST_TINT = 0x6a6470;

/** Hiệu ứng bản đồ cần; phần còn lại của bộ hiệu ứng chỉ nạp khi vào trận. */
const WORLD_FX = [SYSTEM_FX.dashDust, SYSTEM_FX.blinkOut, SYSTEM_FX.blinkIn] as const;
const FX_DEPTH_OFFSET = 1;
/** Bóng mờ sau lưng khi lướt: 3 bóng dùng lại, cách nhau 45 ms, mờ dần trong 220 ms. */
const DASH_GHOST_COUNT = 3;
const DASH_GHOST_INTERVAL_MS = 45;
const DASH_GHOST_FADE_MS = 220;
const DASH_GHOST_ALPHA = 0.45;
const SKILL_KEY_CODES: Readonly<Record<MovementSkillId, number>> = {
  dash: Phaser.Input.Keyboard.KeyCodes.SPACE,
  blink: Phaser.Input.Keyboard.KeyCodes.E,
};

/** Tốc độ đi bộ, pixel/giây (khoảng 3,4 ô mỗi giây). */
const HERO_SPEED = 110;
/** Hitbox ở chân nhân vật LPC: hẹp và thấp để đi sát tường, đi sau cột tự nhiên. */
const HERO_BODY_WIDTH = 20;
const HERO_BODY_HEIGHT = 12;
/** NPC, rương chỉ chắn ở phần chân, hẹp hơn ô một chút mỗi bên để hero lách qua khe một ô. */
const PROP_BODY_HEIGHT = 12;
const PROP_BODY_SIDE_INSET = 2;
const FADE_MS = 250;
/** Chuyển cảnh vào trận: rung, loé trắng, zoom vào hero rồi tối dần. */
const BATTLE_INTRO_MS = 550;
const BATTLE_INTRO_ZOOM = 1.8;
const BATTLE_INTRO_SHAKE = 0.006;
const BATTLE_INTRO_FLASH_MS = 160;
/** Level có quái lang thang: chạm vào là đánh trận luyện (lặp lại được). */
const ROAMING_SPAWNS: Readonly<Record<string, RoamingSpawn>> = {
  Misty_Fields: { encounterId: FIELD_ROAM_ENCOUNTER_ID, count: 7 },
};
const HERO_LIGHT_RADIUS = 120;
const TORCH_LIGHT_RADIUS = 96;
const HERO_LIGHT_OFFSET_Y = -24;
const CAMERA_FADE_COLOR = { r: 0, g: 0, b: 0 } as const;
const ERROR_TEXT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'sans-serif',
  fontSize: '14px',
  color: '#e8d9a8',
  align: 'center',
  wordWrap: { width: 520 },
};

/** Khoá cache có namespace theo file map để nhiều file `.ldtk` không đè nhau. */
function levelCacheKey(mapPath: string, levelId: string): string {
  return `ldtk-level:${mapPath}:${levelId}`;
}

function tilesetTextureKeyFor(mapPath: string): (tilesetUid: number) => string {
  return (tilesetUid) => `ldtk-tileset:${mapPath}:${tilesetUid}`;
}

/** Level nhỏ hơn khung nhìn thì nới biên camera đều hai phía để level nằm giữa màn hình thay vì dồn về góc. */
function cameraBoundsFor(level: MapLevel, view: { width: number; height: number }): [number, number, number, number] {
  const width = Math.max(level.widthPx, view.width);
  const height = Math.max(level.heightPx, view.height);
  return [(level.widthPx - width) / 2, (level.heightPx - height) / 2, width, height];
}

/** Hero đứng trong vùng cổng tính theo hitbox chân. */
function bodyOverlapsRect(body: Phaser.Physics.Arcade.Body, rect: MapEntity): boolean {
  return body.right > rect.x && body.x < rect.x + rect.width && body.bottom > rect.y && body.y < rect.y + rect.height;
}

/** Scene đi lại trên map LDtk: dựng level, hero, va chạm, camera và chuyển level qua cổng. */
export class WorldScene extends Phaser.Scene {
  private map!: LoadedMapProject;
  private levelRef!: MapLevelRef;
  private spawnId: string | undefined;
  private level: MapLevel | null = null;
  private loadError: string | null = null;
  private hero: Phaser.Physics.Arcade.Sprite | null = null;
  private heroLook!: HeroLook;
  private movementInput!: InputController;
  private atmosphere: GoldenHourAtmosphere | null = null;
  private facing: Facing = 'down';
  private portals: PortalEntity[] = [];
  /** Cổng chỉ kích hoạt sau khi hero đã rời mọi cổng, tránh vừa tới đã bị đẩy về. */
  private portalsArmed = false;
  private transitioning = false;
  private battleTriggers = new TriggerZones<string>([]);
  private buildingDoors = new TriggerZones<BuildingId>([]);
  private buildingImages: Phaser.GameObjects.Image[] = [];
  private npcZones = new TriggerZones<string>([]);
  private chestZones = new TriggerZones<string>([]);
  private chestSprites = new Map<string, Phaser.GameObjects.Sprite>();
  private story: WorldStory | null = null;
  private roamers: RoamingMonsters | null = null;
  private warmingBattleAssets = false;
  /** Đã mở màn trận hoặc panel trong khung này: các vùng khác không mở thêm lớp phủ nữa. */
  private overlayOpen = false;
  /** Giữ qua các lần đổi level để hồi chiêu không reset khi qua cổng. */
  private movementSkills: MovementSkillState | null = null;
  private skillKeys = new Map<MovementSkillId, Phaser.Input.Keyboard.Key>();
  private fx: FxPlayer | null = null;
  private blockers: Rect[] = [];
  private dashVector: MovementVector = { x: 0, y: 0 };
  private dashGhosts: Phaser.GameObjects.Image[] = [];
  private nextGhostAtMs = 0;
  private ghostIndex = 0;

  constructor() {
    super(SCENE_KEYS.world);
  }

  init(data: WorldSceneData): void {
    this.map = this.registry.get(REGISTRY_KEYS.mapProject) as LoadedMapProject;
    const { levels } = this.map.project;
    const levelRef = levels.find((level) => level.identifier === data.levelId) ?? levels[0];
    if (!levelRef) throw new LdtkFormatError(`${this.map.sourcePath}: không có level nào (chưa hỗ trợ project nhiều world)`);
    this.levelRef = levelRef;
    this.spawnId = data.spawnId;
    this.level = null;
    this.loadError = null;
    this.hero = null;
    this.atmosphere = null;
    this.facing = 'down';
    this.portals = [];
    this.portalsArmed = false;
    this.transitioning = false;
    this.battleTriggers = new TriggerZones<string>([]);
    this.buildingDoors = new TriggerZones<BuildingId>([]);
    this.buildingImages = [];
    this.npcZones = new TriggerZones<string>([]);
    this.chestZones = new TriggerZones<string>([]);
    this.chestSprites = new Map();
    this.story = null;
    this.overlayOpen = false;
    this.fx = null;
    this.blockers = [];
    this.dashGhosts = [];
  }

  preload(): void {
    queueFxAssets(this, WORLD_FX);
    queueHeroSheet(this);
    queuePropSprites(this);
    queueMonsterSprites(this);
    // Loader thuộc scene và sống qua các lần restart: gỡ listener cũ trước khi gắn lại.
    this.load.off(Phaser.Loader.Events.FILE_LOAD_ERROR);
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
      // Thiếu hiệu ứng chỉ làm mất hình kỹ năng, bản đồ vẫn chơi được.
      if (isFxAssetKey(file.key) || isMonsterTextureKey(file.key) || this.warmingBattleAssets) return;
      this.loadError = `Không tải được ${file.key}`;
    });
    const { externalRelPath, identifier } = this.levelRef;
    const cacheKey = levelCacheKey(this.map.sourcePath, identifier);
    if (externalRelPath === null || this.cache.json.exists(cacheKey)) {
      this.queueTilesets();
      return;
    }
    // Tileset phụ thuộc layer của level nên chỉ biết sau khi file .ldtkl về; loader vẫn chạy tiếp hàng đợi mới thêm.
    this.load.once(`${Phaser.Loader.Events.FILE_KEY_COMPLETE}json-${cacheKey}`, () => this.queueTilesets());
    this.load.json(cacheKey, mapAssetUrl(resolveAssetPath(this.map.sourcePath, externalRelPath)));
  }

  create(): void {
    const level = this.level;
    if (this.loadError !== null || level === null) {
      this.showLoadError(this.loadError ?? `Không đọc được level ${this.levelRef.identifier}`);
      return;
    }
    this.cameras.main.setBackgroundColor(level.backgroundColor);
    const built = buildLevelTilemap(this, this.map.project, level, {
      tilesetTextureKey: tilesetTextureKeyFor(this.map.sourcePath),
      collisionTextureKey: TEXTURE_KEYS.collisionTile,
    });

    this.physics.world.setBounds(0, 0, level.widthPx, level.heightPx);
    const hero = this.createHero(level);
    this.hero = hero;
    if (built.collisionLayer) this.physics.add.collider(hero, built.collisionLayer);
    const props = this.createProps(level);
    this.physics.add.collider(hero, props);
    this.blockers = props.getChildren().map((child) => {
      const body = (child as Phaser.Physics.Arcade.Sprite).body as Phaser.Physics.Arcade.StaticBody;
      return { x: body.x, y: body.y, width: body.width, height: body.height };
    });
    this.portals = findEntities(level, 'Portal');
    this.battleTriggers = new TriggerZones(findEntities(level, 'BattleTrigger').map((trigger) => ({ rect: trigger, value: trigger.encounterId })));
    this.buildingDoors = new TriggerZones(this.createBuildings(level));
    this.npcZones = new TriggerZones(findEntities(level, 'Npc').map((npc) => ({ rect: interactionRect(npc), value: npc.dialogId })));
    this.chestZones = new TriggerZones(findEntities(level, 'Chest').map((chest) => ({ rect: interactionRect(chest), value: chest.itemId })));

    const camera = this.cameras.main;
    camera.setBounds(...cameraBoundsFor(level, this.scale.gameSize)).startFollow(hero, true);
    camera.fadeIn(FADE_MS, CAMERA_FADE_COLOR.r, CAMERA_FADE_COLOR.g, CAMERA_FADE_COLOR.b);

    const quality = this.registry.get(REGISTRY_KEYS.quality) as QualityController | undefined;
    const atmosphere = new GoldenHourAtmosphere(this, {
      enabled: quality?.profile.dynamicLightingEnabled ?? true,
      preset: lightingForLevel(level.identifier),
    });
    this.atmosphere = atmosphere;
    this.decorateLevelLighting(atmosphere, level);
    const unsubscribeQuality = quality?.subscribe((profile) => {
      if (!profile.dynamicLightingEnabled) atmosphere.disable();
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => unsubscribeQuality?.());
    // Nguồn sáng đọc vị trí hero mỗi frame nên dùng getter thay vì chép toạ độ.
    this.atmosphere.addLight(
      {
        get x(): number {
          return hero.x;
        },
        get y(): number {
          return hero.y + HERO_LIGHT_OFFSET_Y;
        },
      },
      HERO_LIGHT_RADIUS,
    );
    for (const torch of findEntities(level, 'Torch')) {
      this.atmosphere.addLight({ x: torch.x + torch.width / 2, y: torch.y + torch.height / 2 }, TORCH_LIGHT_RADIUS, true);
    }

    const ui = this.scene.get(SCENE_KEYS.ui) as UiScene;
    this.movementInput = new InputController(this, () => ui.movement);
    this.setUpMovementSkills(ui);
    this.events.on(Phaser.Scenes.Events.RESUME, this.handleResume);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off(Phaser.Scenes.Events.RESUME, this.handleResume);
      this.story?.dispose();
    });
    this.story = new WorldStory(this.storyJournal(), this.questTracker(), this.storyHost());
    for (const [itemId, sprite] of this.chestSprites) {
      if (this.story.isChestOpened(itemId)) this.showChestOpened(sprite);
    }
    this.spawnRoamers(level);
    this.warmBattleAssets();
    // Chờ màn mờ dần xong rồi mới mở hội thoại tự động (mở đầu, kết chương).
    this.time.delayedCall(FADE_MS, () => this.story?.refresh());
  }

  /** Bóng nhà và cửa sổ phát sáng; chỉ thắp cửa sổ trên layer dùng atlas chương 1 (map khác có chỉ số tile riêng). */
  private decorateLevelLighting(atmosphere: GoldenHourAtmosphere, level: MapLevel): void {
    if (level.collision !== null) atmosphere.addShadows(level.collision, level.widthPx, level.heightPx);
    const chapterLayers = level.tileLayers.filter((layer) => this.map.project.tilesets.get(layer.tilesetUid)?.relPath.endsWith(CHAPTER_1_ATLAS_FILE) === true);
    atmosphere.addWindowGlows(findTileGlows(chapterLayers, glowByTileIndex(CHAPTER_1_TILE_INDEX, CHAPTER_1_TILE_GLOW)));
  }

  /** Quái lang thang chỉ hiện khi truyện đã cho đánh trận luyện ở level này. */
  private spawnRoamers(level: MapLevel): void {
    this.roamers = null;
    const spawn = ROAMING_SPAWNS[level.identifier];
    if (spawn === undefined || level.collision === null || this.story?.canStartBattle(spawn.encounterId) !== true) return;
    const hero = this.hero;
    const keepOut: Rect[] = level.entities.map((entity) => ({ x: entity.x, y: entity.y, width: entity.width, height: entity.height }));
    if (hero !== null) keepOut.push(this.bodyRect(hero));
    this.roamers = new RoamingMonsters(this, { spawn, collision: level.collision, keepOut, atmosphere: this.atmosphere });
  }

  /**
   * Tải sẵn ảnh và hiệu ứng của màn trận lúc đang đi bản đồ, để chạm quái là vào trận ngay, không đứng hình chờ tải.
   * Lỗi tải ở đây bỏ qua: màn trận tự tải lại hoặc dùng hình tạm.
   */
  private warmBattleAssets(): void {
    queueFxAssets(this);
    queueHeroBattleSheets(this);
    queueArenaTiles(this);
    if (this.load.list.size === 0) return;
    this.warmingBattleAssets = true;
    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      this.warmingBattleAssets = false;
    });
    this.load.start();
  }

  private storyJournal(): StoryJournal {
    const existing = this.registry.get(REGISTRY_KEYS.story) as StoryJournal | undefined;
    if (existing !== undefined) return existing;
    // Chỉ xảy ra khi dev mở thẳng scene bản đồ: truyện chạy cục bộ.
    const journal = new StoryJournal(new DevStoryBackend());
    this.registry.set(REGISTRY_KEYS.story, journal);
    return journal;
  }

  private questTracker(): QuestTracker {
    const existing = this.registry.get(REGISTRY_KEYS.questTracker) as QuestTracker | undefined;
    if (existing !== undefined) return existing;
    const tracker = new QuestTracker(document.body);
    this.registry.set(REGISTRY_KEYS.questTracker, tracker);
    return tracker;
  }

  private storyHost(): StoryHost {
    const me = this.registry.get(REGISTRY_KEYS.me) as MeResponse | undefined;
    return {
      heroName: me?.hero?.name ?? DEV_HERO_NAME,
      wordCounts: () => ({ learned: me?.learning.learned ?? 0, mastered: me?.learning.mastered ?? 0 }),
      pauseWorld: () => {
        if (this.hero !== null) (this.hero.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
        this.overlayOpen = true;
        this.scene.pause();
        this.scene.sleep(SCENE_KEYS.ui);
      },
      resumeWorld: () => {
        this.scene.resume();
        this.scene.wake(SCENE_KEYS.ui);
      },
      startBattle: (encounterId) => {
        const data: BattleSceneData = { encounterId };
        this.scene.launch(SCENE_KEYS.battle, data);
      },
      markChestOpened: (itemId) => {
        const sprite = this.chestSprites.get(itemId);
        if (sprite !== undefined) this.showChestOpened(sprite);
      },
    };
  }

  /** Rương đã nhặt: hình rương mở, hoặc tối đi khi chưa có hình. */
  private showChestOpened(sprite: Phaser.GameObjects.Sprite): void {
    const opened = chestTextureKey(this, true);
    if (opened === TEXTURE_KEYS.chest) sprite.setTint(OPENED_CHEST_TINT);
    else sprite.setTexture(opened);
  }

  /** Về từ màn trận: phím nhả trong lúc bản đồ dừng không được ghi nhận, phải xoá để hero không tự chạy. */
  private readonly handleResume = (): void => {
    this.input.keyboard?.resetKeys();
    this.overlayOpen = false;
    // Về từ trận: gỡ quái vừa đánh, trả camera về như trước chuyển cảnh.
    this.roamers?.releaseEngaged();
    const camera = this.cameras.main;
    camera.resetFX();
    camera.setZoom(1);
    camera.fadeIn(FADE_MS, CAMERA_FADE_COLOR.r, CAMERA_FADE_COLOR.g, CAMERA_FADE_COLOR.b);
    // Panel thành trì có thể vừa tải số từ đã học mới hơn lúc boot.
    const textureKey = BUILDING_TEXTURE_KEYS[this.citadelStage()];
    for (const image of this.buildingImages) image.setTexture(textureKey);
    // Về từ trận truyện hay hội thoại: cập nhật nhiệm vụ, có thể mở đoạn kết chương.
    if (this.story?.isDialogOpen !== true) this.story?.refresh();
  };

  private citadelStage(): CitadelStage {
    const latest = this.registry.get(REGISTRY_KEYS.citadelStage) as CitadelStage | undefined;
    if (latest !== undefined) return latest;
    const me = this.registry.get(REGISTRY_KEYS.me) as MeResponse | undefined;
    return citadelStageFor(me?.learning.learned ?? 0);
  }

  override update(time: number): void {
    if (!this.hero) return;
    this.useMovementSkills(this.hero, time);
    this.moveHero(this.hero, time);
    this.checkPortals(this.hero);
    this.checkBattleTriggers(this.hero);
    this.checkRoamers(this.hero);
    this.checkBuildingDoors(this.hero);
    this.checkNpcs(this.hero);
    this.checkChests(this.hero);
  }

  /** Đọc level (đã nạp hoặc nhúng trong project) rồi xếp hàng chỉ những tileset level dùng. */
  private queueTilesets(): void {
    const level = this.parseLevel();
    if (!level) return;
    this.level = level;
    const textureKey = tilesetTextureKeyFor(this.map.sourcePath);
    for (const tilesetUid of new Set(level.tileLayers.map((layer) => layer.tilesetUid))) {
      const tileset = this.map.project.tilesets.get(tilesetUid);
      if (!tileset) {
        this.loadError = `Level ${level.identifier} dùng tileset ${tilesetUid} không có ảnh`;
        return;
      }
      const key = textureKey(tilesetUid);
      if (!this.textures.exists(key)) this.load.image(key, mapAssetUrl(resolveAssetPath(this.map.sourcePath, tileset.relPath)));
    }
  }

  private parseLevel(): MapLevel | null {
    const { externalRelPath, identifier } = this.levelRef;
    const raw: unknown = externalRelPath === null
      ? this.map.project.inlineLevels.get(identifier)
      : this.cache.json.get(levelCacheKey(this.map.sourcePath, identifier));
    try {
      return parseLdtkLevel(raw);
    } catch (error) {
      this.loadError = error instanceof LdtkFormatError ? error.message : `Không đọc được level ${identifier}`;
      return null;
    }
  }

  private showLoadError(message: string): void {
    const { width, height } = this.scale.gameSize;
    this.add.text(width / 2, height / 2, `Lỗi bản đồ: ${message}`, ERROR_TEXT_STYLE).setOrigin(0.5);
  }

  private createHero(level: MapLevel): Phaser.Physics.Arcade.Sprite {
    const spawn = findSpawn(level, this.spawnId);
    if (!spawn) throw new LdtkFormatError(`Level "${level.identifier}" không có PlayerSpawn`);
    // Toạ độ hero là điểm chân (giữa đáy ô spawn) để sắp lớp theo y và đặt hitbox đúng chỗ.
    const feetX = spawn.x + spawn.width / 2;
    const feetY = spawn.y + spawn.height;
    const look = prepareHeroLook(this);
    this.heroLook = look;
    const hero = this.physics.add.sprite(feetX, feetY, look.textureKey, this.facing);
    hero.setOrigin(0.5, look.feetY / look.frameSize);
    const body = hero.body as Phaser.Physics.Arcade.Body;
    body.setSize(HERO_BODY_WIDTH, HERO_BODY_HEIGHT);
    body.setOffset((look.frameSize - HERO_BODY_WIDTH) / 2, look.feetY - HERO_BODY_HEIGHT);
    body.setCollideWorldBounds(true);
    return hero;
  }

  /** NPC và rương chắn đường ở phần chân; sắp lớp theo y để hero đi trước/sau đúng. */
  private createProps(level: MapLevel): Phaser.Physics.Arcade.StaticGroup {
    const group = this.physics.add.staticGroup();
    const propEntities = [...findEntities(level, 'Npc'), ...findEntities(level, 'Chest')];
    for (const entity of propEntities) {
      const textureKey = entity.kind === 'Npc' ? npcTextureKey(this, entity.dialogId) : chestTextureKey(this, false);
      const feetY = entity.y + entity.height;
      const sprite = group.create(entity.x + entity.width / 2, feetY, textureKey) as Phaser.Physics.Arcade.Sprite;
      // Thân tĩnh tạo lúc `create` theo origin giữa; đổi origin xong phải tính lại, không thì thân lệch xuống nửa sprite.
      sprite.setOrigin(0.5, 1).setDepth(feetY).refreshBody();
      if (entity.kind === 'Chest') this.chestSprites.set(entity.itemId, sprite);
      // Thân chắn theo kích thước entity trong LDtk, canh giữa đáy sprite (sprite có thể rộng/cao hơn ô).
      const body = sprite.body as Phaser.Physics.Arcade.StaticBody;
      const bodyWidth = entity.width - PROP_BODY_SIDE_INSET * 2;
      body.setSize(bodyWidth, PROP_BODY_HEIGHT, false);
      body.setOffset((sprite.width - bodyWidth) / 2, sprite.height - PROP_BODY_HEIGHT);
    }
    return group;
  }

  /**
   * Công trình ở thành trì: hình theo giai đoạn hồi sinh (số từ đã học), nền móng chắn đường nằm sẵn trong lưới va chạm.
   * Trả vùng cửa ở cạnh dưới mỗi công trình.
   */
  private createBuildings(level: MapLevel): { rect: Rect; value: BuildingId }[] {
    const textureKey = BUILDING_TEXTURE_KEYS[this.citadelStage()];
    return findEntities(level, 'Building').map((building) => {
      const image = this.add.image(building.x, building.y, textureKey).setOrigin(0, 0).setDisplaySize(building.width, building.height);
      this.buildingImages.push(image.setDepth(building.y + building.height));
      return { rect: buildingDoorRect(building), value: building.buildingId };
    });
  }

  private moveHero(hero: Phaser.Physics.Arcade.Sprite, nowMs: number): void {
    const body = hero.body as Phaser.Physics.Arcade.Body;
    // Đang chuyển cảnh vào trận/panel (`overlayOpen` bật trước khi bản đồ dừng): hero đứng yên.
    if (this.transitioning || this.overlayOpen) {
      body.setVelocity(0, 0);
      return;
    }
    if (this.movementSkills?.isDashing(nowMs) === true) {
      // Lướt vẫn va chạm tường như đi bộ, chỉ nhanh hơn và khoá hướng.
      body.setVelocity(this.dashVector.x * DASH_SPEED, this.dashVector.y * DASH_SPEED);
      this.dropDashGhost(hero, nowMs);
      hero.setDepth(body.bottom);
      return;
    }
    const movement = this.movementInput.readMovement();
    body.setVelocity(movement.x * HERO_SPEED, movement.y * HERO_SPEED);
    const facing = facingFromVector(movement, this.facing);
    const moving = movement.x !== 0 || movement.y !== 0;
    if (this.heroLook.animated && moving) {
      hero.anims.play(walkAnimationKey(facing), true);
    } else if (facing !== this.facing || hero.anims.isPlaying) {
      hero.anims.stop();
      hero.setFrame(facing);
    }
    this.facing = facing;
    hero.setDepth(body.bottom);
  }

  private setUpMovementSkills(ui: UiScene): void {
    if (this.movementSkills === null) {
      const me = this.registry.get(REGISTRY_KEYS.me) as MeResponse | undefined;
      // Dev vào map thử không có tiến độ học: mở hết để thử kỹ năng; bản build luôn theo tiến độ thật.
      this.movementSkills = new MovementSkillState(unlockedMovementSkills(me?.learning.byPos ?? null, import.meta.env.DEV));
    }
    const skills = this.movementSkills;
    this.skillKeys.clear();
    for (const [id, code] of Object.entries(SKILL_KEY_CODES) as [MovementSkillId, number][]) {
      const key = this.input.keyboard?.addKey(code, false);
      if (key !== undefined && skills.isUnlocked(id)) this.skillKeys.set(id, key);
    }
    ui.showSkillButtons(new Set(MOVEMENT_SKILL_IDS.filter((id) => skills.isUnlocked(id))));
    this.fx = new FxPlayer(this);
  }

  private requestedSkill(ui: UiScene): MovementSkillId | null {
    const touched = ui.consumeSkillRequest();
    if (touched !== null) return touched;
    for (const [id, key] of this.skillKeys) {
      if (Phaser.Input.Keyboard.JustDown(key)) return id;
    }
    return null;
  }

  private useMovementSkills(hero: Phaser.Physics.Arcade.Sprite, nowMs: number): void {
    const skills = this.movementSkills;
    if (skills === null || this.transitioning) return;
    const ui = this.scene.get(SCENE_KEYS.ui) as UiScene;
    for (const id of MOVEMENT_SKILL_IDS) ui.setSkillCoolingDown(id, skills.cooldownRatio(id, nowMs) > 0);
    const requested = this.requestedSkill(ui);
    if (requested === 'dash') this.dash(hero, skills, nowMs);
    else if (requested === 'blink') this.blink(hero, skills, nowMs);
  }

  /** Lướt theo hướng đang đi (đứng yên thì theo hướng nhìn). */
  private dash(hero: Phaser.Physics.Arcade.Sprite, skills: MovementSkillState, nowMs: number): void {
    if (!skills.use('dash', nowMs)) return;
    const movement = this.movementInput.readMovement();
    const length = Math.hypot(movement.x, movement.y);
    this.dashVector = length > 0 ? { x: movement.x / length, y: movement.y / length } : facingVector(this.facing);
    this.nextGhostAtMs = nowMs;
    this.fx?.play(SYSTEM_FX.dashDust, hero.x, hero.y, { depth: hero.depth - FX_DEPTH_OFFSET, scale: 0.6 });
  }

  /** Thuấn bộ theo hướng nhìn tới điểm đáp xa nhất đứng được; không có chỗ đáp thì không tốn hồi chiêu. */
  private blink(hero: Phaser.Physics.Arcade.Sprite, skills: MovementSkillState, nowMs: number): void {
    const level = this.level;
    if (level === null || !skills.canUse('blink', nowMs)) return;
    const body = hero.body as Phaser.Physics.Arcade.Body;
    const bodyOffset = { x: body.x - hero.x, y: body.y - hero.y };
    const isFree = (point: Point): boolean =>
      isAreaWalkable(
        { x: point.x + bodyOffset.x, y: point.y + bodyOffset.y, width: body.width, height: body.height },
        level,
        level.collision,
        this.blockers,
      );
    const destination = findBlinkDestination({ x: hero.x, y: hero.y }, facingVector(this.facing), isFree);
    if (destination === null || !skills.use('blink', nowMs)) return;
    this.fx?.play(SYSTEM_FX.blinkOut, hero.x, hero.y, { depth: hero.depth + FX_DEPTH_OFFSET });
    body.reset(destination.x, destination.y);
    hero.setDepth(body.bottom);
    this.fx?.play(SYSTEM_FX.blinkIn, destination.x, destination.y, { depth: hero.depth + FX_DEPTH_OFFSET });
  }

  /** Bóng mờ sau lưng khi lướt; 3 ảnh dùng lại để không tạo đối tượng mỗi lần lướt. */
  private dropDashGhost(hero: Phaser.Physics.Arcade.Sprite, nowMs: number): void {
    if (nowMs < this.nextGhostAtMs) return;
    this.nextGhostAtMs = nowMs + DASH_GHOST_INTERVAL_MS;
    if (this.dashGhosts.length < DASH_GHOST_COUNT) {
      this.dashGhosts.push(this.add.image(0, 0, this.heroLook.textureKey, this.facing).setOrigin(hero.originX, hero.originY));
    }
    const ghost = this.dashGhosts[this.ghostIndex % this.dashGhosts.length];
    this.ghostIndex += 1;
    if (ghost === undefined) return;
    this.tweens.killTweensOf(ghost);
    ghost.setFrame(this.facing).setPosition(hero.x, hero.y).setDepth(hero.depth - FX_DEPTH_OFFSET).setAlpha(DASH_GHOST_ALPHA).setVisible(true);
    this.tweens.add({ targets: ghost, alpha: 0, duration: DASH_GHOST_FADE_MS, onComplete: () => ghost.setVisible(false) });
  }

  private bodyRect(hero: Phaser.Physics.Arcade.Sprite): Rect {
    const body = hero.body as Phaser.Physics.Arcade.Body;
    return { x: body.x, y: body.y, width: body.width, height: body.height };
  }

  /** Bước vào vùng trận: dừng bản đồ, ẩn joystick, mở màn trận; thoát trận thì bản đồ chạy tiếp tại chỗ. */
  private checkBattleTriggers(hero: Phaser.Physics.Arcade.Sprite): void {
    if (this.transitioning || this.overlayOpen) return;
    const encounterId = this.battleTriggers.enter(this.bodyRect(hero));
    if (encounterId === null || this.story?.canStartBattle(encounterId) === false) return;
    this.enterBattle(hero, encounterId);
  }

  /** Chạm quái lang thang: quái đứng lại, vào trận luyện. */
  private checkRoamers(hero: Phaser.Physics.Arcade.Sprite): void {
    if (this.transitioning || this.overlayOpen || this.roamers === null) return;
    if (this.roamers.touch(this.bodyRect(hero))) this.enterBattle(hero, this.roamers.encounterId);
  }

  /** Chuyển cảnh vào trận (rung, loé, zoom, tối dần) rồi mới mở màn trận, để không đứng hình đột ngột. */
  private enterBattle(hero: Phaser.Physics.Arcade.Sprite, encounterId: string): void {
    (hero.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.overlayOpen = true;
    const camera = this.cameras.main;
    camera.shake(BATTLE_INTRO_MS, BATTLE_INTRO_SHAKE);
    camera.flash(BATTLE_INTRO_FLASH_MS, 255, 255, 255);
    camera.zoomTo(BATTLE_INTRO_ZOOM, BATTLE_INTRO_MS, 'Quad.easeIn');
    camera.fadeOut(BATTLE_INTRO_MS, CAMERA_FADE_COLOR.r, CAMERA_FADE_COLOR.g, CAMERA_FADE_COLOR.b);
    camera.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      const data: BattleSceneData = { encounterId };
      this.openOverlay(hero, SCENE_KEYS.battle, data);
    });
  }

  /** Bước tới cửa công trình: mở panel thành trì; đóng panel thì bản đồ chạy tiếp tại chỗ. */
  private checkBuildingDoors(hero: Phaser.Physics.Arcade.Sprite): void {
    if (this.transitioning || this.overlayOpen) return;
    const buildingId = this.buildingDoors.enter(this.bodyRect(hero));
    if (buildingId === null) return;
    const data: CitadelSceneData = { buildingId };
    this.openOverlay(hero, SCENE_KEYS.citadel, data);
  }

  /** Dừng bản đồ, ẩn joystick rồi mở scene phủ lên trên; scene đó tự resume bản đồ khi đóng. */
  private openOverlay(hero: Phaser.Physics.Arcade.Sprite, sceneKey: string, data: object): void {
    (hero.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.overlayOpen = true;
    this.questTracker().setVisible(false);
    this.scene.pause();
    this.scene.sleep(SCENE_KEYS.ui);
    this.scene.launch(sceneKey, data);
  }

  /** Lại gần NPC: mở hội thoại hợp với mốc truyện hiện tại. */
  private checkNpcs(hero: Phaser.Physics.Arcade.Sprite): void {
    if (this.transitioning || this.overlayOpen) return;
    const dialogId = this.npcZones.enter(this.bodyRect(hero));
    if (dialogId !== null) this.story?.talkTo(dialogId);
  }

  /** Lại gần rương: nhặt thánh tích (ghi mốc truyện). */
  private checkChests(hero: Phaser.Physics.Arcade.Sprite): void {
    if (this.transitioning || this.overlayOpen) return;
    const itemId = this.chestZones.enter(this.bodyRect(hero));
    if (itemId !== null) void this.story?.openChest(itemId);
  }

  private checkPortals(hero: Phaser.Physics.Arcade.Sprite): void {
    if (this.transitioning) return;
    const body = hero.body as Phaser.Physics.Arcade.Body;
    const portal = this.portals.find((candidate) => bodyOverlapsRect(body, candidate));
    if (!portal) {
      this.portalsArmed = true;
      return;
    }
    if (!this.portalsArmed) return;
    // Cổng khoá theo truyện: báo một lần, chỉ báo lại sau khi hero bước ra rồi vào lại.
    if (this.story?.canUsePortal(portal.targetLevel) === false) {
      this.portalsArmed = false;
      return;
    }
    if (!this.map.project.levels.some((level) => level.identifier === portal.targetLevel)) return;
    this.transitioning = true;
    this.cameras.main.fadeOut(FADE_MS, CAMERA_FADE_COLOR.r, CAMERA_FADE_COLOR.g, CAMERA_FADE_COLOR.b);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      const next: WorldSceneData = { levelId: portal.targetLevel, spawnId: portal.targetSpawn };
      this.scene.restart(next);
    });
  }
}
