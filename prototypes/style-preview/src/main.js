import Phaser from 'phaser';
import { loadManifest, preloadAll, createAnimations } from './asset-catalog.js';
import { renderDesignBoard } from './design-board.js';
import { ExploreScene } from './explore-scene.js';
import { BattleScene } from './battle-scene.js';

const VIEW_WIDTH = 640;
const VIEW_HEIGHT = 360;
const SCENE_BY_TAB = { explore: 'explore', battle: 'battle' };

const tabs = [...document.querySelectorAll('[data-tab]')];
const designSection = document.getElementById('tab-design');
const playSection = document.getElementById('tab-play');
const stage = document.getElementById('stage');
const viewport = document.getElementById('viewport');

let manifest;
let game;

class PreloadScene extends Phaser.Scene {
  constructor() {
    super('preload');
  }

  preload() {
    preloadAll(this, manifest);
  }

  create() {
    createAnimations(this, manifest);
    this.game.registry.set('manifest', manifest);
    this.scene.start(this.game.registry.get('pendingScene') ?? 'explore');
  }
}

/** Phóng khung 640x360 vừa màn hình; canvas và overlay DOM phóng cùng nhau nên toạ độ HUD giữ nguyên. */
function fitViewport() {
  const scale = Math.min(stage.clientWidth / VIEW_WIDTH, stage.clientHeight / VIEW_HEIGHT);
  const left = (stage.clientWidth - VIEW_WIDTH * scale) / 2;
  const top = (stage.clientHeight - VIEW_HEIGHT * scale) / 2;
  viewport.style.transform = `translate(${left}px, ${top}px) scale(${scale})`;
  game?.scale.refresh();
}

function createGame(firstScene) {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game-root',
    width: VIEW_WIDTH,
    height: VIEW_HEIGHT,
    pixelArt: true,
    backgroundColor: '#050407',
    scale: { mode: Phaser.Scale.NONE },
    callbacks: { preBoot: (bootingGame) => bootingGame.registry.set('pendingScene', firstScene) },
    scene: [PreloadScene, ExploreScene, BattleScene],
  });
}

function stopRunningScenes() {
  for (const key of Object.values(SCENE_BY_TAB)) {
    if (game.scene.isActive(key) || game.scene.isPaused(key)) game.scene.stop(key);
  }
}

/** Đổi tab; game chỉ khởi tạo khi lần đầu mở màn chơi và ngủ khi xem bảng thiết kế để tiết kiệm pin iPhone. */
export function showTab(tab) {
  for (const button of tabs) button.setAttribute('aria-selected', String(button.dataset.tab === tab));
  const isPlay = tab in SCENE_BY_TAB;
  designSection.hidden = isPlay;
  playSection.hidden = !isPlay;
  if (!isPlay) {
    game?.loop.sleep();
    return;
  }
  fitViewport();
  if (!game) {
    game = createGame(SCENE_BY_TAB[tab]);
    return;
  }
  game.loop.wake();
  if (!game.registry.get('manifest')) {
    game.registry.set('pendingScene', SCENE_BY_TAB[tab]);
    return;
  }
  stopRunningScenes();
  game.scene.start(SCENE_BY_TAB[tab]);
}

async function start() {
  manifest = await loadManifest();
  renderDesignBoard(designSection, manifest, showTab);
  for (const button of tabs) button.addEventListener('click', () => showTab(button.dataset.tab));
  window.addEventListener('resize', fitViewport);
  window.addEventListener('herox:navigate', (event) => showTab(event.detail));
  showTab(new URLSearchParams(location.search).get('tab') ?? 'design');
}

start().catch((error) => {
  designSection.textContent = `Không tải được bản xem: ${error.message}`;
});
