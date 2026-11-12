import Phaser from 'phaser';
import { attachDisplayZoom, BACKGROUND_COLOR, LOGICAL_HEIGHT, LOGICAL_WIDTH } from './config/display';
import { BattleScene } from './scenes/battle-scene';
import { BootScene } from './scenes/boot-scene';
import { CitadelScene } from './scenes/citadel-scene';
import { UiScene } from './scenes/ui-scene';
import { WorldScene } from './scenes/world-scene';

const GAME_ROOT_ID = 'game-root';

const container = document.getElementById(GAME_ROOT_ID);
if (!container) throw new Error(`Thiếu phần tử #${GAME_ROOT_ID}`);

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: container,
  width: LOGICAL_WIDTH,
  height: LOGICAL_HEIGHT,
  backgroundColor: BACKGROUND_COLOR,
  pixelArt: true,
  roundPixels: true,
  // Zoom do `attachDisplayZoom` tính (ưu tiên số nguyên); căn giữa bằng CSS flex trong index.html.
  scale: { mode: Phaser.Scale.NONE, autoCenter: Phaser.Scale.NO_CENTER },
  physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 } } },
  // Hai ngón cùng lúc: joystick và nút chiêu.
  input: { activePointers: 2 },
  // Thứ tự cũng là thứ tự vẽ: UiScene nằm trên WorldScene, màn trận trên cùng; thành trì là panel DOM phủ trên canvas.
  scene: [BootScene, WorldScene, UiScene, BattleScene, CitadelScene],
});

// Chỉ ở dev: cho script kiểm thử trình duyệt đọc trạng thái game; bị loại khỏi bản build.
if (import.meta.env.DEV) {
  (window as unknown as { __HEROX_GAME__?: Phaser.Game }).__HEROX_GAME__ = game;
}

const detachDisplayZoom = attachDisplayZoom(game, container);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    detachDisplayZoom();
    game.destroy(true);
  });
}
