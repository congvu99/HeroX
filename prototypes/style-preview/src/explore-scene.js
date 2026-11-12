import Phaser from 'phaser';
import { playFx, ASSET_BASE } from './asset-catalog.js';
import { DarknessLayer, ensurePixelTexture } from './lighting.js';
import { clearOverlay, el, showBanner, isTouchDevice } from './overlay-dom.js';
import { SAMPLE_HERO } from './sample-words.js';
import { TILE, paintTiles, gradeTiles, createHero, addShadow } from './world-kit.js';

const MAP_COLS = 40;
const MAP_ROWS = 24;
const WALK_SPEED = 90;
const BLINK_DISTANCE = 72;
const BLINK_COOLDOWN_MS = 900;
const TALK_RANGE = 40;
const ENCOUNTER_RANGE = 22;
const SOLID_TILES = new Set(['wall_dark', 'wall_dark2', 'wall_brown', 'lava', 'lava2', 'column', 'statue', 'altar', 'fountain_blood']);

const MONK_LINES = [
  'Hiệp sĩ! Làng Sương Sớm đã rơi vào tay quỷ từ <em>Vực Câm Lặng</em>.',
  'Lũ quỷ sợ <em>lời nói</em>. Mỗi từ ngươi đã học là một nhát kiếm thánh.',
  'Gọi đúng tên từ, quỷ tan thành tro. Gọi sai, chúng sẽ cắn trả.',
  'Diệt lũ quỷ quanh khe nứt dung nham, rồi trở về tiền đồn <em>Lexhold</em>.',
];

/** Dựng bản đồ Màn 1 bằng code (bản thật sẽ đọc từ LDtk). Trả về lưới tên tile. */
function buildVillageGrid() {
  const random = new Phaser.Math.RandomDataGenerator(['herox-village']);
  const grid = Array.from({ length: MAP_ROWS }, () =>
    Array.from({ length: MAP_COLS }, () => (random.frac() < 0.3 ? 'floor_dirt2' : 'floor_dirt')));
  const set = (col, row, key) => { if (grid[row]?.[col] !== undefined) grid[row][col] = key; };
  const rect = (c0, r0, c1, r1, key) => { for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) set(c, r, key); };
  const cobble = () => (random.frac() < 0.5 ? 'floor_cobble' : 'floor_cobble2');

  // Đường lát đá chữ thập dẫn từ cổng Lexhold (phía nam) lên nhà nguyện.
  for (let c = 1; c < MAP_COLS - 1; c++) { set(c, 11, cobble()); set(c, 12, cobble()); }
  for (let r = 3; r < MAP_ROWS - 1; r++) { set(19, r, cobble()); set(20, r, cobble()); }

  // Nhà nguyện: tường gạch nâu, nền đá, bàn thờ giữa hai tượng.
  rect(4, 2, 14, 9, 'wall_brown');
  for (let r = 3; r <= 8; r++) for (let c = 5; c <= 13; c++) set(c, r, cobble());
  set(9, 9, 'floor_cobble');
  set(9, 3, 'altar'); set(6, 3, 'statue'); set(12, 3, 'statue');
  set(6, 6, 'column'); set(12, 6, 'column');
  set(16, 7, 'fountain_blood');

  // Nhà đổ nát: tường đen có lỗ hổng.
  for (const [c0, r0, c1, r1] of [[26, 3, 33, 8], [4, 15, 10, 20]]) {
    for (let c = c0; c <= c1; c++) for (const r of [r0, r1]) if (random.frac() < 0.7) set(c, r, random.frac() < 0.5 ? 'wall_dark' : 'wall_dark2');
    for (let r = r0; r <= r1; r++) for (const c of [c0, c1]) if (random.frac() < 0.7) set(c, r, 'wall_dark');
  }

  // Khe nứt dung nham chéo về phía đông nam, viền đất địa ngục.
  for (let i = 0; i < 12; i++) {
    const c = 25 + i;
    const r = 14 + Math.floor(i * 0.6);
    rect(c - 1, r - 1, c + 1, r + 2, random.frac() < 0.5 ? 'floor_hell' : 'floor_hell2');
  }
  for (let i = 0; i < 12; i++) {
    const c = 25 + i;
    const r = 14 + Math.floor(i * 0.6);
    set(c, r, 'lava'); set(c, r + 1, 'lava2');
  }

  // Tường bao.
  rect(0, 0, MAP_COLS - 1, 0, 'wall_dark'); rect(0, MAP_ROWS - 1, MAP_COLS - 1, MAP_ROWS - 1, 'wall_dark');
  rect(0, 0, 0, MAP_ROWS - 1, 'wall_dark'); rect(MAP_COLS - 1, 0, MAP_COLS - 1, MAP_ROWS - 1, 'wall_dark');
  set(19, MAP_ROWS - 1, 'door'); set(20, MAP_ROWS - 1, 'door');
  return grid;
}

export class ExploreScene extends Phaser.Scene {
  constructor() {
    super('explore');
  }

  create() {
    this.manifest = this.registry.get('manifest');
    this.grid = buildVillageGrid();
    const worldWidth = MAP_COLS * TILE;
    const worldHeight = MAP_ROWS * TILE;
    paintTiles(this, 'village_floor', this.grid);
    gradeTiles(this, worldWidth, worldHeight, 0x1a2540, 0.2); // ánh trăng lạnh

    this.hero = createHero(this, 19.5 * TILE, 21 * TILE);
    addShadow(this, this.hero);
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight).startFollow(this.hero, true, 0.12, 0.12).setRoundPixels(true);

    this.darkness = new DarknessLayer(this, { darkness: 0.66 });
    this.darkness.addLight({ follow: this.hero, radius: 95, flicker: 0.02 });
    this.spawnFireSources();
    this.spawnNpcs();
    this.spawnDemons();
    this.spawnWeather();
    this.setupInput();
    this.buildHud();
    this.lastBlinkAt = -BLINK_COOLDOWN_MS;
    this.dialogIndex = -1;
    this.encounterStarted = false;
    this.events.once('shutdown', () => clearOverlay());
    showBanner('Làng Sương Sớm', 'Chương 1 · bị quỷ chiếm đóng');
  }

  spawnFireSources() {
    const at = (col, row) => [col * TILE + TILE / 2, row * TILE + TILE / 2];
    for (const [col, row] of [[7, 9], [11, 9], [26, 3], [33, 8]]) {
      const [x, y] = at(col, row);
      playFx(this, this.manifest, 'torch', x, y - 4, { depth: y + 2 });
      this.darkness.addLight({ x, y: y - 10, radius: 70, flicker: 0.08, glow: { color: 0xff8a3a, alpha: 0.35 } });
    }
    for (const [col, row] of [[18, 9], [21, 9], [24, 12]]) {
      const [x, y] = at(col, row);
      playFx(this, this.manifest, 'brazier', x, y + 8, { depth: y + 8 });
      this.markSolid(col, row);
      this.darkness.addLight({ x, y, radius: 90, flicker: 0.06, glow: { color: 0xff6a20, alpha: 0.45 } });
    }
    // Dung nham tự phát sáng đỏ.
    for (let i = 0; i < 12; i += 3) {
      const [x, y] = at(25 + i, 14 + Math.floor(i * 0.6));
      this.darkness.addLight({ x, y, radius: 60, flicker: 0.1, glow: { color: 0xff3010, alpha: 0.4 } });
    }
    const [altarX, altarY] = at(9, 3);
    playFx(this, this.manifest, 'blessing', altarX, altarY + 6, { depth: altarY + 20 }).setAlpha(0.8);
    this.darkness.addLight({ x: altarX, y: altarY, radius: 80, flicker: 0.03, glow: { color: 0xfff1c2, alpha: 0.3 } });
  }

  spawnNpcs() {
    this.monk = this.add.image(9.5 * TILE, 10.6 * TILE, 'monk').setOrigin(0.5, 1);
    this.monk.setDepth(this.monk.y);
    addShadow(this, this.monk, 18);
    this.talkMarker = this.add.text(this.monk.x, this.monk.y - 40, '!', {
      fontFamily: 'Times New Roman', fontSize: '16px', color: '#e8c66a', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(5000);
    this.tweens.add({ targets: this.talkMarker, y: this.talkMarker.y - 4, yoyo: true, repeat: -1, duration: 600 });

    const cherub = this.add.image(9.5 * TILE, 4.6 * TILE, 'cherub').setOrigin(0.5, 1).setDepth(4.6 * TILE);
    this.tweens.add({ targets: cherub, y: cherub.y - 5, yoyo: true, repeat: -1, duration: 1400, ease: 'Sine.inOut' });
  }

  spawnDemons() {
    this.demons = [];
    const wander = (key, col, row, range) => {
      const demon = this.add.image(col * TILE, row * TILE, key).setOrigin(0.5, 1);
      addShadow(this, demon, 18);
      this.tweens.add({
        targets: demon, x: demon.x + range, duration: 2200 + Math.random() * 800, yoyo: true, repeat: -1, ease: 'Sine.inOut',
        onYoyo: () => demon.setFlipX(true), onRepeat: () => demon.setFlipX(false),
      });
      this.demons.push(demon);
    };
    wander('imp', 29, 11, 70);
    wander('shadow_imp', 7, 18, 50);
    wander('red_devil', 31, 20, 40);

    const skeleton = this.add.sprite(24 * TILE, 12.6 * TILE, 'skeleton_walk').setOrigin(0.5, 126 / 192);
    addShadow(this, skeleton, 18);
    skeleton.play('skeleton_walk_right');
    this.tweens.add({
      targets: skeleton, x: 35 * TILE, duration: 5200, yoyo: true, repeat: -1,
      onYoyo: () => skeleton.play('skeleton_walk_left'), onRepeat: () => skeleton.play('skeleton_walk_right'),
    });
    this.demons.push(skeleton);
  }

  spawnWeather() {
    ensurePixelTexture(this, 'rain', 0x9ab0d8, 1, 6);
    ensurePixelTexture(this, 'ember', 0xffa040, 2, 2);
    this.add.particles(0, 0, 'rain', {
      x: { min: -40, max: 680 }, y: -10, lifespan: 700, speedY: { min: 420, max: 520 }, speedX: -80,
      rotate: 10, alpha: { start: 0.45, end: 0.1 }, frequency: 12, quantity: 2,
    }).setScrollFactor(0).setDepth(9500);
    this.add.particles(0, 0, 'ember', {
      emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(25 * TILE, 14 * TILE, 12 * TILE, 8 * TILE) },
      lifespan: 1800, speedY: { min: -40, max: -15 }, speedX: { min: -10, max: 10 },
      alpha: { start: 1, end: 0 }, scale: { start: 1, end: 0.3 }, frequency: 90, blendMode: 'ADD',
    }).setDepth(8000);
  }

  markSolid(col, row) {
    this.grid[row][col] = 'column';
  }

  isSolidAt(x, y) {
    const key = this.grid[Math.floor(y / TILE)]?.[Math.floor(x / TILE)];
    return key === undefined || SOLID_TILES.has(key);
  }

  /** Va chạm theo ô với hộp chân 12x6 của hero. */
  canStand(x, y) {
    return ![[-6, -6], [6, -6], [-6, 0], [6, 0]].some(([dx, dy]) => this.isSolidAt(x + dx, y + dy));
  }

  setupInput() {
    this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,E', false);
    this.keys.SPACE.on('down', () => this.blink());
    this.keys.E.on('down', () => this.talkOrAdvance());
    this.touchVector = new Phaser.Math.Vector2();
  }

  buildHud() {
    clearOverlay();
    const card = el('div', 'hud-card', `
      <div class="name">${SAMPLE_HERO.name}</div>
      Cấp ${SAMPLE_HERO.level} · Đã học ${SAMPLE_HERO.learned} từ · Đã thuộc ${SAMPLE_HERO.mastered}
      <div class="bar"><i style="width:86%"></i></div><div class="bar mana"><i style="width:60%"></i></div>
      <div class="sample">dữ liệu mẫu, bản thật đọc từ LingoBrain</div>`);
    Object.assign(card.style, { left: '8px', top: '8px', width: '170px' });
    const quest = el('div', 'hud-card', `
      <div class="name">✠ Thanh tẩy Làng Sương Sớm</div>
      · Nói chuyện với Tu sĩ Giữ Thư<br>· Chạm vào quỷ để vào trận`);
    Object.assign(quest.style, { right: '8px', top: '8px', width: '150px' });
    const touch = isTouchDevice();
    el('div', 'hint').textContent = touch
      ? 'Cần điều khiển: đi · Lướt: dịch chuyển · Nói: hội thoại'
      : 'WASD / mũi tên: đi · Space: Lướt Ảnh · E: nói chuyện';
    if (touch) this.buildTouchControls();
  }

  buildTouchControls() {
    const pad = el('div', 'joystick hit', '<i></i>');
    const knob = pad.querySelector('i');
    const move = (event) => {
      const box = pad.getBoundingClientRect();
      const dx = event.clientX - (box.left + box.width / 2);
      const dy = event.clientY - (box.top + box.height / 2);
      this.touchVector.set(dx, dy).limit(box.width / 2);
      knob.style.transform = `translate(${(this.touchVector.x / box.width) * 70}px, ${(this.touchVector.y / box.height) * 70}px)`;
      this.touchVector.scale(2 / box.width);
    };
    const release = () => { this.touchVector.reset(); knob.style.transform = ''; };
    pad.addEventListener('pointerdown', (event) => { pad.setPointerCapture(event.pointerId); move(event); });
    pad.addEventListener('pointermove', (event) => { if (pad.hasPointerCapture(event.pointerId)) move(event); });
    pad.addEventListener('pointerup', release);
    pad.addEventListener('pointercancel', release);
    const button = (label, right, bottom, action) => {
      const node = el('button', 'touch-btn hit', label);
      Object.assign(node.style, { right: `${right}px`, bottom: `${bottom}px` });
      node.addEventListener('pointerdown', action);
    };
    button('Lướt', 20, 24, () => this.blink());
    button('Nói', 70, 52, () => this.talkOrAdvance());
  }

  readDirection() {
    const k = this.keys;
    const x = (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.A.isDown || k.LEFT.isDown ? 1 : 0) + this.touchVector.x;
    const y = (k.S.isDown || k.DOWN.isDown ? 1 : 0) - (k.W.isDown || k.UP.isDown ? 1 : 0) + this.touchVector.y;
    return new Phaser.Math.Vector2(x, y).limit(1);
  }

  blink() {
    if (this.dialogOpen || this.time.now - this.lastBlinkAt < BLINK_COOLDOWN_MS) return;
    const offsets = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[this.hero.facing];
    let distance = BLINK_DISTANCE;
    while (distance > 0 && !this.canStand(this.hero.x + offsets[0] * distance, this.hero.y + offsets[1] * distance)) distance -= 8;
    if (distance <= 0) return;
    this.lastBlinkAt = this.time.now;
    playFx(this, this.manifest, 'blink_out', this.hero.x, this.hero.y - 20);
    this.hero.x += offsets[0] * distance;
    this.hero.y += offsets[1] * distance;
    playFx(this, this.manifest, 'blink_in', this.hero.x, this.hero.y - 20);
  }

  talkOrAdvance() {
    if (!this.dialogOpen && Phaser.Math.Distance.Between(this.hero.x, this.hero.y, this.monk.x, this.monk.y) > TALK_RANGE) return;
    this.dialogIndex += 1;
    this.dialogNode?.remove();
    if (this.dialogIndex >= MONK_LINES.length) {
      this.dialogOpen = false;
      this.dialogIndex = -1;
      this.talkMarker.setVisible(false);
      return;
    }
    this.dialogOpen = true;
    this.hero.standStill();
    this.dialogNode = el('div', 'dialog hit', `
      <img src="${ASSET_BASE}monsters/monk.png" alt="">
      <div class="speaker">Tu sĩ Giữ Thư</div>${MONK_LINES[this.dialogIndex]}
      <div class="more">${this.dialogIndex + 1}/${MONK_LINES.length} · E / chạm để tiếp</div>`);
    this.dialogNode.addEventListener('pointerdown', () => this.talkOrAdvance());
  }

  update(time, delta) {
    this.darkness.update(time);
    if (this.encounterStarted || this.dialogOpen) return;
    this.moveHero(delta);
    this.hero.setDepth(this.hero.y);
    for (const demon of this.demons) {
      demon.setDepth(demon.y);
      if (Phaser.Math.Distance.Between(this.hero.x, this.hero.y, demon.x, demon.y) < ENCOUNTER_RANGE) this.startEncounter(demon);
    }
  }

  moveHero(delta) {
    const direction = this.readDirection();
    if (direction.lengthSq() < 0.04) {
      if (this.hero.anims.isPlaying) this.hero.standStill();
      return;
    }
    const step = (WALK_SPEED * delta) / 1000;
    const nextX = this.hero.x + direction.x * step;
    const nextY = this.hero.y + direction.y * step;
    if (this.canStand(nextX, this.hero.y)) this.hero.x = nextX;
    if (this.canStand(this.hero.x, nextY)) this.hero.y = nextY;
    const facing = Math.abs(direction.x) > Math.abs(direction.y)
      ? (direction.x > 0 ? 'right' : 'left')
      : (direction.y > 0 ? 'down' : 'up');
    this.hero.facing = facing;
    this.hero.play(`hero_walk_${facing}`, true);
  }

  startEncounter(demon) {
    this.encounterStarted = true;
    this.hero.standStill();
    this.tweens.killTweensOf(demon);
    this.cameras.main.shake(250, 0.006);
    showBanner('Chạm trán!', 'Gọi đúng tên từ để tung chiêu');
    this.time.delayedCall(1000, () => window.dispatchEvent(new CustomEvent('herox:navigate', { detail: 'battle' })));
  }
}
