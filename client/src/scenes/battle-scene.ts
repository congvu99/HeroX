import Phaser from 'phaser';
import {
  beatForEncounter,
  InvalidBattleSetupError,
  SYSTEM_FX,
  type BattleEvent,
  type BattleInput,
  type BattleSetup,
  type MeResponse,
  type SkillKind,
} from '@herox/shared';
import { submitBattleResult, startBattle } from '../api/battle-api';
import { readEngSessionToken } from '../api/me-api';
import { BattleSounds } from '../audio/battle-sounds';
import { arenaThemeFor, buildArenaLayout } from '../battle/battle-arena-layout';
import { BattleCueMapper, type BattleCue, type CueTarget } from '../battle/battle-cues';
import { BattleSession } from '../battle/battle-session';
import { devBattleSetup } from '../battle/dev-battle-fixture';
import { BACKGROUND_COLOR, LOGICAL_WIDTH } from '../config/display';
import {
  loadSettings,
  otherInputMode,
  resolveInputMode,
  saveSettings,
  type BattleInputMode,
  type GameSettings,
} from '../config/game-settings';
import { FxPlayer, queueFxAssets } from '../fx/fx-player';
import { BattleProjectiles } from '../render/battle-projectile';
import { isTouchPrimaryDevice } from '../input/input-controller';
import type { QualityController } from '../platform/quality-settings';
import { BattleActors, ENEMY_FEET, HERO_FEET, queueMonsterSprites, type ActorPoint } from '../render/battle-actors';
import { BattleArena, queueArenaTiles } from '../render/battle-arena';
import { queueHeroBattleSheets } from '../render/hero-battle-animations';
import { queueHeroSheet } from '../render/hero-sprite';
import type { QuestTracker } from '../story/quest-tracker';
import type { StoryJournal } from '../story/story-journal';
import { BattleHud, type BattleHudButton } from '../ui/battle-hud';
import { TypingInput } from '../ui/typing-input';
import { WordRing } from '../ui/word-ring';
import { REGISTRY_KEYS, SCENE_KEYS } from './scene-keys';

export interface BattleSceneData {
  readonly encounterId: string;
}

/** Thông tin gửi kết quả; `null` khi chạy trận thử ở dev không có server. */
interface OnlineBattle {
  readonly token: string;
  readonly battleId: string;
}

/** Hiệu ứng chiêu đặt ngang thân nhân vật (chân ở `HERO_FEET`/`ENEMY_FEET`, thân cao khoảng 90 px sau khi phóng). */
const FX_BODY_OFFSET_Y = -44;
/**
 * Chữ nổi: trên đầu quái (khoảng trống dưới thẻ máu); dưới chân hiệp sĩ, vì trên đầu hiệp sĩ là thẻ combo và
 * đường bay của chiêu.
 */
const FLOAT_OFFSET_Y: Readonly<Record<CueTarget, number>> = { enemy: -110, hero: 34 };
const FX_DEPTH = 20;
/** Sân trận mờ dần vào sau màn tối của chuyển cảnh trên bản đồ. */
const INTRO_FADE_MS = 450;
const WAITING_NOTICE_DELAY_MS = 700;
/** Hiệu ứng pixelfx phát chậm hơn fps gốc để chiêu không loé qua trong chớp mắt. */
const FX_TIME_SCALE = 0.6;
/** Thời gian dừng nhịp trận sau mỗi chiêu đúng để người chơi xem trọn động tác, đường bay và hiệu ứng trúng. */
const SHOWCASE_MS: Readonly<Record<SkillKind, number>> = { attack: 1500, empower: 1800, guard: 1300, evade: 1100 };
const ACTOR_LIGHT_RADIUS = 110;
const SHAKE = { light: { durationMs: 120, intensity: 0.004 }, strong: { durationMs: 260, intensity: 0.012 } } as const;
const DEV_HERO_NAME = 'Hiệp sĩ';
const SESSION_EXPIRED_MESSAGE = 'Phiên đăng nhập LingoBrain đã hết. Đăng nhập lại để vào trận.';
const INVALID_SETUP_MESSAGE = 'Dữ liệu trận không hợp lệ. Thử lại sau.';
const EXIT_LABEL = 'Về bản đồ';
const INPUT_MODE_LABELS: Readonly<Record<BattleInputMode, string>> = { typing: 'Kiểu nhập: Gõ', ring: 'Kiểu nhập: Vòng từ' };

/**
 * Màn trận: lấy setup từ server (hoặc bộ từ thử ở dev), chạy `battle-state` qua `BattleSession`,
 * đổi sự kiện thành động tác, hiệu ứng pixelfx, chữ nổi, âm thanh; cuối trận gửi log để server chạy lại và phát thưởng.
 * Sân và nhân vật vẽ bằng Phaser; HUD, ô gõ, vòng từ là DOM phủ lên canvas.
 */
export class BattleScene extends Phaser.Scene {
  private encounterId = '';
  private showcaseUntilMs = 0;
  private settings!: GameSettings;
  private inputMode: BattleInputMode = 'typing';
  private session: BattleSession | null = null;
  private online: OnlineBattle | null = null;
  private ended = false;
  private hud!: BattleHud;
  private fx!: FxPlayer;
  private projectiles!: BattleProjectiles;
  private sounds!: BattleSounds;
  private ring!: WordRing;
  private typing!: TypingInput;
  private cueMapper!: BattleCueMapper;
  private actors!: BattleActors;
  private modeButton!: HTMLButtonElement;
  private soundButton!: HTMLButtonElement;
  /** Tăng mỗi lần mở trận; scene được dùng lại nên lời gọi mạng của trận cũ phải so số này trước khi ghi đè trạng thái. */
  private battleRun = 0;

  constructor() {
    super(SCENE_KEYS.battle);
  }

  init(data: BattleSceneData): void {
    this.encounterId = data.encounterId;
    this.session = null;
    this.online = null;
    this.ended = false;
    this.battleRun += 1;
    this.showcaseUntilMs = 0;
  }

  preload(): void {
    queueFxAssets(this);
    queueHeroSheet(this);
    queueHeroBattleSheets(this);
    queueMonsterSprites(this);
    queueArenaTiles(this);
  }

  create(): void {
    this.settings = loadSettings(() => window.localStorage);
    this.inputMode = resolveInputMode(this.settings, isTouchPrimaryDevice());
    this.cueMapper = new BattleCueMapper();
    this.cameras.main.setBackgroundColor(BACKGROUND_COLOR).fadeIn(INTRO_FADE_MS);
    this.actors = new BattleActors(this);
    this.createArena();
    this.fx = new FxPlayer(this);
    this.projectiles = new BattleProjectiles(this, FX_DEPTH);
    this.sounds = new BattleSounds(this.settings.soundEnabled);
    this.createHud();
    this.questTracker()?.setVisible(false);
    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown);
    this.input.keyboard?.on(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, this.unlockSound);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup);
    this.applyInputMode();
    void this.beginBattle();
  }

  override update(_time: number, delta: number): void {
    const session = this.session;
    if (session === null || this.ended) return;
    // Lúc xem chiêu, đồng hồ trận đứng yên: đề, combo, đòn quái đều chờ. Log chỉ ghi thời gian trận nên server
    // chạy lại vẫn khớp.
    const events = session.tick(this.isShowcasing() ? 0 : delta);
    for (const event of events) this.handleEvent(event);
    if (events.length > 0) this.refreshHud(session);
    this.refreshTimers(session);
    if (session.isOver) void this.finishBattle(session);
  }

  private quality(): QualityController | undefined {
    return this.registry.get(REGISTRY_KEYS.quality) as QualityController | undefined;
  }

  private createArena(): void {
    const quality = this.quality();
    const arena = new BattleArena(this, buildArenaLayout(arenaThemeFor(this.encounterId)), {
      lightingEnabled: quality?.profile.dynamicLightingEnabled ?? true,
      actorLights: [
        { source: this.actors.heroLight, radius: ACTOR_LIGHT_RADIUS },
        { source: this.actors.enemyLight, radius: ACTOR_LIGHT_RADIUS },
      ],
    });
    // Máy tụt fps giữa trận: bỏ lớp ánh sáng như ở bản đồ.
    const unsubscribeQuality = quality?.subscribe((profile) => {
      if (!profile.dynamicLightingEnabled) arena.atmosphere.disable();
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => unsubscribeQuality?.());
  }

  private createHud(): void {
    const parent = this.game.canvas.parentElement ?? document.body;
    const me = this.registry.get(REGISTRY_KEYS.me) as MeResponse | undefined;
    this.hud = new BattleHud(parent, this.game.canvas, me?.hero?.name ?? DEV_HERO_NAME);
    this.ring = new WordRing((wordId) => this.submit({ kind: 'ring', wordId }));
    this.typing = new TypingInput({
      onSubmit: (text) => {
        // Đề vừa hiện chưa nhận input (luật chống bấm vội của server): giữ nguyên chữ để người chơi Enter lại.
        if (text.trim() === '' || this.session?.isInputLocked === true || this.isShowcasing()) return;
        this.submit({ kind: 'type', text });
        this.typing.clear();
      },
    });
    this.hud.dockCenter.append(this.typing.element, this.ring.element);
    this.hud.addDockButton('start', { label: 'Rời trận', onClick: () => void this.flee() });
    this.modeButton = this.hud.addDockButton('start', { label: INPUT_MODE_LABELS[this.inputMode], onClick: () => this.toggleInputMode() });
    this.soundButton = this.hud.addDockButton('end', { label: this.soundLabel(), onClick: () => this.toggleSound() });
  }

  private questTracker(): QuestTracker | undefined {
    return this.registry.get(REGISTRY_KEYS.questTracker) as QuestTracker | undefined;
  }

  private soundLabel(): string {
    return this.settings.soundEnabled ? 'Âm thanh: bật' : 'Âm thanh: tắt';
  }

  private readonly unlockSound = (): void => {
    this.sounds.unlock();
  };

  /** Chạm sân ở chế độ gõ thì mở lại bàn phím (iPhone chỉ mở bàn phím ảo trong thao tác chạm). */
  private readonly handlePointerDown = (): void => {
    this.sounds.unlock();
    if (this.inputMode === 'typing' && !this.ended) this.typing.focus();
  };

  private readonly cleanup = (): void => {
    this.input.off(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown);
    this.input.keyboard?.off(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, this.unlockSound);
    this.typing.destroy();
    this.hud.destroy();
    this.sounds.destroy();
    this.tweens.timeScale = 1;
  };

  private applyInputMode(): void {
    const typing = this.inputMode === 'typing';
    this.ring.setVisible(!typing && !this.ended);
    this.typing.setVisible(typing && !this.ended);
    this.modeButton.textContent = INPUT_MODE_LABELS[this.inputMode];
    if (typing && !this.ended) this.typing.focus();
    else this.typing.blur();
  }

  private toggleInputMode(): void {
    this.inputMode = otherInputMode(this.inputMode);
    this.settings = { ...this.settings, inputMode: this.inputMode };
    saveSettings(() => window.localStorage, this.settings);
    this.applyInputMode();
  }

  private toggleSound(): void {
    this.settings = { ...this.settings, soundEnabled: !this.settings.soundEnabled };
    saveSettings(() => window.localStorage, this.settings);
    this.sounds.setEnabled(this.settings.soundEnabled);
    if (this.settings.soundEnabled) this.sounds.unlock();
    this.soundButton.textContent = this.soundLabel();
  }

  private submit(input: BattleInput): void {
    if (this.session === null || this.ended || this.isShowcasing()) return;
    this.sounds.unlock();
    this.session.submit(input);
  }

  private async beginBattle(): Promise<void> {
    // Mạng nhanh thì không hiện bảng chờ: sân mờ dần vào rồi quái xuất hiện luôn.
    const waitingRun = this.battleRun;
    this.time.delayedCall(WAITING_NOTICE_DELAY_MS, () => {
      if (!this.isStale(waitingRun) && this.session === null && !this.ended) this.hud.showCenter('Đang vào trận…');
    });
    // Dev vào map bằng nút thử (không có phiên LingoBrain): chơi bộ từ thử, không gửi kết quả.
    if (import.meta.env.DEV && this.registry.get(REGISTRY_KEYS.me) === undefined) {
      this.startSession(devBattleSetup(this.encounterId), null);
      return;
    }
    const token = readEngSessionToken(() => window.localStorage);
    if (token === null) {
      this.showEnd(SESSION_EXPIRED_MESSAGE);
      return;
    }
    const run = this.battleRun;
    const result = await startBattle(token, { encounterId: this.encounterId }, window.fetch.bind(window));
    // Người chơi có thể đã rời trận (hoặc đã sang trận khác) trong lúc chờ mạng.
    if (this.isStale(run)) return;
    if (result.kind === 'ok') {
      this.startSession(result.value.setup, { token, battleId: result.value.battleId });
      if (result.value.tutorial) this.hud.floatText(LOGICAL_WIDTH / 2, 170, 'Trận hướng dẫn: học thêm từ ở LingoBrain để mạnh hơn', 'info');
    } else if (result.kind === 'unauthenticated') {
      this.showEnd(SESSION_EXPIRED_MESSAGE);
    } else {
      this.showEnd(result.message);
    }
  }

  private isStale(run: number): boolean {
    return run !== this.battleRun || !this.scene.isActive();
  }

  private startSession(setup: BattleSetup, online: OnlineBattle | null): void {
    let session: BattleSession;
    // Hiệu ứng chiêu theo bậc đã nâng ở tháp phép (server ghi trong setup).
    this.cueMapper = new BattleCueMapper(setup.skillTiers);
    try {
      session = new BattleSession(setup);
    } catch (error) {
      if (!(error instanceof InvalidBattleSetupError)) throw error;
      this.showEnd(INVALID_SETUP_MESSAGE);
      return;
    }
    this.online = online;
    this.session = session;
    this.hud.hideCenter();
    this.refreshHud(session);
  }

  private handleEvent(event: BattleEvent): void {
    if (event.type === 'prompt') this.showPrompt(event.wordId, event.options);
    else if (event.type === 'enemySpawn') this.actors.showEnemy(event.kind, event.elite);
    else if (event.type === 'enemyDefeated') this.actors.defeatEnemy();
    else if (event.type === 'defeat') this.actors.fall();
    else if (event.type === 'miss' && event.reason === 'wrong') this.typing.shake();
    else if (event.type === 'cast') this.showcaseUntilMs = this.time.now + SHOWCASE_MS[event.skill];
    for (const cue of this.cueMapper.cuesFor(event)) this.scheduleCue(cue);
  }

  private showPrompt(wordId: string, options: readonly string[]): void {
    const session = this.session;
    const word = session?.wordById(wordId);
    if (session === null || word === undefined) return;
    this.hud.setPrompt(word.emoji, word.meaning);
    this.ring.setOptions(options.map((id) => ({ wordId: id, label: session.wordById(id)?.word ?? '' })));
    this.typing.clear();
  }

  private refreshHud(session: BattleSession): void {
    const { hero, enemy } = session.current;
    this.hud.setHero(hero.hp, hero.maxHp, hero.shield);
    if (enemy !== null) {
      this.hud.setEnemy(enemy.kind, enemy.hp, enemy.maxHp, enemy.elite, enemy.shielded);
      this.actors.setEnemyState(enemy.elite, enemy.shielded);
    }
  }

  /** Thanh thời gian đề đổi mỗi khung; chỉ đổi tỉ lệ, không tạo đối tượng. */
  private refreshTimers(session: BattleSession): void {
    const { prompt, elapsedMs, setup } = session.current;
    this.hud.setPromptTimer(prompt === null ? 0 : (prompt.deadlineMs - elapsedMs) / setup.promptTimeMs);
    this.ring.setEnabled(!session.isInputLocked && !this.isShowcasing());
  }

  /** Đang dừng nhịp trận để người chơi xem chiêu vừa tung (đồng hồ trận đứng, chưa nhận đáp án mới). */
  private isShowcasing(): boolean {
    return this.time.now < this.showcaseUntilMs;
  }

  private feetOf(target: CueTarget): ActorPoint {
    return target === 'hero' ? HERO_FEET : ENEMY_FEET;
  }

  private bodyOf(target: CueTarget): ActorPoint {
    const feet = this.feetOf(target);
    return { x: feet.x, y: feet.y + FX_BODY_OFFSET_Y };
  }

  /** Cue có `delayMs` chờ trên đồng hồ scene (dừng theo scene, tự huỷ khi rời trận). */
  private scheduleCue(cue: BattleCue): void {
    if (cue.delayMs === undefined) this.playCue(cue);
    else this.time.delayedCall(cue.delayMs, () => this.playCue(cue));
  }

  private playCue(cue: BattleCue): void {
    switch (cue.type) {
      case 'fx': {
        // Hiệu ứng pixelfx vẽ sẵn theo góc nhìn chính diện; giữ nguyên, không xoay theo trục sân.
        const at = this.bodyOf(cue.target);
        this.fx.play(cue.fx, at.x, at.y, { scale: cue.scale, depth: FX_DEPTH, timeScale: FX_TIME_SCALE });
        break;
      }
      case 'projectile': {
        const to = cue.from === 'hero' ? 'enemy' : 'hero';
        this.projectiles.fire(this.bodyOf(cue.from), this.bodyOf(to), cue.tone, cue.durationMs);
        break;
      }
      case 'sound':
        this.sounds.play(cue.sound);
        break;
      case 'floatText': {
        const at = this.feetOf(cue.target);
        this.hud.floatText(at.x, at.y + FLOAT_OFFSET_Y[cue.target], cue.text, cue.tone);
        break;
      }
      case 'heroMove':
        this.actors.moveHero(cue.move, () => this.fx.play(SYSTEM_FX.blinkIn, HERO_FEET.x, HERO_FEET.y + FX_BODY_OFFSET_Y, { depth: FX_DEPTH }));
        break;
      case 'actor':
        this.actors.act(cue.target, cue.action);
        break;
      case 'hitstop':
        this.actors.hitstop(cue.durationMs);
        break;
      case 'shake': {
        if (this.quality()?.profile.screenShakeEnabled === false) break;
        const shake = cue.strong ? SHAKE.strong : SHAKE.light;
        this.cameras.main.shake(shake.durationMs, shake.intensity);
        break;
      }
    }
  }

  private async finishBattle(session: BattleSession): Promise<void> {
    this.ended = true;
    this.typing.blur();
    this.ring.setEnabled(false);
    this.hud.clearPrompt();
    const victory = session.current.outcome === 'victory';
    const title = victory ? 'Chiến thắng!' : 'Hiệp sĩ gục ngã…';
    const online = this.online;
    if (online === null) {
      const lines = [title, '(Trận thử, không ghi kết quả)'];
      if (victory) {
        this.storyJournal()?.recordVictory(this.encounterId);
        const run = this.battleRun;
        const storyLine = await this.completeStoryBattle();
        // Người chơi có thể đã rời trận (hoặc sang trận khác) trong lúc chờ ghi mốc truyện.
        if (this.isStale(run)) return;
        if (storyLine !== null) lines.push(storyLine);
      }
      this.showEnd(lines.join('\n'));
      return;
    }
    await this.submitResult(session, online, title);
  }

  /** Gửi log cho server chạy lại; lỗi thì cho thử lại để không mất thưởng của trận đã đánh. */
  private async submitResult(session: BattleSession, online: OnlineBattle, title: string): Promise<void> {
    this.hud.showCenter(`${title}\nĐang ghi kết quả…`);
    const run = this.battleRun;
    const result = await submitBattleResult(online.token, online.battleId, session.resultRequest(), window.fetch.bind(window));
    if (this.isStale(run)) return;
    if (result.kind === 'unauthenticated') {
      this.showEnd(`${title}\nChưa ghi được kết quả: phiên đăng nhập đã hết`);
      return;
    }
    if (result.kind === 'failed') {
      this.showEnd(`${title}\nChưa ghi được kết quả: ${result.message}`, () => void this.submitResult(session, online, title));
      return;
    }
    const { goldEarned, missedWordIds, outcome } = result.value;
    const lines = [title];
    if (outcome === 'victory') {
      const storyLine = await this.completeStoryBattle();
      if (this.isStale(run)) return;
      if (storyLine !== null) lines.push(storyLine);
    }
    if (goldEarned > 0) lines.push(`+${goldEarned} vàng`);
    if (missedWordIds.length > 0) lines.push(`${missedWordIds.length} từ cần ôn lại`);
    this.showEnd(lines.join('\n'));
  }

  private storyJournal(): StoryJournal | undefined {
    return this.registry.get(REGISTRY_KEYS.story) as StoryJournal | undefined;
  }

  /**
   * Trận truyện vừa thắng: báo server ghi mốc (server tự kiểm bằng chứng thắng đã ghi lúc chốt trận).
   * Trả dòng báo cho màn kết thúc, `null` khi trận không gắn mốc nào.
   */
  private async completeStoryBattle(): Promise<string | null> {
    const journal = this.storyJournal();
    const found = journal === undefined ? null : beatForEncounter(this.encounterId, journal.progress);
    if (journal === undefined || found === null) return null;
    const result = await journal.complete(found.chapter, found.beat.id);
    if (result.kind === 'ok') return `Xong: ${found.beat.objective}`;
    return result.kind === 'failed' ? `Chưa ghi được mốc truyện: ${result.message}` : 'Chưa ghi được mốc truyện: phiên đăng nhập đã hết';
  }

  private showEnd(message: string, retry?: () => void): void {
    this.ended = true;
    this.typing.blur();
    this.applyInputMode();
    const buttons: BattleHudButton[] = [{ label: EXIT_LABEL, onClick: () => this.exitBattle() }];
    if (retry !== undefined) buttons.push({ label: 'Thử lại', onClick: retry });
    this.hud.showCenter(message, buttons);
  }

  /** Rời trận giữa chừng: báo server (trận tính "rời trận", vẫn ghi từ sai) rồi về bản đồ. */
  private async flee(): Promise<void> {
    const session = this.session;
    const online = this.online;
    if (this.ended || session === null || online === null) {
      this.exitBattle();
      return;
    }
    this.ended = true;
    this.hud.showCenter('Đang rời trận…');
    const run = this.battleRun;
    // Gửi được hay không thì vẫn về bản đồ; trận không chốt sẽ bị bỏ khi bắt đầu trận mới.
    await submitBattleResult(online.token, online.battleId, session.resultRequest(), window.fetch.bind(window));
    if (!this.isStale(run)) this.exitBattle();
  }

  private exitBattle(): void {
    this.scene.stop();
    this.scene.resume(SCENE_KEYS.world);
    this.scene.wake(SCENE_KEYS.ui);
  }
}
