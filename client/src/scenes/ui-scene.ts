import Phaser from 'phaser';
import { MOVEMENT_SKILLS, type MovementSkillId } from '@herox/shared';
import { isTouchPrimaryDevice } from '../input/input-controller';
import { ZERO_VECTOR, type MovementVector } from '../input/movement-vector';
import { UI_DEPTH, VirtualJoystick } from '../input/virtual-joystick';
import { SCENE_KEYS } from './scene-keys';

/** Nút kỹ năng ở góc phải dưới, đường kính 52 px logic (≥ 44pt khi màn nằm ngang). */
const SKILL_BUTTON_RADIUS = 26;
const SKILL_BUTTON_POSITIONS: Readonly<Record<MovementSkillId, { readonly x: number; readonly y: number }>> = {
  dash: { x: 598, y: 300 },
  blink: { x: 534, y: 322 },
};
const SKILL_BUTTON_COLOR = 0xe8d9a8;
const SKILL_BUTTON_ALPHA = 0.55;
const SKILL_BUTTON_COOLDOWN_ALPHA = 0.2;
const SKILL_LABEL_PADDING = 6;
// Tên chiêu hai chữ xuống dòng để nằm gọn trong nút tròn.
const SKILL_LABEL_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'sans-serif',
  fontSize: '11px',
  color: '#0b0b12',
  align: 'center',
  wordWrap: { width: SKILL_BUTTON_RADIUS * 2 - SKILL_LABEL_PADDING },
};

interface SkillButton {
  readonly circle: Phaser.GameObjects.Arc;
  coolingDown: boolean;
}

/**
 * Lớp điều khiển chạy song song, nằm trên WorldScene và không restart khi đổi level:
 * ngón tay đang giữ joystick lúc qua cổng vẫn điều khiển tiếp được. Trên cảm ứng có thêm nút kỹ năng di chuyển.
 */
export class UiScene extends Phaser.Scene {
  private joystick: VirtualJoystick | null = null;
  private readonly skillButtons = new Map<MovementSkillId, SkillButton>();
  private skillRequest: MovementSkillId | null = null;

  constructor() {
    super(SCENE_KEYS.ui);
  }

  create(): void {
    this.joystick = isTouchPrimaryDevice() ? new VirtualJoystick(this) : null;
    this.skillButtons.clear();
    this.skillRequest = null;
    this.events.on(Phaser.Scenes.Events.WAKE, this.handleWake);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.events.off(Phaser.Scenes.Events.WAKE, this.handleWake));
  }

  /** Về từ màn trận: bỏ thao tác dở trước khi ngủ để hero không tự chạy hay tự tung chiêu. */
  private readonly handleWake = (): void => {
    this.joystick?.release();
    this.skillRequest = null;
  };

  get movement(): MovementVector {
    return this.joystick?.movement ?? ZERO_VECTOR;
  }

  /** WorldScene báo kỹ năng nào đã mở; chỉ máy cảm ứng mới hiện nút (bàn phím dùng phím tắt). */
  showSkillButtons(unlocked: ReadonlySet<MovementSkillId>): void {
    if (this.joystick === null) return;
    for (const id of unlocked) {
      if (this.skillButtons.has(id)) continue;
      this.skillButtons.set(id, this.createSkillButton(id));
    }
  }

  /** Lấy yêu cầu dùng kỹ năng từ nút chạm (mỗi lần chạm dùng một lần). */
  consumeSkillRequest(): MovementSkillId | null {
    const request = this.skillRequest;
    this.skillRequest = null;
    return request;
  }

  setSkillCoolingDown(id: MovementSkillId, coolingDown: boolean): void {
    const button = this.skillButtons.get(id);
    if (button === undefined || button.coolingDown === coolingDown) return;
    button.coolingDown = coolingDown;
    button.circle.setAlpha(coolingDown ? SKILL_BUTTON_COOLDOWN_ALPHA : SKILL_BUTTON_ALPHA);
  }

  private createSkillButton(id: MovementSkillId): SkillButton {
    const position = SKILL_BUTTON_POSITIONS[id];
    const circle = this.add
      .circle(position.x, position.y, SKILL_BUTTON_RADIUS, SKILL_BUTTON_COLOR, SKILL_BUTTON_ALPHA)
      .setDepth(UI_DEPTH)
      .setInteractive();
    circle.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
      this.skillRequest = id;
    });
    this.add.text(position.x, position.y, MOVEMENT_SKILLS[id].name, SKILL_LABEL_STYLE).setOrigin(0.5).setDepth(UI_DEPTH);
    return { circle, coolingDown: false };
  }
}
