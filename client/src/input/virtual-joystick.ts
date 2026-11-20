import Phaser from 'phaser';
import { joystickVector, ZERO_VECTOR, type MovementVector } from './movement-vector';

/** Bán kính vòng ngoài, tính theo pixel logic (640×360). */
const BASE_RADIUS = 34;
const THUMB_RADIUS = 14;
const DEAD_ZONE_RATIO = 0.18;
/** Chỉ nửa trái màn hình mở joystick; nửa phải để dành nút chiêu, vòng từ. */
const ACTIVATION_AREA_RATIO = 0.5;
const BASE_ALPHA = 0.35;
const THUMB_ALPHA = 0.6;
const JOYSTICK_COLOR = 0xe8d9a8;
/** Trên cùng mọi lớp game và lớp ánh sáng. */
export const UI_DEPTH = 10_000;

/** Joystick động: xuất hiện ở chỗ ngón tay chạm trong nửa trái màn hình, ẩn khi nhấc tay. */
export class VirtualJoystick {
  private readonly base: Phaser.GameObjects.Arc;
  private readonly thumb: Phaser.GameObjects.Arc;
  private pointerId: number | null = null;
  private vector: MovementVector = ZERO_VECTOR;

  constructor(private readonly scene: Phaser.Scene) {
    this.base = scene.add.circle(0, 0, BASE_RADIUS, JOYSTICK_COLOR, BASE_ALPHA);
    this.thumb = scene.add.circle(0, 0, THUMB_RADIUS, JOYSTICK_COLOR, THUMB_ALPHA);
    for (const part of [this.base, this.thumb]) {
      part.setScrollFactor(0).setDepth(UI_DEPTH).setVisible(false);
    }
    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.handleDown);
    scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.handleMove);
    scene.input.on(Phaser.Input.Events.POINTER_UP, this.handleUp);
    scene.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.handleUp);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy);
  }

  get movement(): MovementVector {
    return this.vector;
  }

  private readonly handleDown = (pointer: Phaser.Input.Pointer): void => {
    if (this.pointerId !== null || pointer.x > this.scene.scale.gameSize.width * ACTIVATION_AREA_RATIO) return;
    this.pointerId = pointer.id;
    this.base.setPosition(pointer.x, pointer.y).setVisible(true);
    this.thumb.setPosition(pointer.x, pointer.y).setVisible(true);
  };

  private readonly handleMove = (pointer: Phaser.Input.Pointer): void => {
    if (pointer.id !== this.pointerId) return;
    const offsetX = pointer.x - this.base.x;
    const offsetY = pointer.y - this.base.y;
    this.vector = joystickVector(offsetX, offsetY, BASE_RADIUS, DEAD_ZONE_RATIO);
    const distance = Math.hypot(offsetX, offsetY);
    const thumbScale = distance > BASE_RADIUS ? BASE_RADIUS / distance : 1;
    this.thumb.setPosition(this.base.x + offsetX * thumbScale, this.base.y + offsetY * thumbScale);
  };

  private readonly handleUp = (pointer: Phaser.Input.Pointer): void => {
    if (pointer.id === this.pointerId) this.release();
  };

  /** Thả joystick; gọi khi scene thức dậy vì lúc ngủ scene không nhận được sự kiện nhấc ngón tay. */
  release(): void {
    this.pointerId = null;
    this.vector = ZERO_VECTOR;
    this.base.setVisible(false);
    this.thumb.setVisible(false);
  }

  private readonly destroy = (): void => {
    this.scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.handleDown);
    this.scene.input.off(Phaser.Input.Events.POINTER_MOVE, this.handleMove);
    this.scene.input.off(Phaser.Input.Events.POINTER_UP, this.handleUp);
    this.scene.input.off(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.handleUp);
  };
}
