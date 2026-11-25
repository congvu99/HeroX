import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SKILL_CATALOG, SKILL_MOVES, STATUS_FX, STATUS_KINDS, SYSTEM_FX } from '@herox/shared';
import { fitFxScale, fxFrameName, FxIndexFormatError, fxOrigin, parseFxIndex } from '../src/fx/fx-index';

const ROOT = join(import.meta.dirname, '..', '..');
const FX_DIR = join(ROOT, 'client', 'public', 'fx');

interface ManifestEffect {
  readonly name: string;
  readonly source: string;
}

interface Manifest {
  readonly pixelfx: { readonly commit: string };
  readonly maxAtlasSize: number;
  readonly effects: readonly ManifestEffect[];
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

const manifest = readJson<Manifest>(join(ROOT, 'assets', 'fx', 'fx-manifest.json'));
const credits = readFileSync(join(ROOT, 'assets', 'fx', 'CREDITS.md'), 'utf8');
const rawIndex = readJson<{ pixelfxCommit: string; effects: Record<string, { atlasSize: [number, number] }> }>(join(FX_DIR, 'fx-index.json'));
const index = parseFxIndex(rawIndex);
const names = manifest.effects.map((effect) => effect.name);

describe('fx manifest', () => {
  it('tên hiệu ứng không trùng', () => {
    expect(new Set(names).size).toBe(names.length);
  });

  it('CREDITS.md liệt kê mọi hiệu ứng (tên + effect gốc) và đúng commit pixelfx', () => {
    for (const effect of manifest.effects) {
      expect(credits).toMatch(new RegExp(`\\| ${effect.name} \\| \`${effect.source}\` \\| MIT \\|`));
    }
    expect(credits).toContain(manifest.pixelfx.commit);
  });

  it('commit trong manifest trùng commit khoá trong package.json', () => {
    const rootPackage = readJson<{ devDependencies: Record<string, string> }>(join(ROOT, 'package.json'));
    expect(rootPackage.devDependencies.pixelfx).toBe(`github:patch-gg/pixelfx#${manifest.pixelfx.commit}`);
  });

  it('atlas đã render khớp manifest, có đủ file và không quá giới hạn WebGL', () => {
    expect(rawIndex.pixelfxCommit).toBe(manifest.pixelfx.commit);
    expect([...index.keys()].sort()).toEqual([...names].sort());
    for (const effect of manifest.effects) {
      expect(index.get(effect.name)?.source).toBe(effect.source);
      expect(existsSync(join(FX_DIR, `${effect.name}.png`))).toBe(true);
      const atlas = readJson<{ frames: unknown[]; meta: { image: string; size: { w: number; h: number } } }>(join(FX_DIR, `${effect.name}.json`));
      expect(atlas.meta.image).toBe(`${effect.name}.png`);
      expect(atlas.frames).toHaveLength(index.get(effect.name)?.frames ?? -1);
      expect(Math.max(atlas.meta.size.w, atlas.meta.size.h)).toBeLessThanOrEqual(manifest.maxAtlasSize);
    }
  });

  it('mọi hiệu ứng chiêu và hiệu ứng hệ thống đều có trong manifest', () => {
    const used = new Set<string>(Object.values(SYSTEM_FX));
    for (const variant of [...Object.values(SKILL_CATALOG).flat(), ...SKILL_MOVES]) {
      used.add(variant.castFx);
      used.add(variant.impactFx);
    }
    for (const status of STATUS_KINDS) {
      used.add(STATUS_FX[status]);
    }
    expect([...used].filter((name) => !names.includes(name))).toEqual([]);
  });
});

describe('parseFxIndex', () => {
  it('đọc tên khung và gốc theo pivot', () => {
    const info = index.get('finisher');
    expect(info).toBeDefined();
    if (info === undefined) return;
    expect(fxFrameName(info, 3)).toBe('smite 3');
    const origin = fxOrigin(info);
    expect(origin.x).toBeCloseTo(info.pivot[0] / info.frameSize[0]);
    expect(origin.y).toBeCloseTo(info.pivot[1] / info.frameSize[1]);
  });

  it('giới hạn cạnh dài nhất của hiệu ứng khung to, giữ nguyên hiệu ứng nhỏ', () => {
    const big = { source: 'a/b', fps: 10, loop: false, frames: 1, frameSize: [372, 156], pivot: [0, 0] } as const;
    const small = { ...big, frameSize: [80, 60] } as const;
    expect(fitFxScale(big, 1.5, 240) * 372).toBeCloseTo(240);
    expect(fitFxScale(small, 1.5, 240)).toBe(1.5);
    expect(fitFxScale(big, 1.5)).toBe(1.5);
  });

  it('chỉ mục sai định dạng báo lỗi rõ', () => {
    expect(() => parseFxIndex(null)).toThrow(FxIndexFormatError);
    expect(() => parseFxIndex({ effects: { a: { source: 'x/y', fps: 0, loop: false, frames: 1, frameSize: [1, 1], pivot: [0, 0] } } })).toThrow(
      FxIndexFormatError,
    );
    expect(() => parseFxIndex({ effects: { a: { source: 'nosplash', fps: 15, loop: false, frames: 1, frameSize: [1, 1], pivot: [0, 0] } } })).toThrow(
      FxIndexFormatError,
    );
  });
});
