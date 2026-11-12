import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(import.meta.dirname, '..', '..');
const ASSETS_DIR = join(ROOT, 'assets');
/** Thư mục ảnh bắt buộc có credit (đường dẫn trong credits.json tính từ assets/). */
const CREDITED_DIRS = ['sprites', 'tiles', 'tilesets'];
const LPC_CSV = join(ASSETS_DIR, 'sprites', 'hero', 'lpc-credits.csv');
const HARMONIZED_MARKER = 'herox-harmonized';
const HARMONIZED_NOTE = 'palette-harmonize';
const PIXELLAB_SOURCE = /pixellab/i;

interface CreditEntry {
  readonly path: string;
  readonly title: string;
  readonly source: string;
  readonly url: string;
  readonly authors: string;
  readonly license: string;
  readonly modified: string;
}

interface HeroRecipes {
  readonly layers: readonly { readonly id: string; readonly credits: Readonly<Record<string, string>> }[];
  readonly extraCredits: Readonly<Record<string, readonly string[]>>;
}

interface ArtRecipe {
  readonly id: string;
  readonly path: string;
  readonly prompt: string;
  readonly seed: number;
  readonly size: { readonly width: number; readonly height: number };
  readonly directions: number;
  readonly animations: readonly string[];
  readonly reference: string;
  readonly createdAt: string;
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function listPngs(): string[] {
  return CREDITED_DIRS.flatMap((dir) =>
    readdirSync(join(ASSETS_DIR, dir), { recursive: true, encoding: 'utf8' })
      .map((file) => `${dir}/${file.replace(/\\/g, '/')}`)
      .filter((file) => file.endsWith('.png')),
  ).sort();
}

/** Tách dòng CSV có ngoặc kép (CREDITS.csv của LPC có khoảng trắng thừa giữa các trường). */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let quoted = false;
  for (let index = 0; index < line.length; index++) {
    const char = line.charAt(index);
    if (quoted && char === '"' && line.charAt(index + 1) === '"') {
      current += '"';
      index++;
    } else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) {
      fields.push(current.trim());
      current = '';
    } else current += char;
  }
  fields.push(current.trim());
  return fields;
}

const isGpl = (license: string): boolean => /^GPL\b/i.test(license);

const credits = readJson<CreditEntry[]>(join(ASSETS_DIR, 'credits.json'));
const creditByPath = new Map(credits.map((entry) => [entry.path, entry]));
const heroRecipes = readJson<HeroRecipes>(join(ROOT, 'tools', 'lpc', 'hero-recipes.json'));
const artRecipes = readJson<{ version: number; assets: ArtRecipe[] }>(join(ROOT, 'tools', 'pixellab', 'art-recipes.json'));
const lpcRows = new Map(
  readFileSync(LPC_CSV, 'utf8').split(/\r?\n/).slice(1).filter((line) => line.trim() !== '').map((line) => {
    const [filename = '', , , licenses = ''] = parseCsvLine(line);
    return [filename, licenses.split(',').map((license) => license.trim()).filter(Boolean)] as const;
  }),
);

describe('credits ảnh trong assets/', () => {
  it('mọi file .png trong sprites, tiles, tilesets đều có dòng credit', () => {
    expect(listPngs().filter((file) => !creditByPath.has(file))).toEqual([]);
  });

  it('mọi dòng credit trỏ tới file có thật, không trùng, đủ trường', () => {
    expect(credits.filter((entry) => !existsSync(join(ASSETS_DIR, entry.path))).map((entry) => entry.path)).toEqual([]);
    expect(creditByPath.size).toBe(credits.length);
    for (const entry of credits) {
      for (const field of ['title', 'source', 'authors', 'license', 'modified'] as const) {
        expect(entry[field].trim(), `${entry.path}.${field}`).not.toBe('');
      }
    }
  });

  it('ghi palette-harmonize khớp với dấu tEXt trong file ảnh', () => {
    for (const entry of credits) {
      const marked = readFileSync(join(ASSETS_DIR, entry.path)).includes(HARMONIZED_MARKER);
      expect(marked, entry.path).toBe(entry.modified.includes(HARMONIZED_NOTE));
    }
  });

  it('assets/CREDITS.md khớp output của tools/build-credits.mjs', () => {
    expect(() => execFileSync(process.execPath, [join(ROOT, 'tools', 'build-credits.mjs'), '--check'], { cwd: ROOT, stdio: 'pipe' })).not.toThrow();
  });
});

describe('layer LPC', () => {
  const usedRows = [
    ...heroRecipes.layers.flatMap((layer) => Object.values(layer.credits)),
    ...Object.values(heroRecipes.extraCredits).flat(),
  ];

  it('mọi layer dùng tới có dòng trong lpc-credits.csv', () => {
    expect(usedRows.filter((filename) => !lpcRows.has(filename))).toEqual([]);
  });

  it('không dùng layer chỉ có license GPL', () => {
    const gplOnly = [...lpcRows].filter(([, licenses]) => !licenses.some((license) => !isGpl(license)));
    expect(gplOnly.map(([filename]) => filename)).toEqual([]);
  });

  it('credit của ảnh ghép từ LPC không ghi license GPL', () => {
    const lpcCredits = credits.filter((entry) => entry.source.includes('LPC'));
    expect(lpcCredits.length).toBeGreaterThan(0);
    for (const entry of lpcCredits) {
      expect(entry.license.split('/').map((license) => license.trim()).filter(isGpl), entry.path).toEqual([]);
    }
  });
});

describe('PixelLab', () => {
  const recipeByPath = new Map(artRecipes.assets.map((recipe) => [recipe.path, recipe]));

  it('asset nguồn PixelLab có công thức tạo lại trong art-recipes.json', () => {
    const missing = credits.filter((entry) => PIXELLAB_SOURCE.test(entry.source) && !recipeByPath.has(entry.path));
    expect(missing.map((entry) => entry.path)).toEqual([]);
  });

  it('công thức đủ trường và không chứa token', () => {
    expect(artRecipes.version).toBe(1);
    for (const recipe of artRecipes.assets) {
      expect(typeof recipe.prompt === 'string' && recipe.prompt !== '', recipe.id).toBe(true);
      expect(Number.isInteger(recipe.seed), recipe.id).toBe(true);
      expect(recipe.size.width > 0 && recipe.size.height > 0, recipe.id).toBe(true);
      expect([4, 8]).toContain(recipe.directions);
      expect(recipe.animations.length, recipe.id).toBeGreaterThan(0);
      expect(existsSync(join(ROOT, recipe.reference)), recipe.id).toBe(true);
      expect(recipe.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    expect(JSON.stringify(artRecipes.assets)).not.toMatch(/token|bearer|api[_-]?key/i);
  });
});
