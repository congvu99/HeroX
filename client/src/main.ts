import Phaser from 'phaser';
import { attachDisplayZoom, BACKGROUND_COLOR, LOGICAL_HEIGHT, LOGICAL_WIDTH } from './config/display';
import { attachIosViewport } from './platform/ios-viewport';
import { QualityController, REDUCED_MOTION_QUERY, watchReducedMotion } from './platform/quality-settings';
import { BattleScene } from './scenes/battle-scene';
import { BootScene } from './scenes/boot-scene';
import { CitadelScene } from './scenes/citadel-scene';
import { REGISTRY_KEYS } from './scenes/scene-keys';
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
const detachIosViewport = attachIosViewport(container);

// Tạo trước khi scene đầu tiên chạy (scene khởi động ở frame sau) để world, trận đọc được ngay từ registry.
const quality = new QualityController(window.matchMedia(REDUCED_MOTION_QUERY).matches);
game.registry.set(REGISTRY_KEYS.quality, quality);
const detachReducedMotion = watchReducedMotion(window.matchMedia.bind(window), (reduced) => quality.setPrefersReducedMotion(reduced));
const sampleFrameRate = (time: number): void => quality.observeFrameRate(game.loop.actualFps, time);
game.events.on(Phaser.Core.Events.POST_STEP, sampleFrameRate);

// Chỉ bản build: SW ở dev sẽ cache mã Vite đang sửa. Scope /herox/ để không đụng SW của LingoBrain cùng origin.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  const baseUrl = import.meta.env.BASE_URL;
  window.addEventListener('load', () => {
    // Không cài được SW (trình duyệt chặn, riêng tư) thì game vẫn chạy online bình thường.
    navigator.serviceWorker.register(`${baseUrl}sw.js`, { scope: baseUrl }).catch(() => undefined);
  });
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    game.events.off(Phaser.Core.Events.POST_STEP, sampleFrameRate);
    detachReducedMotion();
    detachIosViewport();
    detachDisplayZoom();
    game.destroy(true);
  });
}
