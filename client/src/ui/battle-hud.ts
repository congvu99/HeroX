import Phaser from 'phaser';
import { MIN_VISIBLE_COMBO } from '@herox/shared';
import type { FloatTone } from '../battle/battle-cues';
import { LOGICAL_WIDTH } from '../config/display';

const BAR_WIDTH = 200;
const BAR_HEIGHT = 10;
const BAR_MARGIN = 14;
const HERO_BAR_COLOR = 0x5fb35a;
const SHIELD_BAR_COLOR = 0xe8d9a8;
const ENEMY_BAR_COLOR = 0xc0392b;
const ELITE_BAR_COLOR = 0xd35400;
const TIMER_BAR_COLOR = 0x8e7cc3;
const COMBO_BAR_COLOR = 0xf1c40f;
const BAR_BACK_COLOR = 0x000000;
const PROMPT_Y = 62;
const COMBO_Y = 112;
const TYPED_Y = 268;
const FLOAT_RISE_PX = 28;
const FLOAT_DURATION_MS = 800;
const FLOAT_POOL_SIZE = 8;

const FLOAT_COLORS: Readonly<Record<FloatTone, string>> = {
  damage: '#ffe08a',
  info: '#bfe3ff',
  bad: '#ff8a80',
};

const LABEL_STYLE: Phaser.Types.GameObjects.Text.TextStyle = { fontFamily: 'sans-serif', fontSize: '12px', color: '#e8d9a8' };
const PROMPT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'sans-serif',
  fontSize: '20px',
  color: '#ffffff',
  align: 'center',
  backgroundColor: '#1c1a2bcc',
  padding: { x: 12, y: 6 },
  wordWrap: { width: 420 },
};
const TYPED_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'monospace',
  fontSize: '22px',
  color: '#f3ead0',
  backgroundColor: '#1c1a2bcc',
  padding: { x: 14, y: 6 },
};
const FLOAT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'sans-serif',
  fontSize: '16px',
  color: '#ffffff',
  stroke: '#000000',
  strokeThickness: 3,
};
const CENTER_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'serif',
  fontSize: '22px',
  color: '#e8d9a8',
  align: 'center',
  backgroundColor: '#0b0b12dd',
  padding: { x: 18, y: 12 },
  wordWrap: { width: 460 },
};

/** Tên quái hiển thị; thêm quái mới thì bổ sung tên ở đây. */
const ENEMY_NAMES: Readonly<Record<string, string>> = {
  'imp-scout': 'Quỷ con trinh sát',
  imp: 'Quỷ con',
  'scarecrow-thrall': 'Bù nhìn bị nhập',
};

export function enemyDisplayName(kind: string): string {
  return ENEMY_NAMES[kind] ?? kind;
}

const TYPING_PLACEHOLDER = 'Gõ từ tiếng Anh rồi Enter';

class MeterBar {
  private readonly fill: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, x: number, y: number, width: number, color: number, depth: number) {
    scene.add.rectangle(x, y, width, BAR_HEIGHT, BAR_BACK_COLOR, 0.6).setOrigin(0, 0).setDepth(depth);
    this.fill = scene.add.rectangle(x, y, width, BAR_HEIGHT, color).setOrigin(0, 0).setDepth(depth + 1);
  }

  get bar(): Phaser.GameObjects.Rectangle {
    return this.fill;
  }

  /** `ratio` 0..1; dùng `scaleX` thay vì đổi kích thước để không dựng lại hình mỗi khung. */
  set(ratio: number): void {
    this.fill.setScale(Phaser.Math.Clamp(ratio, 0, 1), 1);
  }
}

/** HUD màn trận: máu, khiên, đề, đồng hồ đề, combo, chữ đang gõ, chữ nổi. Đối tượng dựng một lần, chỉ cập nhật. */
export class BattleHud {
  private readonly heroHp: MeterBar;
  private readonly heroShield: MeterBar;
  private readonly heroLabel: Phaser.GameObjects.Text;
  private readonly enemyHp: MeterBar;
  private readonly enemyLabel: Phaser.GameObjects.Text;
  private readonly promptText: Phaser.GameObjects.Text;
  private readonly promptTimer: MeterBar;
  private readonly comboText: Phaser.GameObjects.Text;
  private readonly comboTimer: MeterBar;
  private readonly typedText: Phaser.GameObjects.Text;
  private readonly centerText: Phaser.GameObjects.Text;
  private readonly floats: Phaser.GameObjects.Text[] = [];
  private nextFloat = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    depth: number,
  ) {
    const right = LOGICAL_WIDTH - BAR_MARGIN - BAR_WIDTH;
    this.heroHp = new MeterBar(scene, BAR_MARGIN, BAR_MARGIN, BAR_WIDTH, HERO_BAR_COLOR, depth);
    this.heroShield = new MeterBar(scene, BAR_MARGIN, BAR_MARGIN + BAR_HEIGHT + 2, BAR_WIDTH, SHIELD_BAR_COLOR, depth);
    this.heroLabel = scene.add.text(BAR_MARGIN, BAR_MARGIN + BAR_HEIGHT * 2 + 4, '', LABEL_STYLE).setDepth(depth);
    this.enemyHp = new MeterBar(scene, right, BAR_MARGIN, BAR_WIDTH, ENEMY_BAR_COLOR, depth);
    this.enemyLabel = scene.add.text(right + BAR_WIDTH, BAR_MARGIN + BAR_HEIGHT + 4, '', LABEL_STYLE).setOrigin(1, 0).setDepth(depth);
    this.promptText = scene.add.text(LOGICAL_WIDTH / 2, PROMPT_Y, '', PROMPT_STYLE).setOrigin(0.5).setDepth(depth);
    this.promptTimer = new MeterBar(scene, LOGICAL_WIDTH / 2 - BAR_WIDTH / 2, PROMPT_Y + 26, BAR_WIDTH, TIMER_BAR_COLOR, depth);
    this.comboText = scene.add.text(LOGICAL_WIDTH / 2, COMBO_Y, '', LABEL_STYLE).setOrigin(0.5).setDepth(depth);
    this.comboTimer = new MeterBar(scene, LOGICAL_WIDTH / 2 - BAR_WIDTH / 4, COMBO_Y + 10, BAR_WIDTH / 2, COMBO_BAR_COLOR, depth);
    this.typedText = scene.add.text(LOGICAL_WIDTH / 2, TYPED_Y, TYPING_PLACEHOLDER, TYPED_STYLE).setOrigin(0.5).setDepth(depth);
    this.centerText = scene.add.text(LOGICAL_WIDTH / 2, 180, '', CENTER_STYLE).setOrigin(0.5).setDepth(depth + 2).setVisible(false);
    for (let index = 0; index < FLOAT_POOL_SIZE; index += 1) {
      this.floats.push(scene.add.text(0, 0, '', FLOAT_STYLE).setOrigin(0.5).setDepth(depth + 1).setVisible(false));
    }
    this.setComboCount(0);
  }

  setHero(hp: number, maxHp: number, shield: number): void {
    this.heroHp.set(hp / maxHp);
    this.heroShield.set(shield / maxHp);
    this.heroLabel.setText(`Hiệp sĩ ${hp}/${maxHp}${shield > 0 ? `  🛡 ${shield}` : ''}`);
  }

  setEnemy(kind: string, hp: number, maxHp: number, elite: boolean): void {
    this.enemyHp.set(hp / maxHp);
    this.enemyHp.bar.setFillStyle(elite ? ELITE_BAR_COLOR : ENEMY_BAR_COLOR);
    this.enemyLabel.setText(`${elite ? '★ Tinh anh · ' : ''}${enemyDisplayName(kind)} ${hp}/${maxHp}`);
  }

  setPrompt(emoji: string, meaning: string): void {
    this.promptText.setText(`${emoji}  ${meaning}`).setVisible(true);
  }

  clearPrompt(): void {
    this.promptText.setVisible(false);
    this.promptTimer.set(0);
  }

  setPromptTimer(ratio: number): void {
    this.promptTimer.set(ratio);
  }

  /** Gọi khi combo đổi (không gọi mỗi khung); dưới `MIN_VISIBLE_COMBO` thì ẩn thanh combo. */
  setComboCount(count: number): void {
    const visible = count >= MIN_VISIBLE_COMBO;
    this.comboText.setText(visible ? `Combo ×${count}` : '').setVisible(visible);
    this.comboTimer.bar.setVisible(visible);
  }

  setComboTimer(remainingRatio: number): void {
    this.comboTimer.set(remainingRatio);
  }

  setTypingVisible(visible: boolean): void {
    this.typedText.setVisible(visible);
  }

  setTyped(text: string): void {
    this.typedText.setText(text === '' ? TYPING_PLACEHOLDER : text).setAlpha(text === '' ? 0.6 : 1);
  }

  showCenter(message: string): void {
    this.centerText.setText(message).setVisible(true);
  }

  hideCenter(): void {
    this.centerText.setVisible(false);
  }

  /** Chữ nổi lên rồi mờ dần; dùng vòng pool cố định, chữ cũ nhất bị tái dùng khi hết chỗ. */
  floatText(x: number, y: number, text: string, tone: FloatTone): void {
    const label = this.floats[this.nextFloat % FLOAT_POOL_SIZE];
    this.nextFloat += 1;
    if (label === undefined) return;
    this.scene.tweens.killTweensOf(label);
    label.setText(text).setColor(FLOAT_COLORS[tone]).setPosition(x, y).setAlpha(1).setVisible(true);
    this.scene.tweens.add({
      targets: label,
      y: y - FLOAT_RISE_PX,
      alpha: 0,
      duration: FLOAT_DURATION_MS,
      ease: 'Cubic.easeOut',
      onComplete: () => label.setVisible(false),
    });
  }
}
