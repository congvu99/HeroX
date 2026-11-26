import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CHAPTER_ENTRIES,
  chapterLevelIds,
  chapterOfLevel,
  presentChapterMapPaths,
} from '../src/maps/chapter-maps';
import { findEntities, parseLdtkLevel, parseLdtkProject, resolveAssetPath, type MapLevel } from '../src/maps/ldtk-loader';

const ASSETS_DIR = join(import.meta.dirname, '..', '..', 'assets');

function readJsonAsset(relPath: string): unknown {
  return JSON.parse(readFileSync(join(ASSETS_DIR, relPath), 'utf8'));
}

/** Mọi level của mọi chương có trên đĩa, kèm số chương. */
function loadAllLevels(): { chapter: number; level: MapLevel }[] {
  return presentChapterMapPaths().flatMap(({ chapter, path }) =>
    parseLdtkProject(readJsonAsset(path)).levels.map((ref) => {
      if (ref.externalRelPath === null) throw new Error(`${ref.identifier} phải tách file .ldtkl`);
      return { chapter, level: parseLdtkLevel(readJsonAsset(resolveAssetPath(path, ref.externalRelPath))) };
    }),
  );
}

const allLevels = loadAllLevels();

function levelById(levelId: string): MapLevel | undefined {
  return allLevels.find((entry) => entry.level.identifier === levelId)?.level;
}

function spawnIds(level: MapLevel): string[] {
  return findEntities(level, 'PlayerSpawn').map((spawn) => spawn.spawnId);
}

describe('bảng chương ↔ level', () => {
  it('khớp đúng level trong file map của từng chương', () => {
    for (const { chapter, path } of presentChapterMapPaths()) {
      const levels = parseLdtkProject(readJsonAsset(path)).levels.map((ref) => ref.identifier);
      expect([...chapterLevelIds(chapter)].sort(), `chương ${chapter}`).toEqual([...levels].sort());
    }
  });

  it('tra được chương của level', () => {
    expect(chapterOfLevel('Lexhold')).toBe(1);
    expect(chapterOfLevel('Ash_Forest')).toBe(2);
    expect(chapterOfLevel('Fallen_Sanctum')).toBe(5);
    expect(chapterOfLevel('Không_Có')).toBeUndefined();
  });

  it('điểm vào mỗi chương là level và spawn có thật của chương đó', () => {
    for (const [chapter, entry] of Object.entries(CHAPTER_ENTRIES)) {
      expect(chapterOfLevel(entry.levelId), entry.levelId).toBe(Number(chapter));
      const level = levelById(entry.levelId);
      expect(level, entry.levelId).toBeDefined();
      if (level) expect(spawnIds(level), entry.levelId).toContain(entry.spawnId);
    }
  });
});

const HUB_LEVEL = 'Lexhold';

function portalsOf(level: MapLevel) {
  return findEntities(level, 'Portal');
}

describe('tuyến cổng giữa các chương (Lexhold làm trung tâm)', () => {
  it('mọi cổng trỏ tới level và spawn có thật trong một chương nào đó', () => {
    const broken = allLevels.flatMap(({ level }) =>
      portalsOf(level)
        .filter((portal) => {
          const target = levelById(portal.targetLevel);
          return target === undefined || !spawnIds(target).includes(portal.targetSpawn);
        })
        .map((portal) => `${level.identifier} → ${portal.targetLevel}/${portal.targetSpawn}`),
    );
    expect(broken).toEqual([]);
  });

  it('Lexhold có cổng tới điểm vào của mọi chương sau', () => {
    const hub = levelById(HUB_LEVEL);
    if (!hub) throw new Error('Thiếu Lexhold');
    const targets = portalsOf(hub).map((portal) => `${portal.targetLevel}/${portal.targetSpawn}`);
    for (const [chapter, entry] of Object.entries(CHAPTER_ENTRIES)) {
      if (Number(chapter) === 1) continue;
      expect(targets, `chương ${chapter}`).toContain(`${entry.levelId}/${entry.spawnId}`);
    }
  });

  it('level vào của mỗi chương sau có cổng về Lexhold', () => {
    for (const [chapter, entry] of Object.entries(CHAPTER_ENTRIES)) {
      if (Number(chapter) === 1) continue;
      const level = levelById(entry.levelId);
      expect(level?.identifier, entry.levelId).toBe(entry.levelId);
      if (level) expect(portalsOf(level).map((portal) => portal.targetLevel), entry.levelId).toContain(HUB_LEVEL);
    }
  });
});
