import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const demoUrl = new URL('./index.html', import.meta.url);

async function html() {
  return readFile(demoUrl, 'utf8');
}

test('contains exactly the four approved UI views', async () => {
  const source = await html();
  const viewIds = [...source.matchAll(/<section[^>]+data-view="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(viewIds, ['login', 'outfit', 'health', 'character']);
  assert.match(source, />Đăng nhập</);
  assert.match(source, />Mặc đồ</);
  assert.match(source, />Thanh máu</);
  assert.match(source, />Nhân vật</);
});

test('models a 640 by 360 game screen instead of a web dashboard', async () => {
  const source = await html();
  assert.match(source, /class="game-screen"/);
  assert.match(source, /data-logical-width="640"/);
  assert.match(source, /data-logical-height="360"/);
  assert.match(source, /aspect-ratio:\s*16\s*\/\s*9/);
  assert.doesNotMatch(source, /class="demo-heading"|class="tabs"|class="login-panel"|class="outfit-list"/);
});

test('uses dedicated action RPG compositions for all four states', async () => {
  const source = await html();
  assert.match(source, /class="[^\"]*title-screen/);
  assert.match(source, /class="[^\"]*combat-hud/);
  assert.match(source, /class="[^\"]*armory-screen/);
  assert.match(source, /class="[^\"]*character-sheet/);
  assert.match(source, /equipment-slot/);
  assert.match(source, /command-bar/);
});

test('uses the existing HeroX sprite and game keyboard controls', async () => {
  const source = await html();
  assert.match(source, /\.\.\/\.\.\/assets\/sprites\/hero\/hero_idle\.png/);
  assert.match(source, /image-rendering:\s*pixelated/);
  assert.match(source, /event\.key\s*===\s*'m'/i);
  assert.match(source, /\['1',\s*'2',\s*'3',\s*'4'\]/);
});

test('offers desktop and landscape-mobile preview modes', async () => {
  const source = await html();
  assert.match(source, /data-mode="desktop"/);
  assert.match(source, /data-mode="mobile"/);
  assert.match(source, /\.game-stage\[data-device='mobile'\]/);
  assert.match(source, /aspect-ratio:\s*16\s*\/\s*9/);
});

test('uses the approved HeroX palette and readable Vietnamese labels', async () => {
  const source = await html();
  for (const color of ['#0b0a10', '#1b1720', '#7a141c', '#e8c66a', '#d9d2c0']) {
    assert.match(source.toLowerCase(), new RegExp(color));
  }
  assert.match(source, /Đăng nhập LingoBrain/);
  assert.match(source, /Đang mặc/);
  assert.match(source, /Chưa mở/);
  assert.match(source, /HP/);
  assert.match(source, /Tiến độ học từ/);
});

test('is self-contained and does not call a network API', async () => {
  const source = await html();
  assert.doesNotMatch(source, /<link[^>]+href=/i);
  assert.doesNotMatch(source, /<script[^>]+src=/i);
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /XMLHttpRequest|WebSocket/);
});

test('uses buttons for every interactive control', async () => {
  const source = await html();
  const tabButtons = [...source.matchAll(/<button[^>]+data-tab="([^"]+)"/g)].map((match) => match[1]);
  const modeButtons = [...source.matchAll(/<button[^>]+data-mode="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(tabButtons, ['login', 'outfit', 'health', 'character']);
  assert.deepEqual(modeButtons, ['desktop', 'mobile']);
  assert.match(source, /aria-selected="true"/);
  assert.match(source, /aria-pressed="true"/);
});
