/**
 * Đọc JSON LDtk thành mô hình map thuần (không phụ thuộc Phaser) để test được trong Node.
 * Dựng Phaser từ mô hình này ở `ldtk-tilemap-builder.ts`.
 */
import { isBuildingId, type BuildingId } from '@herox/shared';
import type {
  LdtkRawEntityInstance,
  LdtkRawLayerInstance,
  LdtkRawLevel,
  LdtkRawTile,
  LdtkRawTilesetDef,
} from './ldtk-types';

/** Phiên bản LDtk dùng để soạn map; loader chấp nhận mọi bản cùng major. */
export const LDTK_REFERENCE_VERSION = '1.5.3';
const SUPPORTED_LDTK_MAJOR = 1;

/** Layer IntGrid tên này là va chạm; mọi giá trị khác 0 là ô chắn. */
export const COLLISION_LAYER_IDENTIFIER = 'Collision';

const FLIP_X_BIT = 1;
const FLIP_Y_BIT = 2;

export class LdtkFormatError extends Error {
  override readonly name = 'LdtkFormatError';
}

export interface MapTileset {
  readonly uid: number;
  readonly identifier: string;
  /** Đường dẫn ảnh tương đối so với file `.ldtk`. */
  readonly relPath: string;
  readonly tileGridSize: number;
  readonly spacing: number;
  readonly padding: number;
}

export interface MapLevelRef {
  readonly identifier: string;
  readonly iid: string;
  /** `null` khi level nằm ngay trong project (không tách file). */
  readonly externalRelPath: string | null;
}

export interface MapProject {
  readonly jsonVersion: string;
  readonly gridSize: number;
  readonly tilesets: ReadonlyMap<number, MapTileset>;
  readonly levels: readonly MapLevelRef[];
  /** Level đầy đủ khi project không tách file, theo identifier. */
  readonly inlineLevels: ReadonlyMap<string, unknown>;
}

export interface MapTile {
  readonly cellX: number;
  readonly cellY: number;
  readonly tileIndex: number;
  readonly flipX: boolean;
  readonly flipY: boolean;
  readonly alpha: number;
}

export interface MapTileLayer {
  readonly identifier: string;
  readonly tilesetUid: number;
  readonly gridSize: number;
  readonly widthCells: number;
  readonly heightCells: number;
  readonly offsetX: number;
  readonly offsetY: number;
  readonly opacity: number;
  /**
   * Phaser chỉ giữ một tile mỗi ô, nên ô có nhiều tile chồng (auto-rule sàn + rêu, layer Tiles bật stacking)
   * được tách thành các lớp con: lớp 0 là tile đầu tiên của mỗi ô, lớp 1 là tile thứ hai…
   */
  readonly stackIndex: number;
  readonly tiles: readonly MapTile[];
}

export interface CollisionGrid {
  readonly gridSize: number;
  /** Độ lệch pixel của layer trong level. */
  readonly offsetX: number;
  readonly offsetY: number;
  readonly widthCells: number;
  readonly heightCells: number;
  /** 1 = ô chắn, 0 = đi được; chỉ số `cellY * widthCells + cellX`. */
  readonly cells: Uint8Array;
}

interface EntityBase {
  readonly iid: string;
  /** Hình chữ nhật của entity trong level, pixel. */
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export type MapEntity =
  | (EntityBase & { readonly kind: 'PlayerSpawn'; readonly spawnId: string })
  | (EntityBase & { readonly kind: 'Portal'; readonly targetLevel: string; readonly targetSpawn: string })
  | (EntityBase & { readonly kind: 'Npc'; readonly dialogId: string })
  | (EntityBase & { readonly kind: 'Chest'; readonly itemId: string })
  | (EntityBase & { readonly kind: 'BattleTrigger'; readonly encounterId: string })
  | (EntityBase & { readonly kind: 'Torch' })
  /** Công trình thành trì: hình chữ nhật là nền móng (chắn đường), cửa ở cạnh dưới. */
  | (EntityBase & { readonly kind: 'Building'; readonly buildingId: BuildingId });

export type MapEntityKind = MapEntity['kind'];

export interface MapLevel {
  readonly identifier: string;
  readonly widthPx: number;
  readonly heightPx: number;
  readonly backgroundColor: string;
  /** Xếp từ dưới lên trên, đúng thứ tự vẽ. */
  readonly tileLayers: readonly MapTileLayer[];
  readonly collision: CollisionGrid | null;
  readonly entities: readonly MapEntity[];
  /** Identifier entity loader chưa hiểu; bỏ qua để map mới không làm hỏng client cũ. */
  readonly unknownEntities: readonly string[];
}

function fail(message: string): never {
  throw new LdtkFormatError(message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readArray(source: Record<string, unknown>, key: string, context: string): readonly unknown[] {
  const value = source[key];
  return Array.isArray(value) ? value : fail(`${context}: thiếu mảng "${key}"`);
}

function readNumber(source: Record<string, unknown>, key: string, context: string): number {
  const value = source[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fail(`${context}: "${key}" không phải số`);
}

function readString(source: Record<string, unknown>, key: string, context: string): string {
  const value = source[key];
  return typeof value === 'string' ? value : fail(`${context}: "${key}" không phải chuỗi`);
}

/** Báo lỗi rõ khi map được lưu bằng LDtk khác major, thay vì vẽ sai âm thầm. */
export function assertSupportedJsonVersion(jsonVersion: string): void {
  const major = Number(jsonVersion.split('.')[0]);
  if (major !== SUPPORTED_LDTK_MAJOR) {
    fail(`Map lưu bằng LDtk ${jsonVersion}; HeroX chỉ đọc LDtk ${SUPPORTED_LDTK_MAJOR}.x (soạn bằng ${LDTK_REFERENCE_VERSION})`);
  }
}

function parseTileset(raw: unknown): MapTileset | null {
  if (!isRecord(raw)) fail('Tileset không hợp lệ');
  const def = raw as unknown as LdtkRawTilesetDef;
  // Tileset nhúng sẵn của LDtk (icon) không có ảnh riêng, game không dùng.
  if (typeof def.relPath !== 'string') return null;
  const context = `Tileset ${def.identifier}`;
  return {
    uid: readNumber(raw, 'uid', context),
    identifier: readString(raw, 'identifier', context),
    relPath: def.relPath,
    tileGridSize: readNumber(raw, 'tileGridSize', context),
    spacing: readNumber(raw, 'spacing', context),
    padding: readNumber(raw, 'padding', context),
  };
}

/** Đọc file project `.ldtk`: phiên bản, tileset, danh sách level. */
export function parseLdtkProject(raw: unknown): MapProject {
  if (!isRecord(raw)) fail('File LDtk không phải object JSON');
  const jsonVersion = readString(raw, 'jsonVersion', 'Project');
  assertSupportedJsonVersion(jsonVersion);

  const defs = raw.defs;
  if (!isRecord(defs)) fail('Project: thiếu "defs"');
  const tilesets = new Map<number, MapTileset>();
  for (const tilesetRaw of readArray(defs, 'tilesets', 'Project.defs')) {
    const tileset = parseTileset(tilesetRaw);
    if (tileset) tilesets.set(tileset.uid, tileset);
  }

  const worlds = raw.worlds;
  if (Array.isArray(worlds) && worlds.length > 0) {
    fail('Project bật nhiều world (Multi-worlds); HeroX chỉ đọc project một world');
  }
  const levels: MapLevelRef[] = [];
  const inlineLevels = new Map<string, unknown>();
  for (const levelRaw of readArray(raw, 'levels', 'Project')) {
    if (!isRecord(levelRaw)) fail('Project: level không hợp lệ');
    const identifier = readString(levelRaw, 'identifier', 'Level');
    const externalRelPath = typeof levelRaw.externalRelPath === 'string' ? levelRaw.externalRelPath : null;
    levels.push({ identifier, iid: readString(levelRaw, 'iid', identifier), externalRelPath });
    if (externalRelPath === null) inlineLevels.set(identifier, levelRaw);
  }

  return {
    jsonVersion,
    gridSize: readNumber(raw, 'defaultGridSize', 'Project'),
    tilesets,
    levels,
    inlineLevels,
  };
}

/** Chia tile theo thứ tự vẽ của LDtk thành các lớp con, mỗi lớp tối đa một tile mỗi ô. */
function splitTileStacks(rawTiles: readonly LdtkRawTile[], layer: LdtkRawLayerInstance): MapTile[][] {
  const stacks: MapTile[][] = [];
  const depthByCell = new Map<number, number>();
  for (const tile of rawTiles) {
    // Tile lệch lưới (rule có offset) được làm tròn về ô chứa góc trên trái; Phaser không đặt được tile lệch ô.
    const cellX = Math.floor(tile.px[0] / layer.__gridSize);
    const cellY = Math.floor(tile.px[1] / layer.__gridSize);
    const cell = cellY * layer.__cWid + cellX;
    const depth = depthByCell.get(cell) ?? 0;
    depthByCell.set(cell, depth + 1);
    (stacks[depth] ??= []).push({
      cellX,
      cellY,
      tileIndex: tile.t,
      flipX: (tile.f & FLIP_X_BIT) !== 0,
      flipY: (tile.f & FLIP_Y_BIT) !== 0,
      alpha: typeof tile.a === 'number' ? tile.a : 1,
    });
  }
  return stacks;
}

function parseTileLayers(layer: LdtkRawLayerInstance): MapTileLayer[] {
  // Đọc phòng thủ: file soạn tay hoặc bản LDtk khác có thể thiếu mảng rỗng.
  const rawTiles = (layer.__type === 'Tiles' ? layer.gridTiles : layer.autoLayerTiles) ?? [];
  const tilesetUid = layer.__tilesetDefUid;
  if (tilesetUid === null || rawTiles.length === 0) return [];
  return splitTileStacks(rawTiles, layer).map((tiles, stackIndex) => ({
    identifier: layer.__identifier,
    tilesetUid,
    gridSize: layer.__gridSize,
    widthCells: layer.__cWid,
    heightCells: layer.__cHei,
    offsetX: layer.__pxTotalOffsetX,
    offsetY: layer.__pxTotalOffsetY,
    opacity: layer.__opacity,
    stackIndex,
    tiles,
  }));
}

function parseCollision(layer: LdtkRawLayerInstance, levelId: string): CollisionGrid {
  const cellCount = layer.__cWid * layer.__cHei;
  const csv = layer.intGridCsv ?? [];
  if (csv.length !== cellCount) {
    fail(`${levelId}.${layer.__identifier}: intGridCsv có ${csv.length} ô, cần ${cellCount}`);
  }
  return {
    gridSize: layer.__gridSize,
    offsetX: layer.__pxTotalOffsetX ?? 0,
    offsetY: layer.__pxTotalOffsetY ?? 0,
    widthCells: layer.__cWid,
    heightCells: layer.__cHei,
    cells: Uint8Array.from(csv, (value) => (value === 0 ? 0 : 1)),
  };
}

function readEntityField(entity: LdtkRawEntityInstance, fieldId: string, levelId: string): string {
  const field = (entity.fieldInstances ?? []).find((candidate) => candidate.__identifier === fieldId);
  const value = field?.__value;
  if (typeof value !== 'string' || value === '') {
    fail(`${levelId}: entity ${entity.__identifier} (${entity.iid}) thiếu trường "${fieldId}"`);
  }
  return value;
}

function readPair(value: unknown, context: string): readonly [number, number] {
  if (Array.isArray(value) && value.length === 2 && value.every((part) => typeof part === 'number' && Number.isFinite(part))) {
    return value as unknown as readonly [number, number];
  }
  return fail(`${context}: cặp toạ độ không hợp lệ`);
}

function parseEntity(
  entity: LdtkRawEntityInstance,
  layer: LdtkRawLayerInstance,
  levelId: string,
): MapEntity | null {
  const context = `${levelId}: entity ${entity.__identifier} (${entity.iid})`;
  const record = entity as unknown as Record<string, unknown>;
  const [pivotX, pivotY] = readPair(entity.__pivot, context);
  const [pixelX, pixelY] = readPair(entity.px, context);
  const width = readNumber(record, 'width', context);
  const height = readNumber(record, 'height', context);
  // `px` tính trong layer; cộng độ lệch layer để ra toạ độ trong level.
  const base: EntityBase = {
    iid: entity.iid,
    x: pixelX + (layer.__pxTotalOffsetX ?? 0) - pivotX * width,
    y: pixelY + (layer.__pxTotalOffsetY ?? 0) - pivotY * height,
    width,
    height,
  };
  const field = (fieldId: string): string => readEntityField(entity, fieldId, levelId);
  switch (entity.__identifier) {
    case 'PlayerSpawn':
      return { ...base, kind: 'PlayerSpawn', spawnId: field('spawnId') };
    case 'Portal':
      return { ...base, kind: 'Portal', targetLevel: field('targetLevel'), targetSpawn: field('targetSpawn') };
    case 'Npc':
      return { ...base, kind: 'Npc', dialogId: field('dialogId') };
    case 'Chest':
      return { ...base, kind: 'Chest', itemId: field('itemId') };
    case 'BattleTrigger':
      return { ...base, kind: 'BattleTrigger', encounterId: field('encounterId') };
    case 'Torch':
      return { ...base, kind: 'Torch' };
    case 'Building': {
      const buildingId = field('buildingId');
      if (!isBuildingId(buildingId)) fail(`${context}: buildingId "${buildingId}" không có trong danh sách công trình`);
      return { ...base, kind: 'Building', buildingId };
    }
    default:
      return null;
  }
}

function readLayers(raw: Record<string, unknown>, levelId: string): readonly LdtkRawLayerInstance[] {
  const layers = raw.layerInstances;
  if (!Array.isArray(layers)) {
    fail(`${levelId}: không có layerInstances (level tách file phải đọc từ file .ldtkl)`);
  }
  for (const layer of layers) {
    if (!isRecord(layer) || typeof layer.__type !== 'string' || typeof layer.__identifier !== 'string') {
      fail(`${levelId}: layer không hợp lệ`);
    }
  }
  return layers as readonly LdtkRawLayerInstance[];
}

/** Đọc một level (file `.ldtkl` hoặc level nhúng trong project) thành layer tile, lưới va chạm và entity. */
export function parseLdtkLevel(raw: unknown): MapLevel {
  if (!isRecord(raw)) fail('Level LDtk không phải object JSON');
  const level = raw as unknown as LdtkRawLevel;
  const identifier = readString(raw, 'identifier', 'Level');
  const tileLayers: MapTileLayer[] = [];
  const entities: MapEntity[] = [];
  const unknownEntities: string[] = [];
  let collision: CollisionGrid | null = null;

  // LDtk liệt kê layer từ trên xuống; đảo lại để vẽ từ dưới lên.
  for (const layer of [...readLayers(raw, identifier)].reverse()) {
    if (layer.__type === 'Entities') {
      for (const entity of layer.entityInstances ?? []) {
        const parsed = parseEntity(entity, layer, identifier);
        if (parsed) entities.push(parsed);
        else unknownEntities.push(entity.__identifier);
      }
      continue;
    }
    if (layer.__type === 'IntGrid' && layer.__identifier === COLLISION_LAYER_IDENTIFIER) {
      collision = parseCollision(layer, identifier);
    }
    if (layer.visible) tileLayers.push(...parseTileLayers(layer));
  }

  return {
    identifier,
    widthPx: readNumber(raw, 'pxWid', identifier),
    heightPx: readNumber(raw, 'pxHei', identifier),
    backgroundColor: typeof level.__bgColor === 'string' ? level.__bgColor : '#000000',
    tileLayers,
    collision,
    entities,
    unknownEntities,
  };
}

/** Ô ngoài biên level tính là chắn để hero không đi ra khỏi map. */
export function isSolidCell(grid: CollisionGrid, cellX: number, cellY: number): boolean {
  if (cellX < 0 || cellY < 0 || cellX >= grid.widthCells || cellY >= grid.heightCells) return true;
  return grid.cells[cellY * grid.widthCells + cellX] === 1;
}

export function findEntities<K extends MapEntityKind>(level: MapLevel, kind: K): Extract<MapEntity, { kind: K }>[] {
  return level.entities.filter((entity): entity is Extract<MapEntity, { kind: K }> => entity.kind === kind);
}

/** Tìm điểm xuất hiện theo `spawnId`; không có thì lấy điểm đầu tiên của level. */
export function findSpawn(level: MapLevel, spawnId?: string): Extract<MapEntity, { kind: 'PlayerSpawn' }> | null {
  const spawns = findEntities(level, 'PlayerSpawn');
  return spawns.find((spawn) => spawn.spawnId === spawnId) ?? spawns[0] ?? null;
}

/** Liệt kê cổng trỏ tới level hoặc spawn không tồn tại; dùng trong test map. */
export function findBrokenPortalLinks(levels: readonly MapLevel[]): string[] {
  const spawnsByLevel = new Map(levels.map((level) => [level.identifier, findEntities(level, 'PlayerSpawn')]));
  const problems: string[] = [];
  for (const level of levels) {
    for (const portal of findEntities(level, 'Portal')) {
      const targetSpawns = spawnsByLevel.get(portal.targetLevel);
      if (!targetSpawns) problems.push(`${level.identifier}: cổng ${portal.iid} trỏ tới level "${portal.targetLevel}" không có`);
      else if (!targetSpawns.some((spawn) => spawn.spawnId === portal.targetSpawn)) {
        problems.push(`${level.identifier}: cổng ${portal.iid} trỏ tới spawn "${portal.targetSpawn}" không có`);
      }
    }
  }
  return problems;
}

/**
 * Ghép đường dẫn tương đối của LDtk (dùng `/`, có thể có `..`) với thư mục file gốc.
 * Ví dụ `resolveAssetPath('maps/test-room.ldtk', '../tilesets/a.png')` → `tilesets/a.png`.
 */
export function resolveAssetPath(baseFile: string, relPath: string): string {
  const segments = baseFile.split('/').slice(0, -1);
  for (const part of relPath.replace(/\\/g, '/').split('/')) {
    if (part === '..') {
      if (segments.length === 0) fail(`Đường dẫn "${relPath}" vượt ra ngoài thư mục asset`);
      segments.pop();
    } else if (part !== '.' && part !== '') {
      segments.push(part);
    }
  }
  return segments.join('/');
}
