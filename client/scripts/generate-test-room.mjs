// Sinh map thử `assets/maps/test-room.ldtk` (LDtk 1.5.3, level tách file) và tileset placeholder.
// Chạy: node client/scripts/generate-test-room.mjs. Map thật soạn bằng LDtk editor ở phase nội dung;
// file này chỉ để có map nhỏ tái tạo được cho test loader và chạy thử di chuyển.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crc32, deflateSync } from 'node:zlib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'assets');
const GRID = 32;
const LDTK_VERSION = '1.5.3';
const TILESET_COLUMNS = 4;
const TILESET_ROWS = 2;
const TILESET_REL_PATH = '../tilesets/placeholder-dungeon.png';

const TILE = { floor: 0, floorAlt: 1, wallTop: 2, wallFace: 3, moss: 4, rune: 5, pillar: 6, carpet: 7 };

// ---------- Tileset PNG ----------

function encodePng(width, height, rgba) {
  const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([length, body, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // 8 bit mỗi kênh
  header[9] = 6; // RGBA
  const rows = [];
  for (let y = 0; y < height; y++) {
    rows.push(Buffer.from([0]), rgba.subarray(y * width * 4, (y + 1) * width * 4));
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function hexToRgb(hex) {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

/** Mỗi tile: màu nền + hoạ tiết đơn giản đủ phân biệt sàn, tường, cột, cổng. */
const TILE_PAINTERS = {
  [TILE.floor]: (x, y) => ((x % 16 === 0 || y % 16 === 0) ? '#25222e' : '#2f2b3a'),
  [TILE.floorAlt]: (x, y) => ((x + y) % 11 === 0 ? '#3a3547' : '#2c2837'),
  [TILE.wallTop]: (x, y) => (y < 4 ? '#5a5168' : (x % 8 === 0 ? '#3b3446' : '#4a4257')),
  [TILE.wallFace]: (x, y) => ((y % 8 === 0 || (x + (y >> 3) * 4) % 16 === 0) ? '#2a2433' : '#3d3549'),
  [TILE.moss]: (x, y) => ((x * 7 + y * 3) % 9 === 0 ? '#3f5a3a' : '#2e3b2f'),
  [TILE.rune]: (x, y) => {
    const distance = Math.hypot(x - 15.5, y - 15.5);
    return distance > 9 && distance < 12 ? '#c46a2b' : '#2f2b3a';
  },
  [TILE.pillar]: (x, y) => {
    const distance = Math.hypot(x - 15.5, y - 15.5);
    if (distance < 11) return x < 14 ? '#6c6378' : '#4e4659';
    return '#2f2b3a';
  },
  [TILE.carpet]: (x, y) => ((x < 3 || x > 28) ? '#8a6b2e' : (y % 6 === 0 ? '#5c1d24' : '#6e232c')),
};

function buildTileset() {
  const width = TILESET_COLUMNS * GRID;
  const height = TILESET_ROWS * GRID;
  const rgba = Buffer.alloc(width * height * 4);
  for (let tile = 0; tile < TILESET_COLUMNS * TILESET_ROWS; tile++) {
    const originX = (tile % TILESET_COLUMNS) * GRID;
    const originY = Math.floor(tile / TILESET_COLUMNS) * GRID;
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        const [r, g, b] = hexToRgb(TILE_PAINTERS[tile](x, y));
        const offset = ((originY + y) * width + originX + x) * 4;
        rgba[offset] = r;
        rgba[offset + 1] = g;
        rgba[offset + 2] = b;
        rgba[offset + 3] = 255;
      }
    }
  }
  return { width, height, png: encodePng(width, height, rgba) };
}

// ---------- Định nghĩa LDtk ----------

const UID = {
  tileset: 1,
  layerEntities: 10,
  layerCollision: 11,
  layerGround: 12,
  entity: { PlayerSpawn: 20, Portal: 21, Npc: 22, Chest: 23, BattleTrigger: 24, Torch: 25, Building: 26 },
  field: {
    spawnId: 40,
    targetLevel: 41,
    targetSpawn: 42,
    dialogId: 43,
    itemId: 44,
    encounterId: 45,
    buildingId: 46,
  },
};
const NEXT_UID = 100;

const ENTITY_DEFS = [
  { id: 'PlayerSpawn', color: '#3BE06C', width: 32, height: 32, pivot: [0.5, 1], fields: ['spawnId'] },
  { id: 'Portal', color: '#C46A2B', width: 32, height: 32, pivot: [0, 0], resizable: true, fields: ['targetLevel', 'targetSpawn'] },
  { id: 'Npc', color: '#E8D9A8', width: 32, height: 32, pivot: [0.5, 1], fields: ['dialogId'] },
  { id: 'Chest', color: '#D9A13B', width: 32, height: 32, pivot: [0.5, 1], fields: ['itemId'] },
  { id: 'BattleTrigger', color: '#B32D3A', width: 32, height: 32, pivot: [0, 0], resizable: true, fields: ['encounterId'] },
  { id: 'Torch', color: '#FFB347', width: 16, height: 16, pivot: [0.5, 0.5], fields: [] },
  { id: 'Building', color: '#E8C66A', width: 96, height: 64, pivot: [0, 0], resizable: true, fields: ['buildingId'] },
];

function fieldDef(identifier) {
  return {
    identifier, doc: null, __type: 'String', uid: UID.field[identifier], type: 'F_String', isArray: false,
    canBeNull: false, arrayMinLength: null, arrayMaxLength: null, editorDisplayMode: 'NameAndValue',
    editorDisplayScale: 1, editorDisplayPos: 'Above', editorLinkStyle: 'StraightArrow', editorDisplayColor: null,
    editorAlwaysShow: false, editorShowInWorld: true, editorCutLongValues: true, editorTextSuffix: null,
    editorTextPrefix: null, useForSmartColor: false, exportToToc: false, searchable: false, min: null, max: null,
    regex: null, acceptFileTypes: null, defaultOverride: null, textLanguageMode: null, symmetricalRef: false,
    autoChainRef: true, allowOutOfLevelRef: true, allowedRefs: 'OnlySame', allowedRefsEntityUid: null,
    allowedRefTags: [], tilesetUid: null,
  };
}

function entityDef(def) {
  return {
    identifier: def.id, uid: UID.entity[def.id], tags: [], exportToToc: false, allowOutOfBounds: false, doc: null,
    width: def.width, height: def.height, resizableX: Boolean(def.resizable), resizableY: Boolean(def.resizable),
    minWidth: null, maxWidth: null, minHeight: null, maxHeight: null, keepAspectRatio: false, tileOpacity: 1,
    fillOpacity: 0.08, lineOpacity: 1, hollow: false, color: def.color, renderMode: 'Rectangle', showName: true,
    tilesetId: null, tileRenderMode: 'FitInside', tileRect: null, uiTileRect: null, nineSliceBorders: [],
    maxCount: 0, limitScope: 'PerLevel', limitBehavior: 'MoveLastOne', pivotX: def.pivot[0], pivotY: def.pivot[1],
    fieldDefs: def.fields.map(fieldDef),
  };
}

function layerDef(type, identifier, uid, extra = {}) {
  return {
    __type: type, identifier, type, uid, doc: null, uiColor: null, gridSize: GRID, guideGridWid: 0, guideGridHei: 0,
    displayOpacity: 1, inactiveOpacity: 0.6, hideInList: false, hideFieldsWhenInactive: true,
    canSelectWhenInactive: true, renderInWorldView: true, pxOffsetX: 0, pxOffsetY: 0, parallaxFactorX: 0,
    parallaxFactorY: 0, parallaxScaling: true, requiredTags: [], excludedTags: [],
    autoTilesKilledByOtherLayers: false, uiFilterTags: [], useAsyncRender: false, intGridValues: [],
    intGridValuesGroups: [], autoRuleGroups: [], autoSourceLayerDefUid: null, tilesetDefUid: null, tilePivotX: 0,
    tilePivotY: 0, biomeFieldUid: null, ...extra,
  };
}

// ---------- Level ----------

// '#' tường, 'o' cột (chắn), '.' sàn, ',' rêu, '=' thảm, 'R' sàn cổng.
const LEVELS = [
  {
    identifier: 'Test_Room_A',
    iid: '7f1c2a10-6a3e-11f0-9a6b-0b5d8e1f0a01',
    worldX: 0,
    rows: [
      '########################',
      '#......................#',
      '#..o.......,,......o...#',
      '#.........,,,,.........#',
      '#......=======.........#',
      '#......=======....o....#',
      'R......=======........R#',
      'R..o...=======........R#',
      '#.........,,...........#',
      '#.....o................#',
      '#..........o.....,,....#',
      '#..............,,,,....#',
      '#..o...................#',
      '########################',
    ],
    entities: [
      { id: 'PlayerSpawn', cell: [3, 6], fields: { spawnId: 'start' } },
      { id: 'PlayerSpawn', cell: [20, 7], fields: { spawnId: 'from_b' } },
      { id: 'PlayerSpawn', cell: [2, 7], fields: { spawnId: 'from_lexhold' } },
      { id: 'Portal', cell: [22, 6], size: [32, 64], fields: { targetLevel: 'Test_Room_B', targetSpawn: 'from_a' } },
      { id: 'Portal', cell: [0, 6], size: [32, 64], fields: { targetLevel: 'Lexhold', targetSpawn: 'from_room_a' } },
      { id: 'Npc', cell: [10, 3], fields: { dialogId: 'test_room_guide' } },
      { id: 'Chest', cell: [15, 10], fields: { itemId: 'test_potion' } },
      { id: 'BattleTrigger', cell: [14, 1], size: [96, 64], fields: { encounterId: 'ch1-field' } },
      { id: 'Torch', cell: [6, 1], fields: {} },
      { id: 'Torch', cell: [17, 1], fields: {} },
      { id: 'Torch', cell: [6, 12], fields: {} },
    ],
  },
  {
    identifier: 'Test_Room_B',
    iid: '7f1c2a10-6a3e-11f0-9a6b-0b5d8e1f0a02',
    worldX: 24 * GRID + 64,
    rows: [
      '################',
      '#..............#',
      '#...o......o...#',
      '#..............#',
      '#.....,,,,.....#',
      'R....,,,,,,....#',
      'R.....,,,,.....#',
      '#..............#',
      '#...o......o...#',
      '#..............#',
      '#..............#',
      '################',
    ],
    entities: [
      { id: 'PlayerSpawn', cell: [3, 6], fields: { spawnId: 'from_a' } },
      { id: 'Portal', cell: [0, 5], size: [32, 64], fields: { targetLevel: 'Test_Room_A', targetSpawn: 'from_b' } },
      { id: 'Torch', cell: [7, 1], fields: {} },
      { id: 'Torch', cell: [7, 10], fields: {} },
    ],
  },
  // Thành trì Lexhold tạm: 4 công trình ('b' là nền móng, chắn đường), cửa ở cạnh dưới mỗi công trình.
  {
    identifier: 'Lexhold',
    iid: '7f1c2a10-6a3e-11f0-9a6b-0b5d8e1f0a03',
    worldX: -(22 * GRID + 64),
    rows: [
      '######################',
      '#....................#',
      '#.bbb....bbb....bbb..#',
      '#.bbb....bbb....bbb..#',
      '#....................#',
      '#.........,,.........#',
      '#.bbb....====........R',
      '#.bbb....====........R',
      '#........====........#',
      '#.....,,.............#',
      '#....................#',
      '######################',
    ],
    entities: [
      { id: 'PlayerSpawn', cell: [10, 9], fields: { spawnId: 'start' } },
      { id: 'PlayerSpawn', cell: [19, 7], fields: { spawnId: 'from_room_a' } },
      { id: 'Portal', cell: [21, 6], size: [32, 64], fields: { targetLevel: 'Test_Room_A', targetSpawn: 'from_lexhold' } },
      { id: 'Building', cell: [2, 2], size: [96, 64], fields: { buildingId: 'forge' } },
      { id: 'Building', cell: [9, 2], size: [96, 64], fields: { buildingId: 'arcane-tower' } },
      { id: 'Building', cell: [16, 2], size: [96, 64], fields: { buildingId: 'tailor' } },
      { id: 'Building', cell: [2, 6], size: [96, 64], fields: { buildingId: 'library' } },
      { id: 'Torch', cell: [5, 4], fields: {} },
      { id: 'Torch', cell: [15, 4], fields: {} },
      { id: 'Torch', cell: [6, 9], fields: {} },
    ],
  },
];

const SOLID_CHARS = new Set(['#', 'o', 'b']);

function tileFor(char, rows, x, y) {
  if (char === '#') return rows[y + 1]?.[x] !== undefined && rows[y + 1][x] !== '#' ? TILE.wallFace : TILE.wallTop;
  if (char === 'o') return TILE.pillar;
  if (char === ',') return TILE.moss;
  if (char === '=') return TILE.carpet;
  if (char === 'R') return TILE.rune;
  return (x * 3 + y * 5) % 7 === 0 ? TILE.floorAlt : TILE.floor;
}

function gridTile(tileId, cellX, cellY, coordId) {
  const src = [(tileId % TILESET_COLUMNS) * GRID, Math.floor(tileId / TILESET_COLUMNS) * GRID];
  return { px: [cellX * GRID, cellY * GRID], src, f: 0, t: tileId, d: [coordId], a: 1 };
}

/** iid cố định (UUID dạng chuỗi) cho layer/entity con, để sinh lại map không đổi diff. */
function childIid(levelDef, marker, index) {
  const levelNumber = LEVELS.indexOf(levelDef) + 1;
  return `${levelDef.iid.slice(0, 24)}0b5d8e${levelNumber}${marker}${index.toString(16).padStart(4, '0')}`;
}

function entityInstance(levelDef, entity, index) {
  const def = ENTITY_DEFS.find((candidate) => candidate.id === entity.id);
  const [width, height] = entity.size ?? [def.width, def.height];
  // Điểm pivot nằm ở góc trên trái ô với pivot (0,0), giữa đáy ô với pivot (0.5,1).
  const px = [entity.cell[0] * GRID + def.pivot[0] * width, entity.cell[1] * GRID + def.pivot[1] * height];
  return {
    __identifier: def.id, __grid: entity.cell, __pivot: def.pivot, __tags: [], __tile: null,
    __smartColor: def.color, __worldX: levelDef.worldX + px[0], __worldY: px[1],
    iid: childIid(levelDef, 'e', index),
    width, height, defUid: UID.entity[def.id], px,
    fieldInstances: def.fields.map((identifier) => ({
      __identifier: identifier, __type: 'String', __value: entity.fields[identifier], __tile: null,
      defUid: UID.field[identifier],
      realEditorValues: [{ id: 'V_String', params: [entity.fields[identifier]] }],
    })),
  };
}

function layerInstance(levelDef, type, identifier, layerDefUid, content) {
  const width = levelDef.rows[0].length;
  const height = levelDef.rows.length;
  const isTiles = type === 'Tiles';
  return {
    __identifier: identifier, __type: type, __cWid: width, __cHei: height, __gridSize: GRID, __opacity: 1,
    __pxTotalOffsetX: 0, __pxTotalOffsetY: 0, __tilesetDefUid: isTiles ? UID.tileset : null,
    __tilesetRelPath: isTiles ? TILESET_REL_PATH : null, iid: childIid(levelDef, 'a', layerDefUid),
    levelId: LEVELS.indexOf(levelDef), layerDefUid, pxOffsetX: 0, pxOffsetY: 0, visible: true, optionalRules: [],
    intGridCsv: [], autoLayerTiles: [], seed: 4242, overrideTilesetUid: null, gridTiles: [], entityInstances: [],
    ...content,
  };
}

function buildLevel(levelDef, levelIndex) {
  const { rows } = levelDef;
  const width = rows[0].length;
  const intGridCsv = [];
  const gridTiles = [];
  rows.forEach((row, y) => {
    if (row.length !== width) throw new Error(`${levelDef.identifier}: dòng ${y} sai độ dài`);
    [...row].forEach((char, x) => {
      intGridCsv.push(SOLID_CHARS.has(char) ? 1 : 0);
      gridTiles.push(gridTile(tileFor(char, rows, x, y), x, y, y * width + x));
    });
  });
  const pxWid = width * GRID;
  const pxHei = rows.length * GRID;
  return {
    identifier: levelDef.identifier, iid: levelDef.iid, uid: 50 + levelIndex, worldX: levelDef.worldX, worldY: 0,
    worldDepth: 0, pxWid, pxHei, __bgColor: '#0B0B12', bgColor: '#0B0B12', useAutoIdentifier: false,
    bgRelPath: null, bgPos: null, bgPivotX: 0.5, bgPivotY: 0.5, __smartColor: '#7A7486', __bgPos: null,
    externalRelPath: null, fieldInstances: [],
    layerInstances: [
      layerInstance(levelDef, 'Entities', 'Entities', UID.layerEntities, {
        entityInstances: levelDef.entities.map((entity, index) => entityInstance(levelDef, entity, index)),
      }),
      layerInstance(levelDef, 'IntGrid', 'Collision', UID.layerCollision, { intGridCsv }),
      layerInstance(levelDef, 'Tiles', 'Ground', UID.layerGround, { gridTiles }),
    ],
    __neighbours: [],
  };
}

function buildProject(tileset, levels) {
  return {
    __header__: {
      fileType: 'LDtk Project JSON', app: 'LDtk', doc: 'https://ldtk.io/json',
      schema: 'https://ldtk.io/files/JSON_SCHEMA.json', appAuthor: 'Sebastien \'deepnight\' Benard',
      appVersion: LDTK_VERSION, url: 'https://ldtk.io',
    },
    iid: '7f1c2a10-6a3e-11f0-9a6b-0b5d8e1f0a00', jsonVersion: LDTK_VERSION, appBuildId: 473703, nextUid: NEXT_UID,
    identifierStyle: 'Capitalize', toc: [], worldLayout: 'Free', worldGridWidth: 256, worldGridHeight: 256,
    defaultLevelWidth: 640, defaultLevelHeight: 384, defaultPivotX: 0, defaultPivotY: 0, defaultGridSize: GRID,
    defaultEntityWidth: GRID, defaultEntityHeight: GRID, bgColor: '#0B0B12', defaultLevelBgColor: '#0B0B12',
    minifyJson: false, externalLevels: true, exportTiled: false, simplifiedExport: false, imageExportMode: 'None',
    exportLevelBg: true, pngFilePattern: null, backupOnSave: false, backupLimit: 10, backupRelPath: null,
    levelNamePattern: 'Level_%idx', tutorialDesc: null, customCommands: [], flags: [],
    defs: {
      layers: [
        layerDef('Entities', 'Entities', UID.layerEntities),
        layerDef('IntGrid', 'Collision', UID.layerCollision, {
          intGridValues: [{ value: 1, identifier: 'Wall', color: '#7A3B3B', tile: null, groupUid: 0 }],
        }),
        layerDef('Tiles', 'Ground', UID.layerGround, { tilesetDefUid: UID.tileset }),
      ],
      entities: ENTITY_DEFS.map(entityDef),
      tilesets: [{
        __cWid: TILESET_COLUMNS, __cHei: TILESET_ROWS, identifier: 'Placeholder_dungeon', uid: UID.tileset,
        relPath: TILESET_REL_PATH, embedAtlas: null, pxWid: tileset.width, pxHei: tileset.height, tileGridSize: GRID,
        spacing: 0, padding: 0, tags: [], tagsSourceEnumUid: null, enumTags: [], customData: [], savedSelections: [],
        cachedPixelData: null,
      }],
      enums: [], externalEnums: [], levelFields: [],
    },
    levels: levels.map(({ level, relPath }) => ({ ...level, layerInstances: null, externalRelPath: relPath })),
    worlds: [], dummyWorldIid: '7f1c2a10-6a3e-11f0-9a6b-0b5d8e1f0aff',
  };
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, '\t')}\n`);
}

const tileset = buildTileset();
mkdirSync(join(ROOT, 'tilesets'), { recursive: true });
writeFileSync(join(ROOT, 'tilesets', 'placeholder-dungeon.png'), tileset.png);

const levels = LEVELS.map((levelDef, index) => ({
  level: buildLevel(levelDef, index),
  relPath: `test-room/${levelDef.identifier}.ldtkl`,
}));
for (const { level, relPath } of levels) writeJson(join(ROOT, 'maps', relPath), level);
writeJson(join(ROOT, 'maps', 'test-room.ldtk'), buildProject(tileset, levels));
