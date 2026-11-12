#!/usr/bin/env node
// Render atlas hiệu ứng pixelfx cho client từ assets/fx/fx-manifest.json.
//
//   node tools/render-fx.mjs              render mọi effect trong manifest
//   node tools/render-fx.mjs finisher     chỉ render effect tên "finisher"
//
// Kết quả: client/public/fx/<name>.png + <name>.json (atlas kiểu Aseprite, Phaser đọc được) và fx-index.json
// (fps, loop, pivot... của từng effect). Chạy tay khi đổi manifest rồi commit kết quả; build không chạy lại.

import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST_PATH = join(ROOT, 'assets', 'fx', 'fx-manifest.json');
const OUTPUT_DIR = join(ROOT, 'client', 'public', 'fx');
const INDEX_FILE = 'fx-index.json';
// Không giảm dưới mức này: hiệu ứng giật thấy rõ.
const MIN_FPS = 8;

const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
// `pixelfx` export src/core/index.js; công cụ render nằm ở tools/ của gói.
const pixelfxRoot = join(dirname(createRequire(import.meta.url).resolve('pixelfx')), '..', '..');
const renderCli = join(pixelfxRoot, 'tools', 'render.mjs');

function renderSheet(effect, fps, workDir) {
  const args = [renderCli, effect.source, '--sheet', '--no-actor', '--bg', 'none', '--fps', String(fps), '--out', workDir];
  if (effect.seed !== undefined) args.push('--seed', String(effect.seed));
  if (effect.palette !== undefined) args.push('--opts', JSON.stringify({ palette: effect.palette }));
  const result = spawnSync(process.execPath, args, { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`${effect.name}: pixelfx render lỗi\n${result.stderr}`);
  const baseName = effect.source.split('/')[1];
  const dir = join(workDir, effect.source);
  return { png: join(dir, `${baseName}.png`), json: JSON.parse(readFileSync(join(dir, `${baseName}.json`), 'utf8')) };
}

/** Atlas lớn hơn giới hạn WebGL an toàn của iPhone thì giảm fps (ít khung hơn) tới khi vừa. */
function renderWithinLimit(effect, workDir) {
  let fps = effect.fps ?? manifest.defaultFps;
  for (;;) {
    const sheet = renderSheet(effect, fps, workDir);
    const { w, h } = sheet.json.meta.size;
    if (w <= manifest.maxAtlasSize && h <= manifest.maxAtlasSize) return sheet;
    if (fps - 1 < MIN_FPS) throw new Error(`${effect.name}: atlas ${w}x${h} vượt ${manifest.maxAtlasSize} cả ở ${MIN_FPS} fps`);
    fps -= 1;
  }
}

function readExistingIndex() {
  const file = join(OUTPUT_DIR, INDEX_FILE);
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')).effects : {};
}

const only = new Set(process.argv.slice(2));
const unknown = [...only].filter((name) => !manifest.effects.some((effect) => effect.name === name));
if (unknown.length > 0) throw new Error(`Không có trong manifest: ${unknown.join(', ')}`);

mkdirSync(OUTPUT_DIR, { recursive: true });
const workDir = mkdtempSync(join(tmpdir(), 'herox-fx-'));
const previous = readExistingIndex();
const index = {};
let totalPixels = 0;
try {
  for (const effect of manifest.effects) {
    if (only.size > 0 && !only.has(effect.name)) {
      if (previous[effect.name] !== undefined) index[effect.name] = previous[effect.name];
      continue;
    }
    const sheet = renderWithinLimit(effect, workDir);
    const { meta } = sheet.json;
    meta.image = `${effect.name}.png`;
    copyFileSync(sheet.png, join(OUTPUT_DIR, `${effect.name}.png`));
    writeFileSync(join(OUTPUT_DIR, `${effect.name}.json`), JSON.stringify(sheet.json));
    const { fps, loop, frames, frameSize, pivot } = meta.pixelfx;
    index[effect.name] = { source: effect.source, fps, loop, frames, frameSize, pivot, atlasSize: [meta.size.w, meta.size.h] };
    totalPixels += meta.size.w * meta.size.h;
    process.stdout.write(`${effect.name.padEnd(18)} ${effect.source.padEnd(24)} ${frames} khung @${fps}fps  ${meta.size.w}x${meta.size.h}\n`);
  }
} finally {
  rmSync(workDir, { recursive: true, force: true });
}
writeFileSync(
  join(OUTPUT_DIR, INDEX_FILE),
  `${JSON.stringify({ pixelfxCommit: manifest.pixelfx.commit, effects: index }, null, 2)}\n`,
);
process.stdout.write(`Bộ nhớ GPU ước tính cho phần vừa render: ${(totalPixels * 4 / 1024 / 1024).toFixed(1)} MB\n`);
