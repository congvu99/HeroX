import Phaser from 'phaser';

export const BOOT_SCENE_KEY = 'boot';

/** Scene khởi động tạm thời: chỉ xác nhận canvas Phaser chạy được. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(BOOT_SCENE_KEY);
  }

  create(): void {
    const { width, height } = this.scale;
    this.add
      .text(width / 2, height / 2, 'HeroX', {
        fontFamily: 'serif',
        fontSize: '48px',
        color: '#e8d9a8',
      })
      .setOrigin(0.5);
  }
}
