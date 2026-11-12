import { describe, expect, it } from 'vitest';
import projectJson from '../../assets/maps/test-room.ldtk?raw';
import roomAJson from '../../assets/maps/test-room/Test_Room_A.ldtkl?raw';
import roomBJson from '../../assets/maps/test-room/Test_Room_B.ldtkl?raw';
import lexholdJson from '../../assets/maps/test-room/Lexhold.ldtkl?raw';
import {
  assertSupportedJsonVersion,
  findBrokenPortalLinks,
  findEntities,
  findSpawn,
  isSolidCell,
  LdtkFormatError,
  parseLdtkLevel,
  parseLdtkProject,
  resolveAssetPath,
  type MapLevel,
} from '../src/maps/ldtk-loader';

interface EditableLevel {
  layerInstances: { __type: string; entityInstances: Record<string, unknown>[] }[];
}

/** JSON thô dạng object để test sửa từng trường. */
function parseJson<T = Record<string, unknown>>(text: string): T {
  return JSON.parse(text) as T;
}

const project = parseLdtkProject(JSON.parse(projectJson));
const roomA = parseLdtkLevel(JSON.parse(roomAJson));
const roomB = parseLdtkLevel(JSON.parse(roomBJson));
const lexhold = parseLdtkLevel(JSON.parse(lexholdJson));

function collisionOf(level: MapLevel) {
  if (!level.collision) throw new Error(`${level.identifier} không có lưới va chạm`);
  return level.collision;
}

describe('parseLdtkProject', () => {
  it('đọc project tách level ra file riêng', () => {
    expect(project.jsonVersion).toBe('1.5.3');
    expect(project.gridSize).toBe(32);
    expect(project.levels.map((level) => [level.identifier, level.externalRelPath])).toEqual([
      ['Test_Room_A', 'test-room/Test_Room_A.ldtkl'],
      ['Test_Room_B', 'test-room/Test_Room_B.ldtkl'],
      ['Lexhold', 'test-room/Lexhold.ldtkl'],
    ]);
    expect(project.inlineLevels.size).toBe(0);
    expect([...project.tilesets.values()].map((tileset) => tileset.relPath)).toEqual(['../tilesets/placeholder-dungeon.png']);
  });

  it('từ chối map lưu bằng LDtk khác major', () => {
    const raw = { ...parseJson(projectJson), jsonVersion: '2.0.0' };
    expect(() => parseLdtkProject(raw)).toThrow(LdtkFormatError);
    expect(() => assertSupportedJsonVersion('1.9.1')).not.toThrow();
  });

  it('báo lỗi rõ khi không phải JSON LDtk', () => {
    expect(() => parseLdtkProject(null)).toThrow(LdtkFormatError);
    expect(() => parseLdtkProject({ jsonVersion: '1.5.3' })).toThrow(/defs/);
  });
});

describe('parseLdtkLevel', () => {
  it('đếm đúng entity theo loại', () => {
    const count = (level: MapLevel) =>
      Object.fromEntries(['PlayerSpawn', 'Portal', 'Npc', 'Chest', 'BattleTrigger', 'Torch'].map((kind) => [kind, level.entities.filter((entity) => entity.kind === kind).length]));
    expect(count(roomA)).toEqual({ PlayerSpawn: 3, Portal: 2, Npc: 1, Chest: 1, BattleTrigger: 1, Torch: 3 });
    expect(count(roomB)).toEqual({ PlayerSpawn: 1, Portal: 1, Npc: 0, Chest: 0, BattleTrigger: 0, Torch: 2 });
    expect(roomA.unknownEntities).toEqual([]);
  });

  it('đọc trường entity và quy pivot về góc trên trái', () => {
    const [portal] = findEntities(roomA, 'Portal');
    expect(portal).toMatchObject({ targetLevel: 'Test_Room_B', targetSpawn: 'from_a', x: 704, y: 192, width: 32, height: 64 });
    // PlayerSpawn pivot (0.5, 1): px là giữa đáy ô.
    expect(findSpawn(roomA, 'start')).toMatchObject({ x: 96, y: 192, width: 32, height: 32 });
    expect(findEntities(roomA, 'Npc')[0]?.dialogId).toBe('test_room_guide');
    expect(findEntities(roomA, 'Chest')[0]?.itemId).toBe('test_potion');
    expect(findEntities(roomA, 'BattleTrigger')[0]?.encounterId).toBe('ch1-field');
  });

  it('lưới va chạm: tường viền, cột chắn, sàn và cổng đi được', () => {
    const grid = collisionOf(roomA);
    expect([grid.widthCells, grid.heightCells, grid.gridSize]).toEqual([24, 14, 32]);
    expect(isSolidCell(grid, 0, 0)).toBe(true);
    expect(isSolidCell(grid, 3, 2)).toBe(true); // cột
    expect(isSolidCell(grid, 1, 1)).toBe(false);
    expect(isSolidCell(grid, 22, 6)).toBe(false); // ô cổng
    expect(isSolidCell(grid, -1, 5)).toBe(true);
    expect(isSolidCell(grid, 24, 5)).toBe(true);
  });

  it('điểm xuất hiện và vùng cổng không nằm trong tường', () => {
    for (const level of [roomA, roomB]) {
      const grid = collisionOf(level);
      for (const entity of [...findEntities(level, 'PlayerSpawn'), ...findEntities(level, 'Portal')]) {
        const cellX = Math.floor(entity.x / grid.gridSize);
        const cellY = Math.floor(entity.y / grid.gridSize);
        expect(isSolidCell(grid, cellX, cellY), `${level.identifier} ${entity.kind} ${entity.iid}`).toBe(false);
      }
    }
  });

  it('layer tile xếp từ dưới lên và phủ kín level', () => {
    expect(roomA.tileLayers.map((layer) => [layer.identifier, layer.stackIndex])).toEqual([['Ground', 0]]);
    expect(roomA.tileLayers[0]?.tiles).toHaveLength(24 * 14);
    expect(roomA.widthPx).toBe(768);
  });

  it('bỏ qua entity lạ, báo lỗi khi thiếu trường bắt buộc', () => {
    const raw = parseJson<EditableLevel>(roomBJson);
    const entities = raw.layerInstances.find((layer) => layer.__type === 'Entities')?.entityInstances ?? [];
    const [firstEntity] = entities;
    if (!firstEntity) throw new Error('Map thử thiếu entity');
    entities.push({ ...firstEntity, __identifier: 'FutureThing', iid: 'x' });
    expect(parseLdtkLevel(raw).unknownEntities).toEqual(['FutureThing']);

    firstEntity.fieldInstances = [];
    expect(() => parseLdtkLevel(raw)).toThrow(/spawnId/);
  });

  it('đọc công trình của thành trì, báo lỗi khi mã công trình lạ', () => {
    expect(findEntities(lexhold, 'Building').map((building) => building.buildingId)).toEqual(['forge', 'arcane-tower', 'tailor', 'library']);
    expect(findEntities(lexhold, 'Building')[0]).toMatchObject({ x: 64, y: 64, width: 96, height: 64 });

    const raw = parseJson<EditableLevel>(lexholdJson);
    const entities = raw.layerInstances.find((layer) => layer.__type === 'Entities')?.entityInstances ?? [];
    const building = entities.find((entity) => entity.__identifier === 'Building');
    if (!building) throw new Error('Thành trì thử thiếu công trình');
    building.fieldInstances = [{ __identifier: 'buildingId', __value: 'casino', __type: 'String' }];
    expect(() => parseLdtkLevel(raw)).toThrow(/buildingId/);
  });

  it('level tách file mà chưa nạp .ldtkl thì báo lỗi', () => {
    const raw = parseJson<{ levels: unknown[] }>(projectJson).levels[0];
    expect(() => parseLdtkLevel(raw)).toThrow(/ldtkl/);
  });
});

describe('tile chồng, độ lệch layer, project nhiều world', () => {
  interface EditableLayer {
    __type: string;
    __pxTotalOffsetX: number;
    __pxTotalOffsetY: number;
    gridTiles: { px: number[]; src: number[]; f: number; t: number; a?: number }[];
    entityInstances: Record<string, unknown>[];
  }

  function roomBLayers(): { raw: { layerInstances: EditableLayer[] }; byType: (type: string) => EditableLayer } {
    const raw = parseJson<{ layerInstances: EditableLayer[] }>(roomBJson);
    const byType = (type: string): EditableLayer => {
      const layer = raw.layerInstances.find((candidate) => candidate.__type === type);
      if (!layer) throw new Error(`Map thử thiếu layer ${type}`);
      return layer;
    };
    return { raw, byType };
  }

  it('ô có nhiều tile được tách thành lớp con, giữ thứ tự vẽ và alpha', () => {
    const { raw, byType } = roomBLayers();
    const ground = byType('Tiles');
    ground.gridTiles.push({ px: [32, 32], src: [0, 32], f: 1, t: 4, a: 0.5 });
    const layers = parseLdtkLevel(raw).tileLayers;
    expect(layers.map((layer) => [layer.identifier, layer.stackIndex, layer.tiles.length])).toEqual([
      ['Ground', 0, 16 * 12],
      ['Ground', 1, 1],
    ]);
    expect(layers[1]?.tiles[0]).toEqual({ cellX: 1, cellY: 1, tileIndex: 4, flipX: true, flipY: false, alpha: 0.5 });
  });

  it('cộng độ lệch layer vào entity và lưới va chạm', () => {
    const { raw, byType } = roomBLayers();
    Object.assign(byType('Entities'), { __pxTotalOffsetX: 8, __pxTotalOffsetY: 4 });
    Object.assign(byType('IntGrid'), { __pxTotalOffsetX: 8, __pxTotalOffsetY: 4 });
    const level = parseLdtkLevel(raw);
    expect(findSpawn(level, 'from_a')).toMatchObject({ x: 104, y: 196 });
    expect(level.collision).toMatchObject({ offsetX: 8, offsetY: 4 });
  });

  it('entity thiếu kích thước báo LdtkFormatError thay vì TypeError', () => {
    const { raw, byType } = roomBLayers();
    const [entity] = byType('Entities').entityInstances;
    if (!entity) throw new Error('Map thử thiếu entity');
    delete entity.width;
    expect(() => parseLdtkLevel(raw)).toThrow(LdtkFormatError);
  });

  it('project nhiều world báo lỗi rõ', () => {
    const raw = { ...parseJson(projectJson), levels: [], worlds: [{ identifier: 'World', levels: [] }] };
    expect(() => parseLdtkProject(raw)).toThrow(/nhiều world/);
  });
});

describe('liên kết cổng', () => {
  it('mọi cổng của map thử trỏ tới level và spawn có thật, đi được hai chiều', () => {
    expect(findBrokenPortalLinks([roomA, roomB, lexhold])).toEqual([]);
    expect(findEntities(roomB, 'Portal')[0]).toMatchObject({ targetLevel: 'Test_Room_A', targetSpawn: 'from_b' });
  });

  it('phát hiện cổng gãy', () => {
    expect(findBrokenPortalLinks([roomA, lexhold])).toEqual([expect.stringContaining('Test_Room_B')]);
  });
});

describe('resolveAssetPath', () => {
  it('ghép đường dẫn tương đối của LDtk', () => {
    expect(resolveAssetPath('maps/test-room.ldtk', '../tilesets/placeholder-dungeon.png')).toBe('tilesets/placeholder-dungeon.png');
    expect(resolveAssetPath('maps/test-room.ldtk', 'test-room/Test_Room_A.ldtkl')).toBe('maps/test-room/Test_Room_A.ldtkl');
    expect(resolveAssetPath('maps/a.ldtk', '.\\sub\\b.png')).toBe('maps/sub/b.png');
  });

  it('chặn đường dẫn thoát khỏi thư mục asset', () => {
    expect(() => resolveAssetPath('maps/a.ldtk', '../../secret.png')).toThrow(LdtkFormatError);
  });
});
