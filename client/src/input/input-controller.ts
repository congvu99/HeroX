import Phaser from 'phaser';
import { combineMovement, keyboardVector, ZERO_VECTOR, type MovementVector } from './movement-vector';

const COARSE_POINTER_QUERY = '(pointer: coarse)';

/** Máy có ngón tay là con trỏ chính (iPhone, iPad, tablet). */
export function isTouchPrimaryDevice(): boolean {
  return window.matchMedia(COARSE_POINTER_QUERY).matches;
}

type DirectionKeySet = Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;

const { KeyCodes } = Phaser.Input.Keyboard;

/** Nguồn vector cảm ứng (joystick ảo ở UiScene); trả vector 0 khi không chạm. */
export type TouchMovementSource = () => MovementVector;

/** Gộp bàn phím (WASD, mũi tên) và joystick ảo thành một vector di chuyển 0..1. */
export class InputController {
  private readonly keySets: readonly DirectionKeySet[];

  constructor(
    scene: Phaser.Scene,
    private readonly touchMovement: TouchMovementSource,
  ) {
    const keyboard = scene.input.keyboard;
    // Không chặn phím ở mức trang (enableCapture = false) để ô nhập DOM (tạo nhân vật, gõ từ) vẫn gõ được.
    const addKey = (code: number): Phaser.Input.Keyboard.Key | undefined => keyboard?.addKey(code, false);
    const sets = [
      { up: addKey(KeyCodes.UP), down: addKey(KeyCodes.DOWN), left: addKey(KeyCodes.LEFT), right: addKey(KeyCodes.RIGHT) },
      { up: addKey(KeyCodes.W), down: addKey(KeyCodes.S), left: addKey(KeyCodes.A), right: addKey(KeyCodes.D) },
    ];
    this.keySets = sets.filter((set): set is DirectionKeySet => Object.values(set).every((key) => key !== undefined));
  }

  readMovement(): MovementVector {
    const isDown = (direction: keyof DirectionKeySet): boolean => this.keySets.some((set) => set[direction].isDown);
    const keys = this.keySets.length > 0
      ? keyboardVector({ left: isDown('left'), right: isDown('right'), up: isDown('up'), down: isDown('down') })
      : ZERO_VECTOR;
    return combineMovement(keys, this.touchMovement());
  }
}
