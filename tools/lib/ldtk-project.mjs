// Dựng JSON LDtk 1.5.3 (project + level tách file .ldtkl) từ mô tả level dạng lưới ký tự.
// Cấu trúc giống client/scripts/generate-test-room.mjs để loader và LDtk editor mở được như nhau.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export const GRID = 32;
export const LDTK_VERSION = '1.5.3';
const APP_BUILD_ID = 473703;
const LEVEL_UID_BASE = 50;
const NEXT_UID = 100;
const AUTO_LAYER_SEED = 4242;
const BG_COLOR = '#0B0A10';

export const UID = {
  tileset: 1,
  layerEntities: 10,
  layerCollision: 11,
  layerGround: 12,
  layerDecor: 13,
  entity: { PlayerSpawn: 20, Portal: 21, Npc: 22, Chest: 23, BattleTrigger: 24, Torch: 25, Building: 26 },
  field: { spawnId: 40, targetLevel: 41, targetSpawn: 42, dialogId: 43, itemId: 44, encounterId: 45, buildingId: 46 },
};

export const ENTITY_DEFS = [
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

/** iid cố định dạng UUID cho layer/entity con, để sinh lại map không đổi diff. */
function childIid(level, marker, index) {
  return `${level.iid.slice(0, 24)}${level.iidTag}${marker}${index.toString(16).padStart(4, '0')}`;
}

function entityInstance(level, entity, index) {
  const def = ENTITY_DEFS.find((candidate) => candidate.id === entity.id);
  if (!def) throw new Error(`${level.identifier}: entity "${entity.id}" không có định nghĩa`);
  const [width, height] = entity.size ?? [def.width, def.height];
  // pivot (0,0): px là góc trên trái ô; pivot (0.5,1): px là giữa đáy ô; Torch (0.5,0.5): tâm ô.
  const px = [entity.cell[0] * GRID + def.pivot[0] * Math.max(width, GRID), entity.cell[1] * GRID + def.pivot[1] * Math.max(height, GRID)];
  return {
    __identifier: def.id, __grid: entity.cell, __pivot: def.pivot, __tags: [], __tile: null,
    __smartColor: def.color, __worldX: level.worldX + px[0], __worldY: level.worldY + px[1],
    iid: childIid(level, 'e', index), width, height, defUid: UID.entity[def.id], px,
    fieldInstances: def.fields.map((identifier) => ({
      __identifier: identifier, __type: 'String', __value: entity.fields[identifier], __tile: null,
      defUid: UID.field[identifier], realEditorValues: [{ id: 'V_String', params: [entity.fields[identifier]] }],
    })),
  };
}

function layerInstance(level, context, type, identifier, layerDefUid, content) {
  const isTiles = type === 'Tiles';
  return {
    __identifier: identifier, __type: type, __cWid: level.widthCells, __cHei: level.heightCells, __gridSize: GRID,
    __opacity: 1, __pxTotalOffsetX: 0, __pxTotalOffsetY: 0, __tilesetDefUid: isTiles ? UID.tileset : null,
    __tilesetRelPath: isTiles ? context.tilesetRelPath : null, iid: childIid(level, 'a', layerDefUid),
    levelId: level.index, layerDefUid, pxOffsetX: 0, pxOffsetY: 0, visible: true, optionalRules: [],
    intGridCsv: [], autoLayerTiles: [], seed: AUTO_LAYER_SEED, overrideTilesetUid: null, gridTiles: [],
    entityInstances: [], ...content,
  };
}

function gridTile(tileId, cellX, cellY, widthCells, columns) {
  const src = [(tileId % columns) * GRID, Math.floor(tileId / columns) * GRID];
  return { px: [cellX * GRID, cellY * GRID], src, f: 0, t: tileId, d: [cellY * widthCells + cellX], a: 1 };
}

/**
 * Level đã giải mã: `cells[y][x] = { ground, decor, solid }` (ground/decor là chỉ số tile hoặc null).
 * `context`: { tilesetRelPath, columns, bgColor? } (bgColor mặc định nền tối cũ).
 */
export function buildLevelJson(level, context) {
  const intGridCsv = [];
  const groundTiles = [];
  const decorTiles = [];
  level.cells.forEach((row, y) => row.forEach((cell, x) => {
    intGridCsv.push(cell.solid ? 1 : 0);
    groundTiles.push(gridTile(cell.ground, x, y, level.widthCells, context.columns));
    if (cell.decor !== null) decorTiles.push(gridTile(cell.decor, x, y, level.widthCells, context.columns));
  }));
  return {
    identifier: level.identifier, iid: level.iid, uid: LEVEL_UID_BASE + level.index, worldX: level.worldX,
    worldY: level.worldY, worldDepth: 0, pxWid: level.widthCells * GRID, pxHei: level.heightCells * GRID,
    __bgColor: context.bgColor ?? BG_COLOR, bgColor: context.bgColor ?? BG_COLOR, useAutoIdentifier: false, bgRelPath: null, bgPos: null, bgPivotX: 0.5,
    bgPivotY: 0.5, __smartColor: '#7A7486', __bgPos: null, externalRelPath: null, fieldInstances: [],
    layerInstances: [
      layerInstance(level, context, 'Entities', 'Entities', UID.layerEntities, {
        entityInstances: level.entities.map((entity, index) => entityInstance(level, entity, index)),
      }),
      layerInstance(level, context, 'IntGrid', 'Collision', UID.layerCollision, { intGridCsv }),
      layerInstance(level, context, 'Tiles', 'Decor', UID.layerDecor, { gridTiles: decorTiles }),
      layerInstance(level, context, 'Tiles', 'Ground', UID.layerGround, { gridTiles: groundTiles }),
    ],
    __neighbours: [],
  };
}

/** `project`: { iid, dummyWorldIid, bgColor?, tileset: { identifier, relPath, width, height, columns, rows } }. */
export function buildProjectJson(project, levels) {
  const { tileset } = project;
  return {
    __header__: {
      fileType: 'LDtk Project JSON', app: 'LDtk', doc: 'https://ldtk.io/json',
      schema: 'https://ldtk.io/files/JSON_SCHEMA.json', appAuthor: 'Sebastien \'deepnight\' Benard',
      appVersion: LDTK_VERSION, url: 'https://ldtk.io',
    },
    iid: project.iid, jsonVersion: LDTK_VERSION, appBuildId: APP_BUILD_ID, nextUid: NEXT_UID,
    identifierStyle: 'Capitalize', toc: [], worldLayout: 'Free', worldGridWidth: 256, worldGridHeight: 256,
    defaultLevelWidth: 640, defaultLevelHeight: 384, defaultPivotX: 0, defaultPivotY: 0, defaultGridSize: GRID,
    defaultEntityWidth: GRID, defaultEntityHeight: GRID, bgColor: project.bgColor ?? BG_COLOR, defaultLevelBgColor: project.bgColor ?? BG_COLOR,
    minifyJson: false, externalLevels: true, exportTiled: false, simplifiedExport: false, imageExportMode: 'None',
    exportLevelBg: true, pngFilePattern: null, backupOnSave: false, backupLimit: 10, backupRelPath: null,
    levelNamePattern: 'Level_%idx', tutorialDesc: null, customCommands: [], flags: [],
    defs: {
      layers: [
        layerDef('Entities', 'Entities', UID.layerEntities),
        layerDef('IntGrid', 'Collision', UID.layerCollision, {
          intGridValues: [{ value: 1, identifier: 'Wall', color: '#7A3B3B', tile: null, groupUid: 0 }],
        }),
        layerDef('Tiles', 'Decor', UID.layerDecor, { tilesetDefUid: UID.tileset }),
        layerDef('Tiles', 'Ground', UID.layerGround, { tilesetDefUid: UID.tileset }),
      ],
      entities: ENTITY_DEFS.map(entityDef),
      tilesets: [{
        __cWid: tileset.columns, __cHei: tileset.rows, identifier: tileset.identifier, uid: UID.tileset,
        relPath: tileset.relPath, embedAtlas: null, pxWid: tileset.width, pxHei: tileset.height, tileGridSize: GRID,
        spacing: 0, padding: 0, tags: [], tagsSourceEnumUid: null, enumTags: [], customData: [], savedSelections: [],
        cachedPixelData: null,
      }],
      enums: [], externalEnums: [], levelFields: [],
    },
    levels: levels.map(({ json, relPath }) => ({ ...json, layerInstances: null, externalRelPath: relPath })),
    worlds: [], dummyWorldIid: project.dummyWorldIid,
  };
}

export function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, '\t')}\n`);
}
