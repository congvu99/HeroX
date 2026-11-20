import { readFileSync } from 'node:fs';
import { ENCOUNTERS, SCARECROW_BOSS_ENCOUNTER_ID, SMITHY_ENCOUNTER_ID } from '@herox/shared';
import { describe, expect, it } from 'vitest';
import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from '../src/config/display';
import { ARENA_CELL_PX, ARENA_COLUMNS, ARENA_ROWS, ARENA_THEMES, arenaCellCenter, arenaThemeFor, arenaTileNames, buildArenaLayout } from '../src/battle/battle-arena-layout';

const TILE_INDEX = JSON.parse(readFileSync(new URL('../../assets/tilesets/chapter-1-tiles.json', import.meta.url), 'utf8')) as Record<string, number>;

/** Hàng 2–8 là dải giữa trống cho quái (trên) và hiệp sĩ (dưới). */
const STAGE_ROWS = [2, 3, 4, 5, 6, 7, 8];

describe('battle-arena-layout', () => {
  it.each(ARENA_THEMES)('sân %s đủ 6×11 ô, mọi tile có trong atlas chương 1', (theme) => {
    const layout = buildArenaLayout(theme);
    expect(layout.cells).toHaveLength(ARENA_ROWS);
    for (const row of layout.cells) expect(row).toHaveLength(ARENA_COLUMNS);
    for (const name of arenaTileNames(layout)) expect(TILE_INDEX[name], name).toBeTypeOf('number');
  });

  it.each(ARENA_THEMES)('sân %s không đặt vật thể chắn chỗ đứng và có nguồn sáng', (theme) => {
    const layout = buildArenaLayout(theme);
    for (const row of STAGE_ROWS) {
      expect(layout.cells[row]?.some((cell) => cell.decor !== null)).toBe(false);
    }
    expect(layout.lights.length).toBeGreaterThan(0);
  });

  it('bố cục tất định: dựng hai lần ra cùng kết quả', () => {
    expect(buildArenaLayout('fields')).toEqual(buildArenaLayout('fields'));
  });

  it('mọi trận chương 1 có chủ đề; lò rèn ở làng, trùm ở hầm có tàn lửa', () => {
    for (const encounter of ENCOUNTERS) expect(ARENA_THEMES).toContain(arenaThemeFor(encounter.id));
    expect(arenaThemeFor(SMITHY_ENCOUNTER_ID)).toBe('village');
    expect(arenaThemeFor(SCARECROW_BOSS_ENCOUNTER_ID)).toBe('lair');
    expect(buildArenaLayout('lair').embers).toBe(true);
    expect(arenaThemeFor('trận-chưa-có')).toBe('fields');
  });

  it('sân cùng tâm với khung dọc: mép thừa chia đều hai bên, trên dưới', () => {
    const first = arenaCellCenter(0, 0);
    const last = arenaCellCenter(ARENA_COLUMNS - 1, ARENA_ROWS - 1);
    expect((first.x + last.x) / 2).toBe(LOGICAL_WIDTH / 2);
    expect((first.y + last.y) / 2).toBe(LOGICAL_HEIGHT / 2);
    expect(ARENA_COLUMNS * ARENA_CELL_PX).toBeGreaterThanOrEqual(LOGICAL_WIDTH);
  });
});
