import Phaser from 'phaser';
import { RING_SIZE } from '@herox/shared';
import { DEFAULT_RING_LAYOUT, RING_SLOT_HEIGHT, RING_SLOT_WIDTH, ringSlotPositions, type RingLayout } from './word-ring-layout';

export interface RingOption {
  readonly wordId: string;
  readonly label: string;
}

const SLOT_FILL = 0x1c1a2b;
const SLOT_FILL_PRESSED = 0x4a3f78;
const SLOT_STROKE = 0xe8d9a8;
const SLOT_ALPHA = 0.88;
const PRESS_SCALE = 0.92;
const PRESS_FEEDBACK_MS = 90;
const LABEL_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'sans-serif',
  fontSize: '15px',
  color: '#f3ead0',
  align: 'center',
};

interface RingSlot {
  readonly container: Phaser.GameObjects.Container;
  readonly background: Phaser.GameObjects.Rectangle;
  readonly label: Phaser.GameObjects.Text;
  wordId: string | null;
}

/**
 * Vòng từ 6 ô cho cảm ứng: chạm một ô là chọn từ đó. Ô dựng một lần và chỉ đổi chữ mỗi đề,
 * nên không tạo đối tượng mới trong trận.
 */
export class WordRing {
  private readonly slots: RingSlot[];
  private enabled = true;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly onPick: (wordId: string) => void,
    layout: RingLayout = DEFAULT_RING_LAYOUT,
    depth = 0,
  ) {
    this.slots = ringSlotPositions(RING_SIZE, layout).map((position) => this.createSlot(position.x, position.y, depth));
  }

  setOptions(options: readonly RingOption[]): void {
    this.slots.forEach((slot, index) => {
      const option = options[index];
      slot.wordId = option?.wordId ?? null;
      slot.label.setText(option?.label ?? '');
      slot.container.setVisible(option !== undefined);
    });
  }

  setVisible(visible: boolean): void {
    for (const slot of this.slots) slot.container.setVisible(visible && slot.wordId !== null);
  }

  /** Khoá vòng từ (đề chưa sẵn sàng, trận đã xong) mà vẫn hiện để người chơi đọc trước. */
  setEnabled(enabled: boolean): void {
    if (enabled === this.enabled) return;
    this.enabled = enabled;
    for (const slot of this.slots) slot.container.setAlpha(enabled ? 1 : 0.5);
  }

  private createSlot(x: number, y: number, depth: number): RingSlot {
    const background = this.scene.add
      .rectangle(0, 0, RING_SLOT_WIDTH, RING_SLOT_HEIGHT, SLOT_FILL, SLOT_ALPHA)
      .setStrokeStyle(2, SLOT_STROKE);
    const label = this.scene.add.text(0, 0, '', LABEL_STYLE).setOrigin(0.5);
    const container = this.scene.add.container(x, y, [background, label]).setDepth(depth).setVisible(false);
    const slot: RingSlot = { container, background, label, wordId: null };
    background.setInteractive({ useHandCursor: true });
    background.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => this.press(slot));
    return slot;
  }

  private press(slot: RingSlot): void {
    if (!this.enabled || slot.wordId === null) return;
    slot.background.setFillStyle(SLOT_FILL_PRESSED, SLOT_ALPHA);
    slot.container.setScale(PRESS_SCALE);
    this.scene.time.delayedCall(PRESS_FEEDBACK_MS, () => {
      slot.background.setFillStyle(SLOT_FILL, SLOT_ALPHA);
      slot.container.setScale(1);
    });
    this.onPick(slot.wordId);
  }
}
