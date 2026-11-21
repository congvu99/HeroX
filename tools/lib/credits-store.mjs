// Đọc/ghi `assets/credits.json` và CSV credit của LPC; dùng chung cho script nhập asset, sinh map, build-credits.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const ASSETS_DIR = join(REPO_ROOT, 'assets');
export const CREDITS_JSON = join(ASSETS_DIR, 'credits.json');

export const CREDIT_FIELDS = ['path', 'title', 'source', 'url', 'authors', 'license', 'modified'];

/** Nguồn dùng lại ở nhiều entry; tên nguồn là khoá gom nhóm trong CREDITS.md. */
export const SOURCES = {
  dcss: {
    source: 'Dungeon Crawl Stone Soup tiles (crawl-tiles Oct-5-2010)',
    url: 'https://opengameart.org/content/dungeon-crawl-32x32-tiles',
    authors: 'Nhóm phát triển Dungeon Crawl Stone Soup và các tác giả RLTiles',
    license: 'CC0 1.0',
  },
  lpc: {
    source: 'Universal LPC Spritesheet Character Generator',
    url: 'https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator',
  },
  kenney: {
    url: 'https://kenney.nl/assets',
    authors: 'Kenney (www.kenney.nl)',
    license: 'CC0 1.0',
  },
  herox: {
    source: 'HeroX, vẽ bằng script',
    url: '',
    authors: 'HeroX',
    license: 'Thuộc dự án HeroX',
  },
  pixellab: {
    source: 'PixelLab (AI pixel art, api.pixellab.ai)',
    url: 'https://www.pixellab.ai/',
    authors: 'HeroX qua PixelLab',
    license: 'Thuộc dự án HeroX (sinh bằng PixelLab, tài khoản HeroX)',
  },
};

export function readCredits() {
  return existsSync(CREDITS_JSON) ? JSON.parse(readFileSync(CREDITS_JSON, 'utf8')) : [];
}

/** Thêm/thay entry theo `path`, sắp theo `path` để file sinh lại không đổi diff. */
export function upsertCredits(entries) {
  const byPath = new Map(readCredits().map((entry) => [entry.path, entry]));
  for (const entry of entries) {
    const missing = CREDIT_FIELDS.filter((field) => typeof entry[field] !== 'string');
    if (missing.length > 0) throw new Error(`Credit ${entry.path}: thiếu trường ${missing.join(', ')}`);
    byPath.set(entry.path, Object.fromEntries(CREDIT_FIELDS.map((field) => [field, entry[field]])));
  }
  const sorted = [...byPath.values()].sort((left, right) => left.path.localeCompare(right.path));
  writeFileSync(CREDITS_JSON, `${JSON.stringify(sorted, null, 2)}\n`);
}

/** Tách một dòng CSV có ngoặc kép (CREDITS.csv của LPC có khoảng trắng thừa sau dấu đóng ngoặc). */
export function parseCsvLine(line) {
  const fields = [];
  let current = '';
  let quoted = false;
  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    if (quoted) {
      if (char === '"' && line[index + 1] === '"') {
        current += '"';
        index++;
      } else if (char === '"') quoted = false;
      else current += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') {
      fields.push(current.trim());
      current = '';
    } else current += char;
  }
  fields.push(current.trim());
  return fields;
}

/** Đọc CREDITS.csv của LPC thành Map filename → { line, notes, authors[], licenses[], urls[] }. */
export function readLpcCsv(path) {
  const lines = readFileSync(path, 'utf8').split(/\r?\n/).filter((line) => line.trim() !== '');
  const [header, ...rows] = lines;
  const split = (value) => value.split(',').map((part) => part.trim()).filter(Boolean);
  const result = new Map();
  for (const line of rows) {
    const [filename, notes, authors, licenses, urls] = parseCsvLine(line);
    result.set(filename, { line, notes, authors: split(authors ?? ''), licenses: split(licenses ?? ''), urls: split(urls ?? '') });
  }
  return { header, rows: result };
}

/** License GPL (mọi phiên bản) không được dùng; layer phải có ít nhất một license khác GPL. */
export function isGplLicense(license) {
  return /^GPL\b/i.test(license);
}
