import Phaser from 'phaser';
import {
  comboExpiresAtMs,
  COMBO_WINDOW_MS,
  InvalidBattleSetupError,
  SYSTEM_FX,
  type BattleEvent,
  type BattleInput,
  type BattleSetup,
} from '@herox/shared';
import { submitBattleResult, startBattle } from '../api/battle-api';
import { readEngSessionToken } from '../api/me-api';
import { BattleSounds } from '../audio/battle-sounds';
import { BattleCueMapper, type BattleCue, type CueTarget, type HeroMove } from '../battle/battle-cues';
import { BattleSession } from '../battle/battle-session';
import { devBattleSetup } from '../battle/dev-battle-fixture';
import { LOGICAL_WIDTH } from '../config/display';
import {
  loadSettings,
  otherInputMode,
  resolveInputMode,
  saveSettings,
  type BattleInputMode,
  type GameSettings,
} from '../config/game-settings';
import { FxPlayer, queueFxAssets } from '../fx/fx-player';
import { isTouchPrimaryDevice } from '../input/input-controller';
import { TEXTURE_KEYS } from '../render/placeholder-textures';
import { BattleHud } from '../ui/battle-hud';
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

const HERO_POSITION = { x: 180, y: 176 } as const;
const ENEMY_POSITION = { x: 460, y: 176 } as const;
const FLOAT_OFFSET_Y = -70;
const ARENA_COLOR = '#140d18';
const FLOOR_COLOR = 0x241a2c;
const SPRITE_DEPTH = 10;
const FX_DEPTH = 20;
const HUD_DEPTH = 100;
const ELITE_TINT = 0xffa060;
const DASH_OFFSET_PX = -34;
const DASH_DURATION_MS = 110;
const BLINK_HIDDEN_MS = 260;
const ENEMY_FADE_MS = 400;
const SHAKE = { light: { durationMs: 120, intensity: 0.004 }, strong: { durationMs: 260, intensity: 0.012 } } as const;
const BUTTON_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'sans-serif',
  fontSize: '13px',
  color: '#0b0b12',
  backgroundColor: '#e8d9a8',
  padding: { x: 10, y: 6 },
};
const SESSION_EXPIRED_MESSAGE = 'Phiên đăng nhập LingoBrain đã hết. Đăng nhập lại để vào trận.';
const INVALID_SETUP_MESSAGE = 'Dữ liệu trận không hợp lệ. Thử lại sau.';
const END_BUTTON_OFFSET_Y = 70;
const END_BUTTON_GAP_X = 70;
const INPUT_MODE_LABELS: Readonly<Record<BattleInputMode, string>> = { typing: 'Kiểu nhập: Gõ', ring: 'Kiểu nhập: Vòng từ' };

/**
 * Màn trận: lấy setup từ server (hoặc bộ từ thử ở dev), chạy `battle-state` qua `BattleSession`,
 * đổi sự kiện thành hiệu ứng pixelfx, chữ nổi, âm thanh; cuối trận gửi log để server chạy lại và phát thưởng.
 */
export class BattleScene extends Phaser.Scene {
  private encounterId = '';
  private settings!: GameSettings;
  private inputMode: BattleInputMode = 'typing';
  private session: BattleSession | null = null;
  private online: OnlineBattle | null = null;
  private ended = false;
  private hud!: BattleHud;
  private fx!: FxPlayer;
  private sounds!: BattleSounds;
  private ring!: WordRing;
  private typing!: TypingInput;
  private cueMapper!: BattleCueMapper;
  private hero!: Phaser.GameObjects.Sprite;
  private enemy!: Phaser.GameObjects.Sprite;
  private modeButton!: Phaser.GameObjects.Text;
  private soundButton!: Phaser.GameObjects.Text;
  private endButtons: Phaser.GameObjects.Text[] = [];
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
    this.endButtons = [];
    this.battleRun += 1;
  }

  preload(): void {
    queueFxAssets(this);
  }

  create(): void {
    this.settings = loadSettings(() => window.localStorage);
    this.inputMode = resolveInputMode(this.settings, isTouchPrimaryDevice());
    this.cueMapper = new BattleCueMapper();
    this.createArena();
    this.hud = new BattleHud(this, HUD_DEPTH);
    this.fx = new FxPlayer(this);
    this.sounds = new BattleSounds(this.settings.soundEnabled);
    this.ring = new WordRing(this, (wordId) => this.submit({ kind: 'ring', wordId }), undefined, HUD_DEPTH);
    this.typing = this.createTypingInput();
    this.createButtons();
    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown);
    this.input.keyboard?.on(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, this.unlockSound);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup);
    this.applyInputMode();
    void this.beginBattle();
  }

  override update(_time: number, delta: number): void {
    const session = this.session;
    if (session === null || this.ended) return;
    const events = session.tick(delta);
    for (const event of events) this.handleEvent(event);
    if (events.length > 0) this.refreshHud(session);
    this.refreshTimers(session);
    if (session.isOver) void this.finishBattle(session);
  }

  private createArena(): void {
    this.cameras.main.setBackgroundColor(ARENA_COLOR);
    this.add.ellipse(LOGICAL_WIDTH / 2, HERO_POSITION.y, 520, 70, FLOOR_COLOR);
    this.hero = this.add.sprite(HERO_POSITION.x, HERO_POSITION.y, TEXTURE_KEYS.hero, 'right').setOrigin(0.5, 1).setDepth(SPRITE_DEPTH);
    this.enemy = this.add.sprite(ENEMY_POSITION.x, ENEMY_POSITION.y, TEXTURE_KEYS.enemy).setOrigin(0.5, 1).setDepth(SPRITE_DEPTH).setAlpha(0);
  }

  private createTypingInput(): TypingInput {
    const parent = this.game.canvas.parentElement ?? document.body;
    return new TypingInput(parent, {
      onChange: (text) => this.hud.setTyped(text),
      onSubmit: (text) => {
        // Đề vừa hiện chưa nhận input (luật chống bấm vội của server): giữ nguyên chữ để người chơi Enter lại.
        if (text.trim() === '' || this.session?.isInputLocked === true) return;
        this.submit({ kind: 'type', text });
        this.typing.clear();
      },
    });
  }

  private createButtons(): void {
    const { width, height } = this.scale.gameSize;
    this.modeButton = this.addButton(12, height - 10, INPUT_MODE_LABELS[this.inputMode], () => this.toggleInputMode()).setOrigin(0, 1);
    this.soundButton = this.addButton(width - 12, height - 10, this.soundLabel(), () => this.toggleSound()).setOrigin(1, 1);
    this.addButton(14, 50, 'Rời trận', () => void this.flee());
  }

  private addButton(x: number, y: number, label: string, onClick: () => void): Phaser.GameObjects.Text {
    return this.add
      .text(x, y, label, BUTTON_STYLE)
      .setDepth(HUD_DEPTH)
      .setInteractive({ useHandCursor: true })
      .on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, onClick);
  }

  private soundLabel(): string {
    return this.settings.soundEnabled ? 'Âm thanh: bật' : 'Âm thanh: tắt';
  }

  private readonly unlockSound = (): void => {
    this.sounds.unlock();
  };

  /** Chạm màn ở chế độ gõ thì mở lại bàn phím (iPhone chỉ mở bàn phím ảo trong thao tác chạm). */
  private readonly handlePointerDown = (): void => {
    this.sounds.unlock();
    if (this.inputMode === 'typing' && !this.ended) this.typing.focus();
  };

  private readonly cleanup = (): void => {
    this.input.off(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown);
    this.input.keyboard?.off(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, this.unlockSound);
    this.typing.destroy();
    this.sounds.destroy();
  };

  private applyInputMode(): void {
    const typing = this.inputMode === 'typing';
    this.ring.setVisible(!typing);
    this.hud.setTypingVisible(typing);
    this.modeButton.setText(INPUT_MODE_LABELS[this.inputMode]);
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
    this.soundButton.setText(this.soundLabel());
  }

  private submit(input: BattleInput): void {
    if (this.session === null || this.ended) return;
    this.sounds.unlock();
    this.session.submit(input);
  }

  private async beginBattle(): Promise<void> {
    this.hud.showCenter('Đang vào trận…');
    // Dev vào map bằng nút thử (không có phiên LingoBrain): chơi bộ từ thử, không gửi kết quả.
    if (import.meta.env.DEV && this.registry.get(REGISTRY_KEYS.me) === undefined) {
      this.startSession(devBattleSetup(), null);
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
      if (result.value.tutorial) this.hud.floatText(LOGICAL_WIDTH / 2, 150, 'Trận hướng dẫn: học thêm từ ở LingoBrain để mạnh hơn', 'info');
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
    else if (event.type === 'enemySpawn') this.showEnemy(event.elite);
    else if (event.type === 'enemyDefeated') this.tweens.add({ targets: this.enemy, alpha: 0, duration: ENEMY_FADE_MS / 2 });
    for (const cue of this.cueMapper.cuesFor(event)) this.playCue(cue);
  }

  private showPrompt(wordId: string, options: readonly string[]): void {
    const session = this.session;
    const word = session?.wordById(wordId);
    if (session === null || word === undefined) return;
    this.hud.setPrompt(word.emoji, word.meaning);
    this.ring.setOptions(options.map((id) => ({ wordId: id, label: session.wordById(id)?.word ?? '' })));
    this.ring.setVisible(this.inputMode === 'ring');
    this.typing.clear();
  }

  private showEnemy(elite: boolean): void {
    this.tweens.killTweensOf(this.enemy);
    this.enemy.setAlpha(0).setX(ENEMY_POSITION.x);
    if (elite) this.enemy.setTint(ELITE_TINT);
    else this.enemy.clearTint();
    this.tweens.add({ targets: this.enemy, alpha: 1, duration: ENEMY_FADE_MS });
  }

  private refreshHud(session: BattleSession): void {
    const { hero, enemy, combo } = session.current;
    this.hud.setHero(hero.hp, hero.maxHp, hero.shield);
    if (enemy !== null) this.hud.setEnemy(enemy.kind, enemy.hp, enemy.maxHp, enemy.elite);
    this.hud.setComboCount(combo.count);
  }

  /** Thanh thời gian đề và cửa sổ combo đổi mỗi khung; chỉ đổi tỉ lệ, không tạo đối tượng. */
  private refreshTimers(session: BattleSession): void {
    const { prompt, elapsedMs, combo, setup } = session.current;
    this.hud.setPromptTimer(prompt === null ? 0 : (prompt.deadlineMs - elapsedMs) / setup.promptTimeMs);
    const comboEnd = comboExpiresAtMs(combo);
    this.hud.setComboTimer(comboEnd === null ? 0 : (comboEnd - elapsedMs) / COMBO_WINDOW_MS);
    this.ring.setEnabled(!session.isInputLocked);
  }

  private positionOf(target: CueTarget): { readonly x: number; readonly y: number } {
    return target === 'hero' ? HERO_POSITION : ENEMY_POSITION;
  }

  private playCue(cue: BattleCue): void {
    switch (cue.type) {
      case 'fx': {
        const at = this.positionOf(cue.target);
        this.fx.play(cue.fx, at.x, at.y, { scale: cue.scale, depth: FX_DEPTH, flipX: cue.mirrored === true });
        break;
      }
      case 'sound':
        this.sounds.play(cue.sound);
        break;
      case 'floatText': {
        const at = this.positionOf(cue.target);
        this.hud.floatText(at.x, at.y + FLOAT_OFFSET_Y, cue.text, cue.tone);
        break;
      }
      case 'heroMove':
        this.moveHero(cue.move);
        break;
      case 'shake': {
        const shake = cue.strong ? SHAKE.strong : SHAKE.light;
        this.cameras.main.shake(shake.durationMs, shake.intensity);
        break;
      }
    }
  }

  /** Né trong trận: lướt lùi rồi về chỗ, hoặc tan biến rồi hiện lại (thuấn bộ). */
  private moveHero(move: HeroMove): void {
    this.tweens.killTweensOf(this.hero);
    this.hero.setPosition(HERO_POSITION.x, HERO_POSITION.y).setAlpha(1);
    if (move === 'dash') {
      this.tweens.add({ targets: this.hero, x: HERO_POSITION.x + DASH_OFFSET_PX, duration: DASH_DURATION_MS, yoyo: true, ease: 'Quad.easeOut' });
      return;
    }
    this.hero.setAlpha(0);
    this.time.delayedCall(BLINK_HIDDEN_MS, () => {
      this.fx.play(SYSTEM_FX.blinkIn, HERO_POSITION.x, HERO_POSITION.y, { depth: FX_DEPTH });
      this.hero.setAlpha(1);
    });
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
      this.showEnd(`${title}\n(Trận thử, không ghi kết quả)`);
      return;
    }
    await this.submitResult(session, online, title);
  }

  /** Gửi log cho server chạy lại; lỗi thì cho thử lại để không mất thưởng của trận đã đánh. */
  private async submitResult(session: BattleSession, online: OnlineBattle, title: string): Promise<void> {
    this.clearEndButtons();
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
    const { goldEarned, missedWordIds } = result.value;
    const lines = [title];
    if (goldEarned > 0) lines.push(`+${goldEarned} vàng`);
    if (missedWordIds.length > 0) lines.push(`${missedWordIds.length} từ cần ôn lại`);
    this.showEnd(lines.join('\n'));
  }

  private showEnd(message: string, retry?: () => void): void {
    this.ended = true;
    this.typing.blur();
    this.ring.setVisible(false);
    this.hud.setTypingVisible(false);
    this.hud.showCenter(message);
    this.clearEndButtons();
    const { width, height } = this.scale.gameSize;
    const y = height / 2 + END_BUTTON_OFFSET_Y;
    const exitX = retry === undefined ? width / 2 : width / 2 + END_BUTTON_GAP_X;
    this.endButtons.push(this.addButton(exitX, y, 'Về bản đồ', () => this.exitBattle()).setOrigin(0.5));
    if (retry !== undefined) this.endButtons.push(this.addButton(width / 2 - END_BUTTON_GAP_X, y, 'Thử lại', retry).setOrigin(0.5));
  }

  private clearEndButtons(): void {
    for (const button of this.endButtons) button.destroy();
    this.endButtons = [];
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
