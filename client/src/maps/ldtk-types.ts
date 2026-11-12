/**
 * Kiểu tối thiểu của JSON LDtk (project `.ldtk` và level tách file `.ldtkl`) mà HeroX đọc tới.
 * Định dạng tham chiếu: LDtk 1.5.3 (https://ldtk.io/json). Mọi trường đều đọc phòng thủ trong `ldtk-loader.ts`.
 */

export type LdtkLayerType = 'IntGrid' | 'Entities' | 'Tiles' | 'AutoLayer';

export interface LdtkRawTile {
  /** Toạ độ pixel góc trên trái của ô trong layer. */
  readonly px: readonly [number, number];
  /** Toạ độ pixel trong ảnh tileset. */
  readonly src: readonly [number, number];
  /** Bit 0: lật ngang, bit 1: lật dọc. */
  readonly f: number;
  /** Chỉ số tile trong tileset. */
  readonly t: number;
  /** Độ trong suốt riêng của tile (0..1), có từ LDtk 1.3. */
  readonly a?: number;
}

export interface LdtkRawFieldInstance {
  readonly __identifier: string;
  readonly __type: string;
  readonly __value: unknown;
}

export interface LdtkRawEntityInstance {
  readonly __identifier: string;
  readonly iid: string;
  /** Toạ độ pixel của điểm pivot trong level. */
  readonly px: readonly [number, number];
  readonly __pivot: readonly [number, number];
  readonly width: number;
  readonly height: number;
  readonly fieldInstances: readonly LdtkRawFieldInstance[];
}

export interface LdtkRawLayerInstance {
  readonly __identifier: string;
  readonly __type: LdtkLayerType;
  readonly __cWid: number;
  readonly __cHei: number;
  readonly __gridSize: number;
  readonly __opacity: number;
  readonly __pxTotalOffsetX: number;
  readonly __pxTotalOffsetY: number;
  readonly __tilesetDefUid: number | null;
  readonly visible: boolean;
  readonly intGridCsv: readonly number[];
  readonly gridTiles: readonly LdtkRawTile[];
  readonly autoLayerTiles: readonly LdtkRawTile[];
  readonly entityInstances: readonly LdtkRawEntityInstance[];
}

export interface LdtkRawLevel {
  readonly identifier: string;
  readonly iid: string;
  readonly pxWid: number;
  readonly pxHei: number;
  readonly __bgColor: string;
  /** Có giá trị khi project bật "Save levels to separate files"; khi đó `layerInstances` là `null`. */
  readonly externalRelPath: string | null;
  /** LDtk xếp từ layer trên cùng xuống dưới cùng. */
  readonly layerInstances: readonly LdtkRawLayerInstance[] | null;
}

export interface LdtkRawTilesetDef {
  readonly uid: number;
  readonly identifier: string;
  readonly relPath: string | null;
  readonly tileGridSize: number;
  readonly spacing: number;
  readonly padding: number;
  readonly pxWid: number;
  readonly pxHei: number;
}
