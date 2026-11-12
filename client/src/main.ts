import Phaser from 'phaser';
import { BootScene } from './scenes/boot-scene';

/** Độ phân giải logic đã chốt: lưới 32px, top-down 3/4; Phaser tự co giãn theo màn hình. */
const LOGICAL_WIDTH = 640;
const LOGICAL_HEIGHT = 360;
const BACKGROUND_COLOR = '#0b0b12';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game-root',
  width: LOGICAL_WIDTH,
  height: LOGICAL_HEIGHT,
  backgroundColor: BACKGROUND_COLOR,
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene],
});

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    game.destroy(true);
  });
}
