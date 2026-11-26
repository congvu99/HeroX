import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { chapterLevelIds, presentChapterMapPaths } from '../src/maps/chapter-maps';
import {
  findBrokenPortalLinks,
  findEntities,
  findSpawn,
  isSolidCell,
  parseLdtkLevel,
  parseLdtkProject,
  resolveAssetPath,
  type MapEntity,
  type MapLevel,
} from '../src/maps/ldtk-loader';

const ASSETS_DIR = join(import.meta.dirname, '..', '..', 'assets');
const CHAPTER_1_PROJECT_FILE = 'maps/chapter-1-misty-village.ldtk';
const LEVEL_IDS = ['Lexhold', 'Misty_Fields', 'Misty_Village', 'Misty_Chapel', 'Scarecrow_Lair'];
const LEVEL_SIZE_CELLS = { minWidth: 30, maxWidth: 44, minHeight: 18, maxHeight: 26 };
const ATLAS_MAX_PX = 2048;
const PNG_WIDTH_OFFSET = 16;

type Cell = readonly [number, number];
type Kind = MapEntity['kind'];

/** Id bắt buộc theo từng level của chương 1 (spawnId, dialogId, itemId, encounterId, buildingId, đích cổng). */
const CHAPTER_1_EXPECTED: Record<string, Partial<Record<Kind, readonly string[]>>> = {
  Lexhold: {
    PlayerSpawn: ['from-ash-forest', 'from-catacomb', 'from-fields', 'from-heaven', 'from-hellmaw', 'start'],
    Npc: ['keeper'],
    Building: ['arcane-tower', 'forge', 'library', 'tailor'],
    BattleTrigger: ['tutorial'],
    Portal: [
      'Ash_Forest/from-lexhold',
      'Broken_Heaven/from-fields',
      'Hellmaw/from-fields',
      'Misty_Fields/from-lexhold',
      'Saint_Catacomb/from-fields',
    ],
  },
  Misty_Fields: {
    PlayerSpawn: ['from-lexhold', 'from-village'],
    BattleTrigger: ['ch1-field', 'ch1-field-roam'],
    Portal: ['Lexhold/from-fields', 'Misty_Village/from-fields'],
  },
  Misty_Village: {
    PlayerSpawn: ['from-chapel', 'from-fields', 'from-lair'],
    Npc: ['chapel-door', 'hollow-villager', 'smith'],
    Portal: ['Misty_Chapel/from-village', 'Misty_Fields/from-village', 'Scarecrow_Lair/from-village'],
  },
  Misty_Chapel: {
    PlayerSpawn: ['from-village'],
    Chest: ['holy-fragment-1', 'holy-fragment-2', 'holy-fragment-3'],
    Npc: ['chapel-altar'],
    Portal: ['Misty_Village/from-chapel'],
  },
  Scarecrow_Lair: {
    PlayerSpawn: ['from-village'],
    Npc: ['scarecrow'],
    Portal: ['Misty_Village/from-lair'],
  },
};

function readAsset(relPath: string): string {
  return readFileSync(join(ASSETS_DIR, relPath), 'utf8');
}

/** Dựng project + các level đã tách file của một chương để kiểm tra bất biến chung và riêng. */
function loadChapter(projectFile: string) {
  const project = parseLdtkProject(JSON.parse(readAsset(projectFile)));
  const levels = project.levels.map((ref) => {
    if (ref.externalRelPath === null) throw new Error(`${ref.identifier} phải tách file .ldtkl`);
    return parseLdtkLevel(JSON.parse(readAsset(resolveAssetPath(projectFile, ref.externalRelPath))));
  });
  const levelById = new Map(levels.map((level) => [level.identifier, level]));

  function levelOf(id: string): MapLevel {
    const level = levelById.get(id);
    if (!level) throw new Error(`Thiếu level ${id}`);
    return level;
  }

  return { project, levels, levelOf };
}

function idOf(entity: MapEntity): string {
  switch (entity.kind) {
    case 'PlayerSpawn': return entity.spawnId;
    case 'Portal': return `${entity.targetLevel}/${entity.targetSpawn}`;
    case 'Npc': return entity.dialogId;
    case 'Chest': return entity.itemId;
    case 'BattleTrigger': return entity.encounterId;
    case 'Building': return entity.buildingId;
    case 'Torch': return 'torch';
  }
}

function cellsOf(entity: MapEntity, grid: number): Cell[] {
  const cells: Cell[] = [];
  for (let y = Math.floor(entity.y / grid); y <= Math.floor((entity.y + entity.height - 1) / grid); y++) {
    for (let x = Math.floor(entity.x / grid); x <= Math.floor((entity.x + entity.width - 1) / grid); x++) cells.push([x, y]);
  }
  return cells;
}

const key = ([x, y]: Cell): string => `${x},${y}`;

/** Ô đi tới được từ `start` (4 hướng), coi lưới va chạm và `blocked` là chắn. */
function reachable(level: MapLevel, start: Cell, blocked: ReadonlySet<string> = new Set()): Set<string> {
  const grid = level.collision;
  if (!grid) throw new Error(`${level.identifier} không có lưới va chạm`);
  const seen = new Set([key(start)]);
  const queue: Cell[] = [start];
  for (let cell = queue.shift(); cell; cell = queue.shift()) {
    const [x, y] = cell;
    for (const next of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]] as const) {
      if (isSolidCell(grid, next[0], next[1]) || blocked.has(key(next)) || seen.has(key(next))) continue;
      seen.add(key(next));
      queue.push(next);
    }
  }
  return seen;
}

function neighbours([x, y]: Cell): Cell[] {
  return [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
}

function spawnCell(level: MapLevel, grid: number, spawnId: string): Cell {
  const spawn = findSpawn(level, spawnId);
  if (spawn?.spawnId !== spawnId) throw new Error(`${level.identifier}: thiếu spawn ${spawnId}`);
  return cellsOf(spawn, grid)[0] ?? [0, 0];
}

function cellsOfKind(level: MapLevel, grid: number, kind: Kind, id?: string): Cell[] {
  return level.entities.filter((entity) => entity.kind === kind && (id === undefined || idOf(entity) === id))
    .flatMap((entity) => cellsOf(entity, grid));
}

// Các chương có file map thật trong bản build; chương chưa dựng được bỏ qua (skip) chứ không fail.
const presentChapters = presentChapterMapPaths();
const chapter1Present = presentChapters.some(({ path }) => path === CHAPTER_1_PROJECT_FILE);

// Bất biến cấu trúc chung cho MỌI chương đang có file map.
describe.each(presentChapters)('cấu trúc map chương $chapter', ({ chapter, path }: { chapter: number; path: string }) => {
  const { project, levels } = loadChapter(path);

  it('level tách file .ldtkl, không có level nhúng trong project', () => {
    expect(project.inlineLevels.size).toBe(0);
    expect(project.levels.length).toBeGreaterThan(0);
  });

  it('tileset lưới 32, ảnh có thật, không quá giới hạn atlas', () => {
    const tilesets = [...project.tilesets.values()];
    expect(tilesets.length).toBeGreaterThan(0);
    for (const tileset of tilesets) {
      expect(tileset.tileGridSize).toBe(32);
      const pngPath = resolveAssetPath(path, tileset.relPath);
      const png = readFileSync(join(ASSETS_DIR, pngPath));
      expect(png.readUInt32BE(PNG_WIDTH_OFFSET), pngPath).toBeLessThanOrEqual(ATLAS_MAX_PX);
      expect(png.readUInt32BE(PNG_WIDTH_OFFSET + 4), pngPath).toBeLessThanOrEqual(ATLAS_MAX_PX);
    }
  });

  it('kích thước level trong khoảng thiết kế và có lưới va chạm', () => {
    for (const level of levels) {
      const grid = level.collision;
      expect(grid, level.identifier).not.toBeNull();
      expect(grid?.widthCells).toBeGreaterThanOrEqual(LEVEL_SIZE_CELLS.minWidth);
      expect(grid?.widthCells).toBeLessThanOrEqual(LEVEL_SIZE_CELLS.maxWidth);
      expect(grid?.heightCells).toBeGreaterThanOrEqual(LEVEL_SIZE_CELLS.minHeight);
      expect(grid?.heightCells).toBeLessThanOrEqual(LEVEL_SIZE_CELLS.maxHeight);
      expect(level.unknownEntities).toEqual([]);
    }
  });

  it('mỗi level có ít nhất một đuốc', () => {
    for (const level of levels) {
      expect(findEntities(level, 'Torch').length, `${level.identifier} cần đuốc`).toBeGreaterThan(0);
    }
  });

  it('cổng trong chương trỏ tới level và spawn có thật (cổng sang chương khác kiểm ở chapter-transition.test.ts)', () => {
    const otherChapterLevels = presentChapters.filter((entry) => entry.chapter !== chapter).flatMap((entry) => chapterLevelIds(entry.chapter));
    const broken = findBrokenPortalLinks(levels).filter((problem) => !otherChapterLevels.some((levelId) => problem.includes(`"${levelId}"`)));
    expect(broken).toEqual([]);
  });

  it('biên level kín, chỗ hở duy nhất là cổng', () => {
    for (const level of levels) {
      const grid = level.collision;
      if (!grid) continue;
      const portalCells = new Set(cellsOfKind(level, project.gridSize, 'Portal').map(key));
      for (let y = 0; y < grid.heightCells; y++) {
        for (let x = 0; x < grid.widthCells; x++) {
          const onEdge = x === 0 || y === 0 || x === grid.widthCells - 1 || y === grid.heightCells - 1;
          if (onEdge && !isSolidCell(grid, x, y)) expect(portalCells.has(key([x, y])), `${level.identifier} (${x},${y})`).toBe(true);
        }
      }
    }
  });

  it('Npc và Chest không đứng trên ô va chạm; spawn không nằm trong cổng hay trận', () => {
    for (const level of levels) {
      const grid = level.collision;
      if (!grid) continue;
      for (const [x, y] of [
        ...cellsOfKind(level, project.gridSize, 'Npc'),
        ...cellsOfKind(level, project.gridSize, 'Chest'),
        ...cellsOfKind(level, project.gridSize, 'PlayerSpawn'),
      ]) {
        expect(isSolidCell(grid, x, y), `${level.identifier} (${x},${y})`).toBe(false);
      }
      const zones = new Set([
        ...cellsOfKind(level, project.gridSize, 'Portal'),
        ...cellsOfKind(level, project.gridSize, 'BattleTrigger'),
      ].map(key));
      expect(cellsOfKind(level, project.gridSize, 'PlayerSpawn').filter((cell) => zones.has(key(cell))), level.identifier).toEqual([]);
    }
  });

  it('spawn cách vùng cổng ít nhất 1 ô', () => {
    for (const level of levels) {
      const portals = cellsOfKind(level, project.gridSize, 'Portal');
      for (const [sx, sy] of cellsOfKind(level, project.gridSize, 'PlayerSpawn')) {
        const nearest = Math.min(...portals.map(([px, py]) => Math.max(Math.abs(px - sx), Math.abs(py - sy))));
        expect(nearest, `${level.identifier} spawn (${sx},${sy})`).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('từ mọi spawn đi tới được mọi spawn, cổng, NPC, rương (NPC và rương chắn đường, phải đi vòng được)', () => {
    for (const level of levels) {
      const blocked = new Set([
        ...cellsOfKind(level, project.gridSize, 'Npc'),
        ...cellsOfKind(level, project.gridSize, 'Chest'),
      ].map(key));
      for (const spawn of findEntities(level, 'PlayerSpawn')) {
        const seen = reachable(level, spawnCell(level, project.gridSize, spawn.spawnId), blocked);
        const targets = level.entities.filter((entity) => entity.kind !== 'Torch' && entity.kind !== 'BattleTrigger' && entity.kind !== 'Building');
        for (const target of targets) {
          const cells = cellsOf(target, project.gridSize);
          const touch = blocked.has(key(cells[0] ?? [0, 0])) ? cells.flatMap(neighbours) : cells;
          expect(touch.some((cell) => seen.has(key(cell))), `${level.identifier}: ${spawn.spawnId} → ${target.kind} ${idOf(target)}`).toBe(true);
        }
      }
    }
  });
});

// Bất biến riêng của chương 1: id entity chính xác, công trình, bố cục trận hướng dẫn, cửa nhà nguyện.
const describeChapter1 = chapter1Present ? describe : describe.skip;
describeChapter1('chương 1: bố cục riêng', () => {
  const { project, levelOf } = loadChapter(CHAPTER_1_PROJECT_FILE);

  it('đủ 5 level theo thứ tự, Lexhold đầu tiên, tách file .ldtkl', () => {
    expect(project.jsonVersion).toBe('1.5.3');
    expect(project.levels.map((level) => level.identifier)).toEqual(LEVEL_IDS);
    expect(project.inlineLevels.size).toBe(0);
  });

  it('tileset chapter-1.png có thật, lưới 32, không quá giới hạn atlas', () => {
    const tilesets = [...project.tilesets.values()];
    expect(tilesets.map((tileset) => tileset.relPath)).toEqual(['../tilesets/chapter-1.png']);
    expect(tilesets[0]?.tileGridSize).toBe(32);
    const png = readFileSync(join(ASSETS_DIR, 'tilesets', 'chapter-1.png'));
    expect(png.readUInt32BE(PNG_WIDTH_OFFSET)).toBeLessThanOrEqual(ATLAS_MAX_PX);
    expect(png.readUInt32BE(PNG_WIDTH_OFFSET + 4)).toBeLessThanOrEqual(ATLAS_MAX_PX);
  });

  it('mỗi level có đúng các id entity theo kịch bản', () => {
    for (const [levelId, expected] of Object.entries(CHAPTER_1_EXPECTED)) {
      const level = levelOf(levelId);
      for (const [kind, ids] of Object.entries(expected)) {
        const actual = level.entities.filter((entity) => entity.kind === kind).map(idOf).sort();
        expect(actual, `${levelId}.${kind}`).toEqual([...ids].sort());
      }
      expect(findEntities(level, 'Torch').length, `${levelId} cần đuốc`).toBeGreaterThan(0);
    }
  });

  it('Building 96x64 với cửa (cạnh dưới) đi được', () => {
    const lexhold = levelOf('Lexhold');
    for (const building of findEntities(lexhold, 'Building')) {
      expect([building.width, building.height]).toEqual([96, 64]);
      const grid = lexhold.collision;
      const doorRow = (building.y + building.height) / project.gridSize;
      const doorCells = [0, 1, 2].map((dx) => building.x / project.gridSize + dx);
      expect(doorCells.some((x) => grid !== null && !isSolidCell(grid, x, doorRow)), building.buildingId).toBe(true);
    }
  });

  it('trận hướng dẫn chắn kín lối ra cổng nam Lexhold', () => {
    const lexhold = levelOf('Lexhold');
    const exit = cellsOfKind(lexhold, project.gridSize, 'Portal', 'Misty_Fields/from-lexhold');
    const tutorial = new Set(cellsOfKind(lexhold, project.gridSize, 'BattleTrigger', 'tutorial').map(key));
    expect(exit.some((cell) => reachable(lexhold, spawnCell(lexhold, project.gridSize, 'start')).has(key(cell)))).toBe(true);
    expect(exit.some((cell) => reachable(lexhold, spawnCell(lexhold, project.gridSize, 'start'), tutorial).has(key(cell)))).toBe(false);
  });

  it('ch1-field cắt ngang đường chính, ch1-field-roam nằm ngoài đường chính', () => {
    const fields = levelOf('Misty_Fields');
    const start = spawnCell(fields, project.gridSize, 'from-lexhold');
    const exit = cellsOfKind(fields, project.gridSize, 'Portal', 'Misty_Village/from-fields');
    const blockedBy = (encounterId: string) => new Set(cellsOfKind(fields, project.gridSize, 'BattleTrigger', encounterId).map(key));
    expect(exit.some((cell) => reachable(fields, start, blockedBy('ch1-field')).has(key(cell)))).toBe(false);
    expect(exit.some((cell) => reachable(fields, start, blockedBy('ch1-field-roam')).has(key(cell)))).toBe(true);
  });

  it('cửa nhà nguyện đứng ngay trước cổng vào nhà nguyện', () => {
    const village = levelOf('Misty_Village');
    const door = cellsOfKind(village, project.gridSize, 'Npc', 'chapel-door');
    const portalCells = new Set(cellsOfKind(village, project.gridSize, 'Portal', 'Misty_Chapel/from-village').map(key));
    expect(door.flatMap(neighbours).some((cell) => portalCells.has(key(cell)))).toBe(true);
  });
});
