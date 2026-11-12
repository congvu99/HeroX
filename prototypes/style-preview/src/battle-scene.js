import Phaser from 'phaser';
import { playFx } from './asset-catalog.js';
import { DarknessLayer, ensurePixelTexture } from './lighting.js';
import { clearOverlay, el, floatText, showBanner, isTouchDevice } from './overlay-dom.js';
import { SAMPLE_HERO, SAMPLE_WORDS, POS_SKILLS } from './sample-words.js';
import { TILE, paintTiles, gradeTiles, createHero, addShadow } from './world-kit.js';

const ZOOM = 2;
const ARENA_COLS = 10;
const ARENA_ROWS = 6;
const COMBO_WINDOW_MS = 4000;
const COMBO_FOR_SMITE = 3;
const RING_SIZE = 6;
const HERO_MAX_HP = 100;
const BLESS_MULTIPLIER = 1.5;
// Sát thương theo từ loại: động từ là đòn chính, các loại khác đổi sát thương lấy hiệu ứng phụ.
const DAMAGE_BY_POS = { verb: 40, noun: 20, adj: 20, adv: 35 };
const SMITE_DAMAGE = 50;
const ENEMY_SPECS = [
  { key: 'imp', x: 272, y: 90, hp: 60, scale: 1.5, threatMs: 9000, hit: 10, gold: 15 },
  { key: 'red_devil', x: 188, y: 126, hp: 140, scale: 2, threatMs: 7000, hit: 18, gold: 40, elite: true },
  { key: 'shadow_imp', x: 258, y: 142, hp: 60, scale: 1.5, threatMs: 10000, hit: 10, gold: 15 },
];

function buildArenaGrid() {
  const random = new Phaser.Math.RandomDataGenerator(['herox-arena']);
  return Array.from({ length: ARENA_ROWS }, (_, row) => Array.from({ length: ARENA_COLS }, (_, col) => {
    if (row === 0) return col % 3 === 1 ? 'wall_dark2' : 'wall_dark';
    if (row === ARENA_ROWS - 1 && col > 6) return random.frac() < 0.5 ? 'lava' : 'lava2';
    if (col < 3) return random.frac() < 0.5 ? 'floor_cobble' : 'floor_cobble2';
    return random.frac() < 0.5 ? 'floor_hell' : 'floor_hell2';
  }));
}

const normalize = (text) => text.trim().toLowerCase();

export class BattleScene extends Phaser.Scene {
  constructor() {
    super('battle');
  }

  create() {
    this.manifest = this.registry.get('manifest');
    this.buildArena();
    this.hero = createHero(this, 80, 116);
    this.hero.facing = 'right';
    this.hero.standStill();
    this.hero.setDepth(this.hero.y);
    addShadow(this, this.hero);
    this.heroHp = HERO_MAX_HP;
    this.blessed = false;
    this.shieldFx = null;
    this.combo = 0;
    this.lastCorrectAt = -COMBO_WINDOW_MS;
    this.missedWords = new Set();
    this.busy = false;
    this.finished = false;
    this.mode = isTouchDevice() ? 'ring' : 'type';
    clearOverlay();
    this.enemies = [];
    for (const spec of ENEMY_SPECS) this.enemies.push(this.spawnEnemy(spec));
    this.buildHud();
    this.refreshInputPanel();
    this.events.once('shutdown', () => clearOverlay());
    showBanner('Khe Nứt Dung Nham', 'Gọi đúng tên từ tiếng Anh để tung chiêu');
  }

  buildArena() {
    const width = ARENA_COLS * TILE;
    const height = ARENA_ROWS * TILE;
    paintTiles(this, 'arena_floor', buildArenaGrid());
    gradeTiles(this, width, height, 0x3a0a10, 0.18);
    for (const x of [48, 144, 240]) this.add.image(x, 40, 'column').setOrigin(0.5, 1).setDepth(40);
    this.cameras.main.setZoom(ZOOM).centerOn(width / 2, 90).setRoundPixels(true);
    this.darkness = new DarknessLayer(this, { darkness: 0.6, tint: '10,2,6' });
    for (const x of [96, 192, 288]) {
      playFx(this, this.manifest, 'torch', x, 26, { depth: 30 });
      this.darkness.addLight({ x, y: 20, radius: 60, flicker: 0.08, glow: { color: 0xff8a3a, alpha: 0.3 } });
    }
    this.darkness.addLight({ x: 270, y: 180, radius: 90, flicker: 0.1, glow: { color: 0xff3010, alpha: 0.35 } });
    this.heroLight = this.darkness.addLight({ x: 80, y: 100, radius: 80 });
    ensurePixelTexture(this, 'ember', 0xffa040, 1, 1);
    this.add.particles(0, 0, 'ember', {
      emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(200, 150, 120, 30) },
      lifespan: 1600, speedY: { min: -35, max: -12 }, alpha: { start: 1, end: 0 }, frequency: 70, blendMode: 'ADD',
    }).setDepth(500);
  }

  spawnEnemy(spec) {
    const sprite = this.add.image(spec.x, spec.y, spec.key).setOrigin(0.5, 1).setScale(spec.scale).setFlipX(true).setDepth(spec.y);
    addShadow(this, sprite, 14 * spec.scale);
    this.tweens.add({ targets: sprite, y: spec.y - 2, yoyo: true, repeat: -1, duration: 700 + Math.random() * 400, ease: 'Sine.inOut' });
    const enemy = { ...spec, sprite, maxHp: spec.hp, threat: Math.random() * 0.4, alive: true };
    enemy.tag = el('div', `enemy-tag hit${spec.elite ? ' elite' : ''}`);
    enemy.tag.addEventListener('pointerdown', () => { this.target = enemy; this.renderTags(); });
    enemy.word = this.pickWord();
    return enemy;
  }

  /** Mỗi quỷ giữ một từ khác nhau, để người chơi chọn mục tiêu bằng chính từ mình gọi. */
  pickWord() {
    const taken = new Set((this.enemies ?? []).filter((enemy) => enemy.alive).map((enemy) => enemy.word?.word));
    const pool = SAMPLE_WORDS.filter((entry) => !taken.has(entry.word));
    return Phaser.Utils.Array.GetRandom(pool);
  }

  aliveEnemies() {
    return this.enemies.filter((enemy) => enemy.alive);
  }

  buildHud() {
    const card = el('div', 'hud-card', `
      <div class="name">${SAMPLE_HERO.name}</div>
      <div class="bar"><i data-hp style="width:100%"></i></div>
      <div class="sample">dữ liệu mẫu</div>`);
    Object.assign(card.style, { left: '8px', top: '8px', width: '130px' });
    this.hpBar = card.querySelector('[data-hp]');
    el('div', 'battle-panel');
    this.comboNode = el('div', 'combo', `<span class="count">0</span> chuỗi<div class="pips">${'<i></i>'.repeat(COMBO_FOR_SMITE)}</div>
      <div>${COMBO_FOR_SMITE} từ đúng liên tiếp trong ${COMBO_WINDOW_MS / 1000}s → Thánh Phạt</div>`);
    const switcher = el('div', 'mode-switch hit', '<button data-mode="type">Gõ từ</button><button data-mode="ring">Vòng từ</button>');
    for (const button of switcher.querySelectorAll('button')) {
      button.addEventListener('click', () => { this.mode = button.dataset.mode; this.refreshInputPanel(); });
    }
    this.switcher = switcher;
  }

  refreshInputPanel() {
    this.inputPanel?.remove();
    for (const button of this.switcher.querySelectorAll('button')) button.classList.toggle('on', button.dataset.mode === this.mode);
    if (this.finished) return;
    if (this.mode === 'type') this.buildTypeBox();
    else this.buildRing();
  }

  buildTypeBox() {
    this.inputPanel = el('div', 'type-box hit', `
      <input type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="gõ từ tiếng Anh…">
      <div class="help">Nhìn nghĩa trên đầu quỷ, gõ từ tiếng Anh. Đúng là tự tung chiêu · Enter để chốt</div>`);
    const input = this.inputPanel.querySelector('input');
    input.addEventListener('input', () => {
      const enemy = this.aliveEnemies().find((candidate) => candidate.word.word === normalize(input.value));
      if (enemy) { input.value = ''; this.castOn(enemy); }
    });
    input.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' || !normalize(input.value)) return;
      this.miss(normalize(input.value));
      input.value = '';
      input.classList.remove('shake');
      void input.offsetWidth; // khởi động lại animation rung
      input.classList.add('shake');
    });
    setTimeout(() => input.focus(), 50);
  }

  buildRing() {
    const answers = this.aliveEnemies().map((enemy) => enemy.word);
    const decoys = Phaser.Utils.Array.Shuffle(SAMPLE_WORDS.filter((entry) => !answers.includes(entry)));
    const choices = Phaser.Utils.Array.Shuffle([...answers, ...decoys.slice(0, RING_SIZE - answers.length)]);
    this.inputPanel = el('div', 'ring hit', '<div class="core">Chọn từ<br>đúng nghĩa</div>');
    choices.forEach((entry, index) => {
      const angle = (index / RING_SIZE) * Math.PI * 2 - Math.PI / 2;
      const button = el('button', '', '', this.inputPanel);
      button.textContent = entry.word;
      Object.assign(button.style, { left: `${75 + Math.cos(angle) * 54}px`, top: `${75 + Math.sin(angle) * 54}px` });
      button.addEventListener('click', () => {
        const enemy = this.aliveEnemies().find((candidate) => candidate.word === entry);
        if (enemy) this.castOn(enemy);
        else this.miss(entry.word);
      });
    });
  }

  castOn(enemy) {
    if (this.busy || this.finished || !enemy.alive) return;
    this.busy = true;
    this.target = enemy;
    const now = this.time.now;
    this.combo = now - this.lastCorrectAt <= COMBO_WINDOW_MS ? this.combo + 1 : 1;
    this.lastCorrectAt = now;
    const { pos } = enemy.word;
    const multiplier = this.blessed && pos !== 'adj' ? BLESS_MULTIPLIER : 1;
    if (multiplier > 1) this.blessed = false;
    const damage = Math.round(DAMAGE_BY_POS[pos] * multiplier);
    this.floatAtWorld(this.hero.x, this.hero.y - 52, POS_SKILLS[pos].skill, 'skill');
    const skills = { verb: this.skillSlash, noun: this.skillShield, adj: this.skillBless, adv: this.skillBlink };
    skills[pos].call(this, enemy, damage, () => this.afterCast());
  }

  afterCast() {
    this.busy = false;
    if (this.combo >= COMBO_FOR_SMITE && this.aliveEnemies().length) {
      this.combo = 0;
      this.holySmite();
    }
    this.checkEnd();
    if (!this.finished) this.refreshInputPanel();
  }

  skillSlash(enemy, damage, done) {
    const homeX = this.hero.x;
    this.tweens.add({
      targets: this.hero, x: enemy.x - 34, duration: 140, ease: 'Quad.out',
      onComplete: () => {
        this.hero.play('hero_slash_right');
        playFx(this, this.manifest, this.combo >= 2 ? 'crit' : 'slash', enemy.x - 4, enemy.y - 18, { depth: 900 });
        this.damage(enemy, damage, this.combo >= 2);
        this.cameras.main.shake(120, 0.004);
        this.time.delayedCall(330, () => {
          this.tweens.add({ targets: this.hero, x: homeX, duration: 200, onComplete: () => { this.hero.standStill(); done(); } });
        });
      },
    });
  }

  skillShield(enemy, damage, done) {
    this.hero.play('hero_spellcast_right');
    this.shieldFx?.destroy();
    this.shieldFx = playFx(this, this.manifest, 'shield', this.hero.x, this.hero.y - 18, { depth: 950 });
    playFx(this, this.manifest, 'spark', enemy.x, enemy.y - 16, { depth: 900 });
    this.damage(enemy, damage);
    this.time.delayedCall(500, () => { this.hero.standStill(); done(); });
  }

  skillBless(enemy, damage, done) {
    this.hero.play('hero_spellcast_right');
    this.blessed = true;
    const glow = playFx(this, this.manifest, 'blessing', this.hero.x, this.hero.y, { depth: 950 });
    this.time.delayedCall(1100, () => glow.destroy());
    playFx(this, this.manifest, 'spark', enemy.x, enemy.y - 16, { depth: 900 });
    this.damage(enemy, damage);
    this.floatAtWorld(this.hero.x, this.hero.y - 64, `Đòn kế ×${BLESS_MULTIPLIER}`, 'skill');
    this.time.delayedCall(500, () => { this.hero.standStill(); done(); });
  }

  skillBlink(enemy, damage, done) {
    const homeX = this.hero.x;
    playFx(this, this.manifest, 'blink_out', this.hero.x, this.hero.y - 20, { depth: 950 });
    this.hero.setVisible(false);
    this.time.delayedCall(180, () => {
      this.hero.setPosition(enemy.x + 30, this.hero.y).setVisible(true);
      playFx(this, this.manifest, 'blink_in', this.hero.x, this.hero.y - 20, { depth: 950 });
      this.hero.play('hero_slash_left');
      playFx(this, this.manifest, 'slash', enemy.x + 4, enemy.y - 18, { depth: 900, flipX: true });
      this.damage(enemy, damage);
      this.time.delayedCall(380, () => {
        playFx(this, this.manifest, 'blink_out', this.hero.x, this.hero.y - 20, { depth: 950 });
        this.hero.setPosition(homeX, this.hero.y);
        this.hero.facing = 'right';
        this.hero.standStill();
        done();
      });
    });
  }

  holySmite() {
    showBanner('Thánh Phạt!', `${COMBO_FOR_SMITE} từ liên hoàn`);
    playFx(this, this.manifest, 'pillar', 230, 140, { depth: 960 });
    this.cameras.main.flash(180, 255, 241, 194);
    for (const enemy of this.aliveEnemies()) {
      playFx(this, this.manifest, 'smite', enemy.x, enemy.y, { depth: 960 });
      this.damage(enemy, SMITE_DAMAGE, true);
    }
  }

  damage(enemy, amount, isCrit = false) {
    enemy.hp = Math.max(0, enemy.hp - amount);
    this.floatAtWorld(enemy.x, enemy.y - enemy.sprite.displayHeight - 6, `-${amount}`, isCrit ? 'crit' : '');
    enemy.sprite.setTintFill(0xffffff);
    this.time.delayedCall(80, () => enemy.sprite.clearTint());
    if (enemy.hp <= 0) this.kill(enemy);
    else enemy.word = this.pickWord();
  }

  kill(enemy) {
    enemy.alive = false;
    enemy.tag.remove();
    this.tweens.killTweensOf(enemy.sprite);
    playFx(this, this.manifest, enemy.elite ? 'dark_explosion' : 'dissolve', enemy.x, enemy.y, { depth: 970 });
    this.tweens.add({ targets: enemy.sprite, alpha: 0, duration: 500, onComplete: () => enemy.sprite.destroy() });
  }

  /** Gọi sai: quỷ đang bị nhắm cắn trả ngay, và hiện đáp án đúng để người chơi học lại. */
  miss(attempt) {
    if (this.busy || this.finished) return;
    const enemy = this.target?.alive ? this.target : this.aliveEnemies()[0];
    if (!enemy) return;
    this.combo = 0;
    this.missedWords.add(enemy.word.word);
    this.floatAtWorld(enemy.x, enemy.y - enemy.sprite.displayHeight - 18, `"${attempt}" ✗ → ${enemy.word.word}`, 'miss');
    this.enemyAttack(enemy);
    if (this.mode === 'ring') this.refreshInputPanel();
  }

  enemyAttack(enemy) {
    enemy.threat = 0;
    this.tweens.add({ targets: enemy.sprite, x: this.hero.x + 30, duration: 160, yoyo: true, ease: 'Quad.in' });
    this.time.delayedCall(160, () => {
      if (this.finished) return;
      if (this.shieldFx) {
        this.shieldFx.destroy();
        this.shieldFx = null;
        this.floatAtWorld(this.hero.x, this.hero.y - 56, 'Chặn!', 'skill');
        return;
      }
      playFx(this, this.manifest, 'curse', this.hero.x, this.hero.y - 4, { depth: 950 });
      this.heroHp = Math.max(0, this.heroHp - enemy.hit);
      this.hpBar.style.width = `${(this.heroHp / HERO_MAX_HP) * 100}%`;
      this.floatAtWorld(this.hero.x, this.hero.y - 52, `-${enemy.hit}`, 'miss');
      this.hero.setTint(0xff6060);
      this.cameras.main.shake(160, 0.006);
      this.time.delayedCall(160, () => this.hero.clearTint());
      this.checkEnd();
    });
  }

  checkEnd() {
    if (this.finished) return;
    if (this.heroHp <= 0) this.finish(false);
    else if (!this.aliveEnemies().length) this.time.delayedCall(700, () => this.finish(true));
  }

  finish(victory) {
    if (this.finished) return;
    this.finished = true;
    this.inputPanel?.remove();
    const gold = this.enemies.filter((enemy) => !enemy.alive).reduce((sum, enemy) => sum + enemy.gold, 0);
    const missed = [...this.missedWords];
    const result = el('div', 'result hit', `
      <h3>${victory ? 'Thanh Tẩy!' : 'Gục Ngã'}</h3>
      <div>${victory ? 'Lũ quỷ đã tan thành tro.' : 'Bóng tối nuốt lấy ánh sáng… lần này.'}</div>
      <div>+${gold} vàng · +${victory ? 2 : 0} pha lê thánh <span class="sample">(mẫu)</span></div>
      <div class="missed">${missed.length ? `Từ cần ôn: ${missed.join(', ')}` : 'Không gọi sai từ nào.'}</div>
      <button class="btn" data-action="again">Đánh lại</button><button class="btn ghost" data-action="home">Về Lexhold</button>`);
    result.querySelector('[data-action="again"]').addEventListener('click', () => this.scene.restart());
    result.querySelector('[data-action="home"]').addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('herox:navigate', { detail: 'explore' }));
    });
    if (victory) {
      this.hero.play('hero_spellcast_down');
      playFx(this, this.manifest, 'pillar', this.hero.x, this.hero.y + 4, { depth: 960 });
    }
  }

  floatAtWorld(x, y, text, kind) {
    const cam = this.cameras.main;
    floatText((x - cam.worldView.x) * ZOOM, (y - cam.worldView.y) * ZOOM, text, kind);
  }

  renderTags() {
    const cam = this.cameras.main;
    const alive = this.aliveEnemies();
    if (!this.target?.alive) this.target = alive.reduce((top, enemy) => (enemy.threat > (top?.threat ?? -1) ? enemy : top), null);
    for (const enemy of alive) {
      const { word } = enemy;
      enemy.tag.classList.toggle('target', enemy === this.target);
      const key = `${word.word}|${enemy.hp}|${Math.round(enemy.threat * 20)}`;
      if (enemy.tag.dataset.key !== key) {
        enemy.tag.dataset.key = key;
        enemy.tag.innerHTML = `
          ${enemy.elite ? '<div class="elite-label">◆ TINH ANH</div>' : ''}
          <div class="prompt"><span class="emoji">${word.emoji}</span> ${word.vi}<span class="pos pos-${word.pos}">${POS_SKILLS[word.pos].label}</span></div>
          <div class="bar"><i style="width:${(enemy.hp / enemy.maxHp) * 100}%"></i></div>
          <div class="threat"><i style="width:${enemy.threat * 100}%"></i></div>`;
      }
      enemy.tag.style.left = `${(enemy.x - cam.worldView.x) * ZOOM}px`;
      enemy.tag.style.top = `${(enemy.sprite.y - enemy.sprite.displayHeight - cam.worldView.y) * ZOOM - 2}px`;
    }
  }

  update(time, delta) {
    this.darkness.update(time);
    this.heroLight.x = this.hero.x;
    this.heroLight.y = this.hero.y - 20;
    this.hero.setDepth(this.hero.y);
    if (this.finished) return;
    if (time - this.lastCorrectAt > COMBO_WINDOW_MS) this.combo = 0;
    this.renderCombo(time);
    for (const enemy of this.aliveEnemies()) {
      enemy.threat += delta / enemy.threatMs;
      if (enemy.threat >= 1 && !this.busy) this.enemyAttack(enemy);
    }
    this.renderTags();
  }

  renderCombo(time) {
    this.comboNode.querySelector('.count').textContent = String(this.combo);
    const pips = this.comboNode.querySelectorAll('.pips i');
    pips.forEach((pip, index) => pip.classList.toggle('on', index < this.combo));
    const remaining = Math.max(0, 1 - (time - this.lastCorrectAt) / COMBO_WINDOW_MS);
    this.comboNode.style.opacity = this.combo ? String(0.5 + remaining / 2) : '0.7';
  }
}
